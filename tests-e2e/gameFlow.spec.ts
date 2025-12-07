import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should handle complete game flow', async ({ page }) => {
    // Start the game and wait for initial load
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // Wait for initial story node and choices to load with timeout
    const storyContent = page.locator('.story-content');
    await expect(storyContent).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Wait for choices to appear and be clickable
    const choices = page.locator('.story-choices button');
    await page.waitForSelector('.story-choices button', { state: 'visible', timeout: 30000 });
    
    // Ensure we have at least one choice
    const choicesCount = await choices.count();
    expect(choicesCount).toBeGreaterThan(0);

    // Click the first choice and wait for response
    await choices.first().click();
    // Wait for story generation to complete
    await page.waitForLoadState('networkidle');

    // Verify dice roll if required
    const diceAnimation = page.locator('#dice-animation-container');
    if (await diceAnimation.isVisible()) {
      // Wait for dice animation to complete
      await expect(diceAnimation).not.toBeVisible({ timeout: 5000 });
    }

    // Verify return to story mode
    await expect(page.locator('.story-content')).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we can continue playing by checking for the story choices container
    await expect(page.locator('.story-choices')).toBeVisible({ timeout: 30000 });
    
    // Ensure we have at least one choice button
    const newChoices = page.locator('.story-choices button');
    await expect(await newChoices.count()).toBeGreaterThan(0);
  });

  test('should handle hook errors gracefully', async ({ page }) => {
    // Start the game and wait for initial load
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // Wait for initial story node and choices to load with timeout
    const storyContent = page.locator('.story-content');
    await expect(storyContent).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Check for React error boundary or error message
    const errorMessage = page.locator('text="Invalid hook call"');
    await expect(errorMessage).not.toBeVisible();

    // Wait for choices to appear
    const choices = page.locator('.story-choices button');
    await page.waitForSelector('.story-choices button', { state: 'visible', timeout: 30000 });
    
    // Test rapid state changes that might trigger hook issues
    const choicesCount = await choices.count();
    if (choicesCount > 1) {
      // Click multiple choices in succession and wait for responses
      await choices.nth(0).click();
      await page.waitForLoadState('networkidle');
      
      await choices.nth(1).click();
      await page.waitForLoadState('networkidle');
      
      // Verify no hook errors appear
      await expect(errorMessage).not.toBeVisible();
    }
  });
});
