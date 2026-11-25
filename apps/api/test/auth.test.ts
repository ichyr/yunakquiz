import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { oneTimeTokens, sessions, users } from '../src/db/schema.ts';
import { parsePeppers } from '../src/passwords.ts';
import { seedTestAccount } from '../seed/test-account.ts';
import {
  buildApp,
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

const apps: { close: () => Promise<undefined> }[] = [];
type TestApp = ReturnType<typeof buildAuthApp>;
const start = (options: Parameters<typeof buildAuthApp>[1] = {}): TestApp => {
  const built = buildAuthApp(db, options);
  apps.push(built.app);
  return built;
};

beforeEach(() => resetDatabase(db));
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
afterAll(() => close());

type Ctx = TestApp;
const post = (
  { app }: Ctx,
  url: string,
  body: unknown,
  { cookie, headers = csrfHeaders }: { cookie?: string; headers?: Record<string, string> } = {},
) =>
  app.inject({
    method: 'POST',
    url,
    payload: body as object,
    headers: { ...headers, ...(cookie && { cookie }) },
  });
const get = ({ app }: Ctx, url: string, cookie?: string) =>
  app.inject({ method: 'GET', url, ...(cookie && { headers: { cookie } }) });

const registration = (overrides: Record<string, unknown> = {}) => ({
  email: uniqueEmail(),
  displayName: `Скаут ${crypto.randomUUID().slice(0, 8)}`,
  password: strongPassword,
  interfaceLanguage: 'uk',
  ...overrides,
});

/** Register, read the mail, open the link: a verified Account. Returns its credentials. */
async function verifiedAccount(ctx: Ctx, overrides: Record<string, unknown> = {}) {
  const input = registration(overrides);
  await post(ctx, '/api/register', input);
  const mail = await waitForOutbox(ctx.mailer, input.email as string);
  const verified = await post(ctx, '/api/verify', { token: tokenIn(mail) });
  expect(verified.statusCode).toBe(204);
  return { email: input.email as string, password: input.password as string, input };
}

const login = (ctx: Ctx, email: string, password: string) =>
  post(ctx, '/api/login', { email, password });
const sessionCookie = (response: { cookies: { name: string; value: string }[] }) => {
  const cookie = response.cookies.find((c) => c.name === 'sid');
  return cookie ? `sid=${cookie.value}` : undefined;
};

describe('POST /api/register', () => {
  it('answers a generic 202, stores an unverified Account and mails a link in its language', async () => {
    const ctx = start();
    const input = registration({ interfaceLanguage: 'en' });

    const response = await post(ctx, '/api/register', input);

    expect(response.statusCode).toBe(202);
    const mail = await waitForOutbox(ctx.mailer, input.email as string);
    expect(mail.subject).toBe('Confirm your email address for Yunakquiz');
    expect(mail.text).toContain('https://quiz.test/verify?token=');
    const [row] = await db.select().from(users);
    expect(row).toMatchObject({ email: input.email, verifiedAt: null, role: 'user' });
  });

  it('mails Ukrainian text to a Ukrainian registrant', async () => {
    const ctx = start();
    const input = registration();
    await post(ctx, '/api/register', input);
    expect((await waitForOutbox(ctx.mailer, input.email as string)).subject).toContain(
      'Підтвердіть',
    );
  });

  it('stores an argon2id hash with a pepper version, never the password', async () => {
    const ctx = start();
    await post(ctx, '/api/register', registration());
    const [row] = await db.select().from(users);
    expect(row!.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row!.passwordHash).not.toContain(strongPassword);
    expect(row!.pepperVersion).toBe('v1');
  });

  it('gives an existing email the same response, creates nothing and mails "you already have an Account"', async () => {
    const ctx = start();
    const first = registration({ interfaceLanguage: 'en' });
    const fresh = await post(ctx, '/api/register', first);
    await waitForOutbox(ctx.mailer, first.email as string);

    const again = await post(
      ctx,
      '/api/register',
      registration({ email: (first.email as string).toUpperCase(), interfaceLanguage: 'en' }),
    );

    expect(again.statusCode).toBe(fresh.statusCode);
    expect(again.body).toBe(fresh.body);
    await waitUntil(() =>
      expect(ctx.mailer.outbox.map((m) => m.subject)).toContain(
        'You already have a Yunakquiz Account',
      ),
    );
    expect(await db.select().from(users)).toHaveLength(1);
    const notice = ctx.mailer.outbox.find((m) => m.subject.startsWith('You already'))!;
    expect(notice.text).toContain('https://quiz.test/login');
    expect(notice.text).toContain('https://quiz.test/reset-password');
  });

  it('answers a taken display name explicitly, whatever its case', async () => {
    const ctx = start();
    await post(ctx, '/api/register', registration({ displayName: 'Богун' }));

    const response = await post(ctx, '/api/register', registration({ displayName: 'БОГУН' }));

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'display_name_taken' });
  });

  it('rejects a weak password with the reason codes', async () => {
    const ctx = start();
    const email = uniqueEmail();
    const local = email.split('@')[0]!;

    const response = await post(
      ctx,
      '/api/register',
      registration({ email, password: `${local}-and-more-text` }),
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'invalid_password', issues: ['contains_email'] });
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('rejects a malformed body', async () => {
    const ctx = start();
    expect((await post(ctx, '/api/register', { email: 'nope' })).statusCode).toBe(400);
  });
});

