import { sql } from 'drizzle-orm';
import { createDb, type Db } from '../src/db/client.ts';

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://yunakquiz:yunakquiz@localhost:5432/yunakquiz_test';

export function createTestDb() {
  return createDb(testDatabaseUrl);
}

export function resetDatabase(db: Db) {
  return db.execute(sql`truncate quiz_categories, quizzes, categories restart identity`);
}
