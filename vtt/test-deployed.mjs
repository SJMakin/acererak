import { chromium, firefox } from '@playwright/test';

const url = process.argv[2] || 'http://localhost:5174/';

async function testBrowser(browserType, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${name} against ${url}`);
  console.log('='.repeat(60));

  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`❌ Failed Request: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('Navigating to page...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ Page loaded');

    // Wait a moment for any delayed errors
    await page.waitForTimeout(3000);

    // Check if main elements are visible
    const heading = page.getByRole('heading', { name: /Lychgate VTT/i });
    const isVisible = await heading.isVisible().catch(() => false);
    console.log(`Heading visible: ${isVisible}`);

    // Try to interact with the page
    const createTab = page.getByRole('tab', { name: /Create Game/i });
    const createTabVisible = await createTab.isVisible().catch(() => false);
    console.log(`Create Game tab visible: ${createTabVisible}`);

    if (createTabVisible) {
      await createTab.click();
      console.log('✓ Clicked Create Game tab');
      await page.waitForTimeout(1000);

      // Try to create a game
      const gameNameInput = page.getByLabel(/Game Name/i);
      if (await gameNameInput.isVisible().catch(() => false)) {
        await gameNameInput.fill('Test Game');
        console.log('✓ Filled game name');

        const gmNameInput = page.getByPlaceholder('Game Master');
        if (await gmNameInput.isVisible().catch(() => false)) {
          await gmNameInput.fill('Test GM');
          console.log('✓ Filled GM name');
        }

        const createButton = page.getByRole('button', { name: /Create Game/i });
        if (await createButton.isVisible().catch(() => false)) {
          console.log('Clicking Create Game button...');
          await createButton.click();

          // Wait for game creation or error
          console.log('Waiting for game creation results...');
          await page.waitForTimeout(10000);

          // Check what happened
          const gameCreated = await page.getByText(/Game Created!/i).isVisible().catch(() => false);
          const roomCode = await page.getByText(/Room Code:/i).isVisible().catch(() => false);
          const anyError = await page.locator('[role="alert"], .mantine-Alert-root').isVisible().catch(() => false);

          console.log(`Game Created message: ${gameCreated}`);
          console.log(`Room Code visible: ${roomCode}`);
          console.log(`Error alert visible: ${anyError}`);

          if (anyError) {
            const alertText = await page.locator('[role="alert"], .mantine-Alert-root').textContent().catch(() => 'unknown');
            console.log(`Alert content: ${alertText}`);
          }
        }
      }
    }

    // Check for any error dialogs or messages
    const errorMessage = await page.locator('.mantine-Alert-message, [role="alert"]').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`Alert message found: ${errorMessage}`);
    }

    console.log('\n--- Console Messages Summary ---');
    const errorMsgs = consoleMessages.filter(m => m.includes('[error]'));
    const warnMsgs = consoleMessages.filter(m => m.includes('[warning]'));
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errorMsgs.length}`);
    console.log(`Warnings: ${warnMsgs.length}`);

    if (errorMsgs.length > 0) {
      console.log('\nAll error messages:');
      errorMsgs.forEach(m => console.log(`  ${m}`));
    }

  } catch (e) {
    console.log(`❌ Test failed: ${e.message}`);
  }

  await browser.close();

  return { errors, consoleMessages };
}

async function main() {
  await testBrowser(chromium, 'Chromium');
  await testBrowser(firefox, 'Firefox');
}

main().catch(console.error);
