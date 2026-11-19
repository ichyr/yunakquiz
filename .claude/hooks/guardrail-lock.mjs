// PreToolUse hook for Edit, Write, MultiEdit and NotebookEdit: denies changes to guardrail files
// (see locked-paths.mjs). The `Edit(…)` deny rules in .claude/settings.json do the same, but rule
// paths resolve from the folder Claude starts in, so they cover only a start at the root or in
// apps/*. They can't be `//**` globs: the sandbox inherits them as denyWrite, and packages in
// node_modules ship their own .github and .claude folders that installs must write. This hook
// matches by folder name, skips node_modules, and so holds from any start folder.
// Plain Node, no dependencies. Tests: guardrail-lock.test.mjs (`pnpm test:guardrails`).
import { readFileSync } from 'node:fs';
import { isLocked, lockedReason } from './locked-paths.mjs';

const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function decide(input) {
  if (!FILE_TOOLS.has(input.tool_name)) return undefined;
  const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (typeof target !== 'string' || !isLocked(target, input.cwd ?? process.cwd())) return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `guardrail-lock: ${lockedReason(target)}`,
    },
  };
}

const output = decide(JSON.parse(readFileSync(0, 'utf8') || '{}'));
if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
