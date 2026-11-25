import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { categories, quizzes, users } from '../src/db/schema.ts';
import { createPasswordHasher, parsePeppers } from '../src/passwords.ts';
import { createUser } from '../src/users.ts';
import { seed } from '../seed/seed.ts';
import { buildAuthApp, csrfHeaders, strongPassword, testPeppers, uniqueEmail } from './app.ts';
import { createTestDb, resetDatabase } from './database.ts';
import { bohun } from './fixtures.ts';

const { db, close } = createTestDb();
const hasher = createPasswordHasher(parsePeppers(testPeppers));

type TestApp = ReturnType<typeof buildAuthApp>;
const apps: { close: () => Promise<undefined> }[] = [];
const start = (): TestApp => {
  const built = buildAuthApp(db);
  apps.push(built.app);
  return built;
};

beforeEach(async () => {
  await resetDatabase(db);
  await db.insert(categories).values([
    { slug: 'knots', name: 'Вузли' },
    { slug: 'history', name: 'Історія' },
  ]);
});
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
afterAll(() => close());

async function account(role: 'user' | 'admin' = 'user', { verified = true } = {}) {
  const email = uniqueEmail();
  const created = await createUser(db, hasher, {
    email,
    displayName: `Автор ${crypto.randomUUID().slice(0, 8)}`,
    password: strongPassword,
    interfaceLanguage: 'uk',
    role,
    ...(verified && { verifiedAt: new Date() }),
  });
  if (!created.ok) throw new Error(created.reason);
  return { id: created.user.id, email, displayName: created.user.displayName };
}

async function login(ctx: TestApp, email: string) {
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/api/login',
    payload: { email, password: strongPassword },
    headers: csrfHeaders,
  });
  expect(response.statusCode).toBe(200);
  return `sid=${response.cookies.find((c) => c.name === 'sid')!.value}`;
}

/** An Account that is logged in, with a helper that calls the API as it. */
async function actor(ctx: TestApp, role: 'user' | 'admin' = 'user') {
  const who = await account(role);
  const cookie = await login(ctx, who.email);
  const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
    ctx.app.inject({
      method,
      url,
      headers: { ...csrfHeaders, cookie },
      ...(payload && { payload }),
    });
  return { ...who, cookie, call };
}

const guest = (
  ctx: TestApp,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  payload?: object,
) => ctx.app.inject({ method, url, headers: csrfHeaders, ...(payload && { payload }) });

const completeDraft = (slug = 'my-quiz') => ({
  slug,
  title: 'Мій квіз',
  description: 'Про вузли',
  language: 'uk',
  categories: ['knots'],
  questions: [
    {
      prompt: 'Який вузол?',
      options: [{ text: 'Прямий', correct: true }, { text: 'Бабський' }],
      explanation: 'Прямий.',
    },
  ],
});

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Actor = Awaited<ReturnType<typeof actor>>;

async function createDraft(who: Actor, body: object = completeDraft()) {
  const response = await who.call('POST', '/api/authoring/quizzes', body);
  expect(response.statusCode).toBe(201);
  return response.json() as { slug: string; version: number };
}

async function publish(who: Actor, slug: string, version: number) {
  return who.call('POST', `/api/authoring/quizzes/${slug}/publish`, { version });
}

describe('Guest visibility of drafts', () => {
  it('shows a draft nowhere: lists, search, Category, Quiz screen', async () => {
    const ctx = start();
    const author = await actor(ctx);
    await createDraft(author);

    const get = async (url: string) => (await guest(ctx, 'GET', url)).json();
    expect(await get('/api/quizzes?q=квіз')).toEqual([]);
    expect(await get('/api/quizzes?q=вузли')).toEqual([]);
    expect(await get('/api/categories')).toEqual([]);
    expect(await get('/api/categories/knots')).toMatchObject({ quizzes: [] });
    const screen = await guest(ctx, 'GET', '/api/quizzes/my-quiz');
    expect(screen.statusCode).toBe(404);
    expect(screen.body).not.toContain('Прямий');
  });

  it('keeps the draft hidden from Guests even when a User asks for it', async () => {
    const ctx = start();
    const author = await actor(ctx);
    await createDraft(author);
    const other = await actor(ctx);

    expect((await other.call('GET', '/api/quizzes/my-quiz')).statusCode).toBe(404);
  });

  it('shows a Quiz once it is published, with its Author name', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    expect((await publish(author, 'my-quiz', version)).statusCode).toBe(200);

    const screen = (await guest(ctx, 'GET', '/api/quizzes/my-quiz')).json();
    expect(screen.author).toEqual({ displayName: author.displayName });
    expect(screen.questions[0].options[0]).toEqual({ text: 'Прямий', correct: true });
    expect(JSON.stringify(screen)).not.toContain(author.email);
    expect((await guest(ctx, 'GET', '/api/quizzes?q=квіз')).json()).toHaveLength(1);
    expect((await guest(ctx, 'GET', '/api/categories')).json()).toEqual([
      { slug: 'knots', name: 'Вузли' },
    ]);
  });

  it('hides a published Quiz again after it is deleted', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await publish(author, 'my-quiz', version);
    expect((await author.call('DELETE', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(204);
    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).statusCode).toBe(404);
  });
});

