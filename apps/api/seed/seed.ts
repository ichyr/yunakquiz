import { quizSchema, type QuizInput } from '@yunakquiz/core';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../src/db/client.ts';
import { categories, quizCategories, quizzes } from '../src/db/schema.ts';

/**
 * Inserts or updates each Quiz by slug, with its Categories. Safe to rerun.
 * Throws before writing anything if a Quiz breaks the content rules.
 */
export async function seed(db: Db, inputs: QuizInput[]) {
  const parsed = inputs.map((input) => quizSchema.parse(input));

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
