# Yunakquiz

A quiz platform for scouts. The point is learning: after each Attempt the scout sees a Review that explains every Question.

- Domain vocabulary: [GLOSSARY.md](GLOSSARY.md). Use these terms in code, UI copy and conversation; avoid the listed synonyms.
- What the MVP does: [docs/mvp-spec.md](docs/mvp-spec.md).
- Why things are the way they are: [docs/adr/](docs/adr/).
- Issue labels and the roadmap: [docs/contributing.md](docs/contributing.md).

## Workspaces

pnpm workspaces monorepo:

- `apps/web`: React app. See [apps/web/CLAUDE.md](apps/web/CLAUDE.md).
- `apps/api`: Fastify REST API. See [apps/api/CLAUDE.md](apps/api/CLAUDE.md).
- `packages/core`: Quiz logic and zod schemas. Plain TypeScript, no dependency on React or the DOM. Tested with Vitest unit tests.

## Rules

- Quiz logic (shuffling, scoring, building the Review) goes in `packages/core`, never in components or route handlers. See ADR 0002.
- The API returns Correct Options and Explanations; checking happens in the browser. See ADR 0001.
- When a skill disagrees with this repo's docs or an ADR, the repo wins.
- Bash runs in a sandbox: no reading `.env` or home credentials, network open to npm, GitHub and Playwright downloads, other hosts prompt. `docker`, `pnpm db:up`, `gh`, `git push`, `git fetch` and `git pull` run outside it, but only when run bare: a pipe (`| tail`), `&&`, `;` or a `cd … &&` prefix keeps the whole command sandboxed, and it then fails on `~/.ssh`. When a command fails on a blocked read or host, that is the sandbox, not a bug. See [ADR 0007](docs/adr/0007-agent-guardrails.md).

## Commands

- `pnpm db:up`: start Postgres in Docker Compose. Needed before `pnpm test`, since the API tests use the real database.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`: run across all workspaces. `pnpm test` first runs `pnpm test:guardrails`, the git-guard hook's tests.
- `pnpm check:stories`: checks every web component has a Storybook story.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), scoped by workspace. commitlint checks them; [commitlint.config.mjs](commitlint.config.mjs) lists the scopes.

## Pull requests

PR titles are Conventional Commits too. PR bodies follow [.github/pull_request_template.md](.github/pull_request_template.md), also when written with the `pr` skill: the template's Verification section takes the place of the skill's Evidence section and keeps its Before / After. `gh pr create --body` skips the template, so copy its sections into the body.