describe('who may use the authoring routes', () => {
  const routes: [Method, string, object?][] = [
    ['GET', '/api/authoring/quizzes'],
    ['POST', '/api/authoring/quizzes', completeDraft('x')],
    ['GET', '/api/authoring/quizzes/my-quiz'],
    ['PUT', '/api/authoring/quizzes/my-quiz', { ...completeDraft(), version: 1 }],
    ['POST', '/api/authoring/quizzes/my-quiz/publish', { version: 1 }],
    ['DELETE', '/api/authoring/quizzes/my-quiz'],
    ['GET', '/api/authoring/slugs/my-quiz'],
  ];

  it.each(routes)('%s %s answers a Guest with 401', async (method, url, payload) => {
    const ctx = start();
    const response = await guest(ctx, method, url, payload);
    expect(response.statusCode).toBe(401);
  });

  it.each(routes)('%s %s refuses an unverified Account with 403', async (method, url, payload) => {
    const ctx = start();
    const unverified = await account('user', { verified: false });
    const cookie = await login(ctx, unverified.email);
    const response = await ctx.app.inject({
      method,
      url,
      headers: { ...csrfHeaders, cookie },
      ...(payload && { payload }),
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'verification_required' });
  });

  it('refuses an unverified Admin too', async () => {
    const ctx = start();
    const fake = await account('admin', { verified: false });
    const cookie = await login(ctx, fake.email);
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/authoring/quizzes',
      headers: { ...csrfHeaders, cookie },
    });
    expect(response.statusCode).toBe(403);
  });

  it('needs the CSRF header on writes', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/authoring/quizzes',
      headers: { cookie: author.cookie },
      payload: completeDraft(),
    });
    expect(response.statusCode).toBe(403);
  });
});

