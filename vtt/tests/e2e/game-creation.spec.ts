import { test, expect } from '@playwright/test';

test.describe('Game Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display lobby on initial load', async ({ page }) => {
    // Check for lobby title
    await expect(page.getByRole('heading', { name: /Acererak VTT/i })).toBeVisible();
    
    // Check for tabs
    await expect(page.getByRole('tab', { name: /Recent Games/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Create Game/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Join Game/i })).toBeVisible();
  });

  test('should create a new game as DM', async ({ page }) => {
    // Click on Create Game tab
    await page.getByRole('tab', { name: /Create Game/i }).click();
    
    // Fill in game details
    await page.getByLabel(/Game Name/i).fill('Test Adventure');
    await page.getByLabel(/Your Name \(DM\)/i).fill('Test DM');
    
    // Create the game
    const createButton = page.getByRole('button', { name: /Create Game/i });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    
    // Wait for game creation confirmation
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    
    // Check QR code is displayed
    await expect(page.locator('svg').first()).toBeVisible();
    
    // Check room ID is displayed
    const roomCode = page.locator('code').first();
    await expect(roomCode).toBeVisible();
    const roomId = await roomCode.textContent();
    expect(roomId).toBeTruthy();
    expect(roomId?.length).toBeGreaterThan(0);
    
    // Check copy buttons are visible
    await expect(page.getByRole('button', { name: /Copy Invite Link/i })).toBeVisible();
    
    // Start the game
    await page.getByRole('button', { name: /Start Game/i }).click();
    
    // Verify we're in the game canvas view
    await expect(page.getByText(/Test Adventure/i)).toBeVisible({ timeout: 5000 });
    
    // Check that DM controls are visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('tab', { name: /Create Game/i }).click();
    
    const createButton = page.getByRole('button', { name: /Create Game/i });
    
    // Button should be disabled when fields are empty
    await expect(createButton).toBeDisabled();
    
    // Fill only game name
    await page.getByLabel(/Game Name/i).fill('Test Game');
    await expect(createButton).toBeDisabled();
    
    // Fill only DM name (clear game name first)
    await page.getByLabel(/Game Name/i).clear();
    await page.getByLabel(/Your Name \(DM\)/i).fill('Test DM');
    await expect(createButton).toBeDisabled();
    
    // Fill both fields
    await page.getByLabel(/Game Name/i).fill('Test Game');
    await expect(createButton).toBeEnabled();
  });

  test('should show recent games tab', async ({ page }) => {
    // Recent games tab should be active by default
    const recentTab = page.getByRole('tab', { name: /Recent Games/i });
    await expect(recentTab).toBeVisible();
    
    // Should show empty state or list of games
    const emptyMessage = page.getByText(/No saved games yet/i);
    const gamesList = page.locator('[role="article"]');
    
    // Either empty message or games list should be visible
    try {
      await expect(emptyMessage).toBeVisible({ timeout: 2000 });
    } catch {
      await expect(gamesList.first()).toBeVisible();
    }
  });

  test('should populate join form from URL parameter', async ({ page }) => {
    // Navigate with room parameter
    await page.goto('/?room=TEST1234');
    
    // Should switch to Join tab
    const joinTab = page.getByRole('tab', { name: /Join Game/i });
    await expect(joinTab).toHaveAttribute('data-active', 'true');
    
    // Room ID should be pre-filled
    const roomInput = page.getByLabel(/Room ID/i);
    await expect(roomInput).toHaveValue('TEST1234');
  });

  test('should validate join game form', async ({ page }) => {
    await page.getByRole('tab', { name: /Join Game/i }).click();
    
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    
    // Button should be disabled when fields are empty
    await expect(joinButton).toBeDisabled();
    
    // Fill only room ID
    await page.getByLabel(/Room ID/i).fill('TEST1234');
    await expect(joinButton).toBeDisabled();
    
    // Fill only player name
    await page.getByLabel(/Room ID/i).clear();
    await page.getByLabel(/Your Name/i).fill('Test Player');
    await expect(joinButton).toBeDisabled();
    
    // Fill both fields
    await page.getByLabel(/Room ID/i).fill('TEST1234');
    await expect(joinButton).toBeEnabled();
  });

  test('should allow color selection for player', async ({ page }) => {
    await page.getByRole('tab', { name: /Join Game/i }).click();
    
    // Color input should be visible
    const colorInput = page.getByLabel(/Your Color/i);
    await expect(colorInput).toBeVisible();
    
    // Should have default color
    const defaultColor = await colorInput.inputValue();
    expect(defaultColor).toMatch(/#[0-9a-f]{6}/i);
  });
});

test.describe('Game Canvas - Initial Load', () => {
  test('should load game canvas after creation', async ({ page }) => {
    await page.goto('/');
    
    // Create game
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('Canvas Test');
    await page.getByLabel(/Your Name \(DM\)/i).fill('DM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    
    // Wait for game created screen
    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 10000 });
    
    // Start game
    await page.getByRole('button', { name: /Start Game/i }).click();
    
    // Verify canvas is loaded
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
    
    // Verify toolbar is visible
    await expect(page.locator('[role="toolbar"]').or(page.getByText(/Canvas Test/i))).toBeVisible();
    
    // Verify sidebar can be toggled
    const sidebarToggle = page.getByRole('button', { name: /sidebar/i }).or(
      page.locator('button').filter({ hasText: /◀|▶/ })
    );
    if (await sidebarToggle.count() > 0) {
      await expect(sidebarToggle.first()).toBeVisible();
    }
  });

  test('should show DM controls in toolbar', async ({ page }) => {
    await page.goto('/');
    
    // Create game as DM
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('DM Controls Test');
    await page.getByLabel(/Your Name \(DM\)/i).fill('DM');
    await page.getByRole('button', { name: /Create Game/i }).click();
    await page.getByRole('button', { name: /Start Game/i }).click();
    
    // Wait for canvas
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
    
    // Check for tool buttons (these should be visible as ActionIcons)
    // The toolbar should have multiple action icons for tools
    const actionIcons = page.locator('button[class*="ActionIcon"], [role="button"]');
    await expect(actionIcons.first()).toBeVisible({ timeout: 5000 });
  });
});
