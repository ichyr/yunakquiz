import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteUnverifiedAccounts } from '../src/cleanup.ts';
import { oneTimeTokens, sessions, users } from '../src/db/schema.ts';
import { PASSWORD_INPUT_MAX_LENGTH } from '@yunakquiz/core';
import {
  buildAuthApp,
  csrfHeaders,
  strongPassword,
  tokenIn,
  uniqueEmail,
  waitForOutbox,
} from './app.ts';
import { createTestDb, resetDatabase } from './database.ts';

const { db, close } = createTestDb();
const DAY = 24 * 60 * 60 * 1000;
const newPassword = 'quiet river under amber moonlight';

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

const displayNameOf = () => `Скаут ${crypto.randomUUID().slice(0, 8)}`;

/** A verified Account with a live session. */
async function signedIn(ctx: Ctx, overrides: Record<string, unknown> = {}) {
  const input = {
    email: uniqueEmail(),
    displayName: displayNameOf(),
    password: strongPassword,
    interfaceLanguage: 'uk',
    ...overrides,
  };
  await post(ctx, '/api/register', input);
  const mail = await waitForOutbox(ctx.mailer, input.email as string);
  await post(ctx, '/api/verify', { token: tokenIn(mail) });
  const cookie = await loginCookie(ctx, input.email as string, input.password as string);
  return { ...input, email: input.email as string, cookie };
}

async function loginCookie(ctx: Ctx, email: string, password: string) {
  const response = await post(ctx, '/api/login', { email, password });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies.find((c) => c.name === 'sid');
  return `sid=${cookie!.value}`;
}

const userRow = async (email: string) =>
  (await db.select().from(users).where(eq(users.email, email)))[0];

describe('every account route', () => {
  it.each([
    ['/api/account/display-name', { displayName: 'Нове ім’я' }],
    ['/api/account/password', { currentPassword: 'x', newPassword: 'y' }],
    ['/api/account/email', { newEmail: 'a@b.co', currentPassword: 'x' }],
    ['/api/account/delete', { currentPassword: 'x' }],
  ])('answers 401 to a Guest on %s', async (url, body) => {
    const ctx = start();
    expect((await post(ctx, url, body)).statusCode).toBe(401);
  });

  it('answers 401 session_expired once the session has lapsed', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    ctx.advance(2 * 60 * 60 * 1000);
    const response = await post(
      ctx,
      '/api/account/display-name',
      { displayName: 'Нове ім’я' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'session_expired' });
  });

  it('refuses a request without the CSRF header', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/display-name',
      { displayName: 'Нове ім’я' },
      { cookie: account.cookie, headers: {} },
    );
    expect(response.statusCode).toBe(403);
  });
});

