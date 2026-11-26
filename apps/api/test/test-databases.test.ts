import pg from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createTestDatabases,
  dropTestDatabases,
  maintenanceUrl,
  testDatabaseNames,
} from '../src/test-databases.ts';
import { testDatabaseUrl } from './database.ts';

describe('testDatabaseNames', () => {
  it('names a test and an e2e database after the ticket', () => {
    expect(testDatabaseNames('84')).toEqual(['yunakquiz_test_84', 'yunakquiz_e2e_84']);
    expect(testDatabaseNames('79fix')).toEqual(['yunakquiz_test_79fix', 'yunakquiz_e2e_79fix']);
  });

  it.each([
    '',
    '..',
    'A1',
    'a b',
    'a-b',
    "x'; drop database yunakquiz; --",
    'x"y',
    '84/../x',
    'a'.repeat(60),
  ])('refuses the ticket %j', (ticket) => {
    expect(() => testDatabaseNames(ticket)).toThrow(/ticket/i);
  });

  it('never yields the shared databases', () => {
    for (const ticket of ['test', 'e2e', '1']) {
      for (const name of testDatabaseNames(ticket)) {
        expect(name).not.toBe('yunakquiz');
        expect(name).not.toBe('yunakquiz_test');
        expect(name).toMatch(/^yunakquiz_(test|e2e)_[a-z0-9_]+$/);
      }
    }
  });
});

describe('create and drop', () => {
  const ticket = `tdb${process.pid}`;
  const adminUrl = maintenanceUrl(testDatabaseUrl);

  async function existing() {
    const client = new pg.Client({ connectionString: adminUrl });
    await client.connect();
    try {
      const { rows } = await client.query<{ datname: string }>(
        'select datname from pg_database where datname = any($1)',
        [testDatabaseNames(ticket)],
      );
      return rows.map((row) => row.datname).toSorted();
    } finally {
      await client.end();
    }
  }

  afterEach(() => dropTestDatabases(adminUrl, ticket));

  it('creates both databases, tolerates a second create, and drops them', async () => {
    await createTestDatabases(adminUrl, ticket);
    await createTestDatabases(adminUrl, ticket);
    expect(await existing()).toEqual([`yunakquiz_e2e_${ticket}`, `yunakquiz_test_${ticket}`]);

    await dropTestDatabases(adminUrl, ticket);
    await dropTestDatabases(adminUrl, ticket);
    expect(await existing()).toEqual([]);
  });

  it('refuses a ticket outside the pattern before touching the server', async () => {
    await expect(createTestDatabases(adminUrl, '')).rejects.toThrow(/ticket/i);
    await expect(dropTestDatabases(adminUrl, 'Bad Name')).rejects.toThrow(/ticket/i);
  });

  it('points the maintenance URL at the postgres database', () => {
    expect(maintenanceUrl('postgres://u:p@localhost:5432/yunakquiz_test_1?sslmode=disable')).toBe(
      'postgres://u:p@localhost:5432/postgres?sslmode=disable',
    );
  });
});
