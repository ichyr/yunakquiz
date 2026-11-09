import type { Category, CategoryWithQuizzes, Quiz, QuizSummary } from '@yunakquiz/core';
import { and, asc, eq, exists, ilike, or } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { categories, quizCategories, quizzes } from './db/schema.ts';

const categoryColumns = { slug: categories.slug, name: categories.name };

const summaryColumns = {
  slug: quizzes.slug,
  title: quizzes.title,
  description: quizzes.description,
  language: quizzes.language,
};

/** Categories that contain at least one Quiz. */
export function listCategories(db: Db): Promise<Category[]> {
  return db
    .select(categoryColumns)
    .from(categories)
    .where(
      exists(db.select().from(quizCategories).where(eq(quizCategories.categoryId, categories.id))),
    )
    .orderBy(asc(categories.name));
}

export async function findCategory(db: Db, slug: string): Promise<CategoryWithQuizzes | null> {
  const [category] = await db
    .select({ id: categories.id, ...categoryColumns })
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
    .orderBy(asc(quizzes.title));

  return { category: { slug: category.slug, name: category.name }, quizzes: categoryQuizzes };
}

/** Case-insensitive partial match on title or description. See ADR 0003. */
export function searchQuizzes(db: Db, query: string): Promise<QuizSummary[]> {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  return db
    .select(summaryColumns)
    .from(quizzes)
    .where(or(ilike(quizzes.title, pattern), ilike(quizzes.description, pattern)))
    .orderBy(asc(quizzes.title));
}

export async function findQuiz(db: Db, slug: string): Promise<Quiz | null> {
  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.slug, slug) });
  if (!quiz) return null;

  const quizCategoryRows = await db
    .select(categoryColumns)
    .from(categories)
    .innerJoin(
      quizCategories,
      and(eq(quizCategories.categoryId, categories.id), eq(quizCategories.quizId, quiz.id)),
    )
    .orderBy(asc(categories.name));

  return {
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    language: quiz.language,
    categories: quizCategoryRows,
    questions: quiz.questions,
  };
}
