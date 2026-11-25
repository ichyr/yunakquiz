import type { DraftQuiz, Question, QuizStatus } from '@yunakquiz/core';
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

export type TokenPurpose = 'verify_email' | 'reset_password' | 'change_email';

/** Single-use mailed tokens. `id` is the SHA-256 hash of the token; a used token is deleted. */
export const oneTimeTokens = pgTable(
  'one_time_tokens',
  {
    id: text().primaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text().$type<TokenPurpose>().notNull(),
    // Only for change_email: the address the link confirms.
    newEmail: citext(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      'one_time_tokens_purpose_check',
      sql`${table.purpose} in ('verify_email', 'reset_password', 'change_email')`,
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
    // A draft holds partial content; a published Quiz is validated by quizSchema in
    // @yunakquiz/core (ADR 0005, ADR 0009). Draft content never reaches Guests.
    questions: jsonb().$type<DraftQuiz['questions'] | Question[]>().notNull(),
    // Null: ownerless (seeded, or its Author deleted their Account). Only Admins manage those.
    authorId: integer().references(() => users.id, { onDelete: 'set null' }),
    status: text().$type<QuizStatus>().notNull(),
    // Optimistic locking: a save sends the version it loaded; every write adds one.
    version: integer().notNull().default(1),
    // Set at the first publish and kept: it is what locks the slug for Authors.
    publishedAt: timestamp({ withTimezone: true }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('quizzes_status_check', sql`${table.status} in ('draft', 'published')`),
    check(
      'quizzes_published_has_date_check',
      sql`${table.status} = 'draft' or ${table.publishedAt} is not null`,
    ),
    index('quizzes_author_idx').on(table.authorId),
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