describe('creating and reading drafts', () => {
  it('creates a draft from a slug alone and sets the Author', async () => {
    const ctx = start();
    const author = await actor(ctx);

    const response = await author.call('POST', '/api/authoring/quizzes', { slug: 'empty' });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      slug: 'empty',
      title: '',
      status: 'draft',
      version: 1,
      authorId: author.id,
      author: { displayName: author.displayName },
      publishedAt: null,
      categories: [],
      questions: [],
    });
  });

  it('lists the Author their own Quizzes only, and an Admin all', async () => {
    const ctx = start();
    const a = await actor(ctx);
    const b = await actor(ctx);
    const admin = await actor(ctx, 'admin');
    await createDraft(a, completeDraft('quiz-a'));
    await createDraft(b, completeDraft('quiz-b'));

    const slugs = async (who: Actor) =>
      (await who.call('GET', '/api/authoring/quizzes'))
        .json()
        .items.map((i: { slug: string }) => i.slug);
    expect(await slugs(a)).toEqual(['quiz-a']);
    expect((await slugs(admin)).toSorted()).toEqual(['quiz-a', 'quiz-b']);
  });

  it('lets an Admin read anyone’s draft but nobody else', async () => {
    const ctx = start();
    const author = await actor(ctx);
    await createDraft(author);
    const admin = await actor(ctx, 'admin');
    const other = await actor(ctx);

    expect((await admin.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(200);
    expect((await author.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(200);
    expect((await other.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(404);
  });

  it('rejects an unknown Category and bad input', async () => {
    const ctx = start();
    const author = await actor(ctx);

    const unknown = await author.call('POST', '/api/authoring/quizzes', {
      ...completeDraft(),
      categories: ['nope'],
    });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json()).toEqual({ error: 'unknown_category', slugs: ['nope'] });
    expect(
      (await author.call('POST', '/api/authoring/quizzes', { slug: 'Bad Slug' })).statusCode,
    ).toBe(400);
    expect((await author.call('POST', '/api/authoring/quizzes', {})).statusCode).toBe(400);
  });

  it('bounds input: 101 Questions, 11 Options and 5,001 characters are refused', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const post = (body: object) => author.call('POST', '/api/authoring/quizzes', body);

    const question = { prompt: 'q', options: [{ text: 'a' }], explanation: 'e' };
    expect(
      (await post({ slug: 'a', questions: Array.from({ length: 101 }, () => ({ ...question })) }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await post({
          slug: 'b',
          questions: [{ options: Array.from({ length: 11 }, () => ({ text: 'x' })) }],
        })
      ).statusCode,
    ).toBe(400);
    expect((await post({ slug: 'c', title: 'x'.repeat(5_001) })).statusCode).toBe(400);
    expect((await post({ slug: 'd', title: 'x'.repeat(5_000) })).statusCode).toBe(201);
  });

  it('accepts a Quiz at the limits although it is over 1 MiB, and refuses a huge body', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const long = 'я'.repeat(5_000);
    const full = {
      slug: 'full',
      questions: Array.from({ length: 100 }, () => ({
        prompt: long,
        options: Array.from({ length: 10 }, (_, i) => ({
          text: long,
          ...(i === 0 && { correct: true }),
        })),
        explanation: long,
      })),
    };
    expect((await author.call('POST', '/api/authoring/quizzes', full)).statusCode).toBe(201);
    const huge = { slug: 'huge', title: 'x'.repeat(17 * 1024 * 1024) };
    expect((await author.call('POST', '/api/authoring/quizzes', huge)).statusCode).toBe(413);
  });
});

describe('ownership', () => {
  it('answers 404 for another Author’s draft on every route, like a missing Quiz', async () => {
    const ctx = start();
    const author = await actor(ctx);
    await createDraft(author);
    const other = await actor(ctx);

    const attempts = [
      other.call('GET', '/api/authoring/quizzes/my-quiz'),
      other.call('PUT', '/api/authoring/quizzes/my-quiz', { ...completeDraft(), version: 1 }),
      other.call('POST', '/api/authoring/quizzes/my-quiz/publish', { version: 1 }),
      other.call('DELETE', '/api/authoring/quizzes/my-quiz'),
    ];
    const missing = [
      other.call('GET', '/api/authoring/quizzes/nope'),
      other.call('PUT', '/api/authoring/quizzes/nope', { ...completeDraft(), version: 1 }),
      other.call('POST', '/api/authoring/quizzes/nope/publish', { version: 1 }),
      other.call('DELETE', '/api/authoring/quizzes/nope'),
    ];
    const results = await Promise.all([...attempts, ...missing]);
    for (const response of results) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'not_found' });
    }
    // Untouched.
    expect((await author.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(200);
  });

  it('answers 403 for another Author’s published Quiz, and changes nothing', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await publish(author, 'my-quiz', version);
    const other = await actor(ctx);

    const put = await other.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft(),
      title: 'Hijacked',
      version: version + 1,
    });
    expect(put.statusCode).toBe(403);
    expect((await other.call('DELETE', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(403);
    expect((await other.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(403);
    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).json().title).toBe('Мій квіз');
  });

  it('lets an Admin edit and delete another Author’s Quiz', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    const admin = await actor(ctx, 'admin');

    const put = await admin.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft(),
      title: 'Moderated',
      version,
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({ title: 'Moderated', authorId: author.id });
    expect((await admin.call('DELETE', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(204);
  });
});

describe('optimistic locking', () => {
  it('bumps the version on each save and refuses a stale one with 409', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);

    const first = await author.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft(),
      title: 'First',
      version,
    });
    expect(first.json().version).toBe(version + 1);

    const stale = await author.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft(),
      title: 'Second',
      version,
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toEqual({ error: 'version_conflict', currentVersion: version + 1 });
    expect((await author.call('GET', '/api/authoring/quizzes/my-quiz')).json().title).toBe('First');
  });

  it('lets exactly one of two simultaneous saves win', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    const save = (title: string) =>
      author.call('PUT', '/api/authoring/quizzes/my-quiz', { ...completeDraft(), title, version });

    const statuses = (await Promise.all([save('A'), save('B'), save('C')])).map(
      (r) => r.statusCode,
    );

    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(2);
  });

  it('refuses to publish a stale version', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await author.call('PUT', '/api/authoring/quizzes/my-quiz', { ...completeDraft(), version });

    const response = await publish(author, 'my-quiz', version);
    expect(response.statusCode).toBe(409);
    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).statusCode).toBe(404);
  });
});

