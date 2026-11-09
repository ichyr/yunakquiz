import { createDb } from '../src/db/client.ts';
import { migrateDatabase } from '../src/db/migrate.ts';
import { requireEnv } from '../src/env.ts';
import { seedQuizzes } from './quizzes.ts';
import { seed } from './seed.ts';

const { db, close } = createDb(requireEnv('DATABASE_URL'));
await migrateDatabase(db);
const count = await seed(db, seedQuizzes);
await close();
console.log(`Seeded ${count} Quiz(zes)`);