describe('POST /api/verify', () => {
  it('verifies the Account once; the same link then fails', async () => {
    const ctx = start();
    const input = registration();
    await post(ctx, '/api/register', input);
    const token = tokenIn(await waitForOutbox(ctx.mailer, input.email as string));

    expect((await post(ctx, '/api/verify', { token })).statusCode).toBe(204);
    const [row] = await db.select().from(users);
    expect(row!.verifiedAt).not.toBeNull();

    const second = await post(ctx, '/api/verify', { token });
    expect(second.statusCode).toBe(400);
    expect(second.json()).toEqual({ error: 'invalid_token' });
  });

  it('stores only the hash of the token', async () => {
    const ctx = start();
    const input = registration();
    await post(ctx, '/api/register', input);
    const token = tokenIn(await waitForOutbox(ctx.mailer, input.email as string));

    const [row] = await db.select().from(oneTimeTokens);
    expect(row!.id).not.toBe(token);
    expect(row!.id).toBe(createHash('sha256').update(token).digest('base64url'));
    expect(token).toHaveLength(43);
  });

  it('rejects the link after 24 hours', async () => {
    const ctx = start();
    const input = registration();
    await post(ctx, '/api/register', input);
    const token = tokenIn(await waitForOutbox(ctx.mailer, input.email as string));

    ctx.advance(24 * HOUR + 1000);

    expect((await post(ctx, '/api/verify', { token })).statusCode).toBe(400);
    const [row] = await db.select().from(users);
    expect(row!.verifiedAt).toBeNull();
  });

  it('accepts the link just before 24 hours', async () => {
    const ctx = start();
    const input = registration();
    await post(ctx, '/api/register', input);
    const token = tokenIn(await waitForOutbox(ctx.mailer, input.email as string));
    ctx.advance(24 * HOUR - 1000);
    expect((await post(ctx, '/api/verify', { token })).statusCode).toBe(204);
  });

  it('rejects an unknown token', async () => {
    const ctx = start();
    expect((await post(ctx, '/api/verify', { token: 'nope' })).statusCode).toBe(400);
  });
});

