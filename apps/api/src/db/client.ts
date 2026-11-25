import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

export function createDb(
  connectionString: string,
  { onError }: { onError?: (error: Error) => void } = {},
) {
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
  });
  // An idle client that loses its connection emits 'error'; unhandled, it crashes the process.
  pool.on('error', (error) => onError?.(error));
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, close: () => pool.end() };
}

export type Db = ReturnType<typeof createDb>['db'];
