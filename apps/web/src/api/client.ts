import {
  accountSchema,
  categorySchema,
  categoryWithQuizzesSchema,
  quizSchema,
  quizSummarySchema,
  type ChangeDisplayNameInput,
  type ChangeEmailInput,
  type ChangePasswordInput,
  type DeleteAccountInput,
  type LoginInput,
  type PasswordIssue,
  type RegisterInput,
} from '@yunakquiz/core';
import type { z } from 'zod';

/** A non-2xx response from the API. `code` is the API's `error` value, such as `session_expired`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly issues: PasswordIssue[];

  constructor(
    status: number,
    path: string,
    {
      method = 'GET',
      code,
      issues = [],
    }: { method?: string; code?: string; issues?: PasswordIssue[] } = {},
  ) {
    super(`${method} ${path} failed with ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === 'session_expired';
}

/** Mutating requests carry this header; the API refuses them without it (CSRF, ADR 0008). */
const csrfHeaders = { 'X-Requested-With': 'yunakquiz' };

async function request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    method,
    // The session cookie travels with every request.
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(method === 'POST' && csrfHeaders),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = response.status === 204 ? '' : await response.text();
  const json: unknown = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const { error, issues } = (json ?? {}) as { error?: string; issues?: PasswordIssue[] };
    throw new ApiError(response.status, path, {
      method,
      ...(error !== undefined && { code: error }),
      ...(issues !== undefined && { issues }),
    });
  }
  return json;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function get<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  return schema.parse(await request('GET', path));
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

/** The signed-in Account, or null for a Guest. Throws `session_expired` (401) for a dead cookie. */
export function fetchMe() {
  return get('/me', accountSchema.nullable());
}

export async function register(input: RegisterInput): Promise<void> {
  await request('POST', '/register', input);
}

export function login(input: LoginInput) {
  return request('POST', '/login', input).then((body) => accountSchema.parse(body));
}

export async function logout(): Promise<void> {
  await request('POST', '/logout', {});
}

export function changeDisplayName(input: ChangeDisplayNameInput) {
  return request('POST', '/account/display-name', input).then((body) => accountSchema.parse(body));
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await request('POST', '/account/password', input);
}

export async function changeEmail(input: ChangeEmailInput): Promise<void> {
  await request('POST', '/account/email', input);
}

export async function confirmEmailChange(token: string): Promise<void> {
  await request('POST', '/account/email/confirm', { token });
}

export async function deleteAccount(input: DeleteAccountInput): Promise<void> {
  await request('POST', '/account/delete', input);
}

export async function verifyEmail(token: string): Promise<void> {
  await request('POST', '/verify', { token });
}
