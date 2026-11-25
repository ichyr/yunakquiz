import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oneTimeTokens, sessions, users } from '../src/db/schema.ts';
import { createPasswordHasher, parsePeppers } from '../src/passwords.ts';
import { createUser } from '../src/users.ts';
import {
  buildAuthApp,
  csrfHeaders,
  strongPassword,
  testPeppers,
  tokenIn,
  uniqueEmail,
  waitForOutbox,
} from './app.ts';
import { createTestDb, resetDatabase } from './database.ts';

const { db, close } = createTestDb();
const HOUR = 60 * 60 * 1000;
const newPassword = 'a completely different phrase of words';

const apps: { close: () => Promise<undefined> }[] = [];
type Ctx = ReturnType<typeof buildAuthApp>;
const start = (options: Parameters<typeof buildAuthApp>[1] = {}): Ctx => {
  const built = buildAuthApp(db, options);
  apps.push(built.app);
  return built;
};

beforeEach(() => resetDatabase(db));
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
afterAll(() => close());

const post = ({ app }: Ctx, url: string, body: unknown, remoteAddress?: string) =>
  app.inject({
    method: 'POST',
    url,
    payload: body as object,
    headers: csrfHeaders,
    ...(remoteAddress && { remoteAddress }),
  });
const requestReset = (ctx: Ctx, email: string, remoteAddress?: string) =>
  post(ctx, '/api/password-reset/request', { email }, remoteAddress);
const completeReset = (ctx: Ctx, token: string, password: string) =>
  post(ctx, '/api/password-reset/complete', { token, password });
const login = (ctx: Ctx, email: string, password: string) =>
  post(ctx, '/api/login', { email, password });

async function account(overrides: { language?: 'uk' | 'en'; peppers?: string } = {}) {
  const email = uniqueEmail();
  const displayName = `Скаут ${crypto.randomUUID().slice(0, 8)}`;
  const hasher = createPasswordHasher(parsePeppers(overrides.peppers ?? testPeppers));
  const created = await createUser(db, hasher, {
    email,
    displayName,
    password: strongPassword,
    interfaceLanguage: overrides.language ?? 'uk',
    verifiedAt: new Date(),
  });
  if (!created.ok) throw new Error('fixture failed');
  return { email, displayName, id: created.user.id };
}

/** Request a reset for a real Account and return the token from its mail. */
async function mailedToken(ctx: Ctx, email: string) {
  await requestReset(ctx, email);
  return tokenIn(await waitForOutbox(ctx.mailer, email));
}

