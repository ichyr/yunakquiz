import {
  AUTHORING_PAGE_SIZE,
  canChangeSlug,
  canEditQuiz,
  isAdmin,
  validateForPublish,
  type Actor,
  type AuthoringQuiz,
  type AuthoringQuizPage,
  type DraftQuiz,
  type QuizIssue,
} from '@yunakquiz/core';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { categories, quizCategories, quizzes, users } from './db/schema.ts';
import { uniqueViolation } from './users.ts';

/**
 * Quiz authoring: the data side of /api/authoring. Reads and writes of one Quiz happen in a
 * transaction on the row locked with `FOR UPDATE`, so the permission check, the version check and
 * the write see the same row. A Quiz the actor may not see answers `not_found` while it is a
 * draft, so a refusal never confirms that a draft exists. Reasons: ADR 0009.
 */

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type QuizRow = typeof quizzes.$inferSelect;

export type AuthoringFailure =
  | { ok: false; reason: 'not_found' | 'forbidden' | 'slug_taken' | 'slug_locked' }
  | { ok: false; reason: 'unknown_category'; slugs: string[] }
  | { ok: false; reason: 'version_conflict'; currentVersion: number }
  | { ok: false; reason: 'invalid_quiz'; issues: QuizIssue[] };
export type AuthoringResult<T = AuthoringQuiz> = { ok: true; value: T } | AuthoringFailure;

const ok = <T>(value: T) => ({ ok: true, value }) as const;

/** The Actor must be able to see the Quiz, or the answer is the same as for a missing one. */
function refusal(actor: Actor, row: QuizRow): AuthoringFailure | null {
  if (canEditQuiz(actor, row)) return null;
  // A published Quiz is public, so refusing to change it reveals nothing.
  return { ok: false, reason: row.status === 'published' ? 'forbidden' : 'not_found' };
}

async function toView(db: Db | Tx, row: QuizRow): Promise<AuthoringQuiz> {
  const [categoryRows, [author]] = await Promise.all([
    db
      .select({ slug: categories.slug })
      .from(categories)
      .innerJoin(quizCategories, eq(quizCategories.categoryId, categories.id))
      .where(eq(quizCategories.quizId, row.id))
      .orderBy(categories.name),
    row.authorId === null
      ? Promise.resolve([])
      : db.select({ displayName: users.displayName }).from(users).where(eq(users.id, row.authorId)),
  ]);
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    language: row.language,
    categories: categoryRows.map((category) => category.slug),
    questions: row.questions as DraftQuiz['questions'],
    status: row.status,
    version: row.version,
    authorId: row.authorId,
    author: author ? { displayName: author.displayName } : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function lockQuiz(tx: Tx, slug: string): Promise<QuizRow | undefined> {
  const [row] = await tx.select().from(quizzes).where(eq(quizzes.slug, slug)).for('update');
  return row;
}

async function findMissingCategories(tx: Tx, slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const found = await tx
    .select({ slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, slugs));
  const known = new Set(found.map((category) => category.slug));
  return slugs.filter((slug) => !known.has(slug));
}

async function setCategories(tx: Tx, quizId: number, slugs: string[]) {
  await tx.delete(quizCategories).where(eq(quizCategories.quizId, quizId));
  if (slugs.length === 0) return;
  const rows = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.slug, slugs));
  await tx.insert(quizCategories).values(rows.map((row) => ({ quizId, categoryId: row.id })));
}

async function categoryNames(tx: Tx, slugs: string[]): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await tx
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(inArray(categories.slug, slugs));
  return new Map(rows.map((row) => [row.slug, row.name]));
}

export function createDraft(
  db: Db,
  actor: Actor,
  draft: DraftQuiz,
  now: Date,
): Promise<AuthoringResult> {
  return db.transaction(async (tx): Promise<AuthoringResult> => {
    const missing = await findMissingCategories(tx, draft.categories);
    if (missing.length > 0) return { ok: false, reason: 'unknown_category', slugs: missing };
    try {
      const [row] = await tx
        .insert(quizzes)
        .values({
          slug: draft.slug,
          title: draft.title,
          description: draft.description,
          language: draft.language,
          questions: draft.questions,
          authorId: actor.id,
          status: 'draft',
          updatedAt: now,
        })
        .returning();
      await setCategories(tx, row!.id, draft.categories);
      return ok(await toView(tx, row!));
    } catch (error) {
      if (uniqueViolation(error) !== undefined) return { ok: false, reason: 'slug_taken' };
      throw error;
    }
  });
}

export function readQuiz(db: Db, actor: Actor, slug: string): Promise<AuthoringResult> {
  return db.transaction(async (tx): Promise<AuthoringResult> => {
    const [row] = await tx.select().from(quizzes).where(eq(quizzes.slug, slug));
    if (!row) return { ok: false, reason: 'not_found' };
    return refusal(actor, row) ?? ok(await toView(tx, row));
  });
}

