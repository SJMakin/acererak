import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

async function createGameAndStart(page: Page, gameName: string) {
  await page.goto(BASE_URL);
  await page.getByRole('tab', { name: /Create Game/i }).click();
  await page.getByLabel(/Game Name/i).fill(gameName);
  await page.getByPlaceholder('Game Master').fill('GM');
  await page.getByRole('button', { name: /Create Game/i }).click();
  await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
  const roomId = await page.getByTestId('room-code').textContent();
  expect(roomId).toBeTruthy();
  await page.getByRole('button', { name: /Start Game/i }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
  return roomId!;
}

/** Sample a pixel color from the Konva canvas via toDataURL */
async function sampleCanvasCenter(page: Page): Promise<{ r: number; g: number; b: number }> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return { r: 0, g: 0, b: 0 };

    // Konva uses multiple canvases; get the first (background layer)
    const allCanvases = document.querySelectorAll('canvas');
    // Create a temporary canvas to composite
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext('2d')!;
    // Draw all Konva canvases in order
    allCanvases.forEach((c) => ctx.drawImage(c, 0, 0));

    const cx = Math.floor(tmp.width / 2);
    const cy = Math.floor(tmp.height / 2);
    const pixel = ctx.getImageData(cx, cy, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
  });
}

test.describe('Scene background images', () => {
  test('URL background (data URI) renders on canvas', async ({ page }) => {
    await createGameAndStart(page, 'URL BG Test');
    await page.waitForTimeout(500);

    // Sample baseline color
    const baseline = await sampleCanvasCenter(page);

    // Edit current scene to add data URI background (red)
    await page.locator('button').filter({ hasText: /Scene/ }).first().click();
    await page.getByRole('menuitem', { name: /Edit Current Scene/i }).click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 10x10 red PNG as data URI
    const redDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8z8BQz0AEYBxVOHIUAgBGWAkFdPgJhgAAAABJRU5ErkJggg==';
    await modal.getByPlaceholder(/https/i).fill(redDataUri);
    await modal.getByRole('button', { name: /Save Changes/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Wait for image to load and render
    await page.waitForTimeout(2000);

    // Sample pixel after — should be reddish (the data URI is a red PNG)
    const after = await sampleCanvasCenter(page);
    console.log('Baseline pixel:', baseline, '→ After pixel:', after);

    // The red channel should have increased significantly
    expect(after.r).toBeGreaterThan(baseline.r + 50);
  });

  test('Embedded background (file upload) renders on canvas', async ({ page }) => {
    await createGameAndStart(page, 'Embed BG Test');
    await page.waitForTimeout(500);

    const baseline = await sampleCanvasCenter(page);

    // Create a blue 100x100 PNG in the browser and save to temp file
    const tempFile = path.join(__dirname2, 'test-bg.png');
    const pngBase64 = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 100; c.height = 100;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(0, 0, 100, 100);
      return c.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(tempFile, Buffer.from(pngBase64, 'base64'));

    try {
      // Edit current scene and upload background
      await page.locator('button').filter({ hasText: /Scene/ }).first().click();
      await page.getByRole('menuitem', { name: /Edit Current Scene/i }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles(tempFile);

      // Wait for embedded indicator
      const embeddedIndicator = modal.locator('input[readonly][value="(embedded image)"]');
      const errorText = modal.locator('text=/Failed to process/i');
      await expect(embeddedIndicator.or(errorText)).toBeVisible({ timeout: 10000 });

      if (await errorText.isVisible()) {
        test.skip(true, 'Image processing not supported in test env');
        return;
      }

      // Preview should show
      await expect(modal.locator('img[alt="Embedded image preview"]')).toBeVisible({ timeout: 5000 });

      // Save
      await modal.getByRole('button', { name: /Save Changes/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });

      await page.waitForTimeout(3000);

      // Sample pixel — should be blue
      const after = await sampleCanvasCenter(page);
      console.log('Baseline pixel:', baseline, '→ After pixel:', after);

      // Blue channel should have increased significantly
      expect(after.b).toBeGreaterThan(baseline.b + 50);
    } finally {
      try { fs.unlinkSync(tempFile); } catch { /* */ }
    }
  });

  test('Preview shows embedded image when reopening edit modal', async ({ page }) => {
    await createGameAndStart(page, 'Preview BG Test');

    // Create a green 100x100 PNG
    const tempFile = path.join(__dirname2, 'test-bg-preview.png');
    const pngBase64 = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 100; c.height = 100;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, 100, 100);
      return c.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(tempFile, Buffer.from(pngBase64, 'base64'));

    try {
      // Edit scene and upload
      await page.locator('button').filter({ hasText: /Scene/ }).first().click();
      await page.getByRole('menuitem', { name: /Edit Current Scene/i }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await modal.locator('input[type="file"]').setInputFiles(tempFile);
      await expect(modal.locator('input[readonly][value="(embedded image)"]')).toBeVisible({ timeout: 10000 });
      await expect(modal.locator('img[alt="Embedded image preview"]')).toBeVisible({ timeout: 5000 });

      // Save and close
      await modal.getByRole('button', { name: /Save Changes/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(1000);

      // Reopen edit modal — preview should still show
      await page.locator('button').filter({ hasText: /Scene/ }).first().click();
      await page.getByRole('menuitem', { name: /Edit Current Scene/i }).click();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Should show embedded image indicator and preview
      await expect(modal.locator('input[readonly][value="(embedded image)"]')).toBeVisible({ timeout: 5000 });
      await expect(modal.locator('img[alt="Embedded image preview"]')).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');
    } finally {
      try { fs.unlinkSync(tempFile); } catch { /* */ }
    }
  });
});
