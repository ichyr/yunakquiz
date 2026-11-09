# Yunakquiz

A quiz platform for scouts. The point is learning: after each Attempt the scout sees a Review that explains every Question.

- Domain vocabulary: [GLOSSARY.md](GLOSSARY.md). Use these terms in code, UI copy and conversation; avoid the listed synonyms.
- What the MVP does: [docs/mvp-spec.md](docs/mvp-spec.md).
- Why things are the way they are: [docs/adr/](docs/adr/).
- How to write React and Fastify code: [CODING_STANDARDS.md](CODING_STANDARDS.md).
- How to test: [docs/testing.md](docs/testing.md).

## Stack and layout

pnpm workspaces monorepo:

- `apps/web`: React, TypeScript, Vite, Tailwind, shadcn/ui, react-i18next (`uk` default, `en`), Storybook. Mobile-first.
- `apps/api`: Fastify, zod, Drizzle, PostgreSQL. REST + JSON. Seed Quizzes live in `apps/api/seed/`.
- `packages/core`: Quiz logic and zod schemas. Plain TypeScript, no dependency on React or the DOM.

## Rules

- Quiz logic (shuffling, scoring, building the Review) goes in `packages/core`, never in components or route handlers. See ADR 0002.
- The API returns Correct Options and Explanations; checking happens in the browser. See ADR 0001.
- Every Interface Language string goes through i18n. Quiz content is never translated by the app.
- Every web component has a Storybook story; route pages, which only read params and call hooks, are exempt. `pnpm check:stories` enforces it. Colours, spacing and fonts are shown in Storybook too.
- Keep everything container-friendly; AWS deployment is planned but not part of the MVP.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), scoped by workspace. commitlint checks them; [commitlint.config.mjs](commitlint.config.mjs) lists the scopes.

## Roadmap

Post-MVP work is tracked as GitHub Issues labelled `roadmap`; content fixes are labelled `content`.
