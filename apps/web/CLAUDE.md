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

## Admin screens

The Admin screens (`routes/AdminUsersPage.tsx` and `api/admin.ts`) are one lazy chunk that `routes/AdminGate.tsx` loads with `React.lazy` only after `GET /me` shows an Admin, so Guests and Users never download it (ADR 0004). A router `lazy` route would fetch the chunk before the guard runs. Controls are hidden with the permission functions from core; the API is what refuses.

## Author screens

"My Quizzes", the Quiz editor and the draft preview (`routes/AuthorQuizzesPage.tsx`, `AuthorEditorPage.tsx`, `AuthorPreviewPage.tsx`, `api/authoring.ts`) are lazy chunks behind `routes/AuthorGate.tsx`, built like AdminGate: `React.lazy` inside an eager gate, so Guests download nothing. A Guest or an unverified Account sees `AuthorAccessNotice` with the reason. The gate reads `me.data`, which survives a failed refetch, so an expired session never unmounts the editor.

The editor (`components/QuizEditorForm.tsx`) is one React Hook Form with `draftQuizSchema` as resolver and `useFieldArray` for Questions and Options. Save works on incomplete content; Publish runs core's `validateForPublish` and shows each issue next to its field in the Interface Language (`quizIssueKind`/`quizIssueField` from core, text from `lib/useIssueText.ts`). A 401 keeps the form in memory and shows `SessionExpiredNotice` (log in, then the failed action retries); a 409 `version_conflict` shows `ConflictNotice`. Slug generation (`slugFromTitle`, `slugCandidate`) lives in core. Preview renders the draft through the real `QuizAttempt`.

The Playwright helpers `loginAsUser()` and `loginAsAdmin()` (`e2e/auth.ts`) make a verified Account through the test Account seed and save its session as `storageState`. `accounts.spec.ts` reads mail from LocalStack. Set `E2E_API_PORT`, `E2E_WEB_PORT` and `DATABASE_URL` when another checkout holds the default ports or database; the web server and the API both start from `playwright.config.ts`.