describe('publishing', () => {
  it('reports everything that is wrong at once and stays a draft', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author, {
      slug: 'half',
      title: '',
      language: 'zzzz-not-a-language',
      questions: [{ prompt: 'p', options: [{ text: 'only' }], explanation: '' }],
    });

    const response = await publish(author, 'half', version);

    expect(response.statusCode).toBe(422);
    const { issues } = response.json();
    const paths = issues.map((i: { path: (string | number)[] }) => i.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining([
        'title',
        'description',
        'language',
        'categories',
        'questions.0.options',
        'questions.0.explanation',
      ]),
    );
    expect(issues[0].message).toEqual(expect.any(String));
    const after = (await author.call('GET', '/api/authoring/quizzes/half')).json();
    expect(after).toMatchObject({ status: 'draft', version });
  });

  it('stores the canonical language, sets publishedAt and keeps it on republish', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author, { ...completeDraft(), language: 'EN-us' });

    const published = (await publish(author, 'my-quiz', version)).json();
    expect(published).toMatchObject({
      status: 'published',
      language: 'en-US',
      version: version + 1,
    });
    expect(published.publishedAt).toEqual(expect.any(String));

    const again = (await publish(author, 'my-quiz', version + 1)).json();
    expect(again.publishedAt).toBe(published.publishedAt);
  });

  it('keeps a published Quiz valid: an edit that breaks it is refused', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await publish(author, 'my-quiz', version);

    const broken = await author.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft(),
      questions: [],
      version: version + 1,
    });

    expect(broken.statusCode).toBe(422);
    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).json().questions).toHaveLength(1);
  });

  it('puts an edit of a published Quiz live at once', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await publish(author, 'my-quiz', version);

    await author.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft(),
      title: 'Нова назва',
      version: version + 1,
    });

    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).json().title).toBe('Нова назва');
  });
});

describe('slugs', () => {
  it('refuses a slug that is taken, on create and on save', async () => {
    const ctx = start();
    const a = await actor(ctx);
    const b = await actor(ctx);
    await createDraft(a, completeDraft('taken'));
    const mine = await createDraft(b, completeDraft('mine'));

    expect((await b.call('POST', '/api/authoring/quizzes', completeDraft('taken'))).json()).toEqual(
      {
        error: 'slug_taken',
      },
    );
    const rename = await b.call('PUT', '/api/authoring/quizzes/mine', {
      ...completeDraft('taken'),
      version: mine.version,
    });
    expect(rename.statusCode).toBe(409);
    expect(rename.json()).toEqual({ error: 'slug_taken' });
  });

  it('lets an Author rename before the first publish, and locks it after', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);

    const renamed = await author.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft('better-name'),
      version,
    });
    expect(renamed.statusCode).toBe(200);
    expect((await author.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(404);
    await publish(author, 'better-name', version + 1);

    const locked = await author.call('PUT', '/api/authoring/quizzes/better-name', {
      ...completeDraft('third-name'),
      version: version + 2,
    });
    expect(locked.statusCode).toBe(403);
    expect(locked.json()).toEqual({ error: 'slug_locked' });
    expect((await guest(ctx, 'GET', '/api/quizzes/better-name')).statusCode).toBe(200);
  });

  it('keeps the slug locked after the Quiz was published, whatever the status', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await publish(author, 'my-quiz', version);
    await db.update(quizzes).set({ status: 'draft' }).where(eq(quizzes.slug, 'my-quiz'));

    const response = await author.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft('other'),
      version: version + 1,
    });
    expect(response.statusCode).toBe(403);
  });

  it('lets an Admin override a locked slug', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const { version } = await createDraft(author);
    await publish(author, 'my-quiz', version);
    const admin = await actor(ctx, 'admin');

    const response = await admin.call('PUT', '/api/authoring/quizzes/my-quiz', {
      ...completeDraft('fixed-slug'),
      version: version + 1,
    });

    expect(response.statusCode).toBe(200);
    expect((await guest(ctx, 'GET', '/api/quizzes/fixed-slug')).statusCode).toBe(200);
    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).statusCode).toBe(404);
  });

  it('checks availability, letting a Quiz keep its own slug', async () => {
    const ctx = start();
    const a = await actor(ctx);
    const b = await actor(ctx);
    await createDraft(a, completeDraft('used'));
    const check = async (who: Actor, url: string) => (await who.call('GET', url)).json();

    expect(await check(a, '/api/authoring/slugs/free-one')).toEqual({ available: true });
    expect(await check(a, '/api/authoring/slugs/used')).toEqual({ available: false });
    expect(await check(a, '/api/authoring/slugs/used?quiz=used')).toEqual({ available: true });
    // Naming a Quiz you cannot edit does not free its slug.
    expect(await check(b, '/api/authoring/slugs/used?quiz=used')).toEqual({ available: false });
    expect((await a.call('GET', '/api/authoring/slugs/Bad%20Slug')).statusCode).toBe(400);
  });
});

