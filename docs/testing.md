# Testing

- `packages/core`: Vitest unit tests.
- `apps/api`: Vitest with `app.inject()` against the real Postgres database from Docker Compose, not mocks.
- End to end: one Playwright test for the main path: search, take a Quiz, see the Review.
- CI: GitHub Actions on Linux runners.
