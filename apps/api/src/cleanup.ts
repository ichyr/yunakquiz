import { and, isNull, lt, ne } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { users } from './db/schema.ts';

export const UNVERIFIED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes non-Admin Accounts that stayed unverified for 7 days, freeing their email and display name.
 * Sessions and tokens go with them (ON DELETE CASCADE). Returns how many were removed.
 */
export async function deleteUnverifiedAccounts(db: Db, now: Date = new Date()): Promise<number> {
  const removed = await db
    .delete(users)
    .where(
      and(
        isNull(users.verifiedAt),
        // An Admin is never removed: promoting needs a verified Account, and the Admin lock rules.
        ne(users.role, 'admin'),
        lt(users.createdAt, new Date(now.getTime() - UNVERIFIED_MAX_AGE_MS)),
      ),
    )
    .returning({ id: users.id });
  return removed.length;
}
