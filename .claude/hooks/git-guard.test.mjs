// Runs the guard the way Claude Code does: a PreToolUse payload on stdin, a decision on stdout.
// Run with `pnpm test:guardrails`.
import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const hook = join(import.meta.dirname, 'git-guard.mjs');
const projectRoot = join(import.meta.dirname, '..', '..');

const scratch = mkdtempSync(join(tmpdir(), 'git-guard-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

function repoOnBranch(branch) {
  const dir = mkdtempSync(join(scratch, 'repo-'));
  execFileSync('git', ['init', '--quiet', '--initial-branch', branch, dir]);
  return dir;
}
const onMain = repoOnBranch('main');
const onFeature = repoOnBranch('feat/quiz-timer');

function run(command, cwd = projectRoot, toolName = 'Bash') {
  const payload = { tool_name: toolName, tool_input: { command }, cwd };
  const result = spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  if (result.stdout.trim() === '') return { decision: 'allow', reason: '' };
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, 'PreToolUse');
  return { decision: output.permissionDecision, reason: output.permissionDecisionReason };
}

// [command, expected decision, cwd?]
const table = {
  'push --force / -f / +refspec: deny': [
    ['git push --force origin feat/quiz-timer', 'deny'],
    ['git push -f', 'deny'],
    ['git push origin +main', 'deny'],
    ['git push origin +feat/quiz-timer', 'deny'],
    ['git push -uf origin feat/quiz-timer', 'deny'],
    ['git push --force-with-lease --force origin feat/quiz-timer', 'deny'],
  ],
  'push --force-with-lease: ask': [
    ['git push --force-with-lease origin feat/quiz-timer', 'ask'],
    ['git push --force-with-lease=feat/quiz-timer origin feat/quiz-timer', 'ask'],
  ],
  'any push to main: deny': [
    ['git push origin main', 'deny'],
    ['git push origin HEAD:main', 'deny'],
    ['git push origin feat/quiz-timer:refs/heads/main', 'deny'],
    ['git push -u origin main', 'deny'],
    ['git push --all origin', 'deny'],
    ['git push --mirror origin', 'deny'],
    ['git push', 'deny', onMain],
    ['git push origin', 'deny', onMain],
    ['git push origin HEAD', 'deny', onMain],
  ],
  'reset --hard: deny': [
    ['git reset --hard', 'deny'],
    ['git reset --hard origin/main', 'deny'],
    ['git reset -q --hard HEAD~1', 'deny'],
  ],
  'clean -f / -fd / -x: deny': [
    ['git clean -f', 'deny'],
    ['git clean -fd', 'deny'],
    ['git clean -dfx', 'deny'],
    ['git clean -x', 'deny'],
    ['git clean --force -d', 'deny'],
  ],
  'discarding work-tree changes: ask': [
    ['git checkout -- .', 'ask'],
    ['git checkout .', 'ask'],
    ['git restore .', 'ask'],
    ['git restore --staged --worktree apps/web/src/main.tsx', 'ask'],
    ['git restore -SW .', 'ask'],
  ],
  'deleting branches and tags: ask': [
    ['git branch -D feat/quiz-timer', 'ask'],
    ['git branch --delete --force feat/quiz-timer', 'ask'],
    ['git push --delete origin feat/quiz-timer', 'ask'],
    ['git push origin --delete feat/quiz-timer', 'ask'],
    ['git push origin :feat/quiz-timer', 'ask'],
    ['git tag -d v1.0.0', 'ask'],
    ['git tag --delete v1.0.0', 'ask'],
  ],
  'stash drop / clear: ask': [
    ['git stash drop', 'ask'],
    ['git stash drop stash@{1}', 'ask'],
    ['git stash clear', 'ask'],
  ],
  'commit --no-verify: deny': [
    ['git commit --no-verify -m "chore: skip hooks"', 'deny'],
    ['git commit -n -m "chore: skip hooks"', 'deny'],
    ['git commit -anm "chore: skip hooks"', 'deny'],
    ['git -c core.hooksPath=/dev/null commit -m "chore: skip hooks"', 'deny'],
  ],
  'rm -rf outside build folders: deny': [
    ['rm -rf /', 'deny'],
    ['rm -rf ~', 'deny'],
    ['rm -rf apps/web/src', 'deny'],
    ['rm -rf .', 'deny'],
    ['rm -rf *', 'deny'],
    ['rm -fr ../other-project', 'deny'],
    ['rm -r -f packages/core', 'deny'],
    ['rm --recursive --force apps', 'deny'],
    ['rm -rf apps/web/dist/../src', 'deny'],
    ['rm -rf "$HOME/projects"', 'deny'],
    ['rm -rf node_modules apps/api/src', 'deny'],
    ['sudo rm -rf /var/lib', 'deny'],
  ],
  'rm -rf inside build folders: allow': [
    ['rm -rf node_modules', 'allow'],
    ['rm -rf apps/web/dist', 'allow'],
    ['rm -rf dist storybook-static', 'allow'],
    ['rm -rf apps/web/playwright-report apps/web/test-results', 'allow'],
    ['rm -rf dist', 'allow', join(projectRoot, 'apps', 'web')],
    ['rm -rf ../../node_modules/.vite', 'allow', join(projectRoot, 'apps', 'api')],
    ['rm -rf apps/*/dist', 'allow'],
    ['rm -rf ' + join(projectRoot, 'node_modules'), 'allow'],
  ],
  'rebase: allow': [
    ['git rebase main', 'allow'],
    ['git rebase --continue', 'allow'],
    ['git -C apps/web rebase origin/main', 'allow'],
  ],
  'bypass variants': [
    ['git -C . reset --hard', 'deny'],
    ['git -C apps/web -c color.ui=never reset --hard', 'deny'],
    ['git --git-dir=.git --work-tree=. clean -fd', 'deny'],
    ['git --no-pager push -f', 'deny'],
    ['cd x && git clean -fd', 'deny'],
    ['git status; git reset --hard', 'deny'],
    ['git fetch || git reset --hard origin/main', 'deny'],
    ['echo y | git clean -f', 'deny'],
    ['git status\ngit push --force', 'deny'],
    ['(cd apps/web && git push -f)', 'deny'],
    ['GIT_TRACE=1 git push -f', 'deny'],
    ['/usr/bin/git push --force', 'deny'],
    ['bash -c "git reset --hard"', 'deny'],
    ['git stash list && git stash clear', 'ask'],
    ['git branch -D feat/a && git reset --hard', 'deny'],
    ['git push origin', 'deny', onMain],
    ['cd ' + onMain + ' && git push', 'deny', onFeature],
    ['find . -name src -exec rm -rf {} +', 'deny'],
    // git accepts any unambiguous prefix of a long option.
    ['git reset --har', 'deny'],
    ['git push --forc origin feat/quiz-timer', 'deny'],
    ['git push --force-with origin feat/quiz-timer', 'ask'],
    ['git commit --no-verif -m "chore: skip hooks"', 'deny'],
    ['git clean --forc', 'deny'],
    ['git branch --del --forc feat/quiz-timer', 'ask'],
  ],
  'ordinary commands pass through': [
    ['git status', 'allow'],
    ['git diff --stat main...HEAD', 'allow'],
    ['git log --oneline -5', 'allow'],
    ['git add -A', 'allow'],
    ['git commit -m "feat(web): add the quiz timer"', 'allow'],
    ['git commit -am "fix(api): reject an empty Option -n"', 'allow'],
    ['git commit -m "docs: mention --no-verify is denied"', 'allow'],
    ['git push -u origin feat/quiz-timer', 'allow'],
    ['git push origin HEAD', 'allow', onFeature],
    ['git push', 'allow', onFeature],
    ['git branch -d feat/merged', 'allow'],
    ['git checkout -b feat/quiz-timer', 'allow'],
    ['git checkout main', 'allow'],
    ['git restore --staged apps/web/src/main.tsx', 'allow'],
    ['git restore --staged .', 'allow'],
    ['git stash', 'allow'],
    ['git stash pop', 'allow'],
    ['git clean -n', 'allow'],
    ['git reset --soft HEAD~1', 'allow'],
    ['git tag v1.0.0', 'allow'],
    ['pnpm test', 'allow'],
    ['grep -rn "reset --hard" docs', 'allow'],
    ['rm apps/web/src/old.ts', 'allow'],
    ['find . -name "*.log" -print', 'allow'],
    ['git commit --no-edit', 'allow'],
  ],
};

for (const [group, cases] of Object.entries(table)) {
  describe(group, () => {
    for (const [command, expected, cwd] of cases) {
      test(command, () => assert.equal(run(command, cwd).decision, expected));
    }
  });
}

describe('the agent sees why', () => {
  test('a deny names the rule', () => {
    assert.match(run('git reset --hard').reason, /reset --hard/);
  });
  test('an ask names the rule', () => {
    assert.match(run('git stash clear').reason, /stash clear/);
  });
  test('rm -rf names the build folders it allows', () => {
    assert.match(run('rm -rf apps').reason, /node_modules/);
  });
});

describe('wiring', () => {
  // Claude Code reads .claude/settings.json only from the folder it starts in, so each app links to
  // the root file instead of keeping a copy that could drift.
  for (const app of ['apps/web', 'apps/api']) {
    test(`${app}/.claude/settings.json links to the root settings`, () => {
      const link = join(projectRoot, app, '.claude', 'settings.json');
      assert.ok(lstatSync(link).isSymbolicLink(), `${link} must be a symlink`);
      assert.equal(realpathSync(link), realpathSync(join(projectRoot, '.claude', 'settings.json')));
    });
  }

  test('the root settings run this hook on Bash, by a path built from the project root', () => {
    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8'),
    );
    const commands = settings.hooks.PreToolUse.filter((entry) => entry.matcher === 'Bash').flatMap(
      (entry) => entry.hooks.map((h) => h.command),
    );
    assert.ok(
      commands.some(
        (c) => c.includes('rev-parse --show-toplevel') && c.includes('.claude/hooks/git-guard.mjs'),
      ),
    );
  });
});

describe('other tools pass through', () => {
  test('a non-Bash tool is ignored', () => {
    assert.equal(run('git push -f', projectRoot, 'Read').decision, 'allow');
  });
});
