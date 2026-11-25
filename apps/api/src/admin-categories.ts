import { categoryInputSchema, categoryRenameInputSchema } from '@yunakquiz/core';
import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from './db/client.ts';
import { categories } from './db/schema.ts';
import { uniqueViolation } from './users.ts';

/**
 * Admin management of Categories. Registered inside the Admin scope in `admin.ts`, so the
 * Admin guard already answers 403 before these handlers run. Deleting a Category removes its
 * links to Quizzes (cascade) and never deletes a Quiz.
 */

const idParams = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });

export type CategoryRow = { id: number; slug: string; name: string };

export type CategoryChange<T = undefined> =
  { ok: true; value: T } | { ok: false; reason: 'not_found' | 'slug_taken' };

export async function createCategory(
  db: Db,
  input: { name: string; slug: string },
): Promise<CategoryChange<CategoryRow>> {
  const [taken] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, input.slug));
  if (taken) return { ok: false, reason: 'slug_taken' };
  try {
    const [row] = await db.insert(categories).values(input).returning({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
    });
    return { ok: true, value: row! };
  } catch (error) {
    // Two creates racing for one slug: the unique index decides.
    if (uniqueViolation(error) !== undefined) return { ok: false, reason: 'slug_taken' };
    throw error;
  }
}

export async function renameCategory(
  db: Db,
  id: number,
  name: string,
): Promise<CategoryChange<CategoryRow>> {
  const [row] = await db
    .update(categories)
    .set({ name })
    .where(eq(categories.id, id))
    .returning({ id: categories.id, slug: categories.slug, name: categories.name });
  return row ? { ok: true, value: row } : { ok: false, reason: 'not_found' };
}

export async function deleteCategory(db: Db, id: number): Promise<CategoryChange> {
  const deleted = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return deleted.length > 0 ? { ok: true, value: undefined } : { ok: false, reason: 'not_found' };
}

export async function adminCategoryRoutes(api: FastifyInstance, { db }: { db: Db }) {
  // Every Category, including ones without Quizzes: the Admin manages the whole list.
  api.get('/categories', async () =>
    db
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
  );

  api.post('/categories', async (request, reply) => {
    const body = categoryInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'invalid_input' });
    const actorId = request.adminActor!.id;

    const result = await createCategory(db, body.data);
    const entry = { event: 'admin_action', action: 'create_category', actorId };
    if (!result.ok) {
      request.log.warn({ ...entry, outcome: 'denied', reason: result.reason }, 'Admin action');
      return reply.code(409).send({ error: result.reason });
    }
    request.log.info({ ...entry, outcome: 'done', categoryId: result.value.id }, 'Admin action');
    return reply.code(201).send(result.value);
  });

  api.patch('/categories/:id', async (request, reply) => {
    const params = idParams.safeParse(request.params);
    const body = categoryRenameInputSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'invalid_input' });
    const actorId = request.adminActor!.id;
    const categoryId = params.data.id;

    const result = await renameCategory(db, categoryId, body.data.name);
    const entry = { event: 'admin_action', action: 'rename_category', actorId, categoryId };
    if (!result.ok) {
      request.log.warn({ ...entry, outcome: 'denied', reason: result.reason }, 'Admin action');
      return reply.code(404).send({ error: 'not_found' });
    }
    request.log.info({ ...entry, outcome: 'done' }, 'Admin action');
    return result.value;
  });

  api.delete('/categories/:id', async (request, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_input' });
    const actorId = request.adminActor!.id;
    const categoryId = params.data.id;

    const result = await deleteCategory(db, categoryId);
    const entry = { event: 'admin_action', action: 'delete_category', actorId, categoryId };
    if (!result.ok) {
      request.log.warn({ ...entry, outcome: 'denied', reason: result.reason }, 'Admin action');
      return reply.code(404).send({ error: 'not_found' });
    }
    request.log.info({ ...entry, outcome: 'done' }, 'Admin action');
    return reply.code(204).send();
  });
}
