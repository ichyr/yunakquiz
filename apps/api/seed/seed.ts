import { quizSchema, type Quiz, type QuizInput } from '@yunakquiz/core';
import { eq } from 'drizzle-orm';
import type { Db } from '../src/db/client.ts';
import { categories, quizCategories, quizzes } from '../src/db/schema.ts';

export interface SeedResult {
  added: number;
  /** Quizzes already in the database, left exactly as they are. */
  skipped: number;
}

/**
 * Imports the Quizzes that are not in the database yet, as ownerless published Quizzes, with
 * their Categories. The database is the source of truth (ADR 0009): a Quiz that already exists
 * is never updated, so edits made in the app survive, and nothing is ever deleted, so Quizzes
 * written in the app survive too. Safe to rerun.
 * Throws before writing anything if a Quiz breaks the content rules, or if two Quizzes give
 * one Category slug different names.
 */
export async function seed(
  db: Db,
  inputs: QuizInput[],
  now: Date = new Date(),
): Promise<SeedResult> {
  const parsed = inputs.map((input) => quizSchema.parse(input));
  assertConsistentCategoryNames(parsed);

  return db.transaction(async (tx) => {
    let added = 0;
    for (const quiz of parsed) {
      const { categories: quizCategoryList, ...fields } = quiz;
      const [quizRow] = await tx
        .insert(quizzes)
        .values({
          ...fields,
          authorId: null,
          status: 'published',
          publishedAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: quizzes.slug })
        .returning({ id: quizzes.id });
      if (!quizRow) continue;
      added += 1;

      for (const category of quizCategoryList) {
        // An existing Category keeps the name it has now.
        await tx
          .insert(categories)
          .values(category)
          .onConflictDoNothing({ target: categories.slug });
        const [categoryRow] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, category.slug));
        await tx.insert(quizCategories).values({ quizId: quizRow.id, categoryId: categoryRow!.id });
      }
    }
    return { added, skipped: parsed.length - added };
  });
}

/** A Category's name must not depend on which Quiz the seed happens to write last. */
function assertConsistentCategoryNames(parsedQuizzes: Quiz[]) {
  const names = new Map<string, { name: string; quiz: string }>();
  for (const quiz of parsedQuizzes) {
    for (const { slug, name } of quiz.categories) {
      const first = names.get(slug);
      if (first === undefined) {
        names.set(slug, { name, quiz: quiz.slug });
      } else if (first.name !== name) {
        throw new Error(
          `Category "${slug}" is named "${first.name}" in Quiz "${first.quiz}" but "${name}" in Quiz "${quiz.slug}"`,
        );
      }
    }
  }
}
