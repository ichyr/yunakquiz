# Design: MVP scaffold

## Implementation Decisions

### Modules

- **Core package** (framework-free, ADR 0002) owns the Quiz schemas and all Quiz logic. Its interface is small and deep:
  - `quizSchema` and friends (`categorySchema`, `quizSummarySchema`, `categoryWithQuizzesSchema`): the content rules and the API response shapes, used by the seed, the API tests and the web client.
  - `startAttempt(quiz, random?)` → `Attempt`: shuffles Questions and Options (Fisher–Yates), strips Correct Options. The random source is injectable for deterministic tests.
  - `chooseOption(attempt, questionId, optionId)` → new `Attempt`: immutable, throws on an Option that isn't part of the Question.
  - `canFinish(attempt)` → boolean.
  - `buildReview(attempt)` → `Review`: Score plus one item per Question in Attempt order; throws if any Question is unanswered.
  - `explanationParagraphs(text)` → string[].
- **API** (Fastify) is a thin, read-only layer: four resource routes plus health under `/api`. Query functions take the database handle explicitly; the app is built by a factory that takes the handle, so tests can inject a test database or an unreachable one.
- **Seed** validates every input with `quizSchema` before opening a transaction, then upserts Quizzes and Categories by slug and replaces each Quiz's Category links.
- **Web app** (React, React Router data router, TanStack Query, shadcn/ui, Tailwind, react-i18next). Route components stay thin: read params, call a query hook, render a view (ADR 0004). A `useAttempt` hook is the only state holder for an Attempt and delegates every rule to core. A `useLeaveGuard` hook combines the router blocker (in-app navigation, confirmed with a dialog) and `beforeunload` (tab close/reload).

### Data and schema

- Tables: `categories` (id, unique slug, name), `quizzes` (id, unique slug, title, description, language, `questions` JSONB), and the join table `quiz_categories` with cascade deletes (ADR 0005).
- GIN trigram indexes on Quiz title and description serve the `ILIKE` search (ADR 0003). The first migration enables `pg_trgm`.
- Questions and Options have no ids; an Attempt identifies them by position in the Quiz (ADR 0006). This is safe only because Attempts are never stored.

### API contract

| Route                       | Success                                                            | Failure                         |
| --------------------------- | ------------------------------------------------------------------ | ------------------------------- |
| `GET /api/categories`       | `Category[]`, non-empty only, by name                              | 500                             |
| `GET /api/categories/:slug` | `{ category, quizzes: QuizSummary[] }`, by title                   | 404                             |
| `GET /api/quizzes?q=`       | `QuizSummary[]`, by title                                          | 400 if blank                    |
| `GET /api/quizzes/:slug`    | whole `Quiz`, Correct Options and Explanations included (ADR 0001) | 404                             |
| `GET /api/health`           | `{ status: "ok" }`                                                 | 503 `{ status: "unavailable" }` |

Errors are `{ error: string }`; 5xx bodies are always the generic message.

### Web behaviour

- Addresses: `/`, `/search?q=`, `/categories/:slug`, `/quizzes/:slug`; they mirror the planned Expo Router files (ADR 0004).
- The Review replaces the Attempt inside the Quiz screen; there is no Review route.
- Once a Quiz has data, the screen renders the Attempt even if a background refetch fails, so an Attempt is never thrown away. The Attempt is keyed by slug.
- The client parses every response with the core schemas. Queries are fresh for 5 minutes; 404s are not retried.
- Interface Language: `uk` fallback, only `localStorage` is consulted (never the browser language), and the choice is cached there. `<html lang>` follows the Interface Language; Quiz content carries `lang` of its Quiz Language.
- Design tokens (colours, spacing, fonts) are defined once and shown in Storybook, next to a story for every component.

### Tooling

- pnpm workspaces; Node runs the API's TypeScript directly (type stripping), so the API has no build step.
- oxlint for lint, `tsc --noEmit` for types, Prettier, commitlint via Husky and CI, a script that fails when a component has no story.

## Testing Decisions

- A good test drives the module through its public interface and asserts what a scout or client would observe: which Questions and Options are offered, what the Score is, what an endpoint returns. Tests don't reach into internal state or mock our own modules.
- **Core** (Vitest): `quizSchema` content rules; `startAttempt` / `chooseOption` / `canFinish` / `buildReview` with a seeded random source so shuffles are repeatable; `explanationParagraphs`. This is the main seam for Attempt and Review rules.
- **API** (Vitest + Fastify `inject`, real Postgres from Docker Compose, its own `yunakquiz_test` database, reset and seeded before each test): every route's success and failure cases, search matching and escaping, seed rerun and all-or-nothing behaviour, and an app built against an unreachable database for 503/500 handling.
- **Main path** (one Playwright test, Pixel 7 viewport, against a seeded database): search from Home, open the Quiz, answer every Question using the seed file as the answer key, Finish, see a perfect Score and an Explanation for every Question.
- No component unit tests; Storybook stories cover visual states.

## Out of Scope

- Accounts, roles, authoring or editing Quizzes in the app.
- Storing Attempts, statistics, history.
- Question types other than single choice; rich text, images, video, audio.
- Tags, a Question Bank, randomly drawn Questions; stable Question ids.
- Search-as-you-type and relevance ranking.
- AI moderation of content.
- The React Native app and deployment to AWS. A container image for the API and a production server for the web build are not part of this change.

## Further Notes

- Not yet covered by any automated test: the leave confirmation (`quiz-attempt` › Leaving discards the Attempt after confirmation) and the remembered Interface Language (`interface-language` › Choosing the Interface Language). Both are browser behaviour, so the natural seam is Playwright; the project rule allows one Playwright test, so adding them is a decision to make, not a gap to fill silently.
- When stable Question ids arrive (ADR 0005/0006), `quiz-attempt` and `quiz-content` change together.
