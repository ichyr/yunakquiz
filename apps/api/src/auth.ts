import {
  loginInputSchema,
  registerInputSchema,
  tokenInputSchema,
  validatePassword,
} from '@yunakquiz/core';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db/client.ts';
import { oneTimeTokens, sessions, users } from './db/schema.ts';
import { existingAccountMail, verificationMail } from './mail-templates.ts';
import type { Mailer } from './mailer.ts';
import type { PasswordHasher } from './passwords.ts';
import {
  createSessionReader,
  SESSION_ABSOLUTE_MS,
  SESSION_COOKIE,
  SESSION_INACTIVITY_MS,
  VERIFICATION_TTL_MS,
} from './session.ts';
import { createKeyedLimiter } from './rate-limit.ts';
import { hashToken, newToken } from './tokens.ts';
import { createUser, findUserByDisplayName, findUserByEmail, toAccount } from './users.ts';

/** Design and reasons: ADR 0008. Hand-rolled on purpose: ADR 0010. */

export { SESSION_ABSOLUTE_MS, SESSION_INACTIVITY_MS, VERIFICATION_TTL_MS };

export type AuthLimits = {
  /** Per client address, on register and login. */
  perIp: { max: number; timeWindow: string };
  /** Per email address, on register and login, whether or not the Account exists. */
  perEmail: { max: number; windowMs: number };
};

export const defaultAuthLimits: AuthLimits = {
  perIp: { max: 20, timeWindow: '15 minutes' },
  perEmail: { max: 10, windowMs: 15 * 60 * 1000 },
};

export type AuthDeps = {
  db: Db;
  mailer: Mailer;
  hasher: PasswordHasher;
  now: () => Date;
  webBaseUrl: string;
  secureCookies: boolean;
  limits: AuthLimits;
};

export async function authRoutes(api: FastifyInstance, deps: AuthDeps) {
  const { db, mailer, hasher, now, webBaseUrl, secureCookies, limits } = deps;
  const clock = () => now().getTime();
  const registerLimiter = createKeyedLimiter({ ...limits.perEmail, now: clock });
  const loginLimiter = createKeyedLimiter({ ...limits.perEmail, now: clock });
  const perIp = { rateLimit: limits.perIp };

  // Mail goes out after the response, so sending never changes how long a request takes.
  const sendLater = (request: FastifyRequest, mail: Parameters<Mailer['send']>[0]) => {
    mailer.send(mail).catch((error) => request.log.error(error, 'Sending mail failed'));
  };

  const { cookieOptions, clearSessionCookie, currentSession } = createSessionReader({
    db,
    now,
    secureCookies,
  });

  api.get('/me', async (request, reply) => {
    const session = await currentSession(request, reply);
    if (session === 'guest') return null;
    if (session === 'expired') return reply.code(401).send({ error: 'session_expired' });
    return toAccount(session);
  });

  api.post('/register', { config: perIp }, async (request, reply) => {
    const body = registerInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const input = body.data;

    const strength = validatePassword(input.password, {
      email: input.email,
      name: input.displayName,
    });
    if (!strength.ok) {
      return reply.code(400).send({ error: 'invalid_password', issues: strength.issues });
    }
    if (!registerLimiter.hit(input.email)) return tooManyRequests(reply);

    // The same 202 whether or not the email has an Account, and one password hash either way.
    const accepted = () => reply.code(202).send({ status: 'ok' });
    const alreadyRegistered = async (language: 'uk' | 'en') => {
      await hasher.hash(input.password);
      sendLater(
        request,
        existingAccountMail(language, input.email, {
          login: `${webBaseUrl}/login`,
          reset: `${webBaseUrl}/reset-password`,
        }),
      );
      return accepted();
    };

    // Display name first: 409 whether or not the email is known, so it cannot probe for Accounts.
    if (await findUserByDisplayName(db, input.displayName)) {
      return reply.code(409).send({ error: 'display_name_taken' });
    }
    const existing = await findUserByEmail(db, input.email);
    if (existing) return alreadyRegistered(existing.interfaceLanguage);

    const created = await createUser(db, hasher, input);
    if (!created.ok) {
      if (created.reason === 'display_name_taken') {
        return reply.code(409).send({ error: 'display_name_taken' });
      }
      return alreadyRegistered(input.interfaceLanguage);
    }

    const token = newToken();
    await db.insert(oneTimeTokens).values({
      id: hashToken(token),
      userId: created.user.id,
      purpose: 'verify_email',
      expiresAt: new Date(clock() + VERIFICATION_TTL_MS),
    });
    sendLater(
      request,
      verificationMail(input.interfaceLanguage, input.email, `${webBaseUrl}/verify?token=${token}`),
    );
    return accepted();
  });

  // POST, not GET: mail scanners and link previews open links, and must not spend the token.
  api.post('/verify', async (request, reply) => {
    const body = tokenInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_token' });

    const verified = await db.transaction(async (tx) => {
      const [token] = await tx
        .delete(oneTimeTokens)
        .where(
          and(
            eq(oneTimeTokens.id, hashToken(body.data.token)),
            eq(oneTimeTokens.purpose, 'verify_email'),
          ),
        )
        .returning();
      if (!token || token.expiresAt.getTime() <= clock()) return false;
      await tx.update(users).set({ verifiedAt: now() }).where(eq(users.id, token.userId));
      return true;
    });
    if (!verified) return reply.code(400).send({ error: 'invalid_token' });
    return reply.code(204).send();
  });

  api.post('/login', { config: perIp }, async (request, reply) => {
    const body = loginInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const { email, password } = body.data;
    if (!loginLimiter.hit(email)) return tooManyRequests(reply);

    const invalid = () => reply.code(401).send({ error: 'invalid_credentials' });
    const user = await findUserByEmail(db, email);
    if (!user) {
      // Unknown email: hash anyway, so the response takes as long as a wrong password.
      await hasher.verifyAgainstNothing(password);
      return invalid();
    }
    const verdict = await hasher.verify(user, password);
    if (!verdict.ok) return invalid();
    if (verdict.rehash) {
      await db.update(users).set(verdict.rehash).where(eq(users.id, user.id));
    }

    const token = newToken();
    await db.insert(sessions).values({
      id: hashToken(token),
      userId: user.id,
      createdAt: now(),
      lastSeenAt: now(),
    });
    reply.setCookie(SESSION_COOKIE, token, {
      ...cookieOptions,
      maxAge: SESSION_ABSOLUTE_MS / 1000,
    });
    return toAccount(user);
  });

  api.post('/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
    clearSessionCookie(reply);
    return reply.code(204).send();
  });
}

function tooManyRequests(reply: FastifyReply) {
  return reply.code(429).header('retry-after', '900').send({ error: 'Too many requests' });
}
