import { parseArgs } from 'node:util';
import { createDb } from '../src/db/client.ts';
import { migrateDatabase } from '../src/db/migrate.ts';
import { requireEnv } from '../src/env.ts';
import { seedTestAccount } from './test-account.ts';

// pnpm db:seed:test-account --email e2e@example.test --name "E2E Scout" --password "a long known password"
const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
    role: { type: 'string', default: 'user' },
  },
});
if (values.role !== 'user' && values.role !== 'admin') {
  throw new Error('--role must be "user" or "admin"');
}
if (!values.email || !values.name || !values.password) {
  throw new Error('Usage: --email <email> --name <display name> --password <password>');
}

const { db, close } = createDb(requireEnv('DATABASE_URL'));
await migrateDatabase(db);
await seedTestAccount(db, {
  peppers: requireEnv('PASSWORD_PEPPERS'),
  email: values.email,
  displayName: values.name,
  password: values.password,
  role: values.role,
});
await close();
console.log(`Test Account ${values.email} created and verified`);
