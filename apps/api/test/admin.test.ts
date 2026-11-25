import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { oneTimeTokens, sessions, users } from '../src/db/schema.ts';
import { createPasswordHasher, parsePeppers } from '../src/passwords.ts';
import { parseRegistrationMode } from '../src/registration-mode.ts';
import { createUser } from '../src/users.ts';
import { seedFirstAdmin } from '../seed/first-admin.ts';
import {
  buildAuthApp,
  csrfHeaders,
  strongPassword,
  testPeppers,
  uniqueEmail,
  waitForOutbox,
} from './app.ts';
import { createTestDb, resetDatabase } from './database.ts';

const { db, close } = createTestDb();
const hasher = createPasswordHasher(parsePeppers(testPeppers));

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

type Role = 'user' | 'admin';

async function account(role: Role, { verified = true }: { verified?: boolean } = {}) {
  const email = uniqueEmail();
  const created = await createUser(db, hasher, {
    email,
    displayName: `Скаут ${crypto.randomUUID().slice(0, 8)}`,
    password: strongPassword,
    interfaceLanguage: 'uk',
    role,
    ...(verified && { verifiedAt: new Date() }),
  });
  if (!created.ok) throw new Error(created.reason);
  return { id: created.user.id, email, displayName: created.user.displayName };
}

async function loginAs(ctx: TestApp, email: string) {
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/api/login',
    payload: { email, password: strongPassword },
    headers: csrfHeaders,
  });
  expect(response.statusCode).toBe(200);
  const sid = response.cookies.find((c) => c.name === 'sid')!;
  return `sid=${sid.value}`;
}

const call = (
  ctx: TestApp,
  method: 'GET' | 'PATCH' | 'DELETE',
  url: string,
  cookie?: string,
  payload?: object,
) =>
  ctx.app.inject({
    method,
    url,
    headers: { ...csrfHeaders, ...(cookie && { cookie }) },
    ...(payload && { payload }),
  });

async function adminSession(ctx: TestApp) {
  const admin = await account('admin');
  return { ...admin, cookie: await loginAs(ctx, admin.email) };
}

describe('every admin route refuses a Guest, a User and an unverified Admin with 403', () => {
  const routes = [
    ['GET', '/api/admin/users'],
    ['PATCH', '/api/admin/users/1/role', { role: 'admin' }],
    ['DELETE', '/api/admin/users/1'],
  ] as const;

  for (const [method, url, payload] of routes) {
    it(`${method} ${url}`, async () => {
      const ctx = start();
      const target = await account('user');
      const path = url.replace('/1', `/${target.id}`);
      const user = await account('user');
      const unverifiedAdmin = await account('admin', { verified: false });

      const guest = await call(ctx, method, path, undefined, payload);
      expect(guest.statusCode).toBe(403);
      for (const who of [user, unverifiedAdmin]) {
        const cookie = await loginAs(ctx, who.email);
        const response = await call(ctx, method, path, cookie, payload);
        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({ error: 'forbidden' });
      }
      // Nothing changed.
      const [row] = await db.select().from(users).where(eq(users.id, target.id));
      expect(row?.role).toBe('user');
    });
  }

  it('answers 401 session_expired to a dead cookie', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    ctx.advance(2 * 60 * 60 * 1000);
    const response = await call(ctx, 'GET', '/api/admin/users', admin.cookie);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'session_expired' });
  });

  it('stops serving an Admin who was demoted, on the very next request', async () => {
    const ctx = start();
    const first = await adminSession(ctx);
    const second = await adminSession(ctx);
    expect((await call(ctx, 'GET', '/api/admin/users', second.cookie)).statusCode).toBe(200);
    await call(ctx, 'PATCH', `/api/admin/users/${second.id}/role`, first.cookie, { role: 'user' });
    expect((await call(ctx, 'GET', '/api/admin/users', second.cookie)).statusCode).toBe(403);
  });
});

