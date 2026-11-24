# apps/web

React, TypeScript, Vite, Tailwind, shadcn/ui, react-i18next, Storybook. Mobile-first.

Before writing or reviewing code here, read [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Rules

- Every Interface Language string goes through i18n (`uk` default, `en`). Quiz content is never translated by the app.
- Every component has a Storybook story; route pages, which only read params and call hooks, are exempt. `pnpm check:stories` enforces it. Colours, spacing and fonts are shown in Storybook too.

## Routing

Home, Search, Category and Quiz load through the router's `lazy` property, one chunk each. The layout, not-found and error pages are eager. A chunk that fails to load shows the route error page, whose Retry reloads. Keep route pages thin so the chunk stays small (ADR 0004).

## Testing

Two Playwright specs in `e2e/`, run with `pnpm test:e2e`:

- `main-path.spec.ts`: search, take a Quiz, see the Review.
- `failure-paths.spec.ts`: offline and recovery, an Attempt carrying on offline, a broken link, and a failed request with Retry, and a screen that fails to load. Before going offline, a test opens every screen it will use offline (Search, for example), so its code is already loaded.
