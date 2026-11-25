import closeWithGrace from 'close-with-grace';
import { buildApp } from './app.ts';
import { createDb } from './db/client.ts';
import { optionalEnv, requireEnv } from './env.ts';

const { db, close } = createDb(requireEnv('DATABASE_URL'), {
  onError: (error) => app.log.error(error, 'Idle database client error'),
});
const app = buildApp({ db, logger: true });

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
