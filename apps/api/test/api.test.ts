import { categoryWithQuizzesSchema, quizSchema } from '@yunakquiz/core';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.ts';
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

describe('unknown routes', () => {
  it('answer 404 in the API error shape', async () => {
    expect(await get('/api/nope')).toEqual({ status: 404, body: { error: 'Not found' } });
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

describe('Ukrainian alphabetical order', () => {
  // Written out of order on purpose; code-point order would put є, і, ї before г and ґ last.
  const names = ['Яблуко', 'Іван', 'Ґанок', 'Єнот', 'Гадюка', 'Їжак', 'Жук', 'Дуб'];
  const alphabetical = ['Гадюка', 'Ґанок', 'Дуб', 'Єнот', 'Жук', 'Іван', 'Їжак', 'Яблуко'];

  beforeEach(async () => {
    await resetDatabase(db);
    await seed(
      db,
      names.map((name, index) => ({
        ...knots,
        slug: `quiz-${index}`,
        title: name,
        description: 'алфавіт',
        categories: [
          { slug: `category-${index}`, name },
          { slug: 'all', name: 'Усі' },
        ],
      })),
    );
  });

  it('orders Categories by name', async () => {
    const list = (await get('/api/categories')).body.map((c: { name: string }) => c.name);

    expect(list.filter((name: string) => name !== 'Усі')).toEqual(alphabetical);
  });

  it('orders the Quizzes of a Category by title', async () => {
    const titles = (await get('/api/categories/all')).body.quizzes.map(
      (quiz: { title: string }) => quiz.title,
    );

    expect(titles).toEqual(alphabetical);
  });

  it('orders search results by title', async () => {
    const titles = (await get(`/api/quizzes?q=${encodeURIComponent('алфавіт')}`)).body.map(
      (quiz: { title: string }) => quiz.title,
    );

    expect(titles).toEqual(alphabetical);
  });

  it('orders the Categories of a Quiz by name', async () => {
    await seed(db, [
      {
        ...knots,
        slug: 'many',
        categories: names.map((name, index) => ({ slug: `c-${index}`, name })),
      },
    ]);
    const quiz = (await get('/api/quizzes/many')).body;

    expect(quiz.categories.map((c: { name: string }) => c.name)).toEqual(alphabetical);
  });
});

describe('GET /api/categories/:slug', () => {
  it('returns the Category with summaries of its Quizzes', async () => {
    const { status, body } = await get('/api/categories/istoriia-ukrainy');

    expect(status).toBe(200);
    expect(categoryWithQuizzesSchema.strict().parse(body)).toBeTruthy();
    // Ukrainian titles come before Latin ones in Ukrainian alphabetical order.
    expect(body.quizzes.map((quiz: { slug: string }) => quiz.slug)).toEqual([
      'ivan-bohun',
      'basic-knots',
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

  describe('when a Quiz is removed from the seed files', () => {
    const knotsWithOwnCategory = {
      ...knots,
      categories: [...knots.categories, { slug: 'uzly', name: 'Вузли' }],
    };

    beforeEach(async () => {
      await seed(db, [bohun, knotsWithOwnCategory]);
    });

    it('withdraws the Quiz and the Categories nothing else uses', async () => {
      await seed(db, [bohun]);

      expect((await get('/api/quizzes/basic-knots')).status).toBe(404);
      expect((await get('/api/quizzes?q=bowline')).body).toEqual([]);
      expect((await get('/api/categories/uzly')).status).toBe(404);
      expect((await get('/api/categories')).body.map((c: { slug: string }) => c.slug)).toEqual([
        'istoriia-ukrainy',
        'patrony-kureniv',
      ]);
      expect((await get('/api/quizzes/ivan-bohun')).status).toBe(200);
    });

    it('removes nothing when the new seed run is invalid', async () => {
      const broken = { ...bohun, questions: [] };

      await expect(seed(db, [broken])).rejects.toThrow();

      expect((await get('/api/quizzes/basic-knots')).status).toBe(200);
      expect((await get('/api/categories/uzly')).status).toBe(200);
    });
  });

  it('reports how many Quizzes it added, updated and removed', async () => {
    const extra = { ...knots, slug: 'extra-knots', title: 'Extra Knots' };

    expect(await seed(db, [{ ...bohun, title: 'Changed' }, extra])).toEqual({
      added: 1,
      updated: 1,
      removed: 1,
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

describe('GET /api/live', () => {
  it('stays ok when the database is down', async () => {
    const unreachable = createDb('postgres://yunakquiz:yunakquiz@localhost:1/yunakquiz');
    const offline = buildApp({ db: unreachable.db });
    const response = await offline.inject({ method: 'GET', url: '/api/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await offline.close();
    await unreachable.close();
  });
});

describe('shutdown', () => {
  it('makes /api/health answer 503 once closing starts', async () => {
    const closing = buildApp({ db });
    // Keeps the server accepting requests after our preClose hook ran.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    closing.addHook('preClose', () => held);
    await closing.listen({ port: 0, host: '127.0.0.1' });
    const url = `http://127.0.0.1:${(closing.server.address() as { port: number }).port}/api/health`;
    expect((await fetch(url)).status).toBe(200);
    const closed = closing.close();
    await new Promise((resolve) => setImmediate(resolve));
    const response = await fetch(url, { headers: { connection: 'close' } });
    release();
    await closed;
    expect(response.status).toBe(503);
  });
});

describe('security headers', () => {
  it('are set on API responses', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/categories' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });
});

describe('rate limit', () => {
  it('answers 429 in the API error shape once the limit is spent', async () => {
    const limited = buildApp({ db, rateLimit: { max: 2, timeWindow: '1 minute' } });
    const statuses: number[] = [];
    let last;
    for (let i = 0; i < 3; i++) {
      last = await limited.inject({ method: 'GET', url: '/api/categories' });
      statuses.push(last.statusCode);
    }
    expect(statuses).toEqual([200, 200, 429]);
    expect(last?.json()).toEqual({ error: 'Too many requests' });
    await limited.close();
  });

  it('does not limit health checks', async () => {
    const limited = buildApp({ db, rateLimit: { max: 1, timeWindow: '1 minute' } });
    for (let i = 0; i < 3; i++) {
      expect((await limited.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
    }
    await limited.close();
  });
});

describe('trustProxy', () => {
  it('uses X-Forwarded-For as the client address when enabled', async () => {
    const limited = buildApp({
      db,
      trustProxy: true,
      rateLimit: { max: 1, timeWindow: '1 minute' },
    });
    const call = (ip: string) =>
      limited.inject({ method: 'GET', url: '/api/categories', headers: { 'x-forwarded-for': ip } });
    expect((await call('10.0.0.1')).statusCode).toBe(200);
    expect((await call('10.0.0.2')).statusCode).toBe(200);
    expect((await call('10.0.0.1')).statusCode).toBe(429);
    await limited.close();
  });
});

describe('rate limit allow list', () => {
  it('does not exempt paths that only start like a probe', async () => {
    const limited = buildApp({ db, rateLimit: { max: 1, timeWindow: '1 minute' } });
    const call = () => limited.inject({ method: 'GET', url: '/api/categories?x=/api/health' });
    await call();
    expect((await call()).statusCode).toBe(429);
    await limited.close();
  });
});
