import type { Db } from '../src/db/client.ts';
import { isLocalEnvironment } from '../src/env.ts';
import { createPasswordHasher, parsePeppers } from '../src/passwords.ts';
import { createUser } from '../src/users.ts';

/**
 * Test-only: creates a verified Account with a known password, so e2e helpers can log in
 * without reading mail. Never runs in production; the password would be public knowledge.
 */
export async function seedTestAccount(
  db: Db,
  input: {
    /** PASSWORD_PEPPERS, as the API reads it. */
    peppers: string | undefined;
    email: string;
    displayName: string;
    password: string;
    role?: 'user' | 'admin';
  },
) {
  if (!isLocalEnvironment()) {
    throw new Error('The test Account seed runs only when NODE_ENV is development or test');
  }
  const hasher = createPasswordHasher(parsePeppers(input.peppers));
  const result = await createUser(db, hasher, {
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName,
    password: input.password,
    interfaceLanguage: 'uk',
    verifiedAt: new Date(),
    ...(input.role && { role: input.role }),
  });
  if (!result.ok) throw new Error(`Test Account not created: ${result.reason}`);
  return result.user;
}
