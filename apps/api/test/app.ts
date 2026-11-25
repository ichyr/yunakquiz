import { randomUUID } from 'node:crypto';
import type { Db } from '../src/db/client.ts';
import { buildApp as buildRealApp } from '../src/app.ts';
import { createFakeMailer, type FakeMailer, type Mail } from '../src/mailer.ts';

export const testPeppers = 'v1:test-pepper-one-0123456789';
export const csrfHeaders = { 'x-requested-with': 'yunakquiz' };
export const strongPassword = 'bright lantern over quiet harbour';

type Options = Parameters<typeof buildRealApp>[0];

/** buildApp with the options every test needs: a pepper. Callers override what they test. */
export function buildApp(
  options: Omit<Options, 'passwordPeppers'> & { passwordPeppers?: string | undefined },
) {
  return buildRealApp({ passwordPeppers: testPeppers, ...options });
}

/** A fresh app with a fake Mailer, and a clock the test can move. */
export function buildAuthApp(
  db: Db,
  options: Partial<Omit<Options, 'db' | 'mailer' | 'now'>> = {},
) {
  const mailer: FakeMailer = createFakeMailer();
  let time = Date.now();
  const app = buildApp({
    db,
    mailer,
    webBaseUrl: 'https://quiz.test',
    corsOrigins: ['https://quiz.test'],
    now: () => new Date(time),
    ...options,
  });
  return {
    app,
    mailer,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

/** A unique recipient, so parallel tests never read each other's mail. */
export const uniqueEmail = () => `user-${randomUUID()}@test.local`;

/** Mail is sent after the response, so poll the outbox for it. */
export async function waitForOutbox(mailer: FakeMailer, to: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const mail = mailer.outbox.find((m: Mail) => m.to === to);
    if (mail) return mail;
    if (Date.now() > deadline) throw new Error(`No mail for ${to} within ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export const tokenIn = (mail: Mail) => /token=([\w-]+)/.exec(mail.text)?.[1] ?? '';
