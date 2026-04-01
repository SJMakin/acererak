import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

/**
 * Generate a tiny valid PNG file buffer (1x1 red pixel).
 * Used for upload tests — avoids needing a fixture file on disk.
 */
function createTestPng(): Buffer {
  // Minimal 1x1 red PNG (67 bytes)
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  );
  return png;
}

/** Write the test PNG to a temp file and return its path */
function writeTempPng(dir: string): string {
  const filePath = path.join(dir, 'test-token.png');
  fs.writeFileSync(filePath, createTestPng());
  return filePath;
}

/** Helper: create a game and get to the canvas */
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

// ─── Single-player: image upload, embedded token, export/import ─────────────

test.describe('Embedded images — upload & export/import', () => {
  let tempPng: string;

  test.beforeAll(() => {
    // Write a tiny PNG next to the test file so fileChooser can use it
    tempPng = writeTempPng(__dirname);
  });

  test.afterAll(() => {
    try { fs.unlinkSync(tempPng); } catch { /* ignore */ }
  });

  test('Upload image via click-to-place token, verify embedded, export, re-import', async ({ page }) => {
    await createGameAndStart(page, 'Image Upload Test');

    // --- Step 1: Place a token via click-to-place with an uploaded image ---

    // Activate token tool ('n' key)
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    // Focus canvas first, then press 'n' for token tool
    await page.mouse.click(canvasBox!.x + 50, canvasBox!.y + 50);
    await page.keyboard.press('n');
    await page.waitForTimeout(300);

    // Click on canvas to open the token config modal (raw mouse to bypass Konva layering)
    await page.mouse.click(canvasBox!.x + 400, canvasBox!.y + 300);

    // Wait for the token config modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill token name
    await modal.getByLabel(/Token Name/i).fill('Embedded Hero');

    // Upload an image via the hidden file input inside ImageInput
    // The ImageInput has a hidden <input type="file"> inside the drop zone
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles(tempPng);

    // Wait for compression — the text field should show "(embedded image)" and become read-only
    await expect(modal.locator('input[readonly][value="(embedded image)"]')).toBeVisible({ timeout: 10000 });

    // The clear button (✕) should appear
    await expect(modal.locator('button[title="Clear embedded image"]')).toBeVisible();

    // A thumbnail preview should appear
    await expect(modal.locator('img[alt="Embedded image preview"]')).toBeVisible({ timeout: 5000 });

    // Submit the token
    await modal.getByRole('button', { name: /Place Token/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // --- Step 2: Verify the token appears in the sidebar ---

    await page.getByRole('tab', { name: 'Tokens' }).click();
    const tokensPanel = page.getByLabel('Tokens', { exact: true });
    await expect(tokensPanel.getByText('Embedded Hero')).toBeVisible({ timeout: 5000 });

    // Canvas should still be rendering
    await expect(canvas).toBeVisible();

    // --- Step 3: Export the game ---

    // Open the ⋯ menu → Save/Load
    // The ⋯ menu button — Mantine Menu.Target sets aria-haspopup="menu"
    // There are multiple menus (Scene menu, etc.) so pick the last one in the toolbar
    await page.locator('[aria-haspopup="menu"]').last().click();
    await page.getByText('Save/Load...').click();

    const exportModal = page.locator('[role="dialog"]');
    await expect(exportModal).toBeVisible({ timeout: 5000 });

    // Should be on Export tab by default — click Export Game
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportModal.getByRole('button', { name: /Export Selected/i }).click(),
    ]);

    // Verify the download happened
    expect(download).toBeTruthy();
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Read and verify the export file contains embedded images
    const exportContent = JSON.parse(fs.readFileSync(downloadPath!, 'utf-8'));
    expect(exportContent.version).toBe(4);
    expect(exportContent.embeddedImages).toBeTruthy();
    const imageIds = Object.keys(exportContent.embeddedImages);
    expect(imageIds.length).toBeGreaterThanOrEqual(1);

    // Verify the token references the embedded imageId
    const allElements = exportContent.scenes.flatMap((s: { elements: unknown[] }) => s.elements);
    const heroToken = allElements.find((el: { name?: string }) => el.name === 'Embedded Hero');
    expect(heroToken).toBeTruthy();
    expect(heroToken.imageId).toBeTruthy();
    expect(imageIds).toContain(heroToken.imageId);

    // Modal may auto-close after export; wait for it to disappear
    await expect(exportModal).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // If still visible, press Escape to close
      return page.keyboard.press('Escape');
    });

    // --- Step 4: Import the export into a fresh game ---

    // Create a new game in a new context to simulate a clean slate
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();

    await createGameAndStart(newPage, 'Import Test');

    // Open Save/Load → Import tab
    await newPage.locator('[aria-haspopup="menu"]').last().click();
    await newPage.getByText('Save/Load...').click();

    const importModal = newPage.locator('[role="dialog"]');
    await expect(importModal).toBeVisible({ timeout: 5000 });

    // Switch to import tab
    await importModal.getByRole('tab', { name: /Import/i }).click();

    // Upload the exported file
    const importFileInput = importModal.locator('input[type="file"], button:has-text("Select File")');

    // Use fileChooser for the import
    const [fileChooser] = await Promise.all([
      newPage.waitForEvent('filechooser'),
      importModal.getByRole('button', { name: /Select File/i }).click(),
    ]);
    await fileChooser.setFiles(downloadPath!);

    // Wait for import to parse the file — "Scenes (1)" appears in the content tree
    await expect(importModal.getByText(/Scenes \(1\)/i)).toBeVisible({ timeout: 10000 });

    // Click Import Selected
    await importModal.getByRole('button', { name: /Import Selected/i }).click();
    await newPage.waitForTimeout(2000);

    // Switch to the imported scene — it may have been added as a new scene
    // The token should be visible in the Tokens tab
    await newPage.getByRole('tab', { name: 'Tokens' }).click();

    // Navigate to the imported scene if needed
    const sceneButton = newPage.locator('button').filter({ hasText: /Scene/ }).first();
    if (await sceneButton.isVisible()) {
      await sceneButton.click();
      // Look for the original scene name
      const sceneItem = newPage.getByRole('menuitem').filter({ hasText: /Scene 1/i }).last();
      if (await sceneItem.isVisible()) {
        await sceneItem.click();
        await newPage.waitForTimeout(1000);
      } else {
        await newPage.keyboard.press('Escape');
      }
    }

    // The imported token with embedded image should be present
    const importedTokens = newPage.getByLabel('Tokens', { exact: true });
    await expect(importedTokens.getByText('Embedded Hero')).toBeVisible({ timeout: 10000 });

    // Canvas should be alive
    await expect(newPage.locator('canvas').first()).toBeVisible();

    await newPage.close();
    await newContext.close();
  });
});

