import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { categories, quizCategories, quizzes } from '../src/db/schema.ts';
import { createPasswordHasher, parsePeppers } from '../src/passwords.ts';
import { createUser } from '../src/users.ts';
import { buildAuthApp, csrfHeaders, strongPassword, testPeppers, uniqueEmail } from './app.ts';
import { createTestDb, resetDatabase } from './database.ts';

const { db, close } = createTestDb();
const hasher = createPasswordHasher(parsePeppers(testPeppers));

const apps: { close: () => Promise<undefined> }[] = [];
type TestApp = ReturnType<typeof buildAuthApp>;
const start = (): TestApp => {
  const built = buildAuthApp(db);
  apps.push(built.app);
  return built;
};

beforeEach(() => resetDatabase(db));
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
afterAll(() => close());

async function account(role: 'user' | 'admin', { verified = true } = {}) {
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
  return { id: created.user.id, email };
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

async function adminCookie(ctx: TestApp) {
  const admin = await account('admin');
  return loginAs(ctx, admin.email);
}

const call = (
  ctx: TestApp,
  method: 'POST' | 'PATCH' | 'DELETE' | 'GET',
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

const question = {
  prompt: 'Так?',
  options: [{ text: 'Так', correct: true as const }, { text: 'Ні' }],
  explanation: 'Пояснення.',
};

/** A Quiz with two Categories, inserted directly: authoring has no route yet. */
async function seedQuiz(slug: string, categorySlugs: string[]) {
  const [quiz] = await db
    .insert(quizzes)
    .values({
      slug,
      title: slug,
      description: 'Опис',
      language: 'uk',
      questions: [question],
      status: 'published',
      publishedAt: new Date(),
    })
    .returning({ id: quizzes.id });
  for (const categorySlug of categorySlugs) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug));
    await db.insert(quizCategories).values({ quizId: quiz!.id, categoryId: category!.id });
  }
  return quiz!.id;
}

async function seedCategory(slug: string, name = slug) {
  const [row] = await db.insert(categories).values({ slug, name }).returning({ id: categories.id });
  return row!.id;
}

describe('POST /api/admin/categories', () => {
  it('creates a Category for an Admin', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    const response = await call(ctx, 'POST', '/api/admin/categories', cookie, {
      name: 'Історія України',
      slug: 'istoriia-ukrainy',
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: 'Історія України',
      slug: 'istoriia-ukrainy',
    });

    const read = await call(ctx, 'GET', '/api/categories/istoriia-ukrainy');
    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual({
      category: { slug: 'istoriia-ukrainy', name: 'Історія України' },
      quizzes: [],
    });
  });

  it('answers 409 slug_taken when the slug already exists', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    await seedCategory('patrony-kureniv');
    const response = await call(ctx, 'POST', '/api/admin/categories', cookie, {
      name: 'Інша назва',
      slug: 'patrony-kureniv',
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'slug_taken' });
  });

  it('answers 400 invalid_input for a bad slug or an empty name', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    for (const payload of [
      { name: 'Ok', slug: 'Bad Slug' },
      { name: '   ', slug: 'ok' },
      { slug: 'ok' },
    ]) {
      const response = await call(ctx, 'POST', '/api/admin/categories', cookie, payload);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'invalid_input' });
    }
  });
});

describe('PATCH /api/admin/categories/:id', () => {
  it('renames a Category and keeps its slug', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    const id = await seedCategory('znannia', 'Знання');
    const response = await call(ctx, 'PATCH', `/api/admin/categories/${id}`, cookie, {
      name: 'Знання і досвід',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id, slug: 'znannia', name: 'Знання і досвід' });
  });

  it('answers 404 not_found for an unknown id', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    const response = await call(ctx, 'PATCH', '/api/admin/categories/999999', cookie, {
      name: 'X',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'not_found' });
  });
});

describe('DELETE /api/admin/categories/:id', () => {
  it('removes the Category from Quizzes that used it, and never deletes a Quiz', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    const doomedId = await seedCategory('doomed');
    await seedCategory('kept');
    await seedQuiz('bohun', ['doomed', 'kept']);
    await seedQuiz('knots', ['doomed']);

    const response = await call(ctx, 'DELETE', `/api/admin/categories/${doomedId}`, cookie);
    expect(response.statusCode).toBe(204);

    const [gone] = await db.select().from(categories).where(eq(categories.id, doomedId));
    expect(gone).toBeUndefined();

    const quizList = await db.select({ slug: quizzes.slug }).from(quizzes);
    expect(quizList.map((quiz) => quiz.slug).toSorted()).toEqual(['bohun', 'knots']);

    const bohun = await call(ctx, 'GET', '/api/quizzes/bohun');
    expect(bohun.json().categories).toEqual([{ slug: 'kept', name: 'kept' }]);

    const knots = await call(ctx, 'GET', '/api/quizzes/knots');
    expect(knots.json().categories).toEqual([]);
  });

  it('answers 404 not_found for an unknown id', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    const response = await call(ctx, 'DELETE', '/api/admin/categories/999999', cookie);
    expect(response.statusCode).toBe(404);
  });
});

describe('category routes refuse a Guest, a User and an unverified Admin with 403', () => {
  const routes = [
    ['POST', '/api/admin/categories', { name: 'X', slug: 'x-cat' }],
    ['PATCH', '/api/admin/categories/1', { name: 'X' }],
    ['DELETE', '/api/admin/categories/1'],
  ] as const;

  for (const [method, url, payload] of routes) {
    it(`${method} ${url}`, async () => {
      const ctx = start();
      const id = await seedCategory('target');
      const path = url.replace('/1', `/${id}`);
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
      const [row] = await db.select().from(categories).where(eq(categories.id, id));
      expect(row).toMatchObject({ slug: 'target', name: 'target' });
    });
  }
});

describe('GET /api/admin/categories', () => {
  it('lists every Category by name, including ones without Quizzes', async () => {
    const ctx = start();
    const cookie = await adminCookie(ctx);
    await seedCategory('znannia', 'Знання');
    await seedCategory('istoriia', 'Історія');
    const response = await call(ctx, 'GET', '/api/admin/categories', cookie);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
    expect(response.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'istoriia', name: 'Історія' }),
        expect.objectContaining({ slug: 'znannia', name: 'Знання' }),
      ]),
    );
  });
});
