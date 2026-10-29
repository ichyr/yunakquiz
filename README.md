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
