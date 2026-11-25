import { createDb } from '../src/db/client.ts';
import { migrateDatabase } from '../src/db/migrate.ts';
import { requireEnv } from '../src/env.ts';
import { seedQuizzes } from './quizzes.ts';
import { seed } from './seed.ts';

const { db, close } = createDb(requireEnv('DATABASE_URL'));
await migrateDatabase(db);
const { added, skipped } = await seed(db, seedQuizzes);
await close();
console.log(`Seeded Quizzes: ${added} added, ${skipped} already there`);
