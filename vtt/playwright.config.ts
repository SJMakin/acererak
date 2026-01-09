import { defineConfig, devices } from '@playwright/test';

// Allow testing against deployed site via environment variable
// Usage: TEST_URL=https://lychgate.sammak.in npx playwright test
const baseURL = process.env.TEST_URL || 'http://localhost:5174';

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
  // Only start webServer if testing locally and not CI
  ...(!process.env.TEST_URL && process.env.CI && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 120000,
    },
  }),
});
