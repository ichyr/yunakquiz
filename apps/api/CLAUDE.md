# apps/api

Fastify, zod, Drizzle, PostgreSQL. REST + JSON.

Before writing or reviewing code here, read [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Database

- Seed Quizzes live in `seed/`; load them with `pnpm db:seed`.
- After changing the Drizzle schema, run `pnpm db:generate`, then `pnpm db:migrate`.

## Testing

Vitest with `app.inject()` against the real Postgres database from Docker Compose, not mocks. Run `pnpm db:up` from the repo root first.

## Mail

- Code sends mail through the `Mailer` interface (`src/mailer.ts`). `buildApp` takes a `mailer`; tests get a fake with an `outbox` per app instance, `server.ts` the SES one.
- Dev mail goes to LocalStack SES (started by `pnpm db:up`). `pnpm mail:last [email]` prints the latest mail; it is a dev convenience, never used in tests.
- Every test that checks mail uses a unique recipient, such as `user-${randomUUID()}@test.local`, and reads it with `waitForMail(recipient)` from `test/mail.ts`, never "the latest mail". That keeps tests parallel-safe.
- Env: `MAIL_FROM` (required), `AWS_REGION`, `AWS_ENDPOINT_URL` (dev only), AWS credentials. Dev defaults are in `.env.development`.
- The LocalStack image is pinned. Read [docs/localstack-licence.md](../../docs/localstack-licence.md) before changing it.

## Auth

- Design: ADR 0008 and 0010, hashing in [docs/password-hashing.md](../../docs/password-hashing.md). Code: `src/auth.ts` (routes, sessions), `src/passwords.ts` (argon2id and pepper), `src/users.ts` (`createUser`, the one way an Account is made).
- `buildApp` needs `passwordPeppers` (`PASSWORD_PEPPERS=v2:<secret>,v1:<secret>`, secrets at least 16 characters) and throws without it. The dev pepper is in `.env.development`; production sets its own.
- Mutating routes need the `X-Requested-With` header (any value). Other env: `WEB_BASE_URL` (mailed links), `CORS_ORIGINS` (comma-separated allowlist, unset means same origin), `NODE_ENV` (the Secure cookie and the test Account seed treat anything but an explicit `development` or `test` as production; `.env.development` sets `development`).
- Tests build apps with `buildAuthApp` from `test/app.ts`: fake Mailer, movable clock (`advance`), a unique recipient from `uniqueEmail()`.
- Self-service changes (display name, password, email, delete) are in `src/account.ts`; the session lookup they share with `auth.ts` is `src/session.ts`. Password, email and delete need the current password, limited per Account. An email change always answers 202 (a taken address gets the "you already have an Account" mail instead of a link) and takes effect only on `POST /api/account/email/confirm`.
- `pnpm db:cleanup-unverified` deletes Accounts unverified for 7 days (`src/cleanup.ts`). Run it daily from a scheduler (cron, EventBridge) with `DATABASE_URL` set; it prints how many it removed.
- `pnpm db:seed:test-account --email … --name … --password …` creates a verified Account for e2e. It refuses to run in production.
