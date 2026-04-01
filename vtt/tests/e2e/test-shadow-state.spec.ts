import { test, expect, type Page } from '@playwright/test';

async function createAndStartGame(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: /Create Game/i }).click();
  await page.getByLabel(/Game Name/i).fill('Shadow Test');
  await page.getByPlaceholder('Game Master').fill('GM');
  await page.getByRole('button', { name: /Create Game/i }).click();
  await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Start Game/i }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 });
}

test('expression updates when stat value changes', async ({ page }) => {
  await createAndStartGame(page);

  // Open library and create character
  await page.getByRole('tab', { name: /Library/i }).click();
  await page.getByRole('button', { name: /Create Character/i }).click();
  await expect(page.getByPlaceholder('Untitled Character')).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder('Untitled Character').fill('Shadow Test');

  const ed = page.locator('.tiptap');
  await ed.click();

  // Create a stat
  await page.keyboard.type('STR:: 10', { delay: 20 });
  await page.keyboard.press('Enter');
  await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });

  // Create an expression that references it
  await page.keyboard.type('{{ STR + 5 }}', { delay: 20 });
  await page.keyboard.press('Enter');

  // Expression should show 15 (10 + 5)
  const expr = ed.locator('.expression');
  await expect(expr).toHaveCount(1);
  await expect(expr).toContainText('15', { timeout: 3000 });

  // Now edit the stat — click on it to enter edit mode
  const stat = ed.locator('.stat-declaration').first();
  await stat.locator('.stat-declaration__edit-trigger').click();
  await expect(stat.locator('.stat-declaration__value-input')).toBeVisible({ timeout: 2000 });

  // Change value from 10 to 25
  const valInput = stat.locator('.stat-declaration__value-input');
  await valInput.fill('25');
  await page.keyboard.press('Enter'); // save

  // Wait for shadow state update
  await page.waitForTimeout(500);

  // Expression should now show 30 (25 + 5)
  await expect(expr).toContainText('30', { timeout: 5000 });
});
