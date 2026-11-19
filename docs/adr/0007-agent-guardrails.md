# Agent guardrails live in the repo, in layers

Coding agents (Claude Code) work in this repo with little supervision, so the repo itself limits what they can break or leak. We guard against three threats: an agent's own mistakes (a force push, a `reset --hard`, an `rm -rf` in the wrong folder), a malicious dependency that runs code at install or test time and sends data out, and prompt injection from files, issues or web pages the agent reads. The main assets are the credentials in the home folder (`~/.ssh`, `~/.aws`, `~/.config/gh`, `~/.npmrc` and similar), then any secrets in `.env`, then `main`'s history.

## Layers

The layers overlap, so each catches some of what another misses. All but the ruleset and the review live in `.claude/settings.json`, `.claude/hooks/` and `pnpm-workspace.yaml`.

- **Permission deny/ask rules** catch the obvious spellings of destructive git commands and deny the Read tool `.env` and the home credentials. The Bash rules match command text, so they are a convenience, not a security boundary. The Read denies matter more: the sandbox applies them too.
- **The git-guard hook** (`.claude/hooks/git-guard.mjs`, a `PreToolUse` hook on Bash) parses the command: it splits on `&&`, `||`, `;`, `|` and newlines, skips git global options such as `-C` and `-c`, follows `cd`, looks inside `bash -c`, `eval` and `find -exec`, and denies or asks with a reason the agent can read. A `node:test` table (`pnpm test:guardrails`) covers every row of #41's table and the known bypass variants. The hook is stricter than that table in places, on purpose: any `git checkout -- <path>` asks, not only `-- .`; dry runs of destructive commands (`git push --dry-run --force`) are denied like the real thing; `push --all`/`--mirror` and `-c core.hooksPath=…` are denied. Known gaps: commands built at run time (`$(echo git) push -f`) and `git checkout -f`.
- **The sandbox** wraps every Bash command and everything it starts. It is the layer that holds against a malicious dependency or an injected command.
- **A GitHub ruleset on `main`** ("Protect main", #40) stops a bad push even when every local layer is bypassed or absent. It blocks force pushes and deletion, requires a pull request (0 approvals, since there is one maintainer) and requires the `checks`, `test` and `e2e` CI checks to pass. Nobody can bypass it; the owner changes it in the repository settings. The Claude review stays advisory and is not required. Rulesets need a public repo or a paid plan, so this layer depends on the repo staying public.
- **A lock on the guardrail files** (#39) stops an agent weakening its own guardrails, whether by mistake or through prompt injection. `.claude/settings.json` and its `apps/*` links, `.claude/hooks/**` and `.github/**` are closed to Edit and Write (deny rules plus a `guardrail-lock` hook), to sandboxed Bash (`denyWrite`) and to the common shell writers in Bash run outside the sandbox (git-guard). Only a human changes these files: by hand in an editor, or in a terminal outside Claude Code, and the change goes through a pull request like any other. An agent that needs a change describes it and asks.
- **An advisory Claude review** (`.github/workflows/claude-review.yml`, #38) comments on every PR, checking it against this repo's standards and its linked issue. Its token has `contents: read`, `pull-requests: write` and `issues: read`. The last one is beyond #38's criterion, and we accept it: the review needs it to read the issue it checks the PR against, and it is read-only. Its tools are pinned to the PR under review.
- **pnpm `allowBuilds`** belongs to the same supply-chain defence: dependency install scripts run only when listed, and the one listed, esbuild, is set to `false`.

## Why a sandbox and not only deny rules

A Read-tool deny on `~/.ssh` does nothing when the agent, or a package script, runs `cat ~/.ssh/id_ed25519` in Bash. Deny rules can't follow every way a shell reaches a file or the network; the sandbox restricts the process itself.

What shipped (#35):

- Sandboxed commands are auto-approved. The prompted option to rerun a failed command outside the sandbox stays on.
- **Excluded commands** run outside the sandbox, after the usual permission prompt and the hook: `docker`, `pnpm db:up`, `gh`, `git push`, `git fetch` and `git pull`, since they need the Docker socket, `~/.config/gh` or `~/.ssh`. An exclusion matches the command Claude runs, not what it starts, so `pnpm db:up` needs its own entry next to `docker`. A pipe or `&&` keeps a command sandboxed unless every part matches.
- **Reads** of `.env` and `.env.*` are blocked at any depth except `.env.example` and `.env.development`, and so are the home credentials. The sandbox applies the Read deny rules too, which is where its `.env` and home-folder blocks come from; `denyRead` adds `.env.*`. The Read tool itself blocks only the exact `.env`, because deny rules can't carry exceptions.
- **Writes** are allowed in the start folder, temp folders, the shared pnpm store and the Playwright browser cache. The last two sit outside the repo; we accept that so installs and browser downloads work.
- **Network** reaches only npm, GitHub and the Playwright download hosts. `network.strictAllowlist` is ignored in project settings, so an unlisted host prompts rather than fails. `allowLocalBinding` lets dev servers listen on localhost. Outbound connections to localhost, such as the API to Postgres, are expected to work but not yet verified.

Claude Code quirks that shaped the config:

- It reads project settings only from `<start folder>/.claude/`, so `apps/web/.claude/settings.json` and `apps/api/.claude/settings.json` are symlinks to the root file.
- Sandbox paths without a leading `/`, and `Read(**/…)` rules, resolve from the start folder. So the rules are absolute patterns: `Read(//**/.env)` and `/**/.env.*`. Absolute `allowRead` exceptions were ignored, so each exception is listed twice, as `**/…` (start at the root) and `../../…` (start in `apps/*`). Side effect: from a root start, `.env.example` and `.env.development` are also readable two folders above the repo.
- The hook path is built from `git rev-parse --show-toplevel`, not the start folder, so it works from any start folder.

Verified: the exclusion works only on a bare command. `git push -u origin <branch> 2>&1 | tail -5` stayed sandboxed and failed with `Host key verification failed`, because the sandbox hides `~/.ssh` and `tail` is not in `excludedCommands`. The agent had to retry with the sandbox disabled. So excluded commands are run bare, with no pipe, `&&`, `;` or `cd … &&` prefix; CLAUDE.md says so.

Still open: `pnpm install` and `pnpm test:e2e` inside the sandbox, the API reaching Postgres on `localhost:5432` from the sandbox, the excluded commands prompting as intended, and a sandboxed `git commit` in a git worktree have not been verified yet.

## `.env` files

Non-secret local defaults (today only the Docker `DATABASE_URL`) live in a committed `.env.development` (#34). Secrets go in the gitignored `.env`, which agents and the sandbox can't read. The API's `dev`, `db:migrate` and `db:seed` scripts load `.env.development` first and `.env` second, so `.env` wins.

- For: a fresh clone runs with no copying, and blocking `.env` breaks nothing.
- Against: anything put in `.env.development` is public, and a secret added there by mistake is committed. Inside the sandbox, Node's `--env-file-if-exists` treats the unreadable `.env` as missing, so scripts run on `.env.development` alone and `.env` overrides are silently ignored; run the command yourself to use them.
- Longer term, a secret manager that injects values at run time would beat any file on disk. We don't need one until the project has real secrets.

The API reads the root `.env.development` and `.env`. The web app will use `apps/web/` (Vite's convention) once it needs variables, and the `.gitignore` exception for `.env.development` works at any depth. Vite compiles `VITE_*` values into the public bundle, so web env files never hold secrets.

## Scope

Web and API are workspaces in one monorepo, covered by one set of guardrails. Keeping every guardrail in the repo makes it visible, reviewed and versioned with the code, and it applies to anyone who clones, without relying on each machine's user settings. The cost: it protects only work in this repo. An agent started elsewhere, or a repo split out of this one, gets none of it, so splitting web and API into separate repos needs a new decision.
