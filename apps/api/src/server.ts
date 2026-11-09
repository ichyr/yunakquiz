import { buildApp } from './app.ts';
import { createDb } from './db/client.ts';
import { requireEnv } from './env.ts';

const { db } = createDb(requireEnv('DATABASE_URL'));
const app = buildApp({ db, logger: true });

await app.listen({
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
});
