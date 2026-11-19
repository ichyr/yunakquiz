// Runs the lock the way Claude Code does: a PreToolUse payload on stdin, a decision on stdout.
// Run with `pnpm test:guardrails`.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const hook = join(import.meta.dirname, 'guardrail-lock.mjs');
const projectRoot = join(import.meta.dirname, '..', '..');
const web = join(projectRoot, 'apps', 'web');

const scratch = mkdtempSync(join(tmpdir(), 'guardrail-lock-'));
after(() => rmSync(scratch, { recursive: true, force: true }));
// A link an agent could make to reach a locked folder by another name.
const linkToGithub = join(scratch, 'gh');
symlinkSync(join(projectRoot, '.github'), linkToGithub);

function run(toolName, toolInput, cwd = projectRoot) {
  const payload = { tool_name: toolName, tool_input: toolInput, cwd };
  const result = spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  if (result.stdout.trim() === '') return { decision: 'allow', reason: '' };
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, 'PreToolUse');
  return { decision: output.permissionDecision, reason: output.permissionDecisionReason };
}
const edit = (file_path, cwd) => run('Edit', { file_path }, cwd);

// [file_path, expected decision, cwd?]
const table = {
  'guardrail files: deny': [
    [join(projectRoot, '.claude', 'settings.json'), 'deny'],
    [join(projectRoot, '.claude', 'settings.local.json'), 'deny'],
    [join(projectRoot, '.claude', 'hooks', 'git-guard.mjs'), 'deny'],
    [join(projectRoot, '.claude', 'hooks', 'new-hook.mjs'), 'deny'],
    [join(projectRoot, '.github', 'workflows', 'ci.yml'), 'deny'],
    [join(projectRoot, '.github', 'workflows', 'new.yml'), 'deny'],
    [join(projectRoot, '.github', 'pull_request_template.md'), 'deny'],
    [join(projectRoot, 'apps', 'web', '.claude', 'settings.json'), 'deny'],
    [join(projectRoot, 'apps', 'api', '.claude', 'settings.json'), 'deny'],
    [join(projectRoot, '.GitHub', 'workflows', 'ci.yml'), 'deny'],
    [join(homedir(), '.claude', 'settings.json'), 'deny'],
    [join(linkToGithub, 'workflows', 'ci.yml'), 'deny'],
    ['.github/workflows/ci.yml', 'deny'],
    ['../../.claude/settings.json', 'deny', web],
    ['../../.github/workflows/ci.yml', 'deny', web],
    ['../api/.claude/settings.json', 'deny', web],
    ['.claude/settings.json', 'deny', web],
  ],
  'everything else: allow': [
    [join(projectRoot, 'apps', 'web', 'src', 'main.tsx'), 'allow'],
    [join(projectRoot, 'README.md'), 'allow'],
    [join(projectRoot, '.claude', 'skills', 'example', 'SKILL.md'), 'allow'],
    [join(projectRoot, '.claude', 'worktrees', 'x', 'README.md'), 'allow'],
    [join(projectRoot, 'node_modules', 'resolve', '.github', 'FUNDING.yml'), 'allow'],
    [join(projectRoot, 'docs', 'github.md'), 'allow'],
    ['src/main.tsx', 'allow', web],
  ],
};

for (const [group, cases] of Object.entries(table)) {
  describe(group, () => {
    for (const [path, expected, cwd] of cases) {
      test(`${path}${cwd ? ` from ${cwd}` : ''}`, () =>
        assert.equal(edit(path, cwd).decision, expected));
    }
  });
}

describe('every file-writing tool is checked', () => {
  const settings = join(projectRoot, '.claude', 'settings.json');
  for (const tool of ['Edit', 'Write', 'MultiEdit']) {
    test(tool, () => assert.equal(run(tool, { file_path: settings }).decision, 'deny'));
  }
  test('NotebookEdit', () => {
    const notebook = join(projectRoot, '.github', 'notes.ipynb');
    assert.equal(run('NotebookEdit', { notebook_path: notebook }).decision, 'deny');
  });
  test('Read passes through', () => {
    assert.equal(run('Read', { file_path: settings }).decision, 'allow');
  });
});

describe('the agent sees why', () => {
  test('a deny names the file and says a human edits it', () => {
    const { reason } = edit(join(projectRoot, '.github', 'workflows', 'ci.yml'));
    assert.match(reason, /\.github\/workflows\/ci\.yml/);
    assert.match(reason, /human/);
  });
});

describe('wiring', () => {
  const settings = JSON.parse(readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8'));

  test('the root settings run this hook on every file-writing tool, by a path built from the project root', () => {
    const entries = settings.hooks.PreToolUse.filter((entry) =>
      entry.hooks.some((h) => h.command.includes('.claude/hooks/guardrail-lock.mjs')),
    );
    assert.equal(entries.length, 1);
    const [entry] = entries;
    for (const tool of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']) {
      assert.ok(entry.matcher.split('|').includes(tool), `matcher must include ${tool}`);
    }
    const [h] = entry.hooks;
    assert.ok(h.command.includes('rev-parse --show-toplevel'));
    assert.equal(h.onFailure, 'block');
  });

  test('deny rules lock the guardrail files for sessions started at the root or in apps/*', () => {
    for (const rule of [
      'Edit(.claude/settings.json)',
      'Edit(.claude/settings.local.json)',
      'Edit(.claude/hooks/**)',
      'Edit(.github/**)',
      'Edit(apps/*/.claude/**)',
      'Edit(../../.claude/settings.json)',
      'Edit(../../.claude/settings.local.json)',
      'Edit(../../.claude/hooks/**)',
      'Edit(../../.github/**)',
      'Edit(../web/.claude/**)',
      'Edit(../api/.claude/**)',
    ]) {
      assert.ok(settings.permissions.deny.includes(rule), `missing deny rule ${rule}`);
    }
  });

  test('sandboxed Bash cannot write the guardrail files', () => {
    const denyWrite = settings.sandbox.filesystem.denyWrite;
    for (const path of [
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.claude/hooks',
      '.github',
      'apps/web/.claude',
      'apps/api/.claude',
    ]) {
      assert.ok(denyWrite.includes(path), `missing sandbox denyWrite ${path}`);
    }
  });
});
