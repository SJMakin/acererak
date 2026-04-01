import { defineConfig, devices } from '@playwright/test';

// Allow testing against deployed site via environment variable
// Usage: TEST_URL=https://lychgate.sammak.in npx playwright test
const baseURL = process.env.TEST_URL || 'http://localhost:5174';

// HEADED=1 npx playwright test  → visible browsers with slowMo
const headed = !!process.env.HEADED;
const slowMo = headed ? Number(process.env.SLOW_MO || 400) : 0;

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
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  // Auto-start dev server unless testing against a deployed URL
  ...(!process.env.TEST_URL && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  }),
});
