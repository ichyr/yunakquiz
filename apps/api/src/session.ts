import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db/client.ts';
import { sessions, users } from './db/schema.ts';
import { hashToken } from './tokens.ts';
import type { UserRow } from './users.ts';

/** Design and reasons: ADR 0008. */

const HOUR = 60 * 60 * 1000;
export const SESSION_INACTIVITY_MS = HOUR;
export const SESSION_ABSOLUTE_MS = 12 * HOUR;
export const VERIFICATION_TTL_MS = 24 * HOUR;

export const SESSION_COOKIE = 'sid';

export type CurrentSession = UserRow | 'guest' | 'expired';

export function createSessionReader({
  db,
  now,
  secureCookies,
}: {
  db: Db;
  now: () => Date;
  secureCookies: boolean;
}) {
  const clock = () => now().getTime();
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
  } as const;
  const clearSessionCookie = (reply: FastifyReply) =>
    reply.clearCookie(SESSION_COOKIE, cookieOptions);

  /** The signed-in user, 'guest' without a cookie, or 'expired' for a cookie with no live session. */
  async function currentSession(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<CurrentSession> {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return 'guest';
    const id = hashToken(token);
    const [row] = await db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id));
    const time = clock();
    const live =
      row &&
      time - row.session.lastSeenAt.getTime() < SESSION_INACTIVITY_MS &&
      time - row.session.createdAt.getTime() < SESSION_ABSOLUTE_MS;
    if (!live) {
      if (row) await db.delete(sessions).where(eq(sessions.id, id));
      clearSessionCookie(reply);
      return 'expired';
    }
    await db.update(sessions).set({ lastSeenAt: now() }).where(eq(sessions.id, id));
    return row.user;
  }

  return { cookieOptions, clearSessionCookie, currentSession };
}
