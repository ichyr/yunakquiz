# Tasks

## 1. Decisions and docs

- [x] 1.1 Record ADRs 0004–0006 and add the Search screen to the MVP spec
- [x] 1.2 Add Ukrainian glossary terms; clarify leaving and Interface Language rules

## 2. Core

- [x] 2.1 Quiz schemas for content rules and API responses
- [x] 2.2 Attempt: shuffle, answer, canFinish
- [x] 2.3 Review: Score and per-Question items
- [x] 2.4 Explanation paragraph splitting
- [x] 2.5 Unit tests for all of the above

## 3. API and seed

- [x] 3.1 Drizzle schema, `pg_trgm` and initial migrations
- [x] 3.2 Routes: categories, category, search, quiz, health; generic 5xx bodies
- [x] 3.3 Rerunnable, all-or-nothing seed with the "Іван Богун" Quiz
- [x] 3.4 Docker Compose Postgres with a test database
- [x] 3.5 API tests against real Postgres

## 4. Web

- [x] 4.1 Layout, Interface Language switcher, i18n (`uk`, `en`)
- [x] 4.2 Home, Search, Category screens and Quiz lists
- [x] 4.3 Quiz screen: Attempt, leave guard, Review, Try again
- [x] 4.4 Loading, not found and error states
- [x] 4.5 Storybook stories for every component and the design tokens

## 5. Quality gates

- [x] 5.1 Playwright main-path test
- [x] 5.2 GitHub Actions: checks, tests, e2e
- [x] 5.3 Commitlint, oxlint, Prettier, story check

## 6. Follow-ups found in review

- [x] 6.1 Reject a Quiz Language that isn't a valid language tag
- [x] 6.2 Reject a Quiz that lists the same Category twice
- [ ] 6.3 Decide whether the leave confirmation and remembered Interface Language need automated tests
