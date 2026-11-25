# MVP Spec

Terms in **bold** are defined in [GLOSSARY.md](../GLOSSARY.md).

## Goal

A scout takes a **Quiz**, finishes it, and sees a **Review** that explains every **Question**. Learning comes from repetition: scouts retake the Quiz, reading the **Explanations** each time, until they reach a perfect **Score**. The app is for learning only. It is not a formal assessment, so there is no pass/fail and no audit trail.

The product is generic, so any scouting organisation can use it.

## Content rules

- A **Quiz** has a title, a description, one **Quiz Language**, one or more **Categories**, and at least 1 **Question**.
- **Categories** are flat (no nesting). A Quiz may belong to many Categories.
- A **Question** has a prompt, at least 2 **Options** (no upper limit), exactly one **Correct Option**, and exactly one **Explanation**.
- All content is plain text. An Explanation may have several paragraphs, separated by a blank line.
- MVP question type: single choice only. True/false is single choice with two Options.

## Screens

1. **Home**: a search box, and the list of Categories that contain at least one Quiz.
2. **Search**: the search box, prefilled, and the Quizzes that match. Submitting the box on Home or here opens this screen at its own address, so a search can be shared as a link.
3. **Category**: the Quizzes in that Category.
4. **Quiz**: all Questions on one page.
   - Questions and the Options within each Question are shuffled on every **Attempt**.
   - The scout can answer in any order and change answers freely. No feedback is shown during the Attempt.
   - "Finish" is available only once every Question has an answer.
   - Leaving partway (closing the tab, navigating away) asks for confirmation, then discards the Attempt. Before the first answer nothing would be lost, so leaving does not ask.
5. **Review**: replaces the Quiz page at the same address, so it has no link of its own.
   - Shows the **Score**, e.g. `7 / 10`.
   - For every Question: the scout's chosen Option, the Correct Option highlighted, and the Explanation.
   - A "Try again" button starts a fresh Attempt. Retakes are unlimited.

Quiz lists and search results show each Quiz's title, description and Quiz Language badge.

## Search

- Matches against Quiz title and description (partial matches allowed).
- Covers all Quizzes, whatever their Quiz Language or the **Interface Language**.
- Runs when the scout submits the search box, not while typing. Search-as-you-type may come later.

## Languages

- Interface Language: Ukrainian (default) and English, through an i18n library. The app opens in Ukrainian whatever the browser's language; once a scout picks a language, that device remembers it.
- Quiz Language is independent of the Interface Language. Scouts can use their browser's translation for Quizzes in other languages.

## Out of scope for the MVP

- OAuth, SSO, MFA and passkeys. Accounts, roles and in-app Quiz authoring are no longer out of scope: see [ADR 0008](adr/0008-accounts-sessions-and-password-policy.md), [ADR 0009](adr/0009-quizzes-authored-in-app.md) and issue #70.
- Storing Attempts, statistics, history.
- Question types beyond single choice; rich text, images, video, audio.
- Tags, a Question Bank, randomly drawn Questions.
- AI moderation of content.
- React Native app; deployment (AWS planned later).

## Seed content

- One TypeScript file per Quiz, checked against the shared zod schema.
- The seed files are imported once as ownerless Quizzes. After that the database is the only source of truth for Quizzes ([ADR 0009](adr/0009-quizzes-authored-in-app.md)). The seed script creates dev and test fixtures only, can be rerun safely, and never deletes a Quiz it does not own.
- First Quiz: "Іван Богун" (Quiz Language `uk`), in Categories "Патрони куренів" and "Історія України". Editorial source: [docs/content/ivan-bohun.md](content/ivan-bohun.md).
