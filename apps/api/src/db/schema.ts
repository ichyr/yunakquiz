import type { Question } from '@yunakquiz/core';
import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** Case-insensitive text, for email and display name (needs the citext extension). */
const citext = customType<{ data: string }>({ dataType: () => 'citext' });

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: citext().notNull().unique(),
    displayName: citext().notNull().unique(),
    passwordHash: text().notNull(),
    // Selects the pepper at verify time. See docs/password-hashing.md.
    pepperVersion: text().notNull(),
    role: text().$type<'user' | 'admin'>().notNull().default('user'),
    verifiedAt: timestamp({ withTimezone: true }),
    interfaceLanguage: text().$type<'uk' | 'en'>().notNull().default('uk'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('users_role_check', sql`${table.role} in ('user', 'admin')`),
    check('users_interface_language_check', sql`${table.interfaceLanguage} in ('uk', 'en')`),
  ],
);

/** `id` is the SHA-256 hash of the cookie value; the cookie value itself is never stored. */
export const sessions = pgTable('sessions', {
  id: text().primaryKey(),
  userId: integer()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp({ withTimezone: true }).notNull(),
  lastSeenAt: timestamp({ withTimezone: true }).notNull(),
});

export type TokenPurpose = 'verify_email' | 'reset_password';

/** Single-use mailed tokens. `id` is the SHA-256 hash of the token; a used token is deleted. */
export const oneTimeTokens = pgTable(
  'one_time_tokens',
  {
    id: text().primaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text().$type<TokenPurpose>().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      'one_time_tokens_purpose_check',
      sql`${table.purpose} in ('verify_email', 'reset_password')`,
    ),
  ],
);

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
