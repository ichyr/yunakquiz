// The guardrail files only a human may change: the Claude Code project settings (and the links to
// them in apps/*), the hooks, and everything GitHub runs or shows from .github. Shared by
// guardrail-lock.mjs (Edit, Write and NotebookEdit) and git-guard.mjs (Bash). Plain Node, no
// dependencies, no side effects.
//
// A path is matched by its folder names wherever it sits, not against one checkout's root, so the
// lock holds in sessions started in apps/web or apps/api and in other worktrees. node_modules is
// skipped: packages ship their own .github folders and installs must still write them.
import { existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';

const SETTINGS_FILES = new Set(['settings.json', 'settings.local.json']);

/** True when the folder names in `path` (absolute) make it a guardrail file. */
function matches(path) {
  // macOS file systems ignore case, so `.GitHub` is `.github`.
  const segments = path.toLowerCase().split(sep).filter(Boolean);
  if (segments.includes('node_modules')) return false;
  if (segments.includes('.github')) return true;
  return segments.some((segment, i) => {
    if (segment !== '.claude') return false;
    const next = segments[i + 1];
    if (next === undefined) return true; // the .claude folder itself: moving it moves the rest
    if (next === 'hooks') return true;
    return SETTINGS_FILES.has(next) && i + 2 === segments.length;
  });
}

/** `path` with every symlink in its existing part resolved, so a link can't hide a locked file. */
function realPath(path) {
  let existing = path;
  const rest = [];
  while (!existsSync(existing) && dirname(existing) !== existing) {
    rest.unshift(basename(existing));
    existing = dirname(existing);
  }
  try {
    return join(realpathSync(existing), ...rest);
  } catch {
    return path;
  }
}

/** The absolute path `target` names, run from `cwd`, with a leading `~` expanded. */
export function absolutePath(target, cwd) {
  const expanded = target === '~' || target.startsWith('~/') ? homedir() + target.slice(1) : target;
  return resolve(cwd, expanded);
}

/** True when writing `target` (relative to `cwd`) would change a guardrail file. */
export function isLocked(target, cwd) {
  const path = absolutePath(target, cwd);
  return matches(path) || matches(realPath(path));
}

/** What the agent is told when a write is refused. */
export function lockedReason(target) {
  return (
    `\`${target}\` is a guardrail file (Claude Code settings, hooks or .github). ` +
    'Agents may not change it; only a human edits it, by hand. ' +
    'Describe the change you need and ask the human to make it.'
  );
}
