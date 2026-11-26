import { requireEnv } from '../src/env.ts';
import {
  createTestDatabases,
  dropTestDatabases,
  listTestDatabaseTickets,
  toMaintenanceUrl,
} from './test-databases.ts';

// pnpm db:test-db create|drop <ticket>, or pnpm db:test-db list
const [action, ticket] = process.argv.slice(2);
const maintenanceUrl = toMaintenanceUrl(requireEnv('DATABASE_URL'));

try {
  if (action === 'list' && !ticket) {
    console.log((await listTestDatabaseTickets(maintenanceUrl)).join('\n'));
  } else if ((action === 'create' || action === 'drop') && ticket) {
    const run = action === 'create' ? createTestDatabases : dropTestDatabases;
    const names = await run(maintenanceUrl, ticket);
    console.log(
      `${action === 'create' ? 'Created' : 'Dropped'}: ${Object.values(names).join(', ')}`,
    );
  } else {
    console.error('Usage: pnpm db:test-db create|drop <ticket> | pnpm db:test-db list');
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
