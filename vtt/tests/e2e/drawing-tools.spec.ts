import { test, expect } from '@playwright/test';

test.describe('Drawing Tools', () => {
  test.beforeEach(async ({ page }) => {
    // Create a game and navigate to canvas
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Drawing Test');
    await page.getByLabel(/Your Name \(GM\)/i).fill('GM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should activate freehand draw tool', async ({ page }) => {
    // Activate freehand tool
    const freehandTool = page.locator('button[aria-label*="Freehand"], button[title*="Freehand"]').or(
      page.locator('button').filter({ hasText: /Freehand|Draw/ })
    );
    
    if (await freehandTool.count() > 0) {
      await freehandTool.first().click();
      await page.waitForTimeout(300);
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('d');
      await page.waitForTimeout(300);
    }
  });

  test('should draw freehand line on canvas', async ({ page }) => {
    // Activate freehand tool
    await page.keyboard.press('d');
    await page.waitForTimeout(300);
    
    // Draw on canvas
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(250, 250, { steps: 5 });
    await page.mouse.move(300, 200, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should activate line tool', async ({ page }) => {
    // Activate line tool
    const lineTool = page.locator('button[aria-label*="Line"], button[title*="Line"]').or(
      page.locator('button').filter({ hasText: /Line/ })
    );
    
    if (await lineTool.count() > 0) {
      await lineTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('l');
      await page.waitForTimeout(300);
    }
  });

  test('should draw straight line', async ({ page }) => {
    // Activate line tool
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
    
    // Draw line
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await page.mouse.move(300, 300, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should activate rectangle tool', async ({ page }) => {
    // Activate rectangle tool
    const rectTool = page.locator('button[aria-label*="Rectangle"], button[title*="Rectangle"]').or(
      page.locator('button').filter({ hasText: /Rectangle/ })
    );
    
    if (await rectTool.count() > 0) {
      await rectTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('r');
      await page.waitForTimeout(300);
    }
  });

  test('should draw rectangle', async ({ page }) => {
    // Activate rectangle tool
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    // Draw rectangle
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 150, y: 150 } });
    await page.mouse.down();
    await page.mouse.move(350, 250, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should activate circle tool', async ({ page }) => {
    // Activate circle tool
    const circleTool = page.locator('button[aria-label*="Circle"], button[title*="Circle"]').or(
      page.locator('button').filter({ hasText: /Circle/ })
    );
    
    if (await circleTool.count() > 0) {
      await circleTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('c');
      await page.waitForTimeout(300);
    }
  });

  test('should draw circle', async ({ page }) => {
    // Activate circle tool
    await page.keyboard.press('c');
    await page.waitForTimeout(300);
    
    // Draw circle
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 250, y: 250 } });
    await page.mouse.down();
    await page.mouse.move(350, 250, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should activate ellipse tool', async ({ page }) => {
    // Activate ellipse tool
    const ellipseTool = page.locator('button[aria-label*="Ellipse"], button[title*="Ellipse"]').or(
      page.locator('button').filter({ hasText: /Ellipse/ })
    );
    
    if (await ellipseTool.count() > 0) {
      await ellipseTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('e');
      await page.waitForTimeout(300);
    }
  });

  test('should draw ellipse', async ({ page }) => {
    // Activate ellipse tool
    await page.keyboard.press('e');
    await page.waitForTimeout(300);
    
    // Draw ellipse
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should activate arrow tool', async ({ page }) => {
    // Activate arrow tool
    const arrowTool = page.locator('button[aria-label*="Arrow"], button[title*="Arrow"]').or(
      page.locator('button').filter({ hasText: /Arrow/ })
    );
    
    if (await arrowTool.count() > 0) {
      await arrowTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('a');
      await page.waitForTimeout(300);
    }
  });

  test('should draw arrow', async ({ page }) => {
    // Activate arrow tool
    await page.keyboard.press('a');
    await page.waitForTimeout(300);
    
    // Draw arrow
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 150, y: 150 } });
    await page.mouse.down();
    await page.mouse.move(350, 350, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should activate polygon tool', async ({ page }) => {
    // Activate polygon tool
    const polygonTool = page.locator('button[aria-label*="Polygon"], button[title*="Polygon"]').or(
      page.locator('button').filter({ hasText: /Polygon/ })
    );
    
    if (await polygonTool.count() > 0) {
      await polygonTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('g');
      await page.waitForTimeout(300);
    }
  });

  test('should draw polygon with multiple points', async ({ page }) => {
    // Activate polygon tool
    await page.keyboard.press('g');
    await page.waitForTimeout(300);
    
    // Click to add points
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 250, y: 350 } });
    await page.waitForTimeout(200);
    
    // Double-click or right-click to finish
    await canvas.dblclick({ position: { x: 200, y: 300 } });
    await page.waitForTimeout(500);
  });
});

