import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { apiEnv } from './env.ts';

export type TestAccount = {
  email: string;
  displayName: string;
  password: string;
  /** A Playwright `storageState` file holding this Account's session cookie. */
  storageState: string;
};

/** A long, uncommon phrase: it passes the password rules, and is known to the test. */
const knownPassword = 'bright lantern over quiet harbour';

/**
 * Creates a verified Account with a known password through the test-only seed (it refuses to
 * run outside development and test), logs in through the real login API and saves the session
 * as `storageState`. Every call makes a new Account, so specs never share state.
 */
async function loginAs(request: APIRequestContext, role: 'user' | 'admin'): Promise<TestAccount> {
  const id = randomUUID();
  const email = `e2e-${role}-${id}@example.test`;
  const displayName = `Скаут ${id.slice(0, 8)}`;

  execFileSync(
    'pnpm',
    [
      '--filter',
      '@yunakquiz/api',
      '--silent',
      'db:seed:test-account',
      '--email',
      email,
      '--name',
      displayName,
      '--password',
      knownPassword,
      '--role',
      role,
    ],
    { env: { ...process.env, ...apiEnv }, stdio: 'pipe' },
  );

  const response = await request.post('/api/login', {
    data: { email, password: knownPassword },
    headers: { 'X-Requested-With': 'yunakquiz' },
  });
  if (!response.ok()) throw new Error(`Login as ${role} failed with ${response.status()}`);

  const storageState = `test-results/auth/${role}-${id}.json`;
  await request.storageState({ path: storageState });
  return { email, displayName, password: knownPassword, storageState };
}

export const loginAsUser = (request: APIRequestContext) => loginAs(request, 'user');
export const loginAsAdmin = (request: APIRequestContext) => loginAs(request, 'admin');
