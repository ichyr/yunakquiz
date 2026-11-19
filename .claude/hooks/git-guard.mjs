// PreToolUse hook for Bash: denies destructive git and rm commands, asks before risky ones, and
// denies commands that write guardrail files (see locked-paths.mjs).
// The permission rules in .claude/settings.json catch the obvious spellings; this catches the
// variants prefix rules miss: chained commands, git global options before the subcommand,
// short-flag clusters, `+refspec` force pushes and pushes that land on main.
// The guardrail-file check reads the common writers (redirects, tee, sed -i, cp, mv, ln, rm, git
// checkout/restore of a path...). It is a backstop for Bash that runs outside the sandbox; the
// sandbox's denyWrite is what stops sandboxed Bash, whatever program does the writing.
// Plain Node, no dependencies. Tests: git-guard.test.mjs (`pnpm test:guardrails`).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { isLocked, lockedReason } from './locked-paths.mjs';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
// The project's own build output, as listed in .gitignore. `rm -rf` may delete inside these.
const BUILD_FOLDERS = [
  'node_modules',
  'dist',
  'storybook-static',
  'playwright-report',
  'test-results',
];
const PROTECTED_BRANCH = 'main';

const SEPARATORS = new Set(['&&', '||', ';', '|', '&', '\n', '(', ')']);
// Git global options that take their value as the next word.
const GIT_GLOBAL_WITH_VALUE = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--config-env',
  '--super-prefix',
]);
// Short flags that take a value, per command, so a cluster such as `-am` stops reading at `m`.
const PUSH_FLAGS_WITH_VALUE = 'o';
const CLEAN_FLAGS_WITH_VALUE = 'e';
const RESTORE_FLAGS_WITH_VALUE = 's';
const COMMIT_FLAGS_WITH_VALUE = 'mFCcSut';
// Programs that write every path they are given, and those that write only their last one.
const WRITES_EVERY_PATH = new Set([
  'mv',
  'ln',
  'rm',
  'rmdir',
  'unlink',
  'touch',
  'truncate',
  'tee',
  'chmod',
  'chown',
  'chgrp',
  'mkdir',
  'shred',
]);
const WRITES_LAST_PATH = new Set(['cp', 'install', 'rsync']);
const WRAPPERS = new Set(['sudo', 'command', 'env', 'nice', 'nohup', 'time', 'exec', 'xargs']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash']);

/** Splits a shell command into words and separators, honouring quotes and backslashes. */
function tokenize(command) {
  const tokens = [];
  let word = '';
  let inWord = false;
  const flush = () => {
    if (inWord) tokens.push(word);
    word = '';
    inWord = false;
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const pair = command.slice(i, i + 2);
    if (ch === "'") {
      const end = command.indexOf("'", i + 1);
      const stop = end === -1 ? command.length : end;
      word += command.slice(i + 1, stop);
      inWord = true;
      i = stop;
    } else if (ch === '"') {
      i++;
      while (i < command.length && command[i] !== '"') {
        if (command[i] === '\\' && i + 1 < command.length) i++;
        word += command[i++];
      }
      inWord = true;
    } else if (ch === '\\' && i + 1 < command.length) {
      if (command[i + 1] !== '\n') word += command[i + 1];
      inWord = true;
      i++;
    } else if (pair === '&&' || pair === '||') {
      flush();
      tokens.push(pair);
      i++;
    } else if (pair === '>&' || pair === '<&') {
      // A redirection such as 2>&1, not a background `&`.
      word += pair;
      inWord = true;
      i++;
    } else if (SEPARATORS.has(ch)) {
      flush();
      tokens.push(ch);
    } else if (ch === ' ' || ch === '\t') {
      flush();
    } else {
      word += ch;
      inWord = true;
    }
  }
  flush();
  return tokens;
}

/**
 * Groups tokens into simple commands: their words, without env assignments and wrappers, and the
 * files their output redirections write.
 */
function simpleCommands(command) {
  const commands = [];
  let words = [];
  let writes = [];
  const flush = () => {
    const stripped = stripPrefixes(words);
    if (stripped.length > 0 || writes.length > 0) commands.push({ words: stripped, writes });
    words = [];
    writes = [];
  };
  const tokens = tokenize(command);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const redirect = /^\d*(>>?|<)(.*)$/.exec(token);
    if (SEPARATORS.has(token)) {
      flush();
    } else if (redirect && redirect[2] === '') {
      // `> file`: the file is the next token
      if (redirect[1] !== '<' && i + 1 < tokens.length) writes.push(tokens[i + 1]);
      i++;
    } else if (redirect) {
      // `>file`; `2>&1` duplicates a descriptor and writes no file
      if (redirect[1] !== '<' && !redirect[2].startsWith('&')) writes.push(redirect[2]);
    } else if ((token === '{' || token === '}') && words.length === 0) {
      // brace group
    } else {
      words.push(token);
    }
  }
  flush();
  return commands;
}

