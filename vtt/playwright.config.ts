import { defineConfig, devices } from '@playwright/test';

// Allow testing against deployed site via environment variable
// Usage: TEST_URL=https://lychgate.sammak.in npx playwright test
const baseURL = process.env.TEST_URL || 'http://localhost:5174';

// HEADED=1 npx playwright test  → visible browsers with slowMo
const headed = !!process.env.HEADED;
const slowMo = headed ? Number(process.env.SLOW_MO || 400) : 0;
const runPaidAI = process.env.RUN_PAID_AI_TESTS === '1';
const paidAITest = /ai-image-generation\.spec\.ts/;
const pureTest = /safe-(dice|expression|invite|markdown)\.spec\.ts/;

if (runPaidAI && !process.env.OPENROUTER_API_KEY?.trim()) {
  throw new Error('RUN_PAID_AI_TESTS=1 requires OPENROUTER_API_KEY');
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000, // Increased timeout for P2P connections (2 minutes)
  fullyParallel: false, // Run sequentially to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once locally for flaky P2P
  workers: 1, // Single worker to avoid conflicts
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    headless: !headed,
    launchOptions: { slowMo },
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Increase action timeout for P2P sync
    actionTimeout: 30000,
  },
  projects: [
    {
      name: 'unit',
      testMatch: pureTest,
      use: { trace: 'off', video: 'off', screenshot: 'off' },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [paidAITest, pureTest],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [paidAITest, pureTest],
    },
    // This project does not exist unless the explicit paid-test gate is set.
    ...(runPaidAI ? [{
      name: 'ai',
      use: {
        ...devices['Desktop Chrome'],
        trace: 'off' as const,
        video: 'off' as const,
        screenshot: 'off' as const,
      },
      testMatch: paidAITest,
    }] : []),
  ],
  // Auto-start dev server unless testing against a deployed URL
  ...(!process.env.TEST_URL && process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1' && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  }),
});
