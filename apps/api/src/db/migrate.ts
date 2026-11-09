import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { requireEnv } from '../env.ts';
import { createDb, type Db } from './client.ts';

const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;

export function migrateDatabase(db: Db) {
  return migrate(db, { migrationsFolder });
}

if (import.meta.main) {
  const { db, close } = createDb(requireEnv('DATABASE_URL'));
  await migrateDatabase(db);
  await close();
  console.log('Migrations applied');
}
