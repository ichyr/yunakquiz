import type { Category, CategoryWithQuizzes, Quiz, QuizSummary } from '@yunakquiz/core';
import { and, eq, exists, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { categories, quizCategories, quizzes } from './db/schema.ts';

/**
 * Lists follow Ukrainian alphabetical order (а б в г ґ д е є ж з и і ї й …) whatever the server's
 * default collation. The Compose image's musl libc sorts by code point, which puts і, ї, є and ґ
 * in the wrong place. An explicit ICU collation behaves the same locally, in CI and on AWS.
 */
const alphabetical = (column: Parameters<typeof sql>[1]): SQL => sql`${column} collate "uk-x-icu"`;

const summaryColumns = {
  slug: quizzes.slug,
  title: quizzes.title,
  description: quizzes.description,
  language: quizzes.language,
};

/** Categories that contain at least one Quiz. */
export function listCategories(db: Db): Promise<Category[]> {
  return db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(
      exists(db.select().from(quizCategories).where(eq(quizCategories.categoryId, categories.id))),
    )
    .orderBy(alphabetical(categories.name));
}

export async function findCategory(db: Db, slug: string): Promise<CategoryWithQuizzes | null> {
  const [category] = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.slug, slug));
  if (!category) return null;

  const categoryQuizzes = await db
    .select(summaryColumns)
    .from(quizzes)
    .innerJoin(
      quizCategories,
      and(eq(quizCategories.quizId, quizzes.id), eq(quizCategories.categoryId, category.id)),
    )
    .orderBy(alphabetical(quizzes.title));

  return { category: { slug: category.slug, name: category.name }, quizzes: categoryQuizzes };
}

/** Case-insensitive partial match on title or description. See ADR 0003. */
export function searchQuizzes(db: Db, query: string): Promise<QuizSummary[]> {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  return db
    .select(summaryColumns)
    .from(quizzes)
    .where(or(ilike(quizzes.title, pattern), ilike(quizzes.description, pattern)))
    .orderBy(alphabetical(quizzes.title));
}

export async function findQuiz(db: Db, slug: string): Promise<Quiz | null> {
  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.slug, slug) });
  if (!quiz) return null;

  const quizCategoryRows = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .innerJoin(
      quizCategories,
      and(eq(quizCategories.categoryId, categories.id), eq(quizCategories.quizId, quiz.id)),
    )
    .orderBy(alphabetical(categories.name));

  return {
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    language: quiz.language,
    categories: quizCategoryRows,
    questions: quiz.questions,
  };
}
