import {
  canCreateQuiz,
  draftQuizSchema,
  isAdmin,
  publishQuizInputSchema,
  saveQuizInputSchema,
  type Actor,
} from '@yunakquiz/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createDraft,
  deleteQuiz,
  listAllCategories,
  listQuizzes,
  publishQuiz,
  readQuiz,
  saveQuiz,
  slugAvailable,
  type AuthoringFailure,
} from './authoring-quizzes.ts';
import type { Db } from './db/client.ts';
import { createSessionReader, toActor } from './session.ts';

/**
 * Quiz authoring routes, all under /api/authoring. The hook answers before any body is read:
 * 401 for a Guest, 403 for an unverified Account. Handlers then call the permission functions
 * from core. Draft content only ever leaves through these routes, to its Author and Admins.
 * Reasons: ADR 0009.
 */

declare module 'fastify' {
  interface FastifyRequest {
    quizActor: Actor | undefined;
  }
}

/** A Quiz at its limits is up to about 12 MB of UTF-8 JSON (100 Questions, 11 texts of 5,000
 * Ukrainian letters each); Fastify's 1 MiB default would refuse it. Only verified Accounts reach
 * the body: the hook above runs before it is read. */
const QUIZ_BODY_LIMIT = 16 * 1024 * 1024;

const slugParams = z.object({ slug: z.string().max(200) });
const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1) });
const slugCheckQuery = z.object({ quiz: z.string().max(200).optional() });
const slugValue = draftQuizSchema.shape.slug;

export type AuthoringDeps = { db: Db; now: () => Date; secureCookies: boolean };

export async function authoringRoutes(api: FastifyInstance, deps: AuthoringDeps) {
  const { db, now, secureCookies } = deps;
  api.decorateRequest('quizActor', undefined);
  const { currentSession } = createSessionReader({ db, now, secureCookies });

  api.addHook('onRequest', async (request, reply) => {
    const session = await currentSession(request, reply);
    if (session === 'guest') return reply.code(401).send({ error: 'unauthenticated' });
    if (session === 'expired') return reply.code(401).send({ error: 'session_expired' });
    const actor = toActor(session);
    // Checked before anything is looked up, so it says nothing about any Quiz.
    if (!canCreateQuiz(actor)) return reply.code(403).send({ error: 'verification_required' });
    request.quizActor = actor;
  });

  const writeLimit = { rateLimit: { max: 60, timeWindow: '1 minute' } };

  // Every Category, unlike the public list, which hides those without a published Quiz.
  api.get('/categories', async () => listAllCategories(db));

  // An Admin changing a Quiz they do not own is logged like any other Admin action: ids only.
  const logAdminEdit = (
    request: FastifyRequest,
    action: 'save_quiz' | 'publish_quiz' | 'delete_quiz',
    quizSlug: string,
    ownerId: number | null,
  ) => {
    const actor = request.quizActor!;
    if (!isAdmin(actor) || ownerId === actor.id) return;
    request.log.info(
      { event: 'admin_action', action, outcome: 'done', actorId: actor.id, ownerId, quizSlug },
      'Admin action',
    );
  };

  api.get('/quizzes', async (request, reply) => {
    const query = pageQuery.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'invalid_input' });
    return listQuizzes(db, request.quizActor!, query.data.page);
  });

  api.post(
    '/quizzes',
    { bodyLimit: QUIZ_BODY_LIMIT, config: writeLimit },
    async (request, reply) => {
      const body = draftQuizSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
      const result = await createDraft(db, request.quizActor!, body.data, now());
      if (!result.ok) return fail(reply, result);
      return reply.code(201).send(result.value);
    },
  );

  api.get('/quizzes/:slug', async (request, reply) => {
    const params = slugParams.safeParse(request.params);
    if (!params.success) return reply.code(404).send({ error: 'not_found' });
    const result = await readQuiz(db, request.quizActor!, params.data.slug);
    return result.ok ? result.value : fail(reply, result);
  });

  api.put(
    '/quizzes/:slug',
    { bodyLimit: QUIZ_BODY_LIMIT, config: writeLimit },
    async (request, reply) => {
      const params = slugParams.safeParse(request.params);
      if (!params.success) return reply.code(404).send({ error: 'not_found' });
      const body = saveQuizInputSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
      const result = await saveQuiz(db, request.quizActor!, params.data.slug, body.data, now());
      if (!result.ok) return fail(reply, result);
      logAdminEdit(request, 'save_quiz', params.data.slug, result.value.authorId);
      return result.value;
    },
  );

  api.post('/quizzes/:slug/publish', { config: writeLimit }, async (request, reply) => {
    const params = slugParams.safeParse(request.params);
    if (!params.success) return reply.code(404).send({ error: 'not_found' });
    const body = publishQuizInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const result = await publishQuiz(
      db,
      request.quizActor!,
      params.data.slug,
      body.data.version,
      now(),
    );
    if (!result.ok) return fail(reply, result);
    logAdminEdit(request, 'publish_quiz', params.data.slug, result.value.authorId);
    return result.value;
  });

  api.delete('/quizzes/:slug', { config: writeLimit }, async (request, reply) => {
    const params = slugParams.safeParse(request.params);
    if (!params.success) return reply.code(404).send({ error: 'not_found' });
    const result = await deleteQuiz(db, request.quizActor!, params.data.slug);
    if (!result.ok) return fail(reply, result);
    logAdminEdit(request, 'delete_quiz', params.data.slug, result.value.authorId);
    return reply.code(204).send();
  });

  // For the form's live check. `?quiz=<current slug>` lets an edited Quiz keep its own slug.
  api.get(
    '/slugs/:slug',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const params = z.object({ slug: slugValue }).safeParse(request.params);
      const query = slugCheckQuery.safeParse(request.query);
      if (!params.success || !query.success) return reply.code(400).send({ error: 'invalid_slug' });
      const available = await slugAvailable(
        db,
        request.quizActor!,
        params.data.slug,
        query.data.quiz,
      );
      return { available };
    },
  );
}

function fail(reply: FastifyReply, failure: AuthoringFailure) {
  switch (failure.reason) {
    case 'not_found':
      return reply.code(404).send({ error: 'not_found' });
    case 'forbidden':
      return reply.code(403).send({ error: 'forbidden' });
    case 'slug_locked':
      return reply.code(403).send({ error: 'slug_locked' });
    case 'slug_taken':
      return reply.code(409).send({ error: 'slug_taken' });
    case 'version_conflict':
      return reply
        .code(409)
        .send({ error: 'version_conflict', currentVersion: failure.currentVersion });
    case 'unknown_category':
      return reply.code(400).send({ error: 'unknown_category', slugs: failure.slugs });
    case 'invalid_quiz':
      return reply.code(422).send({ error: 'invalid_quiz', issues: failure.issues });
  }
}
