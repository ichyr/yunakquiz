import type { Account, InterfaceLanguage } from '@yunakquiz/core';
import { eq } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { users } from './db/schema.ts';
import type { PasswordHasher } from './passwords.ts';

export type UserRow = typeof users.$inferSelect;

export type CreateUserInput = {
  email: string;
  displayName: string;
  password: string;
  interfaceLanguage: InterfaceLanguage;
  role?: 'user' | 'admin';
  /** Mark the email as verified from the start (seeds, and later admin-created Accounts). */
  verifiedAt?: Date;
};

export type CreateUserResult =
  { ok: true; user: UserRow } | { ok: false; reason: 'email_taken' | 'display_name_taken' };

/** The Postgres error behind a Drizzle error, when it is a unique violation. */
export function uniqueViolation(error: unknown): string | undefined {
  const pg = (error as { cause?: unknown })?.cause ?? error;
  const { code, constraint } = pg as { code?: string; constraint?: string };
  return code === '23505' ? (constraint ?? '') : undefined;
}

/**
 * The one way an Account comes into being (register now; admin-created Accounts or invites
 * later). Hashes the password, inserts the row and reports a taken email or display name.
 */
export async function createUser(
  db: Db,
  hasher: PasswordHasher,
  input: CreateUserInput,
): Promise<CreateUserResult> {
  const stored = await hasher.hash(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        displayName: input.displayName,
        passwordHash: stored.passwordHash,
        pepperVersion: stored.pepperVersion,
        interfaceLanguage: input.interfaceLanguage,
        ...(input.role && { role: input.role }),
        ...(input.verifiedAt && { verifiedAt: input.verifiedAt }),
      })
      .returning();
    return { ok: true, user: user! };
  } catch (error) {
    const constraint = uniqueViolation(error);
    if (constraint === undefined) throw error;
    return {
      ok: false,
      reason: constraint.includes('display') ? 'display_name_taken' : 'email_taken',
    };
  }
}

export async function findUserByEmail(db: Db, email: string): Promise<UserRow | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function findUserByDisplayName(db: Db, name: string): Promise<UserRow | undefined> {
  const [user] = await db.select().from(users).where(eq(users.displayName, name));
  return user;
}

export function toAccount(user: UserRow): Account {
  return {
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    verified: user.verifiedAt !== null,
    interfaceLanguage: user.interfaceLanguage,
  };
}