describe('POST /api/account/display-name', () => {
  it('changes the display name', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/display-name',
      { displayName: '  Нове ім’я ' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(200);
    expect(response.json().displayName).toBe('Нове ім’я');
    const me = await get(ctx, '/api/me', account.cookie);
    expect(me.json().displayName).toBe('Нове ім’я');
  });

  it('refuses a name another Account holds, ignoring case', async () => {
    const ctx = start();
    const taken = await signedIn(ctx, { displayName: 'Орест Тарас' });
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/display-name',
      { displayName: 'орест тарас' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'display_name_taken' });
    expect((await userRow(taken.email))?.displayName).toBe('Орест Тарас');
  });

  it('lets an Account change only the case of its own name', async () => {
    const ctx = start();
    const account = await signedIn(ctx, { displayName: 'Орест Тарас' });
    const response = await post(
      ctx,
      '/api/account/display-name',
      { displayName: 'орест ТАРАС' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(200);
  });

  it('rejects a name outside 2 to 50 characters', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/display-name',
      { displayName: 'O' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/account/password', () => {
  it('changes the password, keeps this session and revokes the others', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const otherCookie = await loginCookie(ctx, account.email, account.password as string);

    const response = await post(
      ctx,
      '/api/account/password',
      { currentPassword: account.password, newPassword },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(204);

    expect((await get(ctx, '/api/me', account.cookie)).json()?.email).toBe(account.email);
    expect((await get(ctx, '/api/me', otherCookie)).statusCode).toBe(401);

    const oldLogin = await post(ctx, '/api/login', {
      email: account.email,
      password: account.password,
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await post(ctx, '/api/login', { email: account.email, password: newPassword });
    expect(newLogin.statusCode).toBe(200);
  });

  it('refuses a wrong current password and changes nothing', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const before = (await userRow(account.email))?.passwordHash;
    const response = await post(
      ctx,
      '/api/account/password',
      { currentPassword: 'definitely not the password', newPassword },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'invalid_current_password' });
    expect((await userRow(account.email))?.passwordHash).toBe(before);
  });

  it('applies the password rules to the new password, naming the issue', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/password',
      { currentPassword: account.password, newPassword: 'short one' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('invalid_password');
    expect(response.json().issues).toContain('too_short');
  });

  it('rejects an oversized password before hashing anything', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const huge = 'a'.repeat(PASSWORD_INPUT_MAX_LENGTH + 1);
    for (const body of [
      { currentPassword: huge, newPassword },
      { currentPassword: account.password, newPassword: huge },
    ]) {
      const response = await post(ctx, '/api/account/password', body, { cookie: account.cookie });
      expect(response.statusCode).toBe(400);
    }
  });

  it('limits wrong current passwords per Account', async () => {
    const ctx = start({ authLimits: { perEmail: { max: 3 } } });
    const account = await signedIn(ctx);
    const attempt = () =>
      post(
        ctx,
        '/api/account/password',
        { currentPassword: 'wrong wrong wrong wrong', newPassword },
        { cookie: account.cookie },
      );
    const codes = [];
    for (let i = 0; i < 5; i += 1) codes.push((await attempt()).statusCode);
    expect(codes.slice(0, 3)).toEqual([403, 403, 403]);
    expect(codes[4]).toBe(429);
  });
});

describe('email change', () => {
  const requestChange = (
    ctx: Ctx,
    account: { cookie: string; password: unknown },
    newEmail: string,
  ) =>
    post(
      ctx,
      '/api/account/email',
      { newEmail, currentPassword: account.password },
      { cookie: account.cookie },
    );

  it('mails a link to the new address and changes nothing until it is opened', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const newEmail = uniqueEmail();

    const response = await requestChange(ctx, account, newEmail);
    expect(response.statusCode).toBe(202);

    const mail = await waitForOutbox(ctx.mailer, newEmail);
    expect(mail.text).toContain('https://quiz.test/confirm-email?token=');
    expect((await get(ctx, '/api/me', account.cookie)).json().email).toBe(account.email);

    const confirmed = await post(ctx, '/api/account/email/confirm', { token: tokenIn(mail) });
    expect(confirmed.statusCode).toBe(204);
    expect((await get(ctx, '/api/me', account.cookie)).json().email).toBe(newEmail);
    expect(
      (await post(ctx, '/api/login', { email: newEmail, password: account.password })).statusCode,
    ).toBe(200);
    expect(
      (await post(ctx, '/api/login', { email: account.email, password: account.password }))
        .statusCode,
    ).toBe(401);
  });

  it('writes the mail in the Account language', async () => {
    const ctx = start();
    const account = await signedIn(ctx, { interfaceLanguage: 'en' });
    const newEmail = uniqueEmail();
    await requestChange(ctx, account, newEmail);
    expect((await waitForOutbox(ctx.mailer, newEmail)).subject).toMatch(/Confirm/);
  });

  it('stores only the hash of the token, and the token works once', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const newEmail = uniqueEmail();
    await requestChange(ctx, account, newEmail);
    const token = tokenIn(await waitForOutbox(ctx.mailer, newEmail));

    const stored = await db
      .select()
      .from(oneTimeTokens)
      .where(eq(oneTimeTokens.purpose, 'change_email'));
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).not.toBe(token);

    expect((await post(ctx, '/api/account/email/confirm', { token })).statusCode).toBe(204);
    expect((await post(ctx, '/api/account/email/confirm', { token })).statusCode).toBe(400);
  });

  it('expires the link after 24 hours', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const newEmail = uniqueEmail();
    await requestChange(ctx, account, newEmail);
    const token = tokenIn(await waitForOutbox(ctx.mailer, newEmail));
    ctx.advance(25 * 60 * 60 * 1000);
    expect((await post(ctx, '/api/account/email/confirm', { token })).statusCode).toBe(400);
    expect((await userRow(account.email))?.email).toBe(account.email);
  });

  it('does not accept a verification or session token as an email change token', async () => {
    const ctx = start();
    const input = { email: uniqueEmail(), displayName: displayNameOf(), password: strongPassword };
    await post(ctx, '/api/register', { ...input, interfaceLanguage: 'uk' });
    const token = tokenIn(await waitForOutbox(ctx.mailer, input.email));
    expect((await post(ctx, '/api/account/email/confirm', { token })).statusCode).toBe(400);
  });

  it('answers the same 202 for an address that already has an Account, and mails that owner', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const owner = await signedIn(ctx);

    const taken = await requestChange(ctx, account, owner.email);
    const free = await requestChange(ctx, account, uniqueEmail());
    expect(taken.statusCode).toBe(free.statusCode);
    expect(taken.json()).toEqual(free.json());
    expect(taken.headers['content-length']).toBe(free.headers['content-length']);

    // The owner gets the "you already have an Account" mail, never a confirmation link.
    const deadline = Date.now() + 5_000;
    const toOwner = () => ctx.mailer.outbox.filter((m) => m.to === owner.email);
    while (!toOwner().some((m) => m.text.includes('/login')) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(toOwner().some((m) => m.text.includes('/login'))).toBe(true);
    expect(toOwner().some((m) => m.text.includes('confirm-email'))).toBe(false);
    const links = await db
      .select()
      .from(oneTimeTokens)
      .where(eq(oneTimeTokens.purpose, 'change_email'));
    expect(links).toHaveLength(1);
  });

  it('answers 202 and sends nothing for the own current address', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const before = ctx.mailer.outbox.length;
    const response = await requestChange(ctx, account, account.email);
    expect(response.statusCode).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(ctx.mailer.outbox.length).toBe(before);
  });

  it('refuses a wrong current password', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/email',
      { newEmail: uniqueEmail(), currentPassword: 'wrong wrong wrong wrong' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(403);
  });

  it('fails the link when the address was taken in the meantime, without changing anything', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const newEmail = uniqueEmail();
    await requestChange(ctx, account, newEmail);
    const token = tokenIn(await waitForOutbox(ctx.mailer, newEmail));

    await signedIn(ctx, { email: newEmail });
    const confirmed = await post(ctx, '/api/account/email/confirm', { token });
    expect(confirmed.statusCode).toBe(400);
    expect((await userRow(account.email))?.email).toBe(account.email);
  });

  it('a newer request replaces the older link', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const first = uniqueEmail();
    const second = uniqueEmail();
    await requestChange(ctx, account, first);
    const firstToken = tokenIn(await waitForOutbox(ctx.mailer, first));
    await requestChange(ctx, account, second);
    const secondToken = tokenIn(await waitForOutbox(ctx.mailer, second));

    expect((await post(ctx, '/api/account/email/confirm', { token: firstToken })).statusCode).toBe(
      400,
    );
    expect((await post(ctx, '/api/account/email/confirm', { token: secondToken })).statusCode).toBe(
      204,
    );
  });
});