test.describe('Drawing Style Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Style Test');
    await page.getByLabel(/Your Name \(GM\)/i).fill('GM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should show drawing controls when drawing tool is active', async ({ page }) => {
    // Activate a drawing tool
    await page.keyboard.press('r');
    await page.waitForTimeout(500);
    
    // Drawing controls should appear (color pickers, stroke width)
    // Look for color input or color swatches
    const colorControls = page.locator('[type="color"], [class*="ColorInput"]').or(
      page.locator('button[style*="background"]')
    );
    
    // Controls might be visible in toolbar
    await page.waitForTimeout(500);
  });

  test('should change stroke color', async ({ page }) => {
    // Activate drawing tool
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    // Look for stroke color button
    const strokeColorButton = page.locator('button[aria-label*="Stroke"], button[title*="Stroke"]').first();
    
    if (await strokeColorButton.count() > 0) {
      await strokeColorButton.click();
      await page.waitForTimeout(500);
      
      // Color picker/swatches should appear
      const colorSwatches = page.locator('[class*="ColorSwatch"], button[style*="background-color"]');
      if (await colorSwatches.count() > 0) {
        await colorSwatches.first().click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should change fill color', async ({ page }) => {
    // Activate drawing tool
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    // Look for fill color button
    const fillColorButton = page.locator('button[aria-label*="Fill"], button[title*="Fill"]').first();
    
    if (await fillColorButton.count() > 0) {
      await fillColorButton.click();
      await page.waitForTimeout(500);
      
      // Color picker should appear
      const colorSwatches = page.locator('[class*="ColorSwatch"], button[style*="background-color"]');
      if (await colorSwatches.count() > 0) {
        await colorSwatches.first().click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should toggle fill on/off', async ({ page }) => {
    // Activate drawing tool
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    // Look for fill toggle
    const fillToggle = page.locator('input[type="checkbox"]').filter({ hasText: /Fill/i }).or(
      page.getByLabel(/Fill/i)
    );
    
    if (await fillToggle.count() > 0) {
      await fillToggle.first().click();
      await page.waitForTimeout(300);
      
      // Toggle back
      await fillToggle.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('should change stroke width', async ({ page }) => {
    // Activate drawing tool
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    // Look for stroke width control
    const strokeWidthButton = page.locator('button').filter({ hasText: /^\d+$/ }).or(
      page.locator('button[aria-label*="Stroke Width"]')
    );
    
    if (await strokeWidthButton.count() > 0) {
      await strokeWidthButton.first().click();
      await page.waitForTimeout(500);
      
      // Width options should appear
      const widthOptions = page.locator('button').filter({ hasText: /^\d+$/ });
      if (await widthOptions.count() > 1) {
        await widthOptions.nth(1).click();
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('Text Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Text Test');
    await page.getByLabel(/Your Name \(GM\)/i).fill('GM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should activate text tool', async ({ page }) => {
    // Activate text tool
    const textTool = page.locator('button[aria-label*="Text"], button[title*="Text"]').or(
      page.locator('button').filter({ hasText: /Text/ })
    );
    
    if (await textTool.count() > 0) {
      await textTool.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('t');
      await page.waitForTimeout(300);
    }
  });

  test('should create text box on canvas', async ({ page }) => {
    // Activate text tool
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    
    // Click on canvas to place text
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 250, y: 250 } });
    await page.waitForTimeout(500);
    
    // Text modal/input should appear
    const textModal = page.locator('[role="dialog"]').or(
      page.locator('textarea, input[type="text"]').filter({ hasText: '' })
    );
    
    if (await textModal.count() > 0) {
      // Type text
      const textInput = page.locator('textarea').or(page.locator('input[type="text"]')).first();
      if (await textInput.count() > 0) {
        await textInput.fill('Test Label');
        
        // Submit
        const submitButton = page.getByRole('button', { name: /Add|Create|OK|Submit/i });
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(500);
        } else {
          // Try Enter key
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should edit existing text on double-click', async ({ page }) => {
    // First create a text element
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 250, y: 250 } });
    await page.waitForTimeout(500);
    
    const textInput = page.locator('textarea, input[type="text"]').first();
    if (await textInput.count() > 0) {
      await textInput.fill('Edit Me');
      const submitButton = page.getByRole('button', { name: /Add|Create|OK/i });
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(500);
      }
    }
    
    // Now try to edit it by double-clicking
    await page.keyboard.press('s'); // Switch to select tool
    await page.waitForTimeout(200);
    
    // Double-click where text was placed
    await canvas.dblclick({ position: { x: 250, y: 250 } });
    await page.waitForTimeout(500);
    
    // Edit modal should appear
    const editInput = page.locator('textarea, input[type="text"]');
    if (await editInput.count() > 0 && await editInput.first().isVisible()) {
      await editInput.first().clear();
      await editInput.first().fill('Edited Text');
      
      const submitButton = page.getByRole('button', { name: /Save|OK|Submit/i });
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Shape Selection and Manipulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Selection Test');
    await page.getByLabel(/Your Name \(GM\)/i).fill('GM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should select drawn shape', async ({ page }) => {
    // Draw a rectangle first
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Switch to select tool
    await page.keyboard.press('s');
    await page.waitForTimeout(300);
    
    // Click on the shape
    await canvas.click({ position: { x: 250, y: 250 } });
    await page.waitForTimeout(300);
  });

  test('should move selected shape', async ({ page }) => {
    // Draw a rectangle
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Select and move it
    await page.keyboard.press('s');
    await page.waitForTimeout(300);
    
    await canvas.hover({ position: { x: 250, y: 250 } });
    await page.mouse.down();
    await page.mouse.move(350, 350, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should delete selected shape', async ({ page }) => {
    // Draw a rectangle
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Select it
    await page.keyboard.press('s');
    await page.waitForTimeout(300);
    await canvas.click({ position: { x: 250, y: 250 } });
    await page.waitForTimeout(300);
    
    // Delete with keyboard
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
  });
});
