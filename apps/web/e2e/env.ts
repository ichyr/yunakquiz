/**
 * The settings the Playwright config and the e2e helpers share: where the API and web servers
 * listen, and the database, pepper and mail settings the API (and the test Account seed) use.
 * Override the ports when another checkout already holds 3000 or 5173.
 */
export const apiPort = process.env['E2E_API_PORT'] ?? '3000';
export const webPort = process.env['E2E_WEB_PORT'] ?? '5173';

export const apiEnv = {
  DATABASE_URL:
    process.env['DATABASE_URL'] ?? 'postgres://yunakquiz:yunakquiz@localhost:5432/yunakquiz',
  // The API refuses to start without a pepper. A throwaway one, same for the seed.
  PASSWORD_PEPPERS: process.env['PASSWORD_PEPPERS'] ?? 'v1:e2e-only-pepper-not-a-secret-0001',
  MAIL_FROM: process.env['MAIL_FROM'] ?? 'noreply@yunakquiz.test',
  // `development` keeps the session cookie usable over http and lets the test Account seed run.
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  // Mail goes to LocalStack SES (`pnpm db:up`), where the specs read it.
  AWS_ENDPOINT_URL: process.env['AWS_ENDPOINT_URL'] ?? 'http://localhost:4566',
  AWS_REGION: process.env['AWS_REGION'] ?? 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env['AWS_ACCESS_KEY_ID'] ?? 'test',
  AWS_SECRET_ACCESS_KEY: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'test',
  WEB_BASE_URL: `http://localhost:${webPort}`,
};
