import {
  categorySchema,
  categoryWithQuizzesSchema,
  quizSchema,
  quizSummarySchema,
} from '@yunakquiz/core';
import type { z } from 'zod';

/** A non-2xx response from the API. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, path: string) {
    super(`GET ${path} failed with ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

async function get<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const response = await fetch(`/api${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ApiError(response.status, path);
  return schema.parse(await response.json());
}

export function fetchCategories() {
  return get('/categories', categorySchema.array());
}

export function fetchCategory(slug: string) {
  return get(`/categories/${encodeURIComponent(slug)}`, categoryWithQuizzesSchema);
}

export function searchQuizzes(query: string) {
  return get(`/quizzes?${new URLSearchParams({ q: query })}`, quizSummarySchema.array());
}

export function fetchQuiz(slug: string) {
  return get(`/quizzes/${encodeURIComponent(slug)}`, quizSchema);
}
