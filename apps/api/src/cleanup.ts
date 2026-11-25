import { and, isNull, lt } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { users } from './db/schema.ts';

export const UNVERIFIED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes Accounts that stayed unverified for 7 days, freeing their email and display name.
 * Sessions and tokens go with them (ON DELETE CASCADE). Returns how many were removed.
 */
export async function deleteUnverifiedAccounts(db: Db, now: Date = new Date()): Promise<number> {
  const removed = await db
    .delete(users)
    .where(
      and(
        isNull(users.verifiedAt),
        lt(users.createdAt, new Date(now.getTime() - UNVERIFIED_MAX_AGE_MS)),
      ),
    )
    .returning({ id: users.id });
  return removed.length;
}
