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
cp .env.example .env
pnpm db:up           # Postgres 18 in Docker, plus an empty yunakquiz_test database
pnpm db:seed         # applies migrations and loads the Quizzes in apps/api/seed/; safe to rerun
pnpm dev:api         # API on http://localhost:3000/api
```

The API runs TypeScript directly on Node (type stripping), with no build step. After changing `apps/api/src/db/schema.ts`, run `pnpm --filter @yunakquiz/api db:generate` to write a migration.

## Checks

- `pnpm lint`: [oxlint](https://oxc.rs/docs/guide/usage/linter), chosen for speed. It has no type-aware rules, so type errors are caught by `pnpm typecheck` (`tsc --noEmit`) instead.
- `pnpm format` / `pnpm format:check`: Prettier.
- `pnpm test`: unit and API tests across the workspace. API tests need `pnpm db:up` first; they use the `yunakquiz_test` database.
- Every web component, including installed shadcn/ui primitives, needs a Storybook story; a check script in CI enforces this.