/** Removes `VAR=value` assignments and wrappers such as `sudo` from the front of a command. */
function stripPrefixes(words) {
  let start = 0;
  while (start < words.length) {
    const word = words[start];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word) || WRAPPERS.has(word)) start++;
    else if (start > 0 && WRAPPERS.has(words[start - 1]) && word.startsWith('-')) start++;
    else break;
  }
  return words.slice(start);
}

/**
 * True when `args` hold one of the `long` options or a short-flag cluster (such as `-uf`) holding
 * one of the `short` letters. A cluster is read up to the first letter in `shortWithValue`, whose
 * value follows. Like git, a long option may be cut to any prefix of two letters or more.
 */
function hasFlag(args, { long = [], short = '', shortWithValue = '' }) {
  for (const arg of args) {
    if (arg === '--') return false;
    if (arg.startsWith('--')) {
      const name = arg.split('=')[0];
      if (name.length >= 4 && long.some((option) => option.startsWith(name))) return true;
    } else if (/^-[A-Za-z]/.test(arg)) {
      for (const letter of arg.slice(1)) {
        if (short.includes(letter)) return true;
        if (shortWithValue.includes(letter)) break;
      }
    }
  }
  return false;
}

/** Positional arguments, skipping options and the values of `withValue` options. */
function positionals(args, withValue = new Set()) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') return [...result, ...args.slice(i + 1)];
    if (arg.startsWith('-') && arg !== '-') {
      if (withValue.has(arg)) i++;
      continue;
    }
    result.push(arg);
  }
  return result;
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const deny = (reason) => ({ decision: 'deny', reason });
const ask = (reason) => ({ decision: 'ask', reason });

