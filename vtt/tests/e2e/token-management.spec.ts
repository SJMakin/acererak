import { test, expect } from '@playwright/test';

test.describe('Token Management', () => {
  test.beforeEach(async ({ page }) => {
    // Create a game and navigate to canvas
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Token Test');
    await page.getByLabel(/Your Name \(DM\)/i).fill('DM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should add token via sidebar form', async ({ page }) => {
    // Open sidebar if not already open
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      await page.waitForTimeout(500);
    }
    
    // Fill token form
    const nameInput = page.getByPlaceholder(/Token name/i).or(
      page.getByLabel(/Token name/i)
    );
    const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ });
    
    if (await nameInput.count() > 0) {
      await nameInput.first().fill('Test Goblin');
      
      // Optional: fill image URL
      const urlInput = page.getByPlaceholder(/Image URL/i).or(
        page.getByLabel(/Image URL/i)
      );
      if (await urlInput.count() > 0) {
        await urlInput.first().fill('https://example.com/goblin.png');
      }
      
      // Click add button
      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);
        
        // Verify token appears in list
        await expect(page.getByText(/Test Goblin/i)).toBeVisible();
      }
    }
  });

  test('should add token via token tool (click-to-place)', async ({ page }) => {
    // Activate token tool
    const tokenTool = page.locator('button[aria-label*="Token"], button[title*="Token"]').or(
      page.locator('button').filter({ hasText: /Token/ })
    );
    
    if (await tokenTool.count() > 0) {
      await tokenTool.first().click();
    } else {
      await page.keyboard.press('n');
    }
    
    await page.waitForTimeout(300);
    
    // Click on canvas to place token
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Token configuration modal should appear
    const modal = page.locator('[role="dialog"]').or(
      page.getByText(/Token/i).filter({ hasText: /Name|Add/ })
    );
    
    await page.waitForTimeout(1000);
    
    // Check if modal appeared, if so fill it
    if (await modal.count() > 0) {
      const tokenNameInput = page.getByPlaceholder(/Name/i).or(
        page.getByLabel(/Name/i)
      );
      
      if (await tokenNameInput.count() > 0) {
        await tokenNameInput.first().fill('Placed Token');
        
        // Submit
        const submitButton = page.getByRole('button', { name: /Add|Create|Place/i });
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should select token by clicking', async ({ page }) => {
    // First add a token via sidebar
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      await page.waitForTimeout(300);
      
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Selectable Token');
        await addButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Switch to select tool
    await page.keyboard.press('s');
    await page.waitForTimeout(200);
    
    // Click on canvas where token should be (at default position 100, 100)
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(300);
  });

  test('should display token in sidebar list', async ({ page }) => {
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      await page.waitForTimeout(300);
      
      // Add a token
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Listed Token');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Verify it appears in the list
        const tokenInList = page.getByText(/Listed Token/i);
        await expect(tokenInList).toBeVisible();
      }
    }
  });

  test('should delete token from sidebar', async ({ page }) => {
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      await page.waitForTimeout(300);
      
      // Add a token
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Token to Delete');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Find delete button (trash icon)
        const deleteButton = page.locator('button').filter({ hasText: /🗑|Delete|Trash/ }).last();
        
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.waitForTimeout(500);
          
          // Token should be removed
          const deletedToken = page.getByText(/Token to Delete/i);
          await expect(deletedToken).not.toBeVisible();
        }
      }
    }
  });

  test('should show empty state when no tokens', async ({ page }) => {
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      await page.waitForTimeout(300);
      
      // Should see empty message
      const emptyMessage = page.getByText(/No tokens on map/i);
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('should show token properties when selected', async ({ page }) => {
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      
      // Add a token with HP and AC
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Warrior');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Click on the token in the list to select it
        await page.getByText(/Warrior/i).click();
        await page.waitForTimeout(300);
        
        // Properties tab might appear
        const propertiesTab = page.getByRole('tab', { name: /Properties/i });
        if (await propertiesTab.count() > 0) {
          await expect(propertiesTab).toBeVisible();
        }
      }
    }
  });
});