describe('POST /api/password-reset/request', () => {
  it('answers the same 202 for a known and an unknown email', async () => {
    const ctx = start();
    const { email } = await account();

    const known = await requestReset(ctx, email);
    const unknown = await requestReset(ctx, uniqueEmail());

    expect(known.statusCode).toBe(202);
    expect(unknown.statusCode).toBe(202);
    expect(unknown.body).toBe(known.body);
    expect(unknown.headers['set-cookie']).toBeUndefined();
  });

  it('mails a link to a known email in its stored Interface Language', async () => {
    const ctx = start();
    const uk = await account({ language: 'uk' });
    const en = await account({ language: 'en' });

    await requestReset(ctx, uk.email);
    await requestReset(ctx, en.email);

    const ukMail = await waitForOutbox(ctx.mailer, uk.email);
    const enMail = await waitForOutbox(ctx.mailer, en.email);
    expect(ukMail.subject).toContain('пароля');
    expect(enMail.subject.toLowerCase()).toContain('password');
    expect(ukMail.text).toContain('https://quiz.test/reset-password?token=');
    expect(tokenIn(enMail)).toHaveLength(43);
  });

  it('sends no mail for an unknown email', async () => {
    const ctx = start();
    const unknown = uniqueEmail();
    const known = await account();

    await requestReset(ctx, unknown);
    await requestReset(ctx, known.email);
    await waitForOutbox(ctx.mailer, known.email);

    expect(ctx.mailer.outbox.some((mail) => mail.to === unknown)).toBe(false);
  });

  it('stores only the hash of the token', async () => {
    const ctx = start();
    const { email, id } = await account();

    const token = await mailedToken(ctx, email);

    const rows = await db.select().from(oneTimeTokens).where(eq(oneTimeTokens.userId, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(createHash('sha256').update(token).digest('base64url'));
    expect(rows[0]!.purpose).toBe('reset_password');
  });

  it('makes a newer link replace the older one', async () => {
    const ctx = start();
    const { email } = await account();
    const first = await mailedToken(ctx, email);

    await requestReset(ctx, email);
    await vi.waitFor(() => expect(ctx.mailer.outbox.filter((m) => m.to === email)).toHaveLength(2));
    const second = tokenIn(ctx.mailer.outbox.filter((m) => m.to === email)[1]!);

    expect((await completeReset(ctx, first, newPassword)).statusCode).toBe(400);
    expect((await completeReset(ctx, second, newPassword)).statusCode).toBe(204);
  });

  it('takes about as long for an unknown email as for a known one', async () => {
    const ctx = start();
    const { email } = await account();
    // One request address each, so the per-IP limit never gets in the way.
    const time = async (address: string) => {
      const started = performance.now();
      await requestReset(ctx, address);
      return performance.now() - started;
    };
    const median = (values: number[]) => values.toSorted((a, b) => a - b)[2]!;
    await time(email);

    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      known.push(await time(email));
      unknown.push(await time(uniqueEmail()));
    }

    // Generous: it catches an unknown email returning at once, not a few milliseconds.
    expect(median(unknown)).toBeGreaterThan(median(known) * 0.3);
  });

  it('rejects a malformed body', async () => {
    const ctx = start();
    expect((await post(ctx, '/api/password-reset/request', { email: 'nope' })).statusCode).toBe(
      400,
    );
    expect((await post(ctx, '/api/password-reset/request', {})).statusCode).toBe(400);
  });
});

describe('POST /api/password-reset/complete', () => {
  it('sets the new password, which then logs in; the old one no longer does', async () => {
    const ctx = start();
    const { email } = await account();
    const token = await mailedToken(ctx, email);

    const done = await completeReset(ctx, token, newPassword);

    expect(done.statusCode).toBe(204);
    expect((await login(ctx, email, newPassword)).statusCode).toBe(200);
    expect((await login(ctx, email, strongPassword)).statusCode).toBe(401);
  });

  it('works once: the same link then fails', async () => {
    const ctx = start();
    const { email } = await account();
    const token = await mailedToken(ctx, email);

    expect((await completeReset(ctx, token, newPassword)).statusCode).toBe(204);
    const again = await completeReset(ctx, token, 'yet another long phrase here');

    expect(again.statusCode).toBe(400);
    expect(again.json()).toEqual({ error: 'invalid_token' });
    expect((await login(ctx, email, newPassword)).statusCode).toBe(200);
  });

  it('allows only one of two simultaneous uses of a link', async () => {
    const ctx = start();
    const { email } = await account();
    const token = await mailedToken(ctx, email);

    const codes = (
      await Promise.all([
        completeReset(ctx, token, newPassword),
        completeReset(ctx, token, 'a second long phrase for racing'),
      ])
    ).map((response) => response.statusCode);

    expect(codes.toSorted()).toEqual([204, 400]);
  });

  it('rejects the link after 1 hour', async () => {
    const ctx = start();
    const { email } = await account();
    const token = await mailedToken(ctx, email);
    ctx.advance(HOUR);

    const late = await completeReset(ctx, token, newPassword);

    expect(late.statusCode).toBe(400);
    expect(late.json()).toEqual({ error: 'invalid_token' });
    expect((await login(ctx, email, newPassword)).statusCode).toBe(401);
  });

  it('accepts the link 59 minutes in', async () => {
    const ctx = start();
    const { email } = await account();
    const token = await mailedToken(ctx, email);
    ctx.advance(HOUR - 60_000);

    expect((await completeReset(ctx, token, newPassword)).statusCode).toBe(204);
  });

  it('rejects an unknown token and a verification token', async () => {
    const ctx = start();
    const { id } = await account();
    const verifyToken = 'verification-token-for-the-test';
    await db.insert(oneTimeTokens).values({
      id: createHash('sha256').update(verifyToken).digest('base64url'),
      userId: id,
      purpose: 'verify_email',
      expiresAt: new Date(Date.now() + HOUR),
    });

    expect((await completeReset(ctx, 'unknown', newPassword)).statusCode).toBe(400);
    expect((await completeReset(ctx, verifyToken, newPassword)).statusCode).toBe(400);
  });

  it('deletes every session of the User, and no one else is touched', async () => {
    const ctx = start();
    const { email } = await account();
    const other = await account();
    await login(ctx, email, strongPassword);
    await login(ctx, email, strongPassword);
    await login(ctx, other.email, strongPassword);
    const token = await mailedToken(ctx, email);

    await completeReset(ctx, token, newPassword);

    const rows = await db.select().from(sessions);
    expect(rows.map((row) => row.userId)).toEqual([other.id]);
  });

  it('logs out the old cookie', async () => {
    const ctx = start();
    const { email } = await account();
    const loggedIn = await login(ctx, email, strongPassword);
    const sid = loggedIn.cookies.find((cookie) => cookie.name === 'sid')!.value;
    const token = await mailedToken(ctx, email);

    await completeReset(ctx, token, newPassword);

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `sid=${sid}` },
    });
    expect(me.statusCode).toBe(401);
  });

  it('rejects a weak password with reason codes and keeps the link usable', async () => {
    const ctx = start();
    const { email, displayName } = await account();
    const token = await mailedToken(ctx, email);
    const local = email.split('@')[0]!;

    const short = await completeReset(ctx, token, 'short');
    const withEmail = await completeReset(ctx, token, `${local} and many more words`);
    const withName = await completeReset(ctx, token, `${displayName} is my name too`);

    expect(short.statusCode).toBe(400);
    expect(short.json()).toEqual({ error: 'invalid_password', issues: ['too_short', 'common'] });
    expect(withEmail.json().issues).toContain('contains_email');
    expect(withName.json().issues).toContain('contains_name');
    expect((await completeReset(ctx, token, newPassword)).statusCode).toBe(204);
  });

  it('rejects a password over 1024 characters before hashing it', async () => {
    const ctx = start();
    const { email } = await account();
    const token = await mailedToken(ctx, email);

    const response = await completeReset(ctx, token, 'a'.repeat(1025));

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'invalid_input' });
    expect((await completeReset(ctx, token, newPassword)).statusCode).toBe(204);
  });

  it('answers a weak password with the same error as a bad token when the token is bad', async () => {
    const ctx = start();

    const response = await completeReset(ctx, 'unknown', 'short');

    expect(response.json()).toEqual({ error: 'invalid_token' });
  });

  it('hashes under the current pepper', async () => {
    const { email, id } = await account({ peppers: 'v1:test-pepper-one-0123456789' });
    const ctx = start({
      passwordPeppers: 'v2:test-pepper-two-0123456789,v1:test-pepper-one-0123456789',
    });
    const token = await mailedToken(ctx, email);

    await completeReset(ctx, token, newPassword);

    const [row] = await db.select().from(users).where(eq(users.id, id));
    expect(row!.pepperVersion).toBe('v2');
    expect(row!.passwordHash).not.toContain(newPassword);
    expect((await login(ctx, email, newPassword)).statusCode).toBe(200);
  });

  it('does not verify an unverified Account', async () => {
    const ctx = start();
    const email = uniqueEmail();
    const hasher = createPasswordHasher(parsePeppers(testPeppers));
    const created = await createUser(db, hasher, {
      email,
      displayName: `Скаут ${crypto.randomUUID().slice(0, 8)}`,
      password: strongPassword,
      interfaceLanguage: 'en',
    });
    if (!created.ok) throw new Error('fixture failed');
    const token = await mailedToken(ctx, email);

    expect((await completeReset(ctx, token, newPassword)).statusCode).toBe(204);

    const [row] = await db.select().from(users).where(eq(users.id, created.user.id));
    expect(row!.verifiedAt).toBeNull();
  });
});

