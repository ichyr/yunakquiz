# apps/api

Fastify, zod, Drizzle, PostgreSQL. REST + JSON.

Before writing or reviewing code here, read [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Database

- The database is the only source of truth for Quizzes (ADR 0009). Seed Quizzes live in `seed/`; `pnpm db:seed` imports each one once, as an ownerless published Quiz, and skips any slug that exists. It never updates or deletes a Quiz or Category, so edits and Quizzes written in the app survive a rerun. Do not add code that makes the seed delete.
- After changing the Drizzle schema, run `pnpm db:generate`, then `pnpm db:migrate`.

## Testing

Vitest with `app.inject()` against the real Postgres database from Docker Compose, not mocks. Run `pnpm db:up` from the repo root first.

### Port 5432 is taken

Another Postgres (often the repo's own `yunakquiz-postgres-1`) may already run, so `pnpm db:up` fails on the port. Reuse it and give your ticket its own databases. Do not invent names.

- `pnpm db:test-db create <ticket>` makes `yunakquiz_test_<ticket>` and `yunakquiz_e2e_<ticket>`. `<ticket>` is lowercase letters, digits and underscores, such as `84` or `79fix`. It connects through `DATABASE_URL`, to the `postgres` database; it needs no `docker exec`. It refuses any name outside `^yunakquiz_(test|e2e)_[a-z0-9_]+$`, so it never touches `yunakquiz` or `yunakquiz_test`.
- API tests: `TEST_DATABASE_URL=postgres://yunakquiz:yunakquiz@localhost:5432/yunakquiz_test_<ticket> pnpm test`. No seeding: `test/global-setup.ts` migrates, and each test builds its own fixtures.
- e2e: use `yunakquiz_e2e_<ticket>`, never the test database, because the API tests truncate tables and would wipe the e2e data. Prepare it with an environment variable, which beats the `--env-file` value:

  ```
  DATABASE_URL=postgres://yunakquiz:yunakquiz@localhost:5432/yunakquiz_e2e_<ticket> pnpm db:migrate
  DATABASE_URL=postgres://yunakquiz:yunakquiz@localhost:5432/yunakquiz_e2e_<ticket> pnpm db:seed
  ```

- When you finish, run `pnpm db:test-db drop <ticket>`. `drop` closes any connection still open on those databases, and dropping a database that does not exist is not an error.

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
- `pnpm db:cleanup-unverified` deletes Accounts unverified for 7 days (`src/cleanup.ts`). Run it daily from a scheduler (cron, EventBridge) with `DATABASE_URL` set; it prints how many it removed. Nothing schedules it yet: the deploy must run it daily (#10).
- `pnpm db:seed:test-account --email … --name … --password …` creates a verified Account for e2e. It refuses to run in production.

## Admin

- Roles and Admin routes: `src/admin.ts` (all under `/api/admin`, 403 for anyone but a verified Admin), `src/admin-users.ts` (list, role change, deletion). Rules are the pure functions in `packages/core/src/permissions.ts`; the route loads actor and target, calls them, maps denial to 403.
- Every change to who is an Admin (promote, demote, delete, the first-Admin seed) takes `lockAdminChanges(tx)` first, a Postgres advisory lock, and reads the Admin count and the actor under it. New code that deletes or demotes an Account must take the same lock, or the last-Admin rule is no longer race-safe.
- Admin actions are logged with `event: "admin_action"`, ids only: never emails, passwords or cookies.
- `REGISTRATION_MODE=open|closed` (`src/registration-mode.ts`; closed answers 403 `registration_closed` on `/api/register`). `pnpm --filter @yunakquiz/api db:seed:admin` creates the first Admin from `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_NAME` and `FIRST_ADMIN_PASSWORD`; it runs in production and does nothing when an Admin exists.

## Quizzes and authoring

- `quizzes` has `author_id` (nullable, `ON DELETE SET NULL`), `status` (`draft`|`published`, no default on purpose), `version`, `published_at`, `updated_at`. Every path that deletes an Account (self, Admin, unverified cleanup) leaves its Quizzes ownerless; keep it so.
- Guests: every public query (`src/quizzes.ts`: Category list, Category page, search, Quiz screen) filters `status = 'published'` through one `published` condition. A new public query must use it. Draft content leaves the API only through `/api/authoring` to its Author and Admins.
- `GET /api/authoring/categories` lists every Category (the public `/categories` hides those with no published Quiz); the editor and the draft preview use it. An Admin who saves, publishes or deletes a Quiz they do not own is logged as `admin_action` (`save_quiz`, `publish_quiz`, `delete_quiz`; ids and slug only).
- Authoring routes: `src/authoring.ts`, data in `src/authoring-quizzes.ts`, under `/api/authoring`. 401 for Guests, 403 `verification_required` for unverified Accounts (checked in a hook before any body is read, so the 16 MiB body limit is reachable only by verified Accounts). Permissions are the core functions (`canEditQuiz`, `canChangeSlug`, ...).
- A draft the actor may not see answers 404, the same as a missing slug, on read, save, publish and delete; a published Quiz they may not change answers 403. Do not add a route that tells the two apart for drafts. Slug uniqueness is global, so `slug_taken` and the slug check do reveal that a slug is in use.
- Writes lock the row with `FOR UPDATE`, then check permission, `version` (409 `version_conflict` with `currentVersion`) and the slug rule (403 `slug_locked` after first publish, Admins excepted). A published Quiz is saved only if it still passes `quizSchema` (422 `invalid_quiz` with `issues`), so Guests never get a broken Quiz. Publish stores the parsed content (canonical language).
- Limits (100 Questions, 10 Options, 5,000 characters, 20 Categories) are in core and checked on every write.
