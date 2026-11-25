import { deleteUnverifiedAccounts } from '../src/cleanup.ts';
import { createDb } from '../src/db/client.ts';
import { requireEnv } from '../src/env.ts';

// Run daily from a scheduler: pnpm --filter @yunakquiz/api db:cleanup-unverified
const { db, close } = createDb(requireEnv('DATABASE_URL'));
try {
  const removed = await deleteUnverifiedAccounts(db);
  console.log(`Removed ${removed} unverified Account(s) older than 7 days`);
} finally {
  await close();
}