describe('GET /api/admin/users', () => {
  it('lists name, email, role, verified, created date and Quiz count, never a hash', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const unverified = await account('user', { verified: false });

    const response = await call(ctx, 'GET', '/api/admin/users', admin.cookie);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ total: 2, page: 1, pageSize: 20, adminCount: 1 });
    const row = body.items.find((item: { id: number }) => item.id === unverified.id);
    expect(row).toEqual({
      id: unverified.id,
      email: unverified.email,
      displayName: unverified.displayName,
      role: 'user',
      verified: false,
      createdAt: expect.any(String),
      quizCount: 0,
    });
    expect(response.body).not.toContain('argon2');
    expect(response.body).not.toMatch(/password/i);
  });

  it('paginates newest first', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    for (let i = 0; i < 24; i++) await account('user');

    const first = (await call(ctx, 'GET', '/api/admin/users', admin.cookie)).json();
    const second = (await call(ctx, 'GET', '/api/admin/users?page=2', admin.cookie)).json();
    expect(first.total).toBe(25);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(5);
    const ids = [...first.items, ...second.items].map((item: { id: number }) => item.id);
    expect(new Set(ids).size).toBe(25);
    expect(ids).toEqual(ids.toSorted((a, b) => b - a));
  });

  it('searches by display name or email, case-insensitively, treating % and _ as text', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const byName = await account('user');
    await db
      .update(users)
      .set({ displayName: 'Богдан Хмельницький' })
      .where(eq(users.id, byName.id));
    const byEmail = await account('user');
    await db.update(users).set({ email: 'zorianyi@kurin.test' }).where(eq(users.id, byEmail.id));

    const search = async (q: string) =>
      (await call(ctx, 'GET', `/api/admin/users?q=${encodeURIComponent(q)}`, admin.cookie)).json();
    expect((await search('хмельн')).items.map((i: { id: number }) => i.id)).toEqual([byName.id]);
    expect((await search('ZORIAN')).items.map((i: { id: number }) => i.id)).toEqual([byEmail.id]);
    expect((await search('%')).total).toBe(0);
    expect((await search('_')).total).toBe(0);
    expect((await search('nobody-here')).items).toEqual([]);
  });

  it('answers 400 for a bad page', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    expect((await call(ctx, 'GET', '/api/admin/users?page=0', admin.cookie)).statusCode).toBe(400);
    expect((await call(ctx, 'GET', '/api/admin/users?page=x', admin.cookie)).statusCode).toBe(400);
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  it('promotes a User and demotes an Admin', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const target = await account('user');

    const promoted = await call(ctx, 'PATCH', `/api/admin/users/${target.id}/role`, admin.cookie, {
      role: 'admin',
    });
    expect(promoted.statusCode).toBe(200);
    expect(promoted.json()).toMatchObject({ id: target.id, role: 'admin' });

    // The promoted Account can use admin routes with a fresh session.
    const cookie = await loginAs(ctx, target.email);
    expect((await call(ctx, 'GET', '/api/admin/users', cookie)).statusCode).toBe(200);

    const demoted = await call(ctx, 'PATCH', `/api/admin/users/${target.id}/role`, admin.cookie, {
      role: 'user',
    });
    expect(demoted.statusCode).toBe(200);
    const [row] = await db.select().from(users).where(eq(users.id, target.id));
    expect(row?.role).toBe('user');
  });

  it('refuses to demote the last Admin, even themselves', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const response = await call(ctx, 'PATCH', `/api/admin/users/${admin.id}/role`, admin.cookie, {
      role: 'user',
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'last_admin' });
    const [row] = await db.select().from(users).where(eq(users.id, admin.id));
    expect(row?.role).toBe('admin');
  });

  it('lets an Admin demote themselves when another Admin remains', async () => {
    const ctx = start();
    const first = await adminSession(ctx);
    await account('admin');
    const response = await call(ctx, 'PATCH', `/api/admin/users/${first.id}/role`, first.cookie, {
      role: 'user',
    });
    expect(response.statusCode).toBe(200);
  });

  it('refuses a change to the role the Account already has', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const target = await account('user');
    const response = await call(ctx, 'PATCH', `/api/admin/users/${target.id}/role`, admin.cookie, {
      role: 'user',
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'forbidden' });
  });

  it('answers 404 for an unknown Account and 400 for bad input', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const url = (id: string | number) => `/api/admin/users/${id}/role`;
    expect(
      (await call(ctx, 'PATCH', url(999_999), admin.cookie, { role: 'admin' })).statusCode,
    ).toBe(404);
    expect((await call(ctx, 'PATCH', url('abc'), admin.cookie, { role: 'admin' })).statusCode).toBe(
      400,
    );
    expect(
      (await call(ctx, 'PATCH', url(admin.id), admin.cookie, { role: 'root' })).statusCode,
    ).toBe(400);
  });

  it('keeps one Admin when two Admins demote each other at once', async () => {
    for (let round = 0; round < 5; round++) {
      await resetDatabase(db);
      const ctx = start();
      const a = await adminSession(ctx);
      const b = await adminSession(ctx);
      const results = await Promise.all([
        call(ctx, 'PATCH', `/api/admin/users/${b.id}/role`, a.cookie, { role: 'user' }),
        call(ctx, 'PATCH', `/api/admin/users/${a.id}/role`, b.cookie, { role: 'user' }),
      ]);
      const codes = results.map((r) => r.statusCode).toSorted();
      expect(codes).toEqual([200, 403]);
      const admins = await db.select().from(users).where(eq(users.role, 'admin'));
      expect(admins).toHaveLength(1);
    }
  });
});

