import { createDb } from '../src/db/client.ts';
import { migrateDatabase } from '../src/db/migrate.ts';
import { requireEnv } from '../src/env.ts';
import { seedFirstAdmin } from './first-admin.ts';

// pnpm db:seed:admin, with FIRST_ADMIN_EMAIL, FIRST_ADMIN_NAME and FIRST_ADMIN_PASSWORD set.
// The password is read from the environment only, never from arguments, and never printed.
const { db, close } = createDb(requireEnv('DATABASE_URL'));
try {
  await migrateDatabase(db);
  const result = await seedFirstAdmin(db, {
    peppers: requireEnv('PASSWORD_PEPPERS'),
    email: requireEnv('FIRST_ADMIN_EMAIL'),
    displayName: requireEnv('FIRST_ADMIN_NAME'),
    password: requireEnv('FIRST_ADMIN_PASSWORD'),
  });
  console.log(
    result === 'created' ? 'First Admin created.' : 'An Admin already exists: nothing to do.',
  );
} finally {
  await close();
}
