import { validatePassword } from '@yunakquiz/core';
import { count, eq } from 'drizzle-orm';
import { lockAdminChanges } from '../src/admin-users.ts';
import type { Db } from '../src/db/client.ts';
import { users } from '../src/db/schema.ts';
import { createPasswordHasher, parsePeppers } from '../src/passwords.ts';
import { createUser } from '../src/users.ts';

/**
 * Creates the first Admin from env variables, for a fresh install. Safe to run on every
 * deploy: when any Admin exists it does nothing. It never promotes an existing Account.
 * Unlike the test Account seed it runs in production, so the password must pass the same
 * rules as registration.
 */
export async function seedFirstAdmin(
  db: Db,
  input: {
    /** PASSWORD_PEPPERS, as the API reads it. */
    peppers: string | undefined;
    email: string;
    displayName: string;
    password: string;
  },
): Promise<'created' | 'admin_exists'> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const strength = validatePassword(input.password, { email, name: displayName });
  if (!strength.ok) {
    throw new Error(`The first Admin's password is not accepted: ${strength.issues.join(', ')}`);
  }
  const hasher = createPasswordHasher(parsePeppers(input.peppers));

  return db.transaction(async (tx) => {
    // Held until commit: a second seed waits here, then sees the Admin this one made.
    await lockAdminChanges(tx);
    const [admins] = await tx.select({ value: count() }).from(users).where(eq(users.role, 'admin'));
    if ((admins?.value ?? 0) > 0) return 'admin_exists';
    // createUser takes a Db, so it inserts on its own connection; the lock above still covers it.
    const created = await createUser(db, hasher, {
      email,
      displayName,
      password: input.password,
      interfaceLanguage: 'uk',
      role: 'admin',
      verifiedAt: new Date(),
    });
    if (!created.ok) {
      throw new Error(`The first Admin was not created: ${created.reason}`);
    }
    return 'created';
  });
}
