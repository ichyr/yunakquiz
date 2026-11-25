import type {
  Category,
  CategoryWithQuizzes,
  Question,
  QuizSummary,
  QuizView,
} from '@yunakquiz/core';
import { and, asc, eq, exists, ilike, or } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { categories, quizCategories, quizzes, users } from './db/schema.ts';

/**
 * Everything Guests can reach goes through this filter: lists, search, Categories and the Quiz
 * screen. A draft must never appear in any of them (ADR 0009).
 */
const published = eq(quizzes.status, 'published');

const categoryColumns = { slug: categories.slug, name: categories.name };

const summaryColumns = {
  slug: quizzes.slug,
  title: quizzes.title,
  description: quizzes.description,
  language: quizzes.language,
};

/** Categories that contain at least one published Quiz. */
export function listCategories(db: Db): Promise<Category[]> {
  return db
    .select(categoryColumns)
    .from(categories)
    .where(
      exists(
        db
          .select()
          .from(quizCategories)
          .innerJoin(quizzes, eq(quizzes.id, quizCategories.quizId))
          .where(and(eq(quizCategories.categoryId, categories.id), published)),
      ),
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
    .where(published)
    .orderBy(asc(quizzes.title));

  return { category: { slug: category.slug, name: category.name }, quizzes: categoryQuizzes };
}

/** Case-insensitive partial match on title or description. See ADR 0003. */
export function searchQuizzes(db: Db, query: string): Promise<QuizSummary[]> {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  return db
    .select(summaryColumns)
    .from(quizzes)
    .where(and(published, or(ilike(quizzes.title, pattern), ilike(quizzes.description, pattern))))
    .orderBy(asc(quizzes.title));
}

/** A published Quiz with its Author's display name. A draft is `null`, as if it did not exist. */
export async function findQuiz(db: Db, slug: string): Promise<QuizView | null> {
  const [quiz] = await db
    .select({ quiz: quizzes, authorName: users.displayName })
    .from(quizzes)
    .leftJoin(users, eq(users.id, quizzes.authorId))
    .where(and(eq(quizzes.slug, slug), published));
  if (!quiz) return null;

  const quizCategoryRows = await db
    .select(categoryColumns)
    .from(categories)
    .innerJoin(
      quizCategories,
      and(eq(quizCategories.categoryId, categories.id), eq(quizCategories.quizId, quiz.quiz.id)),
    )
    .orderBy(asc(categories.name));

  return {
    slug: quiz.quiz.slug,
    title: quiz.quiz.title,
    description: quiz.quiz.description,
    language: quiz.quiz.language,
    categories: quizCategoryRows,
    // A published Quiz passed quizSchema when it was published (or imported).
    questions: quiz.quiz.questions as Question[],
    author: quiz.authorName === null ? null : { displayName: quiz.authorName },
  };
}