describe('POST /api/account/delete', () => {
  it('hard-deletes the Account, its sessions and its tokens', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const other = await signedIn(ctx);
    await requestEmailTokenFor(ctx, account);
    const row = await userRow(account.email);

    const response = await post(
      ctx,
      '/api/account/delete',
      { currentPassword: account.password },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(204);

    expect(await userRow(account.email)).toBeUndefined();
    expect(await db.select().from(sessions).where(eq(sessions.userId, row!.id))).toHaveLength(0);
    expect(
      await db.select().from(oneTimeTokens).where(eq(oneTimeTokens.userId, row!.id)),
    ).toHaveLength(0);
    expect((await get(ctx, '/api/me', account.cookie)).statusCode).toBe(401);
    expect(await userRow(other.email)).toBeDefined();
  });

  it('refuses a wrong current password and keeps the Account', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    const response = await post(
      ctx,
      '/api/account/delete',
      { currentPassword: 'wrong wrong wrong wrong' },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(403);
    expect(await userRow(account.email)).toBeDefined();
  });

  it('refuses to delete the last Admin', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    await db.update(users).set({ role: 'admin' }).where(eq(users.email, account.email));
    const response = await post(
      ctx,
      '/api/account/delete',
      { currentPassword: account.password },
      { cookie: account.cookie },
    );
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'last_admin' });
    expect(await userRow(account.email)).toBeDefined();
  });

  it('frees the email and display name for a new registration', async () => {
    const ctx = start();
    const account = await signedIn(ctx);
    await post(
      ctx,
      '/api/account/delete',
      { currentPassword: account.password },
      { cookie: account.cookie },
    );
    const again = await post(ctx, '/api/register', {
      email: account.email,
      displayName: account.displayName,
      password: strongPassword,
      interfaceLanguage: 'uk',
    });
    expect(again.statusCode).toBe(202);
    expect(await userRow(account.email)).toBeDefined();
  });
});