describe('ownerless Quizzes', () => {
  it('can be edited and deleted by Admins only', async () => {
    const ctx = start();
    await seed(db, [bohun]);
    const user = await actor(ctx);
    const admin = await actor(ctx, 'admin');
    const current = (await admin.call('GET', '/api/authoring/quizzes/ivan-bohun')).json();
    expect(current).toMatchObject({ status: 'published', authorId: null, author: null });

    expect((await user.call('GET', '/api/authoring/quizzes/ivan-bohun')).statusCode).toBe(403);
    expect((await user.call('DELETE', '/api/authoring/quizzes/ivan-bohun')).statusCode).toBe(403);
    const edit = await admin.call('PUT', '/api/authoring/quizzes/ivan-bohun', {
      slug: 'ivan-bohun',
      title: 'Іван Богун (виправлено)',
      description: current.description,
      language: current.language,
      categories: current.categories,
      questions: current.questions,
      version: current.version,
    });
    expect(edit.statusCode).toBe(200);
    expect((await guest(ctx, 'GET', '/api/quizzes/ivan-bohun')).json().title).toBe(
      'Іван Богун (виправлено)',
    );
  });

  it('survive the deletion of their Author, by themselves or by an Admin', async () => {
    const ctx = start();
    const leaving = await actor(ctx);
    const removed = await actor(ctx);
    const admin = await actor(ctx, 'admin');
    for (const [who, slug] of [
      [leaving, 'left'],
      [removed, 'removed'],
    ] as const) {
      const { version } = await createDraft(who, completeDraft(slug));
      await publish(who, slug, version);
    }

    const self = await leaving.call('POST', '/api/account/delete', {
      currentPassword: strongPassword,
    });
    expect(self.statusCode).toBe(204);
    const byAdmin = await admin.call('DELETE', `/api/admin/users/${removed.id}`);
    expect(byAdmin.statusCode).toBe(204);

    for (const slug of ['left', 'removed']) {
      const screen = await guest(ctx, 'GET', `/api/quizzes/${slug}`);
      expect(screen.statusCode).toBe(200);
      expect(screen.json().author).toBeNull();
      expect((await admin.call('GET', `/api/authoring/quizzes/${slug}`)).json()).toMatchObject({
        authorId: null,
        status: 'published',
      });
    }
  });

  it('keeps drafts of a deleted Author, visible to Admins only', async () => {
    const ctx = start();
    const author = await actor(ctx);
    await createDraft(author);
    const admin = await actor(ctx, 'admin');
    const other = await actor(ctx);

    await admin.call('DELETE', `/api/admin/users/${author.id}`);

    expect((await admin.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(200);
    expect((await other.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(404);
    expect((await guest(ctx, 'GET', '/api/quizzes/my-quiz')).statusCode).toBe(404);
  });

  it('survive the removal of an unverified Account', async () => {
    const { deleteUnverifiedAccounts } = await import('../src/cleanup.ts');
    const ghost = await account('user', { verified: false });
    await db.insert(quizzes).values({
      slug: 'ghosts',
      title: 't',
      description: 'd',
      language: 'uk',
      questions: [],
      authorId: ghost.id,
      status: 'draft',
    });

    const far = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(await deleteUnverifiedAccounts(db, far)).toBe(1);

    const [row] = await db.select().from(quizzes).where(eq(quizzes.slug, 'ghosts'));
    expect(row?.authorId).toBeNull();
    expect(await db.select().from(users).where(eq(users.id, ghost.id))).toEqual([]);
  });
});

describe('Admin Account list', () => {
  it('counts the Quizzes of each Account, drafts included', async () => {
    const ctx = start();
    const author = await actor(ctx);
    const admin = await actor(ctx, 'admin');
    await createDraft(author, completeDraft('one'));
    await createDraft(author, completeDraft('two'));

    const page = (await admin.call('GET', '/api/admin/users')).json();
    const row = page.items.find((item: { id: number }) => item.id === author.id);
    expect(row.quizCount).toBe(2);
  });
});

describe('deleting a Quiz', () => {
  it('removes the Quiz and its Category links after the Author asks', async () => {
    const ctx = start();
    const author = await actor(ctx);
    await createDraft(author);

    expect((await author.call('DELETE', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(204);
    expect((await author.call('GET', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(404);
    expect((await author.call('DELETE', '/api/authoring/quizzes/my-quiz')).statusCode).toBe(404);
  });
});
