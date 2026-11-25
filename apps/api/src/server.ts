import { SESClient } from '@aws-sdk/client-ses';
import closeWithGrace from 'close-with-grace';
import { buildApp } from './app.ts';
import { createDb } from './db/client.ts';
import { createSesMailer } from './mailer.ts';
import { optionalEnv, requireEnv } from './env.ts';

const { db, close } = createDb(requireEnv('DATABASE_URL'), {
  onError: (error) => app.log.error(error, 'Idle database client error'),
});
// TRUST_PROXY: number of proxy hops in front of the API (e.g. 1 behind one load balancer).
// Unset means no proxy, so X-Forwarded-For is ignored and cannot spoof the rate limit.
const trustProxyHops = Number(optionalEnv('TRUST_PROXY', '0'));
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY must be a non-negative integer (number of proxy hops)');
}
// SES client reads AWS_REGION, credentials and AWS_ENDPOINT_URL (LocalStack in dev) from the environment.
const mailer = createSesMailer({ client: new SESClient({}), from: requireEnv('MAIL_FROM') });
const app = buildApp({
  db,
  mailer,
  logger: true,
  trustProxy: trustProxyHops > 0 ? trustProxyHops : false,
});

// On SIGINT/SIGTERM (or a fatal error): stop accepting connections, drain in-flight
// requests, then end the pool. Force-exit if that takes longer than `delay`.
closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) app.log.error(err, 'Closing after fatal error');
  else app.log.info({ signal }, 'Closing on signal');
  await app.close();
  await close();
  app.log.info('Closed');
});

await app.listen({
  host: optionalEnv('HOST', '0.0.0.0'),
  port: Number(optionalEnv('PORT', '3000')),
});
