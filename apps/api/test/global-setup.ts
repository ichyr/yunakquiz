import { migrateDatabase } from '../src/db/migrate.ts';
import { createTestDb } from './database.ts';

export default async function setup() {
  const { db, close } = createTestDb();
  await migrateDatabase(db);
  await close();
}