describe('DELETE /api/admin/users/:id', () => {
  it('hard-deletes the Account with its sessions and tokens', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const target = await account('user');
    const targetCookie = await loginAs(ctx, target.email);
    await db.insert(oneTimeTokens).values({
      id: `token-${target.id}`,
      userId: target.id,
      purpose: 'reset_password',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await call(ctx, 'DELETE', `/api/admin/users/${target.id}`, admin.cookie);
    expect(response.statusCode).toBe(204);
    expect(await db.select().from(users).where(eq(users.id, target.id))).toEqual([]);
    expect(await db.select().from(sessions).where(eq(sessions.userId, target.id))).toEqual([]);
    expect(
      await db.select().from(oneTimeTokens).where(eq(oneTimeTokens.userId, target.id)),
    ).toEqual([]);
    // The deleted Account's cookie is dead.
    const me = await call(ctx, 'GET', '/api/me', targetCookie);
    expect(me.statusCode).toBe(401);
  });

  it('refuses to delete the last Admin', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    const response = await call(ctx, 'DELETE', `/api/admin/users/${admin.id}`, admin.cookie);
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'last_admin' });
    expect(await db.select().from(users).where(eq(users.id, admin.id))).toHaveLength(1);
  });

  it('lets an Admin delete another Admin', async () => {
    const ctx = start();
    const first = await adminSession(ctx);
    const second = await account('admin');
    const response = await call(ctx, 'DELETE', `/api/admin/users/${second.id}`, first.cookie);
    expect(response.statusCode).toBe(204);
  });

  it('keeps one Admin when two Admins delete each other at once', async () => {
    for (let round = 0; round < 5; round++) {
      await resetDatabase(db);
      const ctx = start();
      const a = await adminSession(ctx);
      const b = await adminSession(ctx);
      const results = await Promise.all([
        call(ctx, 'DELETE', `/api/admin/users/${b.id}`, a.cookie),
        call(ctx, 'DELETE', `/api/admin/users/${a.id}`, b.cookie),
      ]);
      // The loser is either refused as the last Admin or already logged out.
      const codes = results.map((r) => r.statusCode).toSorted();
      expect(codes[0]).toBe(204);
      expect([401, 403]).toContain(codes[1]);
      const admins = await db.select().from(users).where(eq(users.role, 'admin'));
      expect(admins).toHaveLength(1);
    }
  });

  it('answers 404 for an unknown Account and 400 for a bad id', async () => {
    const ctx = start();
    const admin = await adminSession(ctx);
    expect((await call(ctx, 'DELETE', '/api/admin/users/999999', admin.cookie)).statusCode).toBe(
      404,
    );
    expect((await call(ctx, 'DELETE', '/api/admin/users/abc', admin.cookie)).statusCode).toBe(400);
  });
});

describe('admin actions in the structured log', () => {
  it('logs who did what to whom, without emails or secrets', async () => {
    const lines: string[] = [];
    const ctx = start({
      logger: { level: 'info', stream: { write: (line: string) => void lines.push(line) } },
    });
    const admin = await adminSession(ctx);
    const target = await account('user');
    await call(ctx, 'PATCH', `/api/admin/users/${target.id}/role`, admin.cookie, { role: 'admin' });
    await call(ctx, 'DELETE', `/api/admin/users/${target.id}`, admin.cookie);
    // Denied: the last Admin.
    const only = await call(ctx, 'DELETE', `/api/admin/users/${admin.id}`, admin.cookie);
    expect(only.statusCode).toBe(403);

    const entries = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const actions = entries.filter((entry) => entry['event'] === 'admin_action');
    expect(actions.map((a) => [a['action'], a['outcome']])).toEqual([
      ['change_role', 'done'],
      ['delete_user', 'done'],
      ['delete_user', 'denied'],
    ]);
    expect(actions[0]).toMatchObject({
      actorId: admin.id,
      targetId: target.id,
      from: 'user',
      to: 'admin',
    });
    expect(actions[2]).toMatchObject({ reason: 'last_admin' });
    const all = lines.join('');
    expect(all).not.toContain(target.email);
    expect(all).not.toContain(admin.email);
    expect(all).not.toContain(strongPassword);
    expect(all).not.toContain(admin.cookie.slice(4));
  });
});

