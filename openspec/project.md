# Project Context

## Purpose

Yunakquiz is a quiz platform for scouts from any scouting organisation. A scout takes a Quiz, finishes the Attempt and reads a Review that explains every Question, then retakes the Quiz until the Score is perfect. It is for learning only: no pass or fail, no stored Attempts.

## Sources of truth

- Domain vocabulary: `GLOSSARY.md`. Specs use these terms (Quiz, Category, Question, Option, Correct Option, Explanation, Attempt, Score, Review, Quiz Language, Interface Language) and avoid the listed synonyms.
- Product scope: `docs/mvp-spec.md`.
- Decisions and their reasons: `docs/adr/`. A spec requirement that depends on an ADR names it.
- Engineering rules, stack, commit and testing conventions: `CLAUDE.md`.

## How specs are organised

- `openspec/specs/<capability>/spec.md` describes how the system behaves today, one capability per folder.
- `openspec/changes/<change-id>/` proposes a change: `proposal.md` (why and what), `design.md` (decisions), `tasks.md`, and spec deltas under `specs/<capability>/spec.md` using `## ADDED`, `## MODIFIED`, `## REMOVED` or `## RENAMED Requirements`.
- Finished changes move to `openspec/changes/archive/<date>-<change-id>/` and their deltas are merged into `openspec/specs/`.

## Capabilities

| Capability           | Covers                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `quiz-content`       | Content rules for Quizzes, and the seed that loads them                 |
| `quiz-api`           | The REST contract the web app reads                                     |
| `catalog-browsing`   | Home and Category screens, Quiz lists                                   |
| `quiz-search`        | Searching Quizzes by title and description                              |
| `quiz-attempt`       | Taking a Quiz: shuffling, answering, Finish, leaving                    |
| `quiz-review`        | The Review: Score, chosen and Correct Options, Explanations, Try again  |
| `interface-language` | Ukrainian and English Interface Languages, independent of Quiz Language |