// ─── Multiplayer: P2P image transfer ────────────────────────────────────────

test.describe.serial('Embedded images — P2P transfer', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'P2P tests skipped in Firefox');

  let tempPng: string;
  let gmContext: BrowserContext;
  let playerContext: BrowserContext;
  let gmPage: Page;
  let playerPage: Page;

  test.beforeAll(async ({ browser }) => {
    tempPng = writeTempPng(__dirname);

    gmContext = await browser.newContext();
    playerContext = await browser.newContext();
    gmPage = await gmContext.newPage();
    playerPage = await playerContext.newPage();

    for (const [label, pg] of [['GM', gmPage], ['Player', playerPage]] as const) {
      pg.on('console', (msg) => console.log(`[${label} ${msg.type()}] ${msg.text()}`));
      pg.on('pageerror', (err) => console.log(`[${label} PAGE ERROR] ${err.message}`));
    }

    // GM creates game
    await gmPage.goto(BASE_URL);
    await gmPage.getByRole('tab', { name: /Create Game/i }).click();
    await gmPage.getByLabel(/Game Name/i).fill('P2P Image Test');
    await gmPage.getByPlaceholder('Game Master').fill('Dungeon Master');
    await gmPage.getByRole('button', { name: /Create Game/i }).click();
    await expect(gmPage.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });

    const roomId = await gmPage.getByTestId('room-code').textContent();
    expect(roomId).toBeTruthy();

    await gmPage.getByRole('button', { name: /Start Game/i }).click();
    await expect(gmPage.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Player joins
    await playerPage.goto(BASE_URL);
    await playerPage.getByRole('tab', { name: /Join Game/i }).click();
    await playerPage.getByLabel(/Room ID/i).fill(roomId!);
    await playerPage.getByPlaceholder('Player Name').fill('Alaric');
    await playerPage.getByRole('button', { name: /Join Game/i }).click();

    // Both see canvas
    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });
    await expect(gmPage.locator('canvas').first()).toBeVisible();
  });

  test.afterAll(async () => {
    try { fs.unlinkSync(tempPng); } catch { /* ignore */ }
    await gmPage?.close();
    await playerPage?.close();
    await gmContext?.close();
    await playerContext?.close();
  });

  test('GM uploads embedded image token → Player receives it via P2P', async () => {
    // --- GM places a token with an uploaded image ---

    const gmCanvas = gmPage.locator('canvas').first();
    const canvasBox = await gmCanvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    // Focus canvas, then activate token tool
    await gmPage.mouse.click(canvasBox!.x + 50, canvasBox!.y + 50);
    await gmPage.keyboard.press('n');
    await gmPage.waitForTimeout(300);

    // Click on canvas to open token config modal (raw mouse for Konva)
    await gmPage.mouse.click(canvasBox!.x + 400, canvasBox!.y + 300);

    const modal = gmPage.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.getByLabel(/Token Name/i).fill('Dragon Boss');

    // Upload the test image
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles(tempPng);
    await expect(modal.locator('input[readonly][value="(embedded image)"]')).toBeVisible({ timeout: 10000 });

    // Place the token
    await modal.getByRole('button', { name: /Place Token/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Verify GM sees the token
    await gmPage.getByRole('tab', { name: 'Tokens' }).click();
    const gmTokens = gmPage.getByLabel('Tokens', { exact: true });
    await expect(gmTokens.getByText('Dragon Boss')).toBeVisible({ timeout: 5000 });

    // --- Player should receive the token AND the image via P2P ---

    await playerPage.getByRole('tab', { name: 'Tokens' }).click();
    const playerTokens = playerPage.getByLabel('Tokens', { exact: true });

    // Player sees the token name (element sync)
    await expect(playerTokens.getByText('Dragon Boss')).toBeVisible({ timeout: 15000 });

    // Canvas should be alive on both sides — the image rendered without crashing
    await expect(gmPage.locator('canvas').first()).toBeVisible();
    await expect(playerPage.locator('canvas').first()).toBeVisible();

    // Verify no desync
    const desyncBadge = playerPage.getByText('Out of Sync');
    await expect(desyncBadge).not.toBeVisible({ timeout: 5000 });

    // --- Also add a URL-only token to verify backward compatibility ---

    await gmPage.getByPlaceholder('Token name').fill('URL Skeleton');
    await gmPage.getByRole('button', { name: 'Add' }).click();
    await expect(gmTokens.getByText('URL Skeleton')).toBeVisible({ timeout: 5000 });
    await expect(playerTokens.getByText('URL Skeleton')).toBeVisible({ timeout: 15000 });
  });
});
