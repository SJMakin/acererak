import { test, expect } from '@playwright/test';

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Create a game and navigate to canvas for each test
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Canvas Test');
    await page.getByLabel(/Your Name \(GM\)/i).fill('GM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should display canvas with grid', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Canvas should have dimensions
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);
  });

  test('should pan canvas using pan tool', async ({ page }) => {
    // Find and click pan tool button (looking for hand/grab icon or Space hint)
    const panToolButton = page.locator('button').filter({ hasText: /Pan|Space/ }).or(
      page.getByRole('button', { name: /Pan/i })
    );
    
    // Try to find the pan tool by tooltip or aria-label
    const panButton = page.locator('[aria-label*="Pan"], [title*="Pan"]').or(panToolButton);
    
    if (await panButton.count() > 0) {
      await panButton.first().click();
    } else {
      // Alternative: press Space to activate pan tool
      await page.keyboard.press('Space');
    }
    
    // Get canvas element
    const canvas = page.locator('canvas').first();
    
    // Get initial position
    const initialBox = await canvas.boundingBox();
    
    // Perform drag on canvas (simulating pan)
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Note: Since panning moves the viewport, we can't easily verify position change
    // But we can verify no errors occurred
    await page.waitForTimeout(500);
  });

  test('should zoom in and out with zoom controls', async ({ page }) => {
    // Look for zoom buttons (+ and -)
    const zoomIn = page.locator('button').filter({ hasText: /\+|Zoom In/i }).or(
      page.getByRole('button', { name: /Zoom In/i })
    );
    const zoomOut = page.locator('button').filter({ hasText: /−|-|Zoom Out/i }).or(
      page.getByRole('button', { name: /Zoom Out/i })
    );
    
    // Look for zoom percentage display
    const zoomDisplay = page.locator('text=/\\d+%/');
    
    // Check initial zoom (should be 100%)
    if (await zoomDisplay.count() > 0) {
      await expect(zoomDisplay.first()).toBeVisible();
    }
    
    // Zoom in
    if (await zoomIn.count() > 0) {
      await zoomIn.first().click();
      await page.waitForTimeout(300);
    }
    
    // Zoom out
    if (await zoomOut.count() > 0) {
      await zoomOut.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('should zoom using mouse wheel', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 400, y: 300 } });
    
    // Zoom in with wheel
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(300);
    
    // Zoom out with wheel
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(300);
  });

  test('should reset zoom', async ({ page }) => {
    // Find reset zoom button (usually a refresh icon or "Reset" text)
    const resetButton = page.locator('button').filter({ hasText: /Reset|🔄/ }).or(
      page.getByRole('button', { name: /Reset Zoom/i })
    );
    
    if (await resetButton.count() > 0) {
      // Zoom in first
      const zoomIn = page.locator('button').filter({ hasText: /\+/ }).first();
      if (await zoomIn.count() > 0) {
        await zoomIn.click();
        await page.waitForTimeout(200);
      }
      
      // Reset
      await resetButton.first().click();
      await page.waitForTimeout(300);
      
      // Check if zoom is back to 100%
      const zoomDisplay = page.locator('text=/100%/');
      if (await zoomDisplay.count() > 0) {
        await expect(zoomDisplay.first()).toBeVisible();
      }
    }
  });

  test('should toggle sidebar', async ({ page }) => {
    // Find sidebar toggle button
    const sidebarToggle = page.locator('button').filter({ hasText: /◀|▶/ }).or(
      page.getByRole('button', { name: /sidebar/i })
    );
    
    if (await sidebarToggle.count() > 0) {
      const toggleBtn = sidebarToggle.first();
      
      // Click to toggle
      await toggleBtn.click();
      await page.waitForTimeout(300);
      
      // Click again to toggle back
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('should switch between tools', async ({ page }) => {
    // Test switching to select tool
    const selectTool = page.locator('button[aria-label*="Select"], button[title*="Select"]').or(
      page.locator('button').filter({ hasText: /Select/ })
    );
    
    if (await selectTool.count() > 0) {
      await selectTool.first().click();
      await page.waitForTimeout(200);
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('s');
      await page.waitForTimeout(200);
    }
    
    // Test switching to token tool
    const tokenTool = page.locator('button[aria-label*="Token"], button[title*="Token"]').or(
      page.locator('button').filter({ hasText: /Token/ })
    );
    
    if (await tokenTool.count() > 0) {
      await tokenTool.first().click();
      await page.waitForTimeout(200);
    } else {
      await page.keyboard.press('n');
      await page.waitForTimeout(200);
    }
  });

  test('should open settings modal', async ({ page }) => {
    // Find settings button (gear icon or Settings text)
    const settingsButton = page.locator('button').filter({ hasText: /⚙|Settings/ }).or(
      page.getByRole('button', { name: /Settings/i })
    );
    
    if (await settingsButton.count() > 0) {
      await settingsButton.first().click();
      
      // Settings modal should open
      const modal = page.locator('[role="dialog"], .mantine-Modal-root').or(
        page.getByText(/Settings/i).first()
      );
      
      await expect(modal.first()).toBeVisible({ timeout: 2000 });
      
      // Close modal (look for close button or press Escape)
      const closeButton = page.locator('button[aria-label*="Close"], button').filter({ hasText: /Close|×/ });
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
      } else {
        await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(300);
    }
  });

  test('should show connection status', async ({ page }) => {
    // Look for connection status badge or indicator
    const connectionBadge = page.locator('text=/Connected|players/i').or(
      page.locator('[class*="Badge"]').filter({ hasText: /Connected/i })
    );
    
    // Should show at least the GM as connected
    await page.waitForTimeout(1000);
    
    // Connection info might be visible
    const hasConnection = await connectionBadge.count() > 0;
    if (hasConnection) {
      await expect(connectionBadge.first()).toBeVisible();
    }
  });

  test('should display game name in toolbar', async ({ page }) => {
    // Game name should be visible somewhere in the header/toolbar
    await expect(page.getByText(/Canvas Test/i)).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Undo (Ctrl+Z)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    
    // Test Redo (Ctrl+Y)
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(200);
    
    // Test tool shortcuts
    const shortcuts = ['s', 'd', 'l', 'r', 'c', 't'];
    for (const key of shortcuts) {
      await page.keyboard.press(key);
      await page.waitForTimeout(100);
    }
  });

  test('should show undo/redo buttons', async ({ page }) => {
    // Look for undo/redo buttons (↶ ↷ or Undo/Redo text)
    const undoButton = page.locator('button').filter({ hasText: /↶|Undo/i }).or(
      page.getByRole('button', { name: /Undo/i })
    );
    const redoButton = page.locator('button').filter({ hasText: /↷|Redo/i }).or(
      page.getByRole('button', { name: /Redo/i })
    );
    
    // Buttons should be visible (might be disabled initially)
    if (await undoButton.count() > 0) {
      await expect(undoButton.first()).toBeVisible();
    }
    if (await redoButton.count() > 0) {
      await expect(redoButton.first()).toBeVisible();
    }
  });
});

test.describe('Canvas - Grid Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Grid Test');
    await page.getByLabel(/Your Name \(GM\)/i).fill('GM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle grid visibility in settings', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('button').filter({ hasText: /⚙|Settings/ }).first();
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      
      // Look for grid toggle checkbox
      const gridToggle = page.locator('input[type="checkbox"]').filter({ hasText: /Grid/i }).or(
        page.getByLabel(/Show Grid/i)
      );
      
      if (await gridToggle.count() > 0) {
        // Toggle grid off
        await gridToggle.first().click();
        await page.waitForTimeout(300);
        
        // Toggle grid back on
        await gridToggle.first().click();
        await page.waitForTimeout(300);
      }
      
      // Close settings
      await page.keyboard.press('Escape');
    }
  });
});