describe('POST /api/login', () => {
  it('logs in, returns the Account and sets a hardened cookie holding only a hashed id in the database', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);

    const response = await login(ctx, email, password);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ email, role: 'user', verified: true });
    expect(response.json()).not.toHaveProperty('passwordHash');
    const header = String(response.headers['set-cookie']);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).not.toContain('Secure');
    const value = sessionCookie(response)!.slice('sid='.length);
    const [row] = await db.select().from(sessions);
    expect(row!.id).not.toBe(value);
    expect(row!.id).toBe(createHash('sha256').update(value).digest('base64url'));
  });

  it('marks the cookie Secure in production', async () => {
    const ctx = start({ secureCookies: true });
    const { email, password } = await verifiedAccount(ctx);
    const response = await login(ctx, email, password);
    expect(String(response.headers['set-cookie'])).toContain('Secure');
  });

  it('lets an unverified Account log in and says it is unverified', async () => {
    const ctx = start();
    const input = registration();
    await post(ctx, '/api/register', input);

    const response = await login(ctx, input.email as string, strongPassword);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ verified: false });
  });

  it('answers a wrong password and an unknown email identically', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);

    const wrong = await login(ctx, email, `${password} but wrong`);
    const unknown = await login(ctx, uniqueEmail(), password);

    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(unknown.body).toBe(wrong.body);
    expect(unknown.json()).toEqual({ error: 'invalid_credentials' });
    expect(unknown.headers['set-cookie']).toBeUndefined();
  });

  it('takes about as long for an unknown email as for a wrong password', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);
    const time = async (address: string) => {
      const started = performance.now();
      await login(ctx, address, `${password} but wrong`);
      return performance.now() - started;
    };
    const median = (values: number[]) => values.toSorted((a, b) => a - b)[2]!;
    await time(email); // warm up the hasher

    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      known.push(await time(email));
      unknown.push(await time(uniqueEmail()));
    }

    // Without a dummy hash an unknown email returns in about a millisecond, not tens.
    expect(median(unknown)).toBeGreaterThan(median(known) * 0.5);
  });

  it('does not tell a retired pepper from a wrong password', async () => {
    const first = start({ passwordPeppers: 'v1:pepper-number-one-0123456' });
    const { email, password } = await verifiedAccount(first);
    const other = start({ passwordPeppers: 'v9:pepper-number-nine-012345' });

    const response = await login(other, email, password);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid_credentials' });
  });
});

describe('pepper rotation', () => {
  const v1 = 'v1:pepper-number-one-0123456';
  const v2 = 'v2:pepper-number-two-0123456';
  const pepperVersion = async () => (await db.select().from(users))[0]!.pepperVersion;

  it('rehashes under the new pepper on login, and the old pepper can then be retired', async () => {
    const old = start({ passwordPeppers: v1 });
    const { email, password } = await verifiedAccount(old);
    const [before] = await db.select().from(users);
    expect(before!.pepperVersion).toBe('v1');

    const rotated = start({ passwordPeppers: `${v2},${v1}` });
    expect((await login(rotated, email, password)).statusCode).toBe(200);

    const [after] = await db.select().from(users);
    expect(after!.pepperVersion).toBe('v2');
    expect(after!.passwordHash).not.toBe(before!.passwordHash);
    expect(await pepperVersion()).toBe('v2');

    const retired = start({ passwordPeppers: v2 });
    expect((await login(retired, email, password)).statusCode).toBe(200);
  });

  it('keeps the hash while the pepper and parameters are current', async () => {
    const ctx = start({ passwordPeppers: v1 });
    const { email, password } = await verifiedAccount(ctx);
    const [before] = await db.select().from(users);
    await login(ctx, email, password);
    const [after] = await db.select().from(users);
    expect(after!.passwordHash).toBe(before!.passwordHash);
  });

  it('rehashes a hash made with weaker parameters', async () => {
    const ctx = start({ passwordPeppers: v1 });
    const { email, password } = await verifiedAccount(ctx);
    const { hash } = await import('@node-rs/argon2');
    const weak = await hash(password.normalize('NFKC'), {
      algorithm: 2,
      memoryCost: 8_192,
      timeCost: 1,
      parallelism: 1,
      secret: Buffer.from('pepper-number-one-0123456'),
    });
    await db.update(users).set({ passwordHash: weak });

    expect((await login(ctx, email, password)).statusCode).toBe(200);

    const [row] = await db.select().from(users);
    expect(row!.passwordHash).toMatch(/m=19456,t=2,p=1/);
  });
});

