// PreToolUse hook for Bash: denies destructive git and rm commands, asks before risky ones.
// The permission rules in .claude/settings.json catch the obvious spellings; this catches the
// variants prefix rules miss: chained commands, git global options before the subcommand,
// short-flag clusters, `+refspec` force pushes and pushes that land on main.
// Plain Node, no dependencies. Tests: git-guard.test.mjs (`pnpm test:guardrails`).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';

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

/** Groups tokens into simple commands (word lists), dropping redirections and env assignments. */
function simpleCommands(command) {
  const commands = [];
  let words = [];
  const tokens = tokenize(command);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (SEPARATORS.has(token)) {
      if (words.length > 0) commands.push(words);
      words = [];
    } else if (/^\d*(>>?|<)$/.test(token)) {
      i++; // `> file`: skip the file too
    } else if (/^\d*(>>?|<)/.test(token)) {
      // `>file`, `2>&1`
    } else if ((token === '{' || token === '}') && words.length === 0) {
      // brace group
    } else {
      words.push(token);
    }
  }
  if (words.length > 0) commands.push(words);
  return commands.map(stripPrefixes).filter((simple) => simple.length > 0);
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

/** True when a short-flag cluster such as `-uf` contains `letter`, reading up to a value-taking flag. */
function hasShortFlag(args, letter, takesValue = '') {
  for (const arg of args) {
    if (arg === '--') return false;
    if (!/^-[A-Za-z]/.test(arg)) continue;
    for (const ch of arg.slice(1)) {
      if (ch === letter) return true;
      if (takesValue.includes(ch)) break;
    }
  }
  return false;
}

function hasLongFlag(args, name) {
  const end = args.indexOf('--');
  const options = end === -1 ? args : args.slice(0, end);
  return options.some((arg) => arg === name || arg.startsWith(`${name}=`));
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
  if (hasLongFlag(args, '--force') || hasShortFlag(args, 'f', 'o')) {
    results.push(
      deny('`git push --force` / `-f` rewrites remote history. Push a new commit instead.'),
    );
  } else if (hasLongFlag(args, '--force-with-lease')) {
    results.push(
      ask('`git push --force-with-lease` rewrites remote history; the human confirms it.'),
    );
  }
  if (hasLongFlag(args, '--all') || hasLongFlag(args, '--mirror')) {
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
  const deleting = hasLongFlag(args, '--delete') || hasShortFlag(args, 'd', 'o');
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

  switch (subcommand) {
    case 'push':
      return checkPush(args, gitCwd);
    case 'reset':
      return hasLongFlag(args, '--hard')
        ? [
            deny(
              '`git reset --hard` throws away uncommitted work. Use `git stash` or `git reset --keep`.',
            ),
          ]
        : [];
    case 'clean':
      return hasLongFlag(args, '--force') ||
        hasShortFlag(args, 'f', 'e') ||
        hasShortFlag(args, 'x', 'e') ||
        hasShortFlag(args, 'X', 'e')
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
      const staged = hasLongFlag(args, '--staged') || hasShortFlag(args, 'S', 's');
      const worktree = hasLongFlag(args, '--worktree') || hasShortFlag(args, 'W', 's');
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
      const deleting = hasLongFlag(args, '--delete') || hasShortFlag(args, 'd');
      const forced = hasLongFlag(args, '--force') || hasShortFlag(args, 'f');
      return hasShortFlag(args, 'D') || (deleting && forced)
        ? [ask('`git branch -D` deletes a branch even if it is not merged; the human confirms it.')]
        : [];
    }
    case 'tag':
      return hasLongFlag(args, '--delete') || hasShortFlag(args, 'd')
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
        hasLongFlag(args, '--no-verify') ||
        hasShortFlag(args, 'n', 'mFCcSut') ||
        config.some((entry) => entry.toLowerCase().startsWith('core.hookspath'));
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
  const index = segments.findIndex((segment) => BUILD_FOLDERS.includes(segment));
  return index !== -1 && !segments.slice(0, index + 1).some((segment) => segment.includes('*'));
}

function checkRm(args, cwd) {
  const recursive =
    hasLongFlag(args, '--recursive') || hasShortFlag(args, 'r') || hasShortFlag(args, 'R');
  const force = hasLongFlag(args, '--force') || hasShortFlag(args, 'f');
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

/** Every deny or ask that applies to `command`, run from `cwd`. */
function evaluate(command, cwd) {
  const results = [];
  let here = cwd;
  for (const words of simpleCommands(command)) {
    const program = basename(words[0]);
    if (program === 'cd') {
      here = resolve(here, words[1] ?? process.env.HOME ?? here);
    } else if (program === 'git') {
      results.push(...checkGit(words, here));
    } else if (program === 'rm') {
      results.push(...checkRm(words.slice(1), here));
    } else if (SHELLS.has(program) && words.includes('-c')) {
      results.push(...evaluate(words[words.indexOf('-c') + 1] ?? '', here));
    } else if (program === 'eval') {
      results.push(...evaluate(words.slice(1).join(' '), here));
    }
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