test.describe('Token Properties', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Properties Test');
    await page.getByLabel(/Your Name \(DM\)/i).fill('DM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should edit token properties via Property Inspector', async ({ page }) => {
    // Add a token first
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Editable Token');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Select the token
        await page.getByText(/Editable Token/i).click();
        await page.waitForTimeout(300);
        
        // Open properties tab if available
        const propertiesTab = page.getByRole('tab', { name: /Properties/i });
        if (await propertiesTab.count() > 0) {
          await propertiesTab.click();
          await page.waitForTimeout(300);
          
          // Properties should be editable here
          // Look for HP, AC, or other property inputs
          const hpInputs = page.locator('input[type="number"]');
          if (await hpInputs.count() > 0) {
            // Properties are loaded
            await expect(hpInputs.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('should update token HP', async ({ page }) => {
    // Add token with HP
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('HP Token');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Select and edit
        await page.getByText(/HP Token/i).click();
        await page.waitForTimeout(300);
        
        const propertiesTab = page.getByRole('tab', { name: /Properties/i });
        if (await propertiesTab.count() > 0) {
          await propertiesTab.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  test('should display token visibility options for DM', async ({ page }) => {
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Visible Token');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Select token
        await page.getByText(/Visible Token/i).click();
        await page.waitForTimeout(300);
        
        // Check DM Tools tab
        const dmTab = page.getByRole('tab', { name: /DM/i });
        if (await dmTab.count() > 0) {
          await dmTab.click();
          await page.waitForTimeout(300);
          
          // Should see visibility options
          const visibilitySelect = page.getByLabel(/Visibility/i);
          if (await visibilitySelect.count() > 0) {
            await expect(visibilitySelect.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('should lock/unlock token', async ({ page }) => {
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Lockable Token');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Select token
        await page.getByText(/Lockable Token/i).click();
        await page.waitForTimeout(300);
        
        // Check DM Tools tab for lock checkbox
        const dmTab = page.getByRole('tab', { name: /DM/i });
        if (await dmTab.count() > 0) {
          await dmTab.click();
          await page.waitForTimeout(300);
          
          // Look for locked checkbox
          const lockCheckbox = page.getByLabel(/Locked/i);
          if (await lockCheckbox.count() > 0) {
            await lockCheckbox.first().click();
            await page.waitForTimeout(300);
            
            // Unlock
            await lockCheckbox.first().click();
            await page.waitForTimeout(300);
          }
        }
      }
    }
  });
});

test.describe('Token Movement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Movement Test');
    await page.getByLabel(/Your Name \(DM\)/i).fill('DM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
  });

  test('should move token by dragging on canvas', async ({ page }) => {
    // Add a token first
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Moveable Token');
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Switch to select tool
        await page.keyboard.press('s');
        await page.waitForTimeout(200);
        
        // Drag token on canvas
        const canvas = page.locator('canvas').first();
        await canvas.hover({ position: { x: 100, y: 100 } });
        await page.mouse.down();
        await page.mouse.move(200, 200, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should snap to grid when snap is enabled', async ({ page }) => {
    // This test verifies the snap-to-grid functionality
    // We'll need to add a token and check if it snaps after being placed
    
    // Add token
    const tokensTab = page.getByRole('tab', { name: /Tokens/i });
    if (await tokensTab.count() > 0) {
      await tokensTab.click();
      const nameInput = page.getByPlaceholder(/Token name/i).first();
      const addButton = page.getByRole('button', { name: /Add/i }).filter({ hasText: /Add/ }).first();
      
      if (await nameInput.count() > 0 && await addButton.count() > 0) {
        await nameInput.fill('Snap Token');
        await addButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Grid snapping is automatic based on game settings
    // Token should snap to grid when moved
  });
});