describe('GET /api/me and POST /api/logout', () => {
  it('answers null for a Guest', async () => {
    const ctx = start();
    const response = await get(ctx, '/api/me');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toBeNull();
  });

  it('returns the signed-in Account', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);
    const cookie = sessionCookie(await login(ctx, email, password))!;

    const response = await get(ctx, '/api/me', cookie);

    expect(response.json()).toMatchObject({ email, verified: true, interfaceLanguage: 'uk' });
  });

  it('logout deletes the session row, so the stolen cookie stops working', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);
    const cookie = sessionCookie(await login(ctx, email, password))!;

    const out = await post(ctx, '/api/logout', {}, { cookie });

    expect(out.statusCode).toBe(204);
    expect(await db.select().from(sessions)).toHaveLength(0);
    const again = await get(ctx, '/api/me', cookie);
    expect(again.statusCode).toBe(401);
    expect(again.json()).toEqual({ error: 'session_expired' });
  });

  it('logout without a session is still 204', async () => {
    const ctx = start();
    expect((await post(ctx, '/api/logout', {})).statusCode).toBe(204);
  });

  it('ends a session after 1 hour of inactivity', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);
    const cookie = sessionCookie(await login(ctx, email, password))!;

    ctx.advance(HOUR - 1000);
    expect((await get(ctx, '/api/me', cookie)).statusCode).toBe(200);
    ctx.advance(HOUR + 1000);

    expect((await get(ctx, '/api/me', cookie)).statusCode).toBe(401);
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it('keeps a session alive while it is used, but ends it after 12 hours in total', async () => {
    const ctx = start();
    const { email, password } = await verifiedAccount(ctx);
    const cookie = sessionCookie(await login(ctx, email, password))!;

    for (let i = 0; i < 11; i += 1) {
      ctx.advance(50 * 60 * 1000);
      expect((await get(ctx, '/api/me', cookie)).statusCode).toBe(200);
    }
    // 11 x 50 min = 9 h 10 min in. Five more steps pass 12 h while staying active.
    ctx.advance(50 * 60 * 1000);
    await get(ctx, '/api/me', cookie);
    ctx.advance(50 * 60 * 1000);
    await get(ctx, '/api/me', cookie);
    ctx.advance(50 * 60 * 1000);
    await get(ctx, '/api/me', cookie);
    ctx.advance(50 * 60 * 1000);

    expect((await get(ctx, '/api/me', cookie)).statusCode).toBe(401);
  });

  it('answers 401 and clears the cookie for a cookie that matches no session', async () => {
    const ctx = start();
    const response = await get(ctx, '/api/me', 'sid=forged');
    expect(response.statusCode).toBe(401);
    expect(String(response.headers['set-cookie'])).toContain('sid=;');
  });
});

describe('CSRF header', () => {
  it.each(['/api/register', '/api/login', '/api/logout', '/api/verify'])(
    'rejects POST %s without X-Requested-With',
    async (url) => {
      const ctx = start();
      const response = await post(ctx, url, {}, { headers: {} });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: 'csrf_header_required' });
    },
  );

  it('does not demand it for GET', async () => {
    const ctx = start();
    expect((await get(ctx, '/api/me')).statusCode).toBe(200);
  });
});

