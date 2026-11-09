import { quizSchema, type Quiz, type QuizInput } from '@yunakquiz/core';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../src/db/client.ts';
import { categories, quizCategories, quizzes } from '../src/db/schema.ts';

/**
 * Inserts or updates each Quiz by slug, with its Categories. Safe to rerun.
 * Throws before writing anything if a Quiz breaks the content rules, or if two Quizzes give
 * one Category slug different names.
 */
export async function seed(db: Db, inputs: QuizInput[]) {
  const parsed = inputs.map((input) => quizSchema.parse(input));
  assertConsistentCategoryNames(parsed);

  await db.transaction(async (tx) => {
    for (const quiz of parsed) {
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
  });

  return parsed.length;
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
