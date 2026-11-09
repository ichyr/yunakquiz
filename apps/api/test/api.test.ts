import { categoryWithQuizzesSchema, quizSchema } from '@yunakquiz/core';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { createDb } from '../src/db/client.ts';
import { categories } from '../src/db/schema.ts';
import { seed } from '../seed/seed.ts';
import { createTestDb, resetDatabase } from './database.ts';
import { bohun, knots } from './fixtures.ts';

const { db, close } = createTestDb();
const app = buildApp({ db });

beforeEach(async () => {
  await resetDatabase(db);
  await seed(db, [bohun, knots]);
});

afterAll(async () => {
  await app.close();
  await close();
});

const get = async (url: string) => {
  const response = await app.inject({ method: 'GET', url });
  return { status: response.statusCode, body: response.json() };
};

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    expect(await get('/api/health')).toEqual({ status: 200, body: { status: 'ok' } });
  });
});

describe('GET /api/categories', () => {
  it('lists only Categories that contain a Quiz, by name', async () => {
    await db.insert(categories).values({ slug: 'empty', name: 'Порожня' });

    expect((await get('/api/categories')).body).toEqual([
      { slug: 'istoriia-ukrainy', name: 'Історія України' },
      { slug: 'patrony-kureniv', name: 'Патрони куренів' },
    ]);
  });
});

describe('GET /api/categories/:slug', () => {
  it('returns the Category with summaries of its Quizzes', async () => {
    const { status, body } = await get('/api/categories/istoriia-ukrainy');

    expect(status).toBe(200);
    expect(categoryWithQuizzesSchema.strict().parse(body)).toBeTruthy();
    expect(body.quizzes.map((quiz: { slug: string }) => quiz.slug)).toEqual([
      'basic-knots',
      'ivan-bohun',
    ]);
    expect(body.quizzes[0]).not.toHaveProperty('questions');
  });

  it('returns 404 for an unknown Category', async () => {
    expect((await get('/api/categories/nope')).status).toBe(404);
  });
});

describe('GET /api/quizzes?q=', () => {
  const slugsFor = async (q: string) =>
    (await get(`/api/quizzes?q=${encodeURIComponent(q)}`)).body.map(
      (quiz: { slug: string }) => quiz.slug,
    );

  it('matches part of the title, ignoring case', async () => {
    expect(await slugsFor('БОГ')).toEqual(['ivan-bohun']);
  });

  it('matches the description, whatever the Quiz Language', async () => {
    expect(await slugsFor('bowline')).toEqual(['basic-knots']);
    expect(await slugsFor('полководець')).toEqual(['ivan-bohun']);
  });

  it('treats % and _ as literal characters', async () => {
    expect(await slugsFor('%')).toEqual(['basic-knots']);
    expect(await slugsFor('_')).toEqual([]);
  });

  it('rejects a blank query', async () => {
    expect((await get('/api/quizzes?q=%20')).status).toBe(400);
    expect((await get('/api/quizzes')).status).toBe(400);
  });
});

describe('GET /api/quizzes/:slug', () => {
  it('returns the whole Quiz, including Correct Options and Explanations', async () => {
    const { status, body } = await get('/api/quizzes/ivan-bohun');

    expect(status).toBe(200);
    const expected = quizSchema.parse(bohun);
    expect(quizSchema.parse(body)).toEqual({
      ...expected,
      // Categories come back ordered by name, not in authored order.
      categories: expect.toSatisfy((list) => list.length === expected.categories.length),
    });
    expect(body.categories).toEqual(expect.arrayContaining(expected.categories));
  });

  it('returns 404 for an unknown Quiz', async () => {
    expect((await get('/api/quizzes/nope')).status).toBe(404);
  });
});

describe('seed', () => {
  it('updates Quizzes and their Categories when rerun', async () => {
    await seed(db, [{ ...knots, title: 'Knots', categories: [bohun.categories[0]!] }]);

    expect((await get('/api/quizzes/basic-knots')).body).toMatchObject({
      title: 'Knots',
      categories: [{ slug: 'patrony-kureniv' }],
    });
  });

  it('writes nothing when a Quiz breaks the content rules', async () => {
    const broken = { ...knots, slug: 'broken', questions: [] };

    await expect(seed(db, [{ ...bohun, title: 'Changed' }, broken])).rejects.toThrow();
    expect((await get('/api/quizzes/ivan-bohun')).body.title).toBe('Іван Богун');
  });

  it('writes nothing when two Quizzes give one Category different names', async () => {
    const renamed = {
      ...knots,
      slug: 'renamed',
      categories: [{ slug: 'patrony-kureniv', name: 'Інша назва' }],
    };

    await expect(seed(db, [{ ...bohun, title: 'Changed' }, renamed])).rejects.toThrow(
      /patrony-kureniv.*Патрони куренів.*Інша назва/s,
    );
    expect((await get('/api/quizzes/ivan-bohun')).body.title).toBe('Іван Богун');
    expect((await get('/api/quizzes/renamed')).status).toBe(404);
  });

  it('stores the Quiz Language in its standard spelling', async () => {
    await seed(db, [{ ...knots, language: 'en-us' }]);

    expect((await get('/api/quizzes/basic-knots')).body.language).toBe('en-US');
  });
});

describe('when the database is unreachable', () => {
  const unreachable = createDb('postgres://yunakquiz:yunakquiz@localhost:1/yunakquiz');
  const offline = buildApp({ db: unreachable.db });

  afterAll(async () => {
    await offline.close();
    await unreachable.close();
  });

  it('reports the health check as unavailable', async () => {
    const response = await offline.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(503);
  });

  it('hides query details from the client', async () => {
    const response = await offline.inject({ method: 'GET', url: '/api/categories' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal Server Error' });
  });
});
