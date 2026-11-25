import {
  ADMIN_USERS_PAGE_SIZE,
  canChangeRole,
  canDeleteUser,
  isAdmin,
  isCountedAdmin,
  type Actor,
  type AdminUserPage,
  type Role,
} from '@yunakquiz/core';
import { and, count, desc, eq, ilike, isNotNull, or, sql } from 'drizzle-orm';
import type { Db } from './db/client.ts';
import { quizCountOf } from './authoring-quizzes.ts';
import { users } from './db/schema.ts';
import { toActor } from './session.ts';
import type { UserRow } from './users.ts';

/**
 * Admin management of Accounts. Every change to who is an Admin (promote, demote, delete,
 * and the first-Admin seed) first takes one Postgres advisory lock, so they run one at a
 * time. Under that lock the Admin count and the actor are read fresh, so "the last Admin
 * stays" holds even when two Admins act at once.
 */
const ADMIN_CHANGE_LOCK = 790_001;

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Held until the surrounding transaction ends. */
export async function lockAdminChanges(tx: Tx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_CHANGE_LOCK})`);
}

/** Verified Admins only: an unverified one is removed by the cleanup, so it never keeps the app administrable. */
export async function countAdmins(db: Db | Tx): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), isNotNull(users.verifiedAt)));
  return row?.value ?? 0;
}

/** `%` and `_` in the search text match themselves. */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

export async function listUsers(
  db: Db,
  { q, page, actorId }: { q: string | undefined; page: number; actorId: number },
): Promise<AdminUserPage> {
  const where = q
    ? or(ilike(users.displayName, likePattern(q)), ilike(users.email, likePattern(q)))
    : undefined;
  const [rows, [total], adminCount] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        verifiedAt: users.verifiedAt,
        createdAt: users.createdAt,
        quizCount: quizCountOf,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(ADMIN_USERS_PAGE_SIZE)
      .offset((page - 1) * ADMIN_USERS_PAGE_SIZE),
    db.select({ value: count() }).from(users).where(where),
    countAdmins(db),
  ]);
  return {
    items: rows.map(({ verifiedAt, createdAt, ...row }) => ({
      ...row,
      verified: verifiedAt !== null,
      createdAt: createdAt.toISOString(),
    })),
    total: total?.value ?? 0,
    page,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    adminCount,
    actorId,
  };
}

export type AdminChange<T = undefined> =
  | { ok: true; value: T; adminCount: number }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'last_admin' | 'target_unverified' };

type Lookup = { actor: Actor | null; target: UserRow | undefined; adminCount: number };

async function load(tx: Tx, actorId: number, targetId: number): Promise<Lookup> {
  await lockAdminChanges(tx);
  const [actor] = await tx.select().from(users).where(eq(users.id, actorId));
  const [target] = await tx.select().from(users).where(eq(users.id, targetId));
  return { actor: actor ? toActor(actor) : null, target, adminCount: await countAdmins(tx) };
}

const toTarget = (user: UserRow) => ({
  id: user.id,
  role: user.role,
  verified: user.verifiedAt !== null,
});

/** Why the core rule said no: the last Admin is the one reason worth naming. */
function denial(actor: Actor | null, target: UserRow, adminCount: number) {
  const lastAdmin = isAdmin(actor) && isCountedAdmin(toTarget(target)) && adminCount <= 1;
  return { ok: false, reason: lastAdmin ? 'last_admin' : 'forbidden' } as const;
}

export async function changeRole(
  db: Db,
  actorId: number,
  targetId: number,
  newRole: Role,
): Promise<AdminChange<{ from: Role; user: UserRow }>> {
  return db.transaction(async (tx) => {
    const { actor, target, adminCount } = await load(tx, actorId, targetId);
    // Not an Admin (any more): say nothing about whether the target exists.
    if (!isAdmin(actor)) return { ok: false, reason: 'forbidden' } as const;
    if (!target) return { ok: false, reason: 'not_found' } as const;
    if (newRole === 'admin' && target.role !== 'admin' && target.verifiedAt === null) {
      return { ok: false, reason: 'target_unverified' } as const;
    }
    if (!canChangeRole(actor, toTarget(target), newRole, adminCount)) {
      return denial(actor, target, adminCount);
    }
    const [user] = await tx
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, targetId))
      .returning();
    const delta = target.verifiedAt === null ? 0 : newRole === 'admin' ? 1 : -1;
    return {
      ok: true,
      value: { from: target.role, user: user! },
      adminCount: adminCount + delta,
    } as const;
  });
}

/** The Account, its sessions and its tokens go (cascading foreign keys). Their Quizzes survive ownerless (`author_id` ON DELETE SET NULL). */
export async function deleteUserAsAdmin(
  db: Db,
  actorId: number,
  targetId: number,
): Promise<AdminChange<{ role: Role }>> {
  return db.transaction(async (tx) => {
    const { actor, target, adminCount } = await load(tx, actorId, targetId);
    if (!isAdmin(actor)) return { ok: false, reason: 'forbidden' } as const;
    if (!target) return { ok: false, reason: 'not_found' } as const;
    if (!canDeleteUser(actor, toTarget(target), adminCount))
      return denial(actor, target, adminCount);
    await tx.delete(users).where(eq(users.id, targetId));
    return {
      ok: true,
      value: { role: target.role },
      adminCount: isCountedAdmin(toTarget(target)) ? adminCount - 1 : adminCount,
    } as const;
  });
}
