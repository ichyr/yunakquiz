import {
  requestResetInputSchema,
  resetPasswordInputSchema,
  validatePassword,
} from '@yunakquiz/core';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Db } from './db/client.ts';
import { oneTimeTokens, sessions, users } from './db/schema.ts';
import type { Mailer } from './mailer.ts';
import { passwordResetMail } from './password-reset-mail.ts';
import type { PasswordHasher } from './passwords.ts';
import { createKeyedLimiter } from './rate-limit.ts';
import { hashToken, newToken } from './tokens.ts';
import { findUserByEmail } from './users.ts';

/** Design and reasons: ADR 0008. */

export const RESET_TTL_MS = 60 * 60 * 1000;

type PerIp = { max: number; timeWindow: string };
type PerEmail = { max: number; windowMs: number };

export type ResetLimits = {
  /** Per client address, on requesting a reset. */
  requestPerIp: PerIp;
  /** Per email address, on requesting a reset, whether or not the Account exists. */
  requestPerEmail: PerEmail;
  /** Per client address, on completing a reset. */
  completePerIp: PerIp;
};

// Stricter than login: every request can send a mail.
export const defaultResetLimits: ResetLimits = {
  requestPerIp: { max: 5, timeWindow: '15 minutes' },
  requestPerEmail: { max: 3, windowMs: 60 * 60 * 1000 },
  completePerIp: { max: 20, timeWindow: '15 minutes' },
};

export type ResetDeps = {
  db: Db;
  mailer: Mailer;
  hasher: PasswordHasher;
  now: () => Date;
  webBaseUrl: string;
  limits: ResetLimits;
};

const invalidToken = (reply: FastifyReply) => reply.code(400).send({ error: 'invalid_token' });

export async function passwordResetRoutes(api: FastifyInstance, deps: ResetDeps) {
  const { db, mailer, hasher, now, webBaseUrl, limits } = deps;
  const clock = () => now().getTime();
  const emailLimiter = createKeyedLimiter({ ...limits.requestPerEmail, now: clock });

  api.post(
    '/password-reset/request',
    { config: { rateLimit: limits.requestPerIp } },
    async (request, reply) => {
      const body = requestResetInputSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
      const { email } = body.data;
      // Counted before the lookup, so the limit says nothing about whether the Account exists.
      if (!emailLimiter.hit(email)) {
        return reply.code(429).header('retry-after', '3600').send({ error: 'Too many requests' });
      }

      const accepted = () => reply.code(202).send({ status: 'ok' });
      const user = await findUserByEmail(db, email);
      if (!user) {
        // The same two queries as below, so an unknown email takes as long as a known one.
        const nothing = hashToken(newToken());
        await db.delete(oneTimeTokens).where(eq(oneTimeTokens.id, nothing));
        await db.delete(oneTimeTokens).where(eq(oneTimeTokens.id, nothing));
        return accepted();
      }

      const token = newToken();
      // A newer link replaces any older one.
      await db
        .delete(oneTimeTokens)
        .where(and(eq(oneTimeTokens.userId, user.id), eq(oneTimeTokens.purpose, 'reset_password')));
      await db.insert(oneTimeTokens).values({
        id: hashToken(token),
        userId: user.id,
        purpose: 'reset_password',
        expiresAt: new Date(clock() + RESET_TTL_MS),
      });
      // After the response, so sending never changes how long the request takes.
      mailer
        .send(
          passwordResetMail(
            user.interfaceLanguage,
            user.email,
            `${webBaseUrl}/reset-password?token=${token}`,
          ),
        )
        .catch((error) => request.log.error(error, 'Sending mail failed'));
      return accepted();
    },
  );

  api.post(
    '/password-reset/complete',
    { config: { rateLimit: limits.completePerIp } },
    async (request, reply) => {
      const body = resetPasswordInputSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
      const { token, password } = body.data;
      const id = hashToken(token);

      // Look first without spending the token: a weak password must leave the link usable.
      const [row] = await db
        .select({ token: oneTimeTokens, user: users })
        .from(oneTimeTokens)
        .innerJoin(users, eq(users.id, oneTimeTokens.userId))
        .where(and(eq(oneTimeTokens.id, id), eq(oneTimeTokens.purpose, 'reset_password')));
      if (!row || row.token.expiresAt.getTime() <= clock()) return invalidToken(reply);

      const strength = validatePassword(password, {
        email: row.user.email,
        name: row.user.displayName,
      });
      if (!strength.ok) {
        return reply.code(400).send({ error: 'invalid_password', issues: strength.issues });
      }

      const stored = await hasher.hash(password);
      const done = await db.transaction(async (tx) => {
        // Deleting is the single-use check: of two simultaneous uses only one gets the row back.
        const [spent] = await tx
          .delete(oneTimeTokens)
          .where(and(eq(oneTimeTokens.id, id), eq(oneTimeTokens.purpose, 'reset_password')))
          .returning();
        if (!spent || spent.expiresAt.getTime() <= clock()) return false;
        await tx.update(users).set(stored).where(eq(users.id, spent.userId));
        await tx.delete(sessions).where(eq(sessions.userId, spent.userId));
        return true;
      });
      if (!done) return invalidToken(reply);
      return reply.code(204).send();
    },
  );
}
