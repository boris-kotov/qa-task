import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0, // flaky tests must be visible, not retried away
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: 'reports/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: env.BASE_URL,
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'ui-chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
  ],
});
