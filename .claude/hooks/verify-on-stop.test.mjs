// Runs the Stop hook the way Claude Code does: a Stop payload on stdin, exit code and stderr out.
// A throwaway git repo stands in for the project and a fake `pnpm` on PATH records its calls, so no
// real typecheck or lint runs. Run with `pnpm test:guardrails`.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const hook = join(import.meta.dirname, 'verify-on-stop.mjs');

const scratch = mkdtempSync(join(tmpdir(), 'verify-on-stop-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

// Fake pnpm: logs its first argument, prints a line, fails when listed in FAKE_FAIL.
const bin = join(scratch, 'bin');
const log = join(scratch, 'pnpm.log');
mkdirSync(bin);
writeFileSync(
  join(bin, 'pnpm'),
  `#!/bin/sh
echo "$1" >> "${log}"
echo "fake $1 output"
case ",$FAKE_FAIL," in *",$1,"*) exit 1;; esac
exit 0
`,
);
chmodSync(join(bin, 'pnpm'), 0o755);

const repo = join(scratch, 'repo');
const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });

beforeEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(log, { force: true });
  mkdirSync(repo);
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(repo, 'README.md'), '# repo\n');
  git('add', '.');
  git('commit', '-q', '-m', 'init');
});

const write = (path, text = 'x\n') => {
  mkdirSync(join(repo, path, '..'), { recursive: true });
  writeFileSync(join(repo, path), text);
};
const pnpmCalls = () => {
  try {
    return readFileSync(log, 'utf8').trim().split('\n');
  } catch {
    return [];
  }
};

function run({ payload = {}, failing = '' } = {}) {
  const result = spawnSync('node', [hook], {
    input: JSON.stringify({ hook_event_name: 'Stop', ...payload }),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CLAUDE_PROJECT_DIR: repo,
      FAKE_FAIL: failing,
    },
  });
  return { status: result.status, stderr: result.stderr };
}

describe('verify-on-stop: skips', () => {
  test('stop_hook_active: exits 0 without running anything', () => {
    write('src/a.ts');
    const { status } = run({
      payload: { stop_hook_active: true },
      failing: 'typecheck',
    });
    assert.equal(status, 0);
    assert.deepEqual(pnpmCalls(), []);
  });

  test('clean working tree: exits 0 without running anything', () => {
    assert.equal(run().status, 0);
    assert.deepEqual(pnpmCalls(), []);
  });

  test('only non-code files changed: exits 0 without running anything', () => {
    write('docs/notes.md');
    write('README.md', 'changed\n');
    assert.equal(run().status, 0);
    assert.deepEqual(pnpmCalls(), []);
  });
});

describe('verify-on-stop: verifies code changes', () => {
  test('modified tracked .ts file, checks pass: exits 0 after typecheck and lint', () => {
    write('a.ts');
    git('add', '.');
    git('commit', '-q', '-m', 'add a');
    write('a.ts', 'changed\n');
    assert.equal(run().status, 0);
    assert.deepEqual(pnpmCalls(), ['typecheck', 'lint']);
  });

  // `git status --porcelain` collapses a new folder to `?? src/`, hiding the file inside.
  test('new .ts file in a new folder is seen', () => {
    write('packages/new/src/a.ts');
    assert.equal(run().status, 0);
    assert.deepEqual(pnpmCalls(), ['typecheck', 'lint']);
  });

  for (const file of ['a.tsx', 'a.mts', 'a.js', 'a.jsx', 'a.mjs']) {
    test(`${file} counts as code`, () => {
      write(file);
      run();
      assert.deepEqual(pnpmCalls(), ['typecheck', 'lint']);
    });
  }
});

describe('verify-on-stop: failures exit 2 with the output on stderr', () => {
  test('typecheck fails: exit 2, stderr names typecheck and carries its output', () => {
    write('a.ts');
    const { status, stderr } = run({ failing: 'typecheck' });
    assert.equal(status, 2);
    assert.match(stderr, /pnpm typecheck failed/);
    assert.match(stderr, /fake typecheck output/);
    assert.doesNotMatch(stderr, /pnpm lint failed/);
  });

  test('lint fails: exit 2, stderr names lint', () => {
    write('a.ts');
    const { status, stderr } = run({ failing: 'lint' });
    assert.equal(status, 2);
    assert.match(stderr, /pnpm lint failed/);
    assert.doesNotMatch(stderr, /pnpm typecheck failed/);
  });

  test('both fail: exit 2, stderr reports both, so one pass fixes both', () => {
    write('a.ts');
    const { status, stderr } = run({ failing: 'typecheck,lint' });
    assert.equal(status, 2);
    assert.match(stderr, /pnpm typecheck failed/);
    assert.match(stderr, /pnpm lint failed/);
    assert.deepEqual(pnpmCalls(), ['typecheck', 'lint']);
  });

  test('stderr tells Claude what to do next', () => {
    write('a.ts');
    assert.match(run({ failing: 'lint' }).stderr, /Fix these before finishing/);
  });
});
