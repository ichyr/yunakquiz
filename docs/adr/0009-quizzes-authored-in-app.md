# Quizzes are authored in the app; the database is the source of truth

Quizzes are written, edited, published and deleted by Authors in the app, and the database is the only source of truth for them. This supersedes the premise in ADR 0005 that a Quiz is "written only by the seed script from TypeScript files". The JSONB storage choice in ADR 0005 still stands; only who writes the column changes.

**Existing seed Quizzes are imported once** as ownerless Quizzes. After that the seed script creates dev and test fixtures only and never deletes a Quiz it does not own. This replaces the old rule in the MVP spec that the database matches the seed files; that rule would erase every authored Quiz on the next run.

**Drafts and publish.** A Quiz has a `status`, `draft` or `published`. A draft may be incomplete: core has a `draftQuizSchema` that allows partial content, and the full `quizSchema` is enforced on publish, which reports everything that is wrong at once. Lists, search and the Quiz screen show only published Quizzes. A draft is visible to its Author and to Admins, and its content is returned only to them. ADR 0001 still holds for published Quizzes: the API returns Correct Options and Explanations.

**Edits go live at once, with no version history.** We chose this over a copy-on-edit scheme because Attempts are never stored (ADR 0006), so changing a Quiz cannot corrupt anyone's history, and an Attempt in progress holds its own copy. Fixes reach scouts quickly. The cost is that a bad edit has no undo.

**Optimistic locking.** `quizzes` has a `version` column. A save sends the version it loaded; if the row has moved on, the API returns 409 and the editor tells the Author, instead of silently overwriting. We chose this over locks or last-write-wins because conflicts are rare and a lock needs cleanup when a tab is closed.

**Ownership.** `quizzes.author_id` is a nullable foreign key with `ON DELETE SET NULL`. When an Account is deleted, its Quizzes survive and become ownerless, like the seeded ones. Only Admins manage ownerless Quizzes. Deleting a Quiz is a hard delete after confirmation; there is no trash.

**Slugs.** The Author types a slug or presses a button that generates one from the title (Ukrainian transliterated, numeric suffix on conflict), with uniqueness checked live and on save. It is locked for Authors after first publish so shared links never break. Admins can override it.

**Limits** live in core: 100 Questions per Quiz, 10 Options per Question, 5,000 characters per text field. Categories are managed by Admins; Authors choose from existing ones.

Revisit when Authors need undo or review before going live: that means version history and a draft state for a published Quiz, which touches `version`, `status` and this ADR.