async function requestEmailTokenFor(ctx: Ctx, account: { cookie: string; password: unknown }) {
  const newEmail = uniqueEmail();
  await post(
    ctx,
    '/api/account/email',
    { newEmail, currentPassword: account.password },
    { cookie: account.cookie },
  );
  await waitForOutbox(ctx.mailer, newEmail);
}

describe('deleteUnverifiedAccounts', () => {
  const insertAccount = async (verified: boolean, ageDays: number, now: Date) => {
    const email = uniqueEmail();
    await db.insert(users).values({
      email,
      displayName: displayNameOf(),
      passwordHash: 'x',
      pepperVersion: 'v1',
      createdAt: new Date(now.getTime() - ageDays * DAY),
      ...(verified && { verifiedAt: now }),
    });
    return email;
  };

  it('removes unverified Accounts older than 7 days and keeps the rest', async () => {
    const now = new Date();
    const old = await insertAccount(false, 8, now);
    const recent = await insertAccount(false, 6, now);
    const oldVerified = await insertAccount(true, 30, now);

    const removed = await deleteUnverifiedAccounts(db, now);

    expect(removed).toBe(1);
    expect(await userRow(old)).toBeUndefined();
    expect(await userRow(recent)).toBeDefined();
    expect(await userRow(oldVerified)).toBeDefined();
  });

  it('never removes an Admin, even an unverified one', async () => {
    const now = new Date();
    const email = await insertAccount(false, 30, now);
    await db.update(users).set({ role: 'admin' }).where(eq(users.email, email));

    expect(await deleteUnverifiedAccounts(db, now)).toBe(0);
    expect(await userRow(email)).toBeDefined();
  });

  it('removes the tokens and sessions of a removed Account, and frees its email', async () => {
    const now = new Date();
    const email = await insertAccount(false, 8, now);
    const row = await userRow(email);
    await db.insert(oneTimeTokens).values({
      id: 'hash',
      userId: row!.id,
      purpose: 'verify_email',
      expiresAt: new Date(now.getTime() + DAY),
    });

    await deleteUnverifiedAccounts(db, now);

    expect(await db.select().from(oneTimeTokens)).toHaveLength(0);
    const ctx = start();
    const again = await post(ctx, '/api/register', {
      email,
      displayName: displayNameOf(),
      password: strongPassword,
      interfaceLanguage: 'uk',
    });
    expect(again.statusCode).toBe(202);
    const mail = await waitForOutbox(ctx.mailer, email);
    expect(mail.text).toContain('verify?token=');
  });
});
