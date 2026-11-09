# Fastify coding standards

- Build the app in a factory (`buildApp({ db, logger })`) that receives its dependencies, so each test creates its own instance.
- Group routes in a plugin registered with a prefix; don't attach routes to the root instance.
- Check params, query and body with a zod schema (`safeParse`) at the start of the handler, and answer 400 when the check fails. Use zod, not TypeBox.
- Handle errors in one place with `setErrorHandler`, and never send a 5xx error's details to the client.
- In the server, log with `request.log` or `app.log`, never `console`.
- Read environment variables through `env.ts`, and fail at startup when one is missing.
- `async` handlers return data. Call `reply.code(...).send(...)` only when the status isn't 200.
- Access the database through Drizzle only. Query functions live in modules such as `src/quizzes.ts`.
