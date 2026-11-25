import { defineConfig, devices } from '@playwright/test';
import { apiEnv, apiPort, webPort } from './e2e/env.ts';

const ci = !!process.env['CI'];

// Runs against the API and a seeded database: `pnpm db:up && pnpm db:seed` first.
// The account specs also read mail from LocalStack SES, which `pnpm db:up` starts.
export default defineConfig({
  testDir: './e2e',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      command: 'pnpm --filter @yunakquiz/api start',
      url: `http://localhost:${apiPort}/api/health`,
      reuseExistingServer: !ci,
      env: { ...apiEnv, PORT: apiPort },
    },
    {
      command: `pnpm dev --port ${webPort} --strictPort`,
      url: `http://localhost:${webPort}`,
      reuseExistingServer: !ci,
      env: { API_URL: `http://localhost:${apiPort}` },
    },
  ],
});
