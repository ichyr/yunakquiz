import Fastify, { type FastifyError } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from './db/client.ts';
import { findCategory, findQuiz, listCategories, searchQuizzes } from './quizzes.ts';

const slugParams = z.object({ slug: z.string() });
const searchQuery = z.object({ q: z.string().trim().min(1) });

export function buildApp({ db, logger = false }: { db: Db; logger?: boolean }) {
  const app = Fastify({ logger, requestTimeout: 30_000 });

  // Log server errors in full, but never send their details (e.g. SQL) to the client.
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error(error);
      return reply.code(status).send({ error: 'Internal Server Error' });
    }
    return reply.code(status).send({ error: error.message });
  });

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'Not found' }));

  app.register(
    async (api) => {
      api.get('/health', async (request, reply) => {
        try {
          await db.execute(sql`select 1`);
          return { status: 'ok' };
        } catch (error) {
          request.log.error(error);
          return reply.code(503).send({ status: 'unavailable' });
        }
      });

      api.get('/categories', () => listCategories(db));

      api.get('/categories/:slug', async (request, reply) => {
        const params = slugParams.safeParse(request.params);
        if (!params.success) return reply.code(400).send({ error: 'Invalid slug' });
        const category = await findCategory(db, params.data.slug);
        return category ?? reply.code(404).send({ error: 'Category not found' });
      });

      api.get('/quizzes', async (request, reply) => {
        const query = searchQuery.safeParse(request.query);
        if (!query.success) return reply.code(400).send({ error: 'Query parameter q is required' });
        return searchQuizzes(db, query.data.q);
      });

      api.get('/quizzes/:slug', async (request, reply) => {
        const params = slugParams.safeParse(request.params);
        if (!params.success) return reply.code(400).send({ error: 'Invalid slug' });
        const quiz = await findQuiz(db, params.data.slug);
        return quiz ?? reply.code(404).send({ error: 'Quiz not found' });
      });
    },
    { prefix: '/api' },
  );

  return app;
}
