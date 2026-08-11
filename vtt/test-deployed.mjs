import { chromium, firefox } from '@playwright/test';

const url = process.argv[2] || 'http://localhost:5174/';

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function testBrowser(browserType, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${name} against ${url}`);
  console.log('='.repeat(60));

  let browser;
  const pageErrors = [];
  const consoleMessages = [];

  try {
    browser = await browserType.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', message => {
      const text = `[${message.type()}] ${message.text()}`;
      consoleMessages.push(text);
      if (message.type() === 'error') {
        console.log(`❌ Console Error: ${message.text()}`);
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log(`❌ Page Error: ${error.message}`);
    });

    page.on('requestfailed', request => {
      console.log(`❌ Failed Request: ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log('Navigating to page...');
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || !response.ok()) {
      throw new Error(`Navigation returned ${response?.status() ?? 'no HTTP response'}`);
    }
    console.log(`✓ Page loaded (${response.status()})`);

    const heading = page.getByRole('heading', { name: /Lychgate VTT/i });
    await heading.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Lobby heading visible');

    const createTab = page.getByRole('tab', { name: /Create Game/i });
    await createTab.waitFor({ state: 'visible', timeout: 10000 });
    await createTab.click();
    console.log('✓ Create Game tab opened');

    const gameNameInput = page.getByLabel(/Game Name/i);
    const gmNameInput = page.getByPlaceholder('Game Master');
    const createButton = page.getByRole('button', { name: /Create Game/i });

    await gameNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await gmNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    await gameNameInput.fill(`Deployment Smoke ${name}`);
    await gmNameInput.fill('Smoke Test GM');

    if (!(await createButton.isEnabled())) {
      throw new Error('Create Game button remained disabled after filling required fields');
    }

    console.log('Creating a signaling room...');
    await createButton.click();

    const gameCreated = page.getByText(/Game Created!/i);
    try {
      await gameCreated.waitFor({ state: 'visible', timeout: 30000 });
    } catch (error) {
      const alertText = await page.locator('[role="alert"], .mantine-Alert-root').first().textContent().catch(() => null);
      throw new Error(
        alertText
          ? `Game creation failed: ${alertText.trim()}`
          : `Game creation did not complete: ${errorMessage(error)}`
      );
    }

    const roomCode = page.getByTestId('room-code');
    await roomCode.waitFor({ state: 'visible', timeout: 10000 });
    if (!(await roomCode.textContent())?.trim()) {
      throw new Error('Game was created without a room code');
    }
    console.log('✓ Game created and room code visible');

    if (pageErrors.length > 0) {
      throw new Error(`Uncaught page errors: ${pageErrors.join(' | ')}`);
    }

    const errorMessages = consoleMessages.filter(message => message.startsWith('[error]'));
    const warningMessages = consoleMessages.filter(message => message.startsWith('[warning]'));
    console.log(`Console summary: ${errorMessages.length} errors, ${warningMessages.length} warnings`);
    console.log(`✓ ${name} deployment smoke passed`);
    return { name, passed: true };
  } catch (error) {
    const message = errorMessage(error);
    console.error(`❌ ${name} deployment smoke failed: ${message}`);
    return { name, passed: false, error: message };
  } finally {
    await browser?.close().catch(error => {
      console.error(`Failed to close ${name}: ${errorMessage(error)}`);
    });
  }
}

async function main() {
  const results = [];
  for (const [browserType, name] of [[chromium, 'Chromium'], [firefox, 'Firefox']]) {
    results.push(await testBrowser(browserType, name));
  }

  const failures = results.filter(result => !result.passed);
  if (failures.length > 0) {
    const details = failures.map(result => `${result.name}: ${result.error}`).join('\n');
    throw new Error(`${failures.length} deployment smoke check(s) failed:\n${details}`);
  }
}

main().catch(error => {
  console.error(`\n${errorMessage(error)}`);
  process.exitCode = 1;
});
