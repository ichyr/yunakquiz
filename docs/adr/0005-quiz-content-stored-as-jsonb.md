# Quiz content is stored as JSONB

A Quiz's Questions, Options and Explanations are stored in one JSONB column on `quizzes`, validated by the `quizSchema` in `packages/core`; Quiz metadata and Categories are ordinary columns and tables. We chose this over a table per Question and per Option because a Quiz is only ever read whole (ADR 0001), it is written only by the seed script from TypeScript files, and the zod schema already defines its shape, so tables would add joins and a mapping layer for no query we run.

Revisit when Questions need their own identity in the database: a Question Bank, randomly drawn Questions, or per-Question statistics (all on the roadmap). Moving then means a migration that splits the JSONB into `questions` and `options` rows, together with the stable Question ids in ADR 0006.

Update: Quizzes are no longer written only by the seed script. [ADR 0009](0009-quizzes-authored-in-app.md) supersedes that premise; the JSONB choice stands.
