import {
  changeDisplayNameInputSchema,
  changeEmailInputSchema,
  changePasswordInputSchema,
  deleteAccountInputSchema,
  tokenInputSchema,
  validatePassword,
} from '@yunakquiz/core';
import { and, eq, ne } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { countAdmins, lockAdminChanges } from './admin-users.ts';
import { changeEmailMail } from './account-mail-templates.ts';
import type { AuthDeps } from './auth.ts';
import { oneTimeTokens, sessions, users } from './db/schema.ts';
import { existingAccountMail } from './mail-templates.ts';
import type { Mailer } from './mailer.ts';
import { createKeyedLimiter } from './rate-limit.ts';
import { createSessionReader, SESSION_COOKIE, VERIFICATION_TTL_MS } from './session.ts';
import { hashToken, newToken } from './tokens.ts';
import { findUserByEmail, toAccount, uniqueViolation, type UserRow } from './users.ts';

/** Self-service Account changes: display name, password, email, delete. See ADR 0008. */

export async function accountRoutes(api: FastifyInstance, deps: AuthDeps) {
  const { db, mailer, hasher, now, webBaseUrl, secureCookies, limits } = deps;
  const { currentSession, clearSessionCookie } = createSessionReader({ db, now, secureCookies });
  // Per Account, so a stolen session cannot guess the current password without limit.
  const passwordLimiter = createKeyedLimiter({ ...limits.perEmail, now: () => now().getTime() });

  const sendLater = (request: FastifyRequest, mail: Parameters<Mailer['send']>[0]) => {
    mailer.send(mail).catch((error) => request.log.error(error, 'Sending mail failed'));
  };

  /** The signed-in user, or null after the 401 has been sent. */
  async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    const session = await currentSession(request, reply);
    if (session === 'guest') {
      await reply.code(401).send({ error: 'unauthenticated' });
      return null;
    }
    if (session === 'expired') {
      await reply.code(401).send({ error: 'session_expired' });
      return null;
    }
    return session;
  }

  /** Checks the current password, with a limit per Account. Sends the refusal and returns false when it fails. */
  async function confirmPassword(
    user: UserRow,
    password: string,
    reply: FastifyReply,
  ): Promise<boolean> {
    if (!passwordLimiter.hit(`user:${user.id}`)) {
      await reply.code(429).header('retry-after', '900').send({ error: 'Too many requests' });
      return false;
    }
    const verdict = await hasher.verify(user, password);
    if (!verdict.ok) {
      await reply.code(403).send({ error: 'invalid_current_password' });
      return false;
    }
    if (verdict.rehash) await db.update(users).set(verdict.rehash).where(eq(users.id, user.id));
    return true;
  }

  api.post('/account/display-name', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = changeDisplayNameInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    try {
      const [updated] = await db
        .update(users)
        .set({ displayName: body.data.displayName })
        .where(eq(users.id, user.id))
        .returning();
      return toAccount(updated!);
    } catch (error) {
      if (uniqueViolation(error) === undefined) throw error;
      return reply.code(409).send({ error: 'display_name_taken' });
    }
  });

  api.post('/account/password', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = changePasswordInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const { currentPassword, newPassword } = body.data;

    if (!(await confirmPassword(user, currentPassword, reply))) return;
    const strength = validatePassword(newPassword, { email: user.email, name: user.displayName });
    if (!strength.ok) {
      return reply.code(400).send({ error: 'invalid_password', issues: strength.issues });
    }

    const stored = await hasher.hash(newPassword);
    const keep = hashToken(request.cookies[SESSION_COOKIE] ?? '');
    await db.transaction(async (tx) => {
      await tx.update(users).set(stored).where(eq(users.id, user.id));
      // Every other session ends; this one stays, so the person is not logged out of the tab they used.
      await tx.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, keep)));
    });
    return reply.code(204).send();
  });

  // Always 202, whether or not the new address already has an Account (no enumeration).
  api.post('/account/email', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = changeEmailInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const { newEmail, currentPassword } = body.data;

    if (!(await confirmPassword(user, currentPassword, reply))) return;
    const accepted = () => reply.code(202).send({ status: 'ok' });

    if (newEmail === user.email) return accepted();
    const owner = await findUserByEmail(db, newEmail);
    if (owner) {
      sendLater(
        request,
        existingAccountMail(owner.interfaceLanguage, newEmail, {
          login: `${webBaseUrl}/login`,
          reset: `${webBaseUrl}/reset-password`,
        }),
      );
      return accepted();
    }

    const token = newToken();
    await db.transaction(async (tx) => {
      // One pending change per Account: a newer request replaces the older link.
      await tx
        .delete(oneTimeTokens)
        .where(and(eq(oneTimeTokens.userId, user.id), eq(oneTimeTokens.purpose, 'change_email')));
      await tx.insert(oneTimeTokens).values({
        id: hashToken(token),
        userId: user.id,
        purpose: 'change_email',
        newEmail,
        expiresAt: new Date(now().getTime() + VERIFICATION_TTL_MS),
      });
    });
    sendLater(
      request,
      changeEmailMail(
        user.interfaceLanguage,
        newEmail,
        `${webBaseUrl}/confirm-email?token=${token}`,
      ),
    );
    return accepted();
  });

  // POST, not GET, so mail scanners cannot spend the link. No session needed: the token is the proof.
  api.post('/account/email/confirm', async (request, reply) => {
    const body = tokenInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_token' });
    try {
      const changed = await db.transaction(async (tx) => {
        const [token] = await tx
          .delete(oneTimeTokens)
          .where(
            and(
              eq(oneTimeTokens.id, hashToken(body.data.token)),
              eq(oneTimeTokens.purpose, 'change_email'),
            ),
          )
          .returning();
        if (!token?.newEmail || token.expiresAt.getTime() <= now().getTime()) return false;
        const [owner] = await tx
          .select({ verifiedAt: users.verifiedAt })
          .from(users)
          .where(eq(users.id, token.userId));
        // Opening the link proves the address, so it also verifies an Account that was not yet.
        await tx
          .update(users)
          .set({ email: token.newEmail, verifiedAt: owner?.verifiedAt ?? now() })
          .where(eq(users.id, token.userId));
        return true;
      });
      if (!changed) return reply.code(400).send({ error: 'invalid_token' });
    } catch (error) {
      // The address got an Account after the mail went out.
      if (uniqueViolation(error) === undefined) throw error;
      return reply.code(400).send({ error: 'invalid_token' });
    }
    return reply.code(204).send();
  });

  api.post('/account/delete', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = deleteAccountInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });

    if (!(await confirmPassword(user, body.data.currentPassword, reply))) return;

    const deleted = await db.transaction(async (tx) => {
      // Same lock as the Admin routes, so two Admins cannot leave none (ADR 0008). The
      // role is read again under it: the session row above may be stale.
      await lockAdminChanges(tx);
      const [current] = await tx.select().from(users).where(eq(users.id, user.id));
      if (!current) return true;
      if (current.role === 'admin' && current.verifiedAt !== null && (await countAdmins(tx)) <= 1) {
        return false;
      }
      // Sessions and tokens go with the row (ON DELETE CASCADE).
      await tx.delete(users).where(eq(users.id, user.id));
      return true;
    });
    if (!deleted) return reply.code(409).send({ error: 'last_admin' });
    clearSessionCookie(reply);
    return reply.code(204).send();
  });
}
