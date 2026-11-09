# Coding standards

When a skill disagrees with this document, [CLAUDE.md](CLAUDE.md) or an [ADR](docs/adr/), the repo wins.

## React (Vite)

`apps/web` follows these rules:

- Start independent requests in parallel; never await them one after another. ([async-parallel](.agents/skills/vercel-react-best-practices/rules/async-parallel.md))
- Import from the module itself, not through a barrel file. ([bundle-barrel-imports](.agents/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md))
- Load routes lazily. ([bundle-dynamic-imports](.agents/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md))
- Compute derived state while rendering; never sync it with an effect. ([rerender-derived-state-no-effect](.agents/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md))
- Never define a component inside another component. ([rerender-no-inline-components](.agents/skills/vercel-react-best-practices/rules/rerender-no-inline-components.md))
- Use functional `setState` when the next state depends on the previous one. ([rerender-functional-setstate](.agents/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md))
- Use variants or composition instead of piles of boolean props. ([architecture-avoid-boolean-props](.agents/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md))

The full rule sets are in [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/SKILL.md) and [vercel-composition-patterns](.agents/skills/vercel-composition-patterns/SKILL.md). This is a Vite app, so the `server-*` rules and other Next.js-only rules don't apply.

UI changes are checked against [web-design-guidelines](.agents/skills/web-design-guidelines/SKILL.md).

## Node.js / Fastify

`apps/api` follows these rules:

- Build the app in a factory (`buildApp({ db, logger })`) that receives its dependencies, so each test creates its own instance.
- Group routes in a plugin registered with a prefix; don't attach routes to the root instance.
- Check params, query and body with a zod schema (`safeParse`) at the start of the handler, and answer 400 when the check fails. Use zod, not TypeBox.
- Handle errors in one place with `setErrorHandler`, and never send a 5xx error's details to the client.
- In the server, log with `request.log` or `app.log`, never `console`.
- Read environment variables through `env.ts`, and fail at startup when one is missing.
- `async` handlers return data. Call `reply.code(...).send(...)` only when the status isn't 200.
- Access the database through Drizzle only. Query functions live in modules such as `apps/api/src/quizzes.ts`.
- Test with Vitest and `app.inject()` against the real Postgres database from Docker Compose. No mocks.
