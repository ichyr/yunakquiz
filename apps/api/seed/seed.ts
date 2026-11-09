import { quizSchema, type Quiz, type QuizInput } from '@yunakquiz/core';
import { eq, notExists, notInArray, sql } from 'drizzle-orm';
import type { Db } from '../src/db/client.ts';
import { categories, quizCategories, quizzes } from '../src/db/schema.ts';

export interface SeedResult {
  added: number;
  updated: number;
  removed: number;
}

/**
 * Makes the database hold exactly these Quizzes and the Categories they use: inserts or updates
 * each Quiz by slug, with its Categories, then removes Quizzes missing from `inputs` and
 * Categories no Quiz uses. Safe to rerun.
 * Throws before writing anything if a Quiz breaks the content rules, or if two Quizzes give
 * one Category slug different names.
 */
export async function seed(db: Db, inputs: QuizInput[]): Promise<SeedResult> {
  const parsed = inputs.map((input) => quizSchema.parse(input));
  assertConsistentCategoryNames(parsed);

  return db.transaction(async (tx) => {
    const existing = new Set(
      (await tx.select({ slug: quizzes.slug }).from(quizzes)).map((q) => q.slug),
    );
    const wanted = parsed.map((quiz) => quiz.slug);
    let added = 0;

    for (const quiz of parsed) {
      if (!existing.has(quiz.slug)) added += 1;
      const { categories: quizCategoryList, ...fields } = quiz;
      const [quizRow] = await tx
        .insert(quizzes)
        .values(fields)
        .onConflictDoUpdate({
          target: quizzes.slug,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            language: sql`excluded.language`,
            questions: sql`excluded.questions`,
          },
        })
        .returning({ id: quizzes.id });
      const quizId = quizRow!.id;

      await tx.delete(quizCategories).where(eq(quizCategories.quizId, quizId));
      for (const category of quizCategoryList) {
        const [categoryRow] = await tx
          .insert(categories)
          .values(category)
          .onConflictDoUpdate({ target: categories.slug, set: { name: category.name } })
          .returning({ id: categories.id });
        await tx.insert(quizCategories).values({ quizId, categoryId: categoryRow!.id });
      }
    }

    // Attempts are never stored (ADR 0006) and links cascade, so deleting is safe.
    const removedRows = await tx
      .delete(quizzes)
      .where(wanted.length > 0 ? notInArray(quizzes.slug, wanted) : undefined)
      .returning({ id: quizzes.id });
    await tx
      .delete(categories)
      .where(
        notExists(
          tx.select().from(quizCategories).where(eq(quizCategories.categoryId, categories.id)),
        ),
      );

    return { added, updated: parsed.length - added, removed: removedRows.length };
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
