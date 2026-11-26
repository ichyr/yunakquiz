import pg from 'pg';

// Per-ticket databases for agents that share one running Postgres (#84). This is dev tooling and
// lives in scripts/, not src/: CREATE DATABASE cannot go through Drizzle.
export const testDatabasePattern = /^yunakquiz_(test|e2e)_[a-z0-9_]+$/;
// Postgres truncates identifiers longer than 63 bytes.
const maxNameLength = 63;

export type TestDatabaseNames = { test: string; e2e: string };

export function testDatabaseNames(ticket: string): TestDatabaseNames {
  const names = { test: `yunakquiz_test_${ticket}`, e2e: `yunakquiz_e2e_${ticket}` };
  for (const name of Object.values(names)) {
    if (!testDatabasePattern.test(name) || name.length > maxNameLength) {
      throw new Error(
        `Invalid ticket ${JSON.stringify(ticket)}: use lowercase letters, digits and underscores, ` +
          `so that ${name} matches ${testDatabasePattern} and is at most ${maxNameLength} characters`,
      );
    }
  }
  return names;
}

export function toMaintenanceUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

export async function withMaintenanceClient<T>(
  maintenanceUrl: string,
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: maintenanceUrl });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

// Names are checked against `testDatabasePattern` before they reach SQL, so quoting them is safe.
const quote = (name: string) => `"${name}"`;
const duplicateDatabase = '42P04';

export async function createTestDatabases(
  maintenanceUrl: string,
  ticket: string,
): Promise<TestDatabaseNames> {
  const names = testDatabaseNames(ticket);
  await withMaintenanceClient(maintenanceUrl, async (client) => {
    for (const name of Object.values(names)) {
      try {
        await client.query(`create database ${quote(name)}`);
      } catch (error) {
        // Atomic, unlike check-then-create: a second create, even a concurrent one, is harmless.
        if ((error as { code?: string }).code !== duplicateDatabase) throw error;
      }
    }
  });
  return names;
}

export async function dropTestDatabases(
  maintenanceUrl: string,
  ticket: string,
): Promise<TestDatabaseNames> {
  const names = testDatabaseNames(ticket);
  await withMaintenanceClient(maintenanceUrl, async (client) => {
    for (const name of Object.values(names)) {
      await client.query(`drop database if exists ${quote(name)} with (force)`);
    }
  });
  return names;
}

// Tickets that have a test or e2e database, for the coordinator's sweep of leftovers.
export async function listTestDatabaseTickets(maintenanceUrl: string): Promise<string[]> {
  const rows = await withMaintenanceClient(maintenanceUrl, async (client) => {
    const result = await client.query<{ datname: string }>('select datname from pg_database');
    return result.rows;
  });
  const tickets = rows
    .filter(({ datname }) => testDatabasePattern.test(datname))
    .map(({ datname }) => datname.replace(/^yunakquiz_(test|e2e)_/, ''));
  return [...new Set(tickets)].toSorted();
}
