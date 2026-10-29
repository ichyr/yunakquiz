# yunakquiz

A quiz platform for scouts. Take a quiz, read why each answer is right or wrong, and retake it until you get a perfect score.

- [MVP spec](docs/mvp-spec.md)
- [Glossary](GLOSSARY.md)
- [Architecture decisions](docs/adr/)

## Development setup

Requires [fnm](https://github.com/Schniz/fnm) (or any Node version manager that reads `.node-version`).

```sh
fnm install          # Node version from .node-version
corepack enable      # pnpm version from package.json
pnpm install         # also installs the commit-msg hook
```

## Checks

- `pnpm lint`: [oxlint](https://oxc.rs/docs/guide/usage/linter), chosen for speed. It has no type-aware rules, so type errors are caught by `pnpm typecheck` (`tsc --noEmit`) instead.
- `pnpm format` / `pnpm format:check`: Prettier.
- `pnpm test`: unit and API tests across the workspace.
- Every web component, including installed shadcn/ui primitives, needs a Storybook story; a check script in CI enforces this.