function checkPush(args, cwd) {
  const results = [];
  if (hasFlag(args, { long: ['--force'], short: 'f', shortWithValue: PUSH_FLAGS_WITH_VALUE })) {
    results.push(
      deny('`git push --force` / `-f` rewrites remote history. Push a new commit instead.'),
    );
  } else if (hasFlag(args, { long: ['--force-with-lease'] })) {
    results.push(
      ask('`git push --force-with-lease` rewrites remote history; the human confirms it.'),
    );
  }
  if (hasFlag(args, { long: ['--all', '--mirror'] })) {
    results.push(
      deny(
        `\`git push --all\` / \`--mirror\` pushes \`${PROTECTED_BRANCH}\`. Push your feature branch by name.`,
      ),
    );
  }

  const [, ...refspecs] = positionals(
    args,
    new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']),
  );
  const deleting = hasFlag(args, {
    long: ['--delete'],
    short: 'd',
    shortWithValue: PUSH_FLAGS_WITH_VALUE,
  });
  if (deleting)
    results.push(ask('`git push --delete` removes a remote branch or tag; the human confirms it.'));
  if (refspecs.some((spec) => spec.startsWith('+'))) {
    results.push(deny('A `+refspec` force-pushes. Push a new commit instead.'));
  }

  const destinations = refspecs.map((spec) => {
    const bare = spec.replace(/^\+/, '');
    if (bare.startsWith(':'))
      results.push(ask('`git push <remote> :<ref>` deletes a remote ref; the human confirms it.'));
    const destination = bare.includes(':') ? bare.slice(bare.indexOf(':') + 1) : bare;
    return destination === 'HEAD' || destination === '@' ? currentBranch(cwd) : destination;
  });
  if (refspecs.length === 0 && !deleting) destinations.push(currentBranch(cwd));
  if (destinations.some((ref) => ref.replace(/^refs\/heads\//, '') === PROTECTED_BRANCH)) {
    results.push(
      deny(
        `Pushing to \`${PROTECTED_BRANCH}\` is not allowed. Push a feature branch and open a pull request.`,
      ),
    );
  }
  return results;
}

function checkGit(words, cwd) {
  let i = 1;
  let gitCwd = cwd;
  const config = [];
  while (i < words.length && words[i].startsWith('-')) {
    const option = words[i];
    if (GIT_GLOBAL_WITH_VALUE.has(option)) {
      if (option === '-C') gitCwd = resolve(gitCwd, words[i + 1] ?? '.');
      if (option === '-c') config.push(words[i + 1] ?? '');
      i += 2;
    } else {
      i++;
    }
  }
  const subcommand = words[i];
  const args = words.slice(i + 1);
  return [
    ...checkGitPaths(subcommand, args, gitCwd),
    ...checkGitSubcommand(subcommand, args, gitCwd, config),
  ];
}

/** `git checkout|restore|rm|mv <paths>` rewrites or removes the paths it names. */
function checkGitPaths(subcommand, args, cwd) {
  if (!['checkout', 'restore', 'rm', 'mv'].includes(subcommand)) return [];
  return lockedWrites(positionals(args, new Set(['-s', '--source'])), cwd);
}

function checkGitSubcommand(subcommand, args, gitCwd, config) {
  switch (subcommand) {
    case 'push':
      return checkPush(args, gitCwd);
    case 'reset':
      return hasFlag(args, { long: ['--hard'] })
        ? [
            deny(
              '`git reset --hard` throws away uncommitted work. Use `git stash` or `git reset --keep`.',
            ),
          ]
        : [];
    case 'clean':
      return hasFlag(args, {
        long: ['--force'],
        short: 'fxX',
        shortWithValue: CLEAN_FLAGS_WITH_VALUE,
      })
        ? [
            deny(
              '`git clean -f` / `-fd` / `-x` deletes untracked files for good. Run `git clean -n` to list them instead.',
            ),
          ]
        : [];
    case 'checkout': {
      const end = args.indexOf('--');
      const discards = (end !== -1 && args.length > end + 1) || positionals(args).includes('.');
      return discards
        ? [ask('`git checkout -- <paths>` discards uncommitted changes; the human confirms it.')]
        : [];
    }
    case 'restore': {
      const staged = hasFlag(args, {
        long: ['--staged'],
        short: 'S',
        shortWithValue: RESTORE_FLAGS_WITH_VALUE,
      });
      const worktree = hasFlag(args, {
        long: ['--worktree'],
        short: 'W',
        shortWithValue: RESTORE_FLAGS_WITH_VALUE,
      });
      const everything = positionals(args, new Set(['-s', '--source'])).some(
        (path) => path === '.' || path === ':/',
      );
      if (staged && worktree)
        return [ask('`git restore --staged --worktree` discards changes; the human confirms it.')];
      if (everything && !staged)
        return [ask('`git restore .` discards every uncommitted change; the human confirms it.')];
      return [];
    }
    case 'branch': {
      const deleting = hasFlag(args, { long: ['--delete'], short: 'd' });
      const forced = hasFlag(args, { long: ['--force'], short: 'f' });
      return hasFlag(args, { short: 'D' }) || (deleting && forced)
        ? [ask('`git branch -D` deletes a branch even if it is not merged; the human confirms it.')]
        : [];
    }
    case 'tag':
      return hasFlag(args, { long: ['--delete'], short: 'd' })
        ? [ask('`git tag -d` deletes a tag; the human confirms it.')]
        : [];
    case 'stash':
      return args[0] === 'drop' || args[0] === 'clear'
        ? [
            ask(
              `\`git stash ${args[0]}\` throws stashed work away, and the stash is shared by every worktree; the human confirms it.`,
            ),
          ]
        : [];
    case 'commit': {
      const skipsHooks =
        hasFlag(args, {
          long: ['--no-verify'],
          short: 'n',
          shortWithValue: COMMIT_FLAGS_WITH_VALUE,
        }) || config.some((entry) => entry.toLowerCase().startsWith('core.hookspath'));
      return skipsHooks
        ? [
            deny(
              'Skipping commit hooks is not allowed: commitlint must check the message. Fix what the hook reports.',
            ),
          ]
        : [];
    }
    default:
      return [];
  }
}

function isInsideBuildFolder(target, cwd) {
  if (/[$`~]/.test(target) || target.startsWith('~')) return false;
  const path = relative(PROJECT_ROOT, resolve(cwd, target));
  if (path === '' || path.startsWith('..') || isAbsolute(path)) return false;
  const segments = path.split(sep);
  // A glob before the build folder (`apps/*/dist`) still only reaches build folders.
  return segments.some((segment) => BUILD_FOLDERS.includes(segment));
}

function checkRm(args, cwd) {
  const recursive = hasFlag(args, { long: ['--recursive'], short: 'rR' });
  const force = hasFlag(args, { long: ['--force'], short: 'f' });
  if (!recursive || !force) return [];
  const targets = positionals(args);
  if (targets.length > 0 && targets.every((target) => isInsideBuildFolder(target, cwd))) return [];
  return [
    deny(
      `\`rm -rf\` is only allowed inside this project's build folders (${BUILD_FOLDERS.join(', ')}). ` +
        'Delete tracked files with `git rm`, or ask the human.',
    ),
  ];
}

/**
 * The commands `find` runs through `-exec`, `-execdir` or `-ok`, each up to its `;` or `+`, with
 * `{}` standing for the folders `find` starts from.
 */
function findExecs(args) {
  const commands = [];
  const end = args.findIndex((arg) => arg.startsWith('-') || arg === '!' || arg === '(');
  const roots = end === -1 ? args : args.slice(0, end);
  args.forEach((arg, i) => {
    if (!['-exec', '-execdir', '-ok', '-okdir'].includes(arg)) return;
    const rest = args.slice(i + 1);
    const stop = rest.findIndex((word) => word === ';' || word === '+');
    const words = stripPrefixes(stop === -1 ? rest : rest.slice(0, stop));
    commands.push(
      words.flatMap((word) => (word === '{}' ? (roots.length > 0 ? roots : ['.']) : [word])),
    );
  });
  return commands.filter((words) => words.length > 0);
}

/** A deny for each of `targets`, run from `cwd`, that is a guardrail file. */
function lockedWrites(targets, cwd) {
  return targets
    .filter((target) => isLocked(target, cwd))
    .map((target) => deny(lockedReason(target)));
}

/** The paths a simple command writes, for the programs this guard knows. */
function writtenPaths(program, args) {
  if (WRITES_EVERY_PATH.has(program)) return positionals(args);
  if (WRITES_LAST_PATH.has(program)) {
    const targetDirectory = args.flatMap((arg, i) => {
      if (arg === '-t' || arg === '--target-directory') return [args[i + 1] ?? ''];
      if (arg.startsWith('--target-directory=')) return [arg.slice('--target-directory='.length)];
      return [];
    });
    return [...positionals(args).slice(-1), ...targetDirectory];
  }
  if (
    program === 'sed' &&
    hasFlag(args, { long: ['--in-place'], short: 'i', shortWithValue: 'efl' })
  )
    return positionals(args, new Set(['-e', '-f', '--expression', '--file']));
  if (program === 'perl' && hasFlag(args, { short: 'i', shortWithValue: 'eEIMmx' }))
    return positionals(args, new Set(['-e', '-E']));
  if (program === 'dd')
    return args.filter((arg) => arg.startsWith('of=')).map((arg) => arg.slice(3));
  return [];
}

/** Every deny or ask that applies to one simple command run from `cwd`. */
function checkCommand(words, cwd) {
  const program = basename(words[0]);
  const locked = lockedWrites(writtenPaths(program, words.slice(1)), cwd);
  if (locked.length > 0) return locked;
  if (program === 'git') return checkGit(words, cwd);
  if (program === 'rm') return checkRm(words.slice(1), cwd);
  if (program === 'find')
    return findExecs(words.slice(1)).flatMap((exec) => checkCommand(exec, cwd));
  if (SHELLS.has(program) && words.includes('-c'))
    return evaluate(words[words.indexOf('-c') + 1] ?? '', cwd);
  if (program === 'eval') return evaluate(words.slice(1).join(' '), cwd);
  return [];
}

/** Every deny or ask that applies to `command`, run from `cwd`, following `cd` between commands. */
function evaluate(command, cwd) {
  const results = [];
  let here = cwd;
  for (const { words, writes } of simpleCommands(command)) {
    results.push(...lockedWrites(writes, here));
    if (words.length === 0) continue;
    if (words[0] === 'cd') here = resolve(here, words[1] ?? process.env.HOME ?? here);
    else results.push(...checkCommand(words, here));
  }
  return results;
}

function decide(input) {
  if (input.tool_name !== 'Bash') return undefined;
  const results = evaluate(String(input.tool_input?.command ?? ''), input.cwd ?? process.cwd());
  const verdict = results.some((r) => r.decision === 'deny')
    ? 'deny'
    : results.length > 0
      ? 'ask'
      : undefined;
  if (!verdict) return undefined;
  const reasons = [...new Set(results.filter((r) => r.decision === verdict).map((r) => r.reason))];
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: verdict,
      permissionDecisionReason: `git-guard: ${reasons.join(' ')}`,
    },
  };
}

const output = decide(JSON.parse(readFileSync(0, 'utf8') || '{}'));
if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