describe('CORS', () => {
  const preflight = (ctx: Ctx, origin: string) =>
    ctx.app.inject({
      method: 'OPTIONS',
      url: '/api/login',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-requested-with',
      },
    });

  it('allows credentials for an allowlisted origin', async () => {
    const ctx = start();
    const response = await preflight(ctx, 'https://quiz.test');
    expect(response.headers['access-control-allow-origin']).toBe('https://quiz.test');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('gives any other origin no CORS headers', async () => {
    const ctx = start();
    const response = await preflight(ctx, 'https://evil.test');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rate limits', () => {
  it('limits register per IP', async () => {
    const ctx = start({ authLimits: { perIp: { max: 2, timeWindow: '1 minute' } } });
    const codes = [];
    for (let i = 0; i < 3; i += 1) {
      codes.push((await post(ctx, '/api/register', registration())).statusCode);
    }
    expect(codes).toEqual([202, 202, 429]);
  });

  it('limits login per IP', async () => {
    const ctx = start({ authLimits: { perIp: { max: 2, timeWindow: '1 minute' } } });
    const codes = [];
    for (let i = 0; i < 3; i += 1) {
      codes.push((await login(ctx, uniqueEmail(), strongPassword)).statusCode);
    }
    expect(codes).toEqual([401, 401, 429]);
  });

  it('limits login per email, whether or not the Account exists, and across IPs', async () => {
    const ctx = start({ authLimits: { perEmail: { max: 2, windowMs: HOUR } } });
    const unknown = uniqueEmail();
    const attempt = (email: string, remoteAddress: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/login',
        payload: { email, password: 'whatever' },
        headers: csrfHeaders,
        remoteAddress,
      });

    const codes = [
      (await attempt(unknown, '10.0.0.1')).statusCode,
      (await attempt(unknown, '10.0.0.2')).statusCode,
      (await attempt(unknown.toUpperCase(), '10.0.0.3')).statusCode,
    ];

    expect(codes).toEqual([401, 401, 429]);
    // Another email is unaffected.
    expect((await attempt(uniqueEmail(), '10.0.0.1')).statusCode).toBe(401);
  });

  it('limits register per email', async () => {
    const ctx = start({ authLimits: { perEmail: { max: 1, windowMs: HOUR } } });
    const email = uniqueEmail();
    const codes = [
      (await post(ctx, '/api/register', registration({ email }))).statusCode,
      (await post(ctx, '/api/register', registration({ email }))).statusCode,
    ];
    expect(codes).toEqual([202, 429]);
  });
});

describe('startup without a pepper', () => {
  it('refuses to build the app', () => {
    expect(() => buildApp({ db, passwordPeppers: '' })).toThrow(/PASSWORD_PEPPERS/);
  });

  it.each(['', '  ', 'noversion', 'v1:short', 'v1:' + 'a'.repeat(20) + ',v1:' + 'b'.repeat(20)])(
    'rejects the pepper list %j',
    (raw) => {
      expect(() => parsePeppers(raw)).toThrow(/PASSWORD_PEPPERS/);
    },
  );

  it('accepts a versioned list and treats the first entry as current', () => {
    expect(parsePeppers(testPeppers + ',v0:' + 'z'.repeat(20))[0]?.version).toBe('v1');
  });

  it('makes the server process exit before listening', () => {
    const { PASSWORD_PEPPERS: _omitted, ...env } = process.env;
    const result = spawnSync('node', ['src/server.ts'], {
      env: {
        ...env,
        DATABASE_URL: 'postgres://unused:unused@127.0.0.1:1/unused',
        MAIL_FROM: 'noreply@yunakquiz.test',
      },
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('PASSWORD_PEPPERS');
  });
});

describe('test-only Account seed', () => {
  it('creates a verified Account that can log in with its known password', async () => {
    const ctx = start();
    const email = uniqueEmail();

    await seedTestAccount(db, {
      peppers: testPeppers,
      email,
      displayName: 'Тестовий скаут',
      password: 'a known password for e2e runs',
    });

    const response = await login(ctx, email, 'a known password for e2e runs');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ verified: true, role: 'user' });
  });

  it('refuses to run in production', async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(
        seedTestAccount(db, {
          peppers: testPeppers,
          email: uniqueEmail(),
          displayName: 'Nope',
          password: 'a known password for e2e runs',
        }),
      ).rejects.toThrow(/production/);
    } finally {
      if (before === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = before;
    }
  });
});

async function waitUntil(assertion: () => void, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}
