import {
  adminUserListQuerySchema,
  isAdmin,
  roleChangeInputSchema,
  type Actor,
} from '@yunakquiz/core';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { changeRole, deleteUserAsAdmin, listUsers, toActor } from './admin-users.ts';
import type { Db } from './db/client.ts';
import { createSessionReader } from './session.ts';

/**
 * Admin routes, all under /api/admin. The hook below answers 403 to everyone who is not a
 * verified Admin before any handler runs, and the data functions check again under a lock.
 * Admin actions go to the structured log by `id` only: no emails, no secrets.
 */

declare module 'fastify' {
  interface FastifyRequest {
    adminActor: Actor | undefined;
  }
}

const idParams = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });

export type AdminDeps = {
  db: Db;
  now: () => Date;
  secureCookies: boolean;
};

export async function adminRoutes(api: FastifyInstance, deps: AdminDeps) {
  const { db, now, secureCookies } = deps;
  api.decorateRequest('adminActor', undefined);

  const { currentSession } = createSessionReader({ db, now, secureCookies });

  api.addHook('onRequest', async (request, reply) => {
    const session = await currentSession(request, reply);
    if (session === 'expired') return reply.code(401).send({ error: 'session_expired' });
    const actor = session === 'guest' ? 'guest' : toActor(session);
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
    return listUsers(db, {
      q: query.data.q || undefined,
      page: query.data.page,
      actorId: request.adminActor!.id,
    });
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
