import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { accountRoutes } from './account.ts';
import { authRoutes, defaultAuthLimits, type AuthLimits } from './auth.ts';
import type { Db } from './db/client.ts';
import { createPasswordHasher, parsePeppers } from './passwords.ts';
import {
  categoriesResponse,
  categoryResponse,
  quizResponse,
  quizSummariesResponse,
} from './response-schemas.ts';
import { createFakeMailer, type Mailer } from './mailer.ts';
import { findCategory, findQuiz, listCategories, searchQuizzes } from './quizzes.ts';

declare module 'fastify' {
  interface FastifyInstance {
    mailer: Mailer;
  }
}

const slugParams = z.object({ slug: z.string() });
const searchQuery = z.object({ q: z.string().trim().min(1) });

const probePaths = new Set(['/api/health', '/api/live']);

export type RateLimitOptions = { max: number; timeWindow: string };

export function buildApp({
  db,
  passwordPeppers,
  mailer = createFakeMailer(),
  logger = false,
  trustProxy = false,
  rateLimit: rateLimitOptions = { max: 300, timeWindow: '1 minute' },
  authLimits = {},
  webBaseUrl = 'http://localhost:5173',
  corsOrigins = [],
  secureCookies = true,
  now = () => new Date(),
}: {
  db: Db;
  /** PASSWORD_PEPPERS: `version:secret,...`, first is current. Throws when missing or malformed. */
  passwordPeppers: string | undefined;
  /** Defaults to an in-memory fake, so an app built without one never sends real mail. */
  mailer?: Mailer;
  logger?: boolean;
  /** Read the client address from X-Forwarded-For. Enable only behind a load balancer. */
  trustProxy?: boolean | number;
  rateLimit?: RateLimitOptions;
  authLimits?: { [K in keyof AuthLimits]?: Partial<AuthLimits[K]> };
  /** Where mailed links point: the web app's address. */
  webBaseUrl?: string;
  /** Origins allowed to call the API from a browser with credentials. Empty: same origin only. */
  corsOrigins?: string[];
  /** Set the Secure flag on the session cookie. On by default; only local development and tests turn it off. */
  secureCookies?: boolean;
  /** The clock, so tests can move time. */
  now?: () => Date;
}) {
  const hasher = createPasswordHasher(parsePeppers(passwordPeppers));
  const app = Fastify({
    logger,
    requestTimeout: 30_000,
    trustProxy: typeof trustProxy === 'number' ? (_address, hop) => hop < trustProxy : trustProxy,
  });

  app.decorate('mailer', mailer);

  // Readiness reports 503 as soon as shutdown starts, so the load balancer stops routing here.
  let closing = false;
  app.addHook('preClose', async () => {
    closing = true;
  });

  app.register(helmet);
  app.register(cookie);
  app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  });
  app.register(rateLimit, {
    ...rateLimitOptions,
    allowList: (request) => probePaths.has(request.routeOptions.url ?? ''),
    errorResponseBuilder: (_request, context) => ({
      statusCode: context.statusCode,
      message: 'Too many requests',
    }),
  });

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
      // Mutating requests need a header a cross-site form cannot set. See ADR 0008.
      api.addHook('onRequest', async (request, reply) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
        if (!request.headers['x-requested-with']) {
          return reply.code(403).send({ error: 'csrf_header_required' });
        }
      });

      const authDeps = {
        db,
        mailer,
        hasher,
        now,
        webBaseUrl,
        secureCookies,
        limits: {
          perIp: { ...defaultAuthLimits.perIp, ...authLimits.perIp },
          perEmail: { ...defaultAuthLimits.perEmail, ...authLimits.perEmail },
        },
      };
      api.register(authRoutes, authDeps);
      api.register(accountRoutes, authDeps);

      // Liveness: the process is up. Never touches the database.
      api.get('/live', async () => ({ status: 'ok' }));

      // Readiness: the database answers and shutdown has not started.
      api.get('/health', async (request, reply) => {
        if (closing) return reply.code(503).send({ status: 'unavailable' });
        try {
          await db.execute(sql`select 1`);
          return { status: 'ok' };
        } catch (error) {
          request.log.error(error);
          return reply.code(503).send({ status: 'unavailable' });
        }
      });

      api.get('/categories', { schema: { response: categoriesResponse } }, () =>
        listCategories(db),
      );

      api.get(
        '/categories/:slug',
        { schema: { response: categoryResponse } },
        async (request, reply) => {
          const params = slugParams.safeParse(request.params);
          if (!params.success) return reply.code(400).send({ error: 'Invalid slug' });
          const category = await findCategory(db, params.data.slug);
          return category ?? reply.code(404).send({ error: 'Category not found' });
        },
      );

      api.get(
        '/quizzes',
        { schema: { response: quizSummariesResponse } },
        async (request, reply) => {
          const query = searchQuery.safeParse(request.query);
          if (!query.success)
            return reply.code(400).send({ error: 'Query parameter q is required' });
          return searchQuizzes(db, query.data.q);
        },
      );

      api.get('/quizzes/:slug', { schema: { response: quizResponse } }, async (request, reply) => {
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