describe('REGISTRATION_MODE', () => {
  const body = () => ({
    email: uniqueEmail(),
    displayName: `Скаут ${crypto.randomUUID().slice(0, 8)}`,
    password: strongPassword,
    interfaceLanguage: 'uk',
  });

  it('closed: self-registration answers 403 and creates nothing', async () => {
    const ctx = start({ registrationMode: 'closed' });
    const input = body();
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/register',
      payload: input,
      headers: csrfHeaders,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'registration_closed' });
    expect(await db.select().from(users)).toEqual([]);
    expect(ctx.mailer.outbox).toEqual([]);
  });

  it('closed: existing Accounts can still log in', async () => {
    const ctx = start({ registrationMode: 'closed' });
    const user = await account('user');
    await loginAs(ctx, user.email);
  });

  it('open (the default): self-registration works', async () => {
    const ctx = start();
    const input = body();
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/register',
      payload: input,
      headers: csrfHeaders,
    });
    expect(response.statusCode).toBe(202);
    await waitForOutbox(ctx.mailer, input.email);
  });
});

describe('first Admin seed', () => {
  const input = (overrides: Partial<Parameters<typeof seedFirstAdmin>[1]> = {}) => ({
    peppers: testPeppers,
    email: uniqueEmail(),
    displayName: 'Перший Адмін',
    password: strongPassword,
    ...overrides,
  });

  it('creates a verified Admin who can log in', async () => {
    const ctx = start();
    const seed = input();
    const result = await seedFirstAdmin(db, seed);
    expect(result).toBe('created');
    const [row] = await db.select().from(users).where(eq(users.email, seed.email));
    expect(row).toMatchObject({ role: 'admin' });
    expect(row?.verifiedAt).not.toBeNull();
    const cookie = await loginAs(ctx, seed.email);
    expect((await call(ctx, 'GET', '/api/admin/users', cookie)).statusCode).toBe(200);
  });

  it('does nothing when an Admin already exists, so a restart never adds one', async () => {
    await account('admin');
    expect(await seedFirstAdmin(db, input())).toBe('admin_exists');
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('creates exactly one Admin when run twice at once', async () => {
    const results = await Promise.all([seedFirstAdmin(db, input()), seedFirstAdmin(db, input())]);
    expect(results.toSorted()).toEqual(['admin_exists', 'created']);
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('refuses a weak password and never promotes an existing User', async () => {
    await expect(seedFirstAdmin(db, input({ password: 'short' }))).rejects.toThrow(/password/i);
    const existing = await account('user');
    await expect(seedFirstAdmin(db, input({ email: existing.email }))).rejects.toThrow();
    const [row] = await db.select().from(users).where(eq(users.id, existing.id));
    expect(row?.role).toBe('user');
  });
});

describe('parseRegistrationMode', () => {
  it('defaults to open and refuses anything unknown instead of opening', () => {
    expect(parseRegistrationMode(undefined)).toBe('open');
    expect(parseRegistrationMode('closed')).toBe('closed');
    expect(() => parseRegistrationMode('Closed')).toThrow(/REGISTRATION_MODE/);
  });
});

describe('last Admin across the self-service route', () => {
  it('keeps one Admin when two Admins delete their own Accounts at once', async () => {
    const ctx = start();
    const a = await adminSession(ctx);
    const b = await adminSession(ctx);
    const results = await Promise.all(
      [a, b].map((admin) =>
        ctx.app.inject({
          method: 'POST',
          url: '/api/account/delete',
          headers: { ...csrfHeaders, cookie: admin.cookie },
          payload: { currentPassword: strongPassword },
        }),
      ),
    );
    expect(results.map((r) => r.statusCode).toSorted()).toEqual([204, 409]);
    expect(await db.select().from(users).where(eq(users.role, 'admin'))).toHaveLength(1);
  });
});