export function listQuizzes(db: Db, actor: Actor, page: number): Promise<AuthoringQuizPage> {
  // Admins see every Quiz; everyone else only their own.
  const where = isAdmin(actor) ? undefined : eq(quizzes.authorId, actor.id);
  return db.transaction(async (tx) => {
    const [rows, [total]] = await Promise.all([
      tx
        .select({
          slug: quizzes.slug,
          title: quizzes.title,
          language: quizzes.language,
          status: quizzes.status,
          version: quizzes.version,
          publishedAt: quizzes.publishedAt,
          updatedAt: quizzes.updatedAt,
          authorName: users.displayName,
        })
        .from(quizzes)
        .leftJoin(users, eq(users.id, quizzes.authorId))
        .where(where)
        .orderBy(desc(quizzes.updatedAt), desc(quizzes.id))
        .limit(AUTHORING_PAGE_SIZE)
        .offset((page - 1) * AUTHORING_PAGE_SIZE),
      tx.select({ value: count() }).from(quizzes).where(where),
    ]);
    return {
      items: rows.map(({ authorName, publishedAt, updatedAt, ...row }) => ({
        ...row,
        author: authorName === null ? null : { displayName: authorName },
        publishedAt: publishedAt?.toISOString() ?? null,
        updatedAt: updatedAt.toISOString(),
      })),
      total: total?.value ?? 0,
      page,
      pageSize: AUTHORING_PAGE_SIZE,
    };
  });
}

/** A published Quiz is saved only when it still passes the full rules: Guests must never see a broken one. */
export function saveQuiz(
  db: Db,
  actor: Actor,
  slug: string,
  input: DraftQuiz & { version: number },
  now: Date,
): Promise<AuthoringResult> {
  return db.transaction(async (tx): Promise<AuthoringResult> => {
    const row = await lockQuiz(tx, slug);
    if (!row) return { ok: false, reason: 'not_found' };
    const denied = refusal(actor, row);
    if (denied) return denied;
    if (row.version !== input.version) {
      return { ok: false, reason: 'version_conflict', currentVersion: row.version };
    }
    if (
      input.slug !== row.slug &&
      !canChangeSlug(actor, { authorId: row.authorId, everPublished: row.publishedAt !== null })
    ) {
      return { ok: false, reason: 'slug_locked' };
    }
    const missing = await findMissingCategories(tx, input.categories);
    if (missing.length > 0) return { ok: false, reason: 'unknown_category', slugs: missing };

    let content: Pick<QuizRow, 'title' | 'description' | 'language' | 'questions'> = input;
    if (row.status === 'published') {
      const checked = validateForPublish(input, await categoryNames(tx, input.categories));
      if (!checked.ok) return { ok: false, reason: 'invalid_quiz', issues: checked.issues };
      content = checked.quiz;
    }
    try {
      const [updated] = await tx
        .update(quizzes)
        .set({
          slug: input.slug,
          title: content.title,
          description: content.description,
          language: content.language,
          questions: content.questions,
          version: row.version + 1,
          updatedAt: now,
        })
        .where(eq(quizzes.id, row.id))
        .returning();
      await setCategories(tx, row.id, input.categories);
      return ok(await toView(tx, updated!));
    } catch (error) {
      if (uniqueViolation(error) !== undefined) return { ok: false, reason: 'slug_taken' };
      throw error;
    }
  });
}

/** Validates the whole Quiz and, only if it passes, makes it public. Reports every problem at once. */
export function publishQuiz(
  db: Db,
  actor: Actor,
  slug: string,
  version: number,
  now: Date,
): Promise<AuthoringResult> {
  return db.transaction(async (tx): Promise<AuthoringResult> => {
    const row = await lockQuiz(tx, slug);
    if (!row) return { ok: false, reason: 'not_found' };
    const denied = refusal(actor, row);
    if (denied) return denied;
    if (row.version !== version) {
      return { ok: false, reason: 'version_conflict', currentVersion: row.version };
    }
    const current = await toView(tx, row);
    const checked = validateForPublish(
      {
        slug: row.slug,
        title: row.title,
        description: row.description,
        language: row.language,
        categories: current.categories,
        questions: current.questions,
      },
      await categoryNames(tx, current.categories),
    );
    if (!checked.ok) return { ok: false, reason: 'invalid_quiz', issues: checked.issues };
    const [updated] = await tx
      .update(quizzes)
      .set({
        title: checked.quiz.title,
        description: checked.quiz.description,
        language: checked.quiz.language,
        questions: checked.quiz.questions,
        status: 'published',
        publishedAt: row.publishedAt ?? now,
        version: row.version + 1,
        updatedAt: now,
      })
      .where(eq(quizzes.id, row.id))
      .returning();
    return ok(await toView(tx, updated!));
  });
}

export function deleteQuiz(db: Db, actor: Actor, slug: string): Promise<AuthoringResult<null>> {
  return db.transaction(async (tx): Promise<AuthoringResult<null>> => {
    const row = await lockQuiz(tx, slug);
    if (!row) return { ok: false, reason: 'not_found' };
    const denied = refusal(actor, row);
    if (denied) return denied;
    // Links go with it (ON DELETE CASCADE). Attempts are never stored (ADR 0006).
    await tx.delete(quizzes).where(eq(quizzes.id, row.id));
    return ok(null);
  });
}

/** Whether the slug is free for this Actor. Their own Quiz keeps its own slug. */
export async function slugAvailable(
  db: Db,
  actor: Actor,
  slug: string,
  currentSlug: string | undefined,
): Promise<boolean> {
  const [row] = await db.select().from(quizzes).where(eq(quizzes.slug, slug));
  if (!row) return true;
  return slug === currentSlug && canEditQuiz(actor, row);
}

/** For the Admin Account list: how many Quizzes each Account wrote, drafts included. */
export const quizCountOf = sql<number>`(select count(*)::int from ${quizzes} where ${quizzes.authorId} = "users"."id")`;
