import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/** Final report mode: evidence (trace + screenshot) for every test, including expected failures. */
const fullEvidence = process.env.FULL_EVIDENCE === 'true';

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
    // Known defects are marked test.fail, so their failures count as "expected" and retain-on-failure drops their
    // traces/screenshots. The final report run (npm run test:report, FULL_EVIDENCE=true) keeps them for every test.
    trace: fullEvidence ? 'on' : 'retain-on-failure',
    screenshot: fullEvidence ? 'on' : 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'ui-chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
  ],
});
