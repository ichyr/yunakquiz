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
2. **Category**: the Quizzes in that Category.
3. **Quiz**: all Questions on one page.
   - Questions and the Options within each Question are shuffled on every **Attempt**.
   - The scout can answer in any order and change answers freely. No feedback is shown during the Attempt.
   - "Finish" is available only once every Question has an answer.
   - Leaving partway (closing the tab, navigating away) asks for confirmation, then discards the Attempt.
4. **Review**: replaces the Quiz page at the same address, so it has no link of its own.
   - Shows the **Score**, e.g. `7 / 10`.
   - For every Question: the scout's chosen Option, the Correct Option highlighted, and the Explanation.
   - A "Try again" button starts a fresh Attempt. Retakes are unlimited.

Quiz lists and search results show each Quiz's title, description and Quiz Language badge.

## Search

- Matches against Quiz title and description (partial matches allowed).
- Covers all Quizzes, whatever their Quiz Language or the **Interface Language**.

## Languages

- Interface Language: Ukrainian (default) and English, through an i18n library.
- Quiz Language is independent of the Interface Language. Scouts can use their browser's translation for Quizzes in other languages.

## Out of scope for the MVP

- Accounts, roles, and authoring or editing Quizzes in the app. Quizzes are seeded from files in the repo.
- Storing Attempts, statistics, history.
- Question types beyond single choice; rich text, images, video, audio.
- Tags, a Question Bank, randomly drawn Questions.
- AI moderation of content.
- React Native app; deployment (AWS planned later).

## Seed content

- One TypeScript file per Quiz, checked against the shared zod schema.
- Loaded by a seed script that can be rerun safely.
- First Quiz: "Іван Богун", in Categories "Патрони куренів" and "Історія України".
