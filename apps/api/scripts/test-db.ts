import { requireEnv } from '../src/env.ts';
import { createTestDatabases, dropTestDatabases, maintenanceUrl } from '../src/test-databases.ts';

// pnpm db:test-db create|drop <ticket>
const [action, ticket] = process.argv.slice(2);
const actions = { create: createTestDatabases, drop: dropTestDatabases };

if ((action !== 'create' && action !== 'drop') || !ticket) {
  console.error('Usage: pnpm db:test-db create|drop <ticket>');
  process.exit(1);
}

try {
  const names = await actions[action](maintenanceUrl(requireEnv('DATABASE_URL')), ticket);
  console.log(`${action === 'create' ? 'Created' : 'Dropped'}: ${names.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
