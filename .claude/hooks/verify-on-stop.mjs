// Stop hook: before Claude finishes, run typecheck and lint when code changed. On failure, exit 2
// with the output on stderr: Claude Code feeds it back and Claude keeps working to fix it.
// Plain Node, no dependencies. Skips when a Stop hook already forced a continue (no loops).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });

// Only verify when tracked or new source files changed.
const status = run('git', ['status', '--porcelain', '-uall']).stdout ?? '';
if (!/\.(ts|tsx|mts|js|jsx|mjs)\b/.test(status)) process.exit(0);

const failures = [];
for (const script of ['typecheck', 'lint']) {
  const result = run('pnpm', [script]);
  if (result.status !== 0) {
    const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n').slice(-40);
    failures.push(`pnpm ${script} failed:\n${text.join('\n')}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n\n')}\n\nFix these before finishing.\n`);
  process.exit(2);
}
