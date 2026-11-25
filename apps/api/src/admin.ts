import {
  adminUserListQuerySchema,
  isAdmin,
  roleChangeInputSchema,
  type Actor,
} from '@yunakquiz/core';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { changeRole, deleteUserAsAdmin, listUsers, toActor } from './admin-users.ts';
import { SESSION_ABSOLUTE_MS, SESSION_INACTIVITY_MS } from './auth.ts';
import type { Db } from './db/client.ts';
import { sessions, users } from './db/schema.ts';
import { hashToken } from './tokens.ts';

/**
 * Admin routes, all under /api/admin. The hook below answers 403 to everyone who is not a
 * verified Admin before any handler runs, and the data functions check again under a lock.
 * Admin actions go to the structured log by `id` only: no emails, no secrets.
 */

// Same cookie as auth.ts. The session lookup is repeated here (rather than exported from
// auth.ts) to keep this ticket out of the file other tickets are changing.
const SESSION_COOKIE = 'sid';

declare module 'fastify' {
  interface FastifyRequest {
    adminActor: Actor | undefined;
  }
}

const idParams = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });

export type AdminDeps = {
  db: Db;
  now: () => Date;
};

export async function adminRoutes(api: FastifyInstance, deps: AdminDeps) {
  const { db, now } = deps;
  api.decorateRequest('adminActor', undefined);

  /** The Actor behind a live session, 'guest' for no cookie, 'expired' for a dead one. */
  async function sessionActor(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return 'guest' as const;
    const id = hashToken(token);
    const [row] = await db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id));
    const time = now().getTime();
    const live =
      row &&
      time - row.session.lastSeenAt.getTime() < SESSION_INACTIVITY_MS &&
      time - row.session.createdAt.getTime() < SESSION_ABSOLUTE_MS;
    if (!live) {
      if (row) await db.delete(sessions).where(eq(sessions.id, id));
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return 'expired' as const;
    }
    await db.update(sessions).set({ lastSeenAt: now() }).where(eq(sessions.id, id));
    return toActor(row.user);
  }

  api.addHook('onRequest', async (request, reply) => {
    const actor = await sessionActor(request, reply);
    if (actor === 'expired') return reply.code(401).send({ error: 'session_expired' });
    if (actor === 'guest' || !isAdmin(actor)) {
      request.log.warn(
        {
          event: 'admin_access_denied',
          actorId: actor === 'guest' ? null : actor.id,
          route: request.routeOptions.url,
          method: request.method,
        },
        'Admin route refused',
      );
      return reply.code(403).send({ error: 'forbidden' });
    }
    request.adminActor = actor;
  });

  api.get('/users', async (request, reply) => {
    const query = adminUserListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'invalid_input' });
    return listUsers(db, { q: query.data.q || undefined, page: query.data.page });
  });

  api.patch('/users/:id/role', async (request, reply) => {
    const params = idParams.safeParse(request.params);
    const body = roleChangeInputSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_input' });
    const actor = request.adminActor!;
    const targetId = params.data.id;

    const result = await changeRole(db, actor.id, targetId, body.data.role);
    const entry = { event: 'admin_action', action: 'change_role', actorId: actor.id, targetId };
    if (!result.ok) {
      request.log.warn(
        { ...entry, outcome: 'denied', reason: result.reason, to: body.data.role },
        'Admin action',
      );
      return denied(reply, result.reason);
    }
    request.log.info(
      { ...entry, outcome: 'done', from: result.value.from, to: body.data.role },
      'Admin action',
    );
    const { id, displayName, role } = result.value.user;
    return { id, displayName, role };
  });

  api.delete('/users/:id', async (request, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_input' });
    const actor = request.adminActor!;
    const targetId = params.data.id;

    const result = await deleteUserAsAdmin(db, actor.id, targetId);
    const entry = { event: 'admin_action', action: 'delete_user', actorId: actor.id, targetId };
    if (!result.ok) {
      request.log.warn({ ...entry, outcome: 'denied', reason: result.reason }, 'Admin action');
      return denied(reply, result.reason);
    }
    request.log.info({ ...entry, outcome: 'done', targetRole: result.value.role }, 'Admin action');
    return reply.code(204).send();
  });
}

function denied(reply: FastifyReply, reason: 'not_found' | 'forbidden' | 'last_admin') {
  if (reason === 'not_found') return reply.code(404).send({ error: 'not_found' });
  return reply.code(403).send({ error: reason });
}