describe('reset rate limits', () => {
  it('limits requests per IP, for known and unknown emails alike', async () => {
    const ctx = start({ resetLimits: { requestPerIp: { max: 2, timeWindow: '1 minute' } } });

    const codes = [];
    for (let i = 0; i < 3; i += 1) codes.push((await requestReset(ctx, uniqueEmail())).statusCode);

    expect(codes).toEqual([202, 202, 429]);
  });

  it('limits requests per email across IPs, whether or not the Account exists', async () => {
    const ctx = start({ resetLimits: { requestPerEmail: { max: 2, windowMs: HOUR } } });
    const known = await account();
    const unknown = uniqueEmail();

    for (const email of [known.email, unknown]) {
      const codes = [
        (await requestReset(ctx, email, '10.0.0.1')).statusCode,
        (await requestReset(ctx, email, '10.0.0.2')).statusCode,
        (await requestReset(ctx, email.toUpperCase(), '10.0.0.3')).statusCode,
      ];
      expect(codes).toEqual([202, 202, 429]);
    }
    expect((await requestReset(ctx, uniqueEmail(), '10.0.0.1')).statusCode).toBe(202);
  });

  it('limits completion attempts per IP', async () => {
    const ctx = start({ resetLimits: { completePerIp: { max: 2, timeWindow: '1 minute' } } });

    const codes = [];
    for (let i = 0; i < 3; i += 1)
      codes.push((await completeReset(ctx, 'x', newPassword)).statusCode);

    expect(codes).toEqual([400, 400, 429]);
  });

  it('has stricter defaults than login', async () => {
    const ctx = start();
    const codes = [];
    for (let i = 0; i < 6; i += 1) codes.push((await requestReset(ctx, uniqueEmail())).statusCode);

    expect(codes).toContain(429);
  });
});
