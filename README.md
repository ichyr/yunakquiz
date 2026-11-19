# yunakquiz

A quiz platform for scouts. Take a quiz, read why each answer is right or wrong, and retake it until you get a perfect score.

- [MVP spec](docs/mvp-spec.md)
- [Glossary](GLOSSARY.md)
- [Architecture decisions](docs/adr/)

## Development setup

Requires [fnm](https://github.com/Schniz/fnm) (or any Node version manager that reads `.node-version`) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Postgres.

```sh
fnm install          # Node version from .node-version
corepack enable      # pnpm version from package.json
pnpm install         # also installs the commit-msg hook
pnpm db:up           # Postgres 18 in Docker, plus an empty yunakquiz_test database
pnpm db:seed         # applies migrations and loads the Quizzes in apps/api/seed/; safe to rerun
pnpm dev:api         # API on http://localhost:3000/api
pnpm dev:web         # in a second terminal: web app on http://localhost:5173, /api proxied to the API
```

Other web scripts: `pnpm build:web` (production build into `apps/web/dist`), `pnpm storybook` (http://localhost:6006) and `pnpm build-storybook`.

Local config needs no copying: the API's `dev`, `db:migrate` and `db:seed` scripts read the committed `.env.development` (non-secret defaults such as the Docker `DATABASE_URL`), then the gitignored `.env`, whose values win. Put real secrets, and any personal overrides, in `.env`; `.env.example` is its template.

The API runs TypeScript directly on Node (type stripping), with no build step. After changing `apps/api/src/db/schema.ts`, run `pnpm --filter @yunakquiz/api db:generate` to write a migration.

## Checks

- `pnpm lint`: [oxlint](https://oxc.rs/docs/guide/usage/linter), chosen for speed. It has no type-aware rules, so type errors are caught by `pnpm typecheck` (`tsc --noEmit`) instead.
- `pnpm format` / `pnpm format:check`: Prettier.
- `pnpm test`: unit and API tests across the workspace. API tests need `pnpm db:up` first; they use the `yunakquiz_test` database.
- `pnpm check:stories`: every web component, including installed shadcn/ui primitives, needs a Storybook story next to it. oxlint has no Storybook plugin, so `scripts/check-stories.mjs` enforces this.

## Claude Code sandbox

`.claude/settings.json` runs Claude Code's Bash commands, and everything they start, in its sandbox. `apps/web` and `apps/api` link to the same file, because Claude Code reads project settings only from the folder it starts in.

- Sandboxed commands can't read `.env` or `.env.*` at any depth (`.env.example` and `.env.development` stay readable), or credentials in your home folder such as `~/.ssh`, `~/.aws` and `~/.config/gh`. Claude's Read tool is denied `.env` and the same home paths.
- Sandboxed commands write only inside the folder Claude started in, temp folders, the pnpm store and the Playwright browser cache. They reach only npm, GitHub and the Playwright browser downloads. Localhost is open both ways: dev servers can listen, and the API reaches Postgres on `localhost:5432` directly.
- Sandbox paths without a leading `/` resolve from the folder Claude started in, so the `.env.*` block is an absolute pattern, and the `.env.example` and `.env.development` exceptions are listed both as `**/…` (start at the root) and as `../../…` (start in `apps/*`).
- `docker`, `pnpm db:up`, `gh`, `git push`, `git fetch` and `git pull` run outside the sandbox, after the usual permission prompt, since they need the Docker socket, `~/.config/gh` and `~/.ssh`. `pnpm db:up` is listed itself because the exclusion matches the command Claude runs, not the `docker` that pnpm starts.
- A denied `.env` looks missing to Node, so `--env-file-if-exists=../../.env` skips it with `.env not found. Continuing without it.` and the scripts run on `.env.development` alone. Inside the sandbox, `.env` overrides are therefore ignored; run the command yourself to use them.

## Acknowledgements

This project was built with help from [Matt Pocock's agent skills](https://github.com/mattpocock/skills).
