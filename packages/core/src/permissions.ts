import type { z } from 'zod';
import type { roleSchema } from './account.ts';

/**
 * Who may do what to Accounts. Pure RBAC plus ownership, no permissions table (ADR 0002,
 * ADR 0008). The API enforces these and maps a denial to 403; the web app calls the same
 * functions only to hide controls. A Guest is `null`.
 */
export type Role = z.infer<typeof roleSchema>;

export type Actor = { id: number; role: Role; verified: boolean };
/** `verified: false` marks an Account that is not counted as an Admin even when its role says so. */
export type AccountTarget = { id: number; role: Role; verified?: boolean };

/** Only verified Admins count towards "the last Admin stays": the cleanup may remove the rest. */
export const isCountedAdmin = (target: AccountTarget): boolean =>
  target.role === 'admin' && target.verified !== false;

/** A verified Admin: the only kind of actor with admin powers. */
export const isAdmin = (actor: Actor | null): boolean =>
  actor !== null && actor.role === 'admin' && actor.verified;

export function canListUsers(actor: Actor | null): boolean {
  return isAdmin(actor);
}

/**
 * `adminCount` is the number of verified Admins right now. A change must really change the
 * role, an unverified Account is never promoted, and the last Admin can never be demoted.
 */
export function canChangeRole(
  actor: Actor | null,
  target: AccountTarget,
  newRole: Role,
  adminCount: number,
): boolean {
  if (!isAdmin(actor)) return false;
  if (target.role === newRole) return false;
  if (newRole === 'admin' && target.verified === false) return false;
  if (isCountedAdmin(target) && adminCount <= 1) return false;
  return true;
}

/** The last Admin can never be deleted, by anyone, themselves included. */
export function canDeleteUser(
  actor: Actor | null,
  target: AccountTarget,
  adminCount: number,
): boolean {
  if (!isAdmin(actor)) return false;
  if (isCountedAdmin(target) && adminCount <= 1) return false;
  return true;
}

/** Self-service changes (name, password, email, own deletion): only on your own Account. */
export function canChangeOwnAccount(actor: Actor | null, target: { id: number }): boolean {
  return actor !== null && actor.id === target.id;
}
