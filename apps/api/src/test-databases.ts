import pg from 'pg';

// Per-ticket databases for agents that share one running Postgres (#84).
const allowedName = /^yunakquiz_(test|e2e)_[a-z0-9_]+$/;
// Postgres truncates identifiers longer than 63 bytes.
const maxNameLength = 63;

export function testDatabaseNames(ticket: string): string[] {
  const names = [`yunakquiz_test_${ticket}`, `yunakquiz_e2e_${ticket}`];
  for (const name of names) {
    if (!allowedName.test(name) || name.length > maxNameLength) {
      throw new Error(
        `Invalid ticket ${JSON.stringify(ticket)}: use lowercase letters, digits and underscores, ` +
          `so that ${name} matches ${allowedName} and is at most ${maxNameLength} characters`,
      );
    }
  }
  return names;
}

export function maintenanceUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

async function withMaintenanceClient<T>(
  adminUrl: string,
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

// Names are checked against `allowedName` before they reach SQL, so quoting them is safe.
const quote = (name: string) => `"${name}"`;

export async function createTestDatabases(adminUrl: string, ticket: string): Promise<string[]> {
  const names = testDatabaseNames(ticket);
  await withMaintenanceClient(adminUrl, async (client) => {
    for (const name of names) {
      const { rowCount } = await client.query('select 1 from pg_database where datname = $1', [
        name,
      ]);
      if (!rowCount) await client.query(`create database ${quote(name)}`);
    }
  });
  return names;
}

export async function dropTestDatabases(adminUrl: string, ticket: string): Promise<string[]> {
  const names = testDatabaseNames(ticket);
  await withMaintenanceClient(adminUrl, async (client) => {
    for (const name of names) {
      await client.query(`drop database if exists ${quote(name)} with (force)`);
    }
  });
  return names;
}
