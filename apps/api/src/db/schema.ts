import type { Question } from '@yunakquiz/core';
import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  name: text().notNull(),
});

export const quizzes = pgTable(
  'quizzes',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull(),
    language: text().notNull(),
    // Validated by quizSchema in @yunakquiz/core. See ADR 0005.
    questions: jsonb().$type<Question[]>().notNull(),
  },
  (table) => [
    // pg_trgm indexes serve the ILIKE search. See ADR 0003.
    index('quizzes_title_trgm').using('gin', sql`${table.title} gin_trgm_ops`),
    index('quizzes_description_trgm').using('gin', sql`${table.description} gin_trgm_ops`),
  ],
);

export const quizCategories = pgTable(
  'quiz_categories',
  {
    quizId: integer('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.quizId, table.categoryId] })],
);
