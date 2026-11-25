import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env['CI'];

// Runs against the API and a seeded database: `pnpm db:up && pnpm db:seed` first.
export default defineConfig({
  testDir: './e2e',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      command: 'pnpm --filter @yunakquiz/api start',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !ci,
      env: {
        DATABASE_URL:
          process.env['DATABASE_URL'] ?? 'postgres://yunakquiz:yunakquiz@localhost:5432/yunakquiz',
        // The API refuses to start without these. Mail goes nowhere here: no AWS endpoint is set.
        PASSWORD_PEPPERS: process.env['PASSWORD_PEPPERS'] ?? 'v1:e2e-only-pepper-not-a-secret-0001',
        MAIL_FROM: process.env['MAIL_FROM'] ?? 'noreply@yunakquiz.test',
      },
    },
    {
      command: 'pnpm dev --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !ci,
    },
  ],
});
