import { afterEach, describe, expect, it } from 'vitest';
import {
  createTestDatabases,
  dropTestDatabases,
  listTestDatabaseTickets,
  testDatabaseNames,
  toMaintenanceUrl,
  withMaintenanceClient,
} from '../scripts/test-databases.ts';
import { testDatabaseUrl } from './database.ts';

describe('testDatabaseNames', () => {
  it('names a test and an e2e database after the ticket', () => {
    expect(testDatabaseNames('84')).toEqual({
      test: 'yunakquiz_test_84',
      e2e: 'yunakquiz_e2e_84',
    });
    expect(testDatabaseNames('79fix')).toEqual({
      test: 'yunakquiz_test_79fix',
      e2e: 'yunakquiz_e2e_79fix',
    });
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
});

describe('create, list and drop', () => {
  const ticket = `tdb${process.pid}`;
  const maintenanceUrl = toMaintenanceUrl(testDatabaseUrl);

  afterEach(() => dropTestDatabases(maintenanceUrl, ticket));

  it('creates both databases, tolerates a second create, lists the ticket, and drops them', async () => {
    await createTestDatabases(maintenanceUrl, ticket);
    await createTestDatabases(maintenanceUrl, ticket);
    expect(await listTestDatabaseTickets(maintenanceUrl)).toContain(ticket);

    await dropTestDatabases(maintenanceUrl, ticket);
    await dropTestDatabases(maintenanceUrl, ticket);
    expect(await listTestDatabaseTickets(maintenanceUrl)).not.toContain(ticket);
  });

  it('lists a ticket that has only one of its two databases', async () => {
    await createTestDatabases(maintenanceUrl, ticket);
    const { test } = testDatabaseNames(ticket);
    await withMaintenanceClient(maintenanceUrl, (client) =>
      client.query(`drop database "${test}"`),
    );
    expect(await listTestDatabaseTickets(maintenanceUrl)).toContain(ticket);
  });

  it('never lists the shared databases', async () => {
    const tickets = await listTestDatabaseTickets(maintenanceUrl);
    expect(tickets).not.toContain('');
    expect(tickets).not.toContain('yunakquiz');
  });

  it('refuses a ticket outside the pattern before touching the server', async () => {
    await expect(createTestDatabases(maintenanceUrl, '')).rejects.toThrow(/ticket/i);
    await expect(dropTestDatabases(maintenanceUrl, 'Bad Name')).rejects.toThrow(/ticket/i);
  });

  it('points the maintenance URL at the postgres database', () => {
    expect(toMaintenanceUrl('postgres://u:p@localhost:5432/yunakquiz_test_1?sslmode=disable')).toBe(
      'postgres://u:p@localhost:5432/postgres?sslmode=disable',
    );
  });
});
