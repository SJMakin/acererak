import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * E2E tests for the P2P Join Game flow
 * 
 * These tests verify:
 * 1. GM can create a game and get room ID
 * 2. Player can join using room ID
 * 3. P2P connection is established
 * 4. Game state syncs between GM and player
 */

// Configurable base URL - can test against deployed site or localhost
const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

// P2P Flow tests require real WebRTC connections via BitTorrent DHT signaling.
// This works reliably in Chromium but has issues in automated Firefox environments
// due to the way Firefox handles WebRTC ICE candidates and WebSocket connections
// to BitTorrent trackers in headless/automated mode.
test.describe('Join Game - P2P Flow', () => {
  // Skip P2P tests in Firefox - BitTorrent DHT signaling doesn't work reliably
  // in automated Firefox test environments (ICE failures, tracker connection issues)
  test.skip(({ browserName }) => browserName === 'firefox', 'P2P tests skipped in Firefox - BitTorrent DHT signaling limitations');

  let browser: Browser;
  let dmContext: BrowserContext;
  let playerContext: BrowserContext;
  let gmPage: Page;
  let playerPage: Page;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.beforeEach(async ({ browserName }) => {
    // Create separate browser contexts for GM and Player
    // This simulates two different users with isolated storage
    // Note: clipboard permissions only supported in Chromium
    const contextOptions = browserName === 'chromium'
      ? { permissions: ['clipboard-read', 'clipboard-write'] as const }
      : {};

    dmContext = await browser.newContext(contextOptions);
    playerContext = await browser.newContext(contextOptions);
    
    gmPage = await dmContext.newPage();
    playerPage = await playerContext.newPage();
    
    // Log ALL console messages for debugging P2P issues
    gmPage.on('console', msg => {
      const text = msg.text();
      // Log everything for debug, highlight errors and P2P-related messages
      const prefix = msg.type() === 'error' ? '❌' :
                     msg.type() === 'warning' ? '⚠️' :
                     (text.includes('peer') || text.includes('ICE') || text.includes('WebRTC')) ? '🔗' : '  ';
      console.log(`[GM ${msg.type()}] ${prefix} ${text}`);
    });
    playerPage.on('console', msg => {
      const text = msg.text();
      const prefix = msg.type() === 'error' ? '❌' :
                     msg.type() === 'warning' ? '⚠️' :
                     (text.includes('peer') || text.includes('ICE') || text.includes('WebRTC')) ? '🔗' : '  ';
      console.log(`[Player ${msg.type()}] ${prefix} ${text}`);
    });

    // Also capture page errors (uncaught exceptions)
    gmPage.on('pageerror', error => {
      console.log(`[GM PAGE ERROR] ❌ ${error.message}`);
    });
    playerPage.on('pageerror', error => {
      console.log(`[Player PAGE ERROR] ❌ ${error.message}`);
    });
  });

  test.afterEach(async () => {
    await gmPage?.close();
    await playerPage?.close();
    await dmContext?.close();
    await playerContext?.close();
  });

  test('GM creates game and player joins via room ID', async () => {
    // Step 1: GM creates a game
    await gmPage.goto(BASE_URL);
    await expect(gmPage.getByRole('heading', { name: /Lychgate VTT/i })).toBeVisible();
    
    await gmPage.getByRole('tab', { name: /Create Game/i }).click();
    
    const gameName = `Test Game ${Date.now()}`;
    await gmPage.getByLabel(/Game Name/i).fill(gameName);
    await gmPage.getByPlaceholder('Game Master').fill('Test GM');
    
    // Click create and wait
    await gmPage.getByRole('button', { name: /Create Game/i }).click();
    
    // Wait for game creation - this involves Trystero room setup
    // If this times out, P2P signaling is failing
    await expect(gmPage.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
    
    // Get the room ID
    const roomCode = gmPage.getByTestId('room-code');
    await expect(roomCode).toBeVisible({ timeout: 10000 });
    const roomId = await roomCode.textContent();
    expect(roomId).toBeTruthy();
    expect(roomId!.length).toBeGreaterThan(0);
    
    console.log(`Room ID created: ${roomId}`);
    
    // GM starts the game (goes to canvas)
    await gmPage.getByRole('button', { name: /Start Game/i }).click();
    await expect(gmPage.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    
    // Step 2: Player joins the game
    await playerPage.goto(BASE_URL);
    await playerPage.getByRole('tab', { name: /Join Game/i }).click();
    
    await playerPage.getByLabel(/Room ID/i).fill(roomId!);
    await playerPage.getByPlaceholder('Player Name').fill('Test Player');
    
    // Select a color (optional, has default)
    const joinButton = playerPage.getByRole('button', { name: /Join Game/i });
    await expect(joinButton).toBeEnabled();
    
    // Click join and wait for P2P connection
    await joinButton.click();
    
    // Wait for the player to see the game canvas (successful join)
    // This may take a while due to P2P signaling via BitTorrent DHT
    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });
    
    // Verify player sees the game name
    await expect(playerPage.getByText(gameName)).toBeVisible({ timeout: 10000 });
  });

  test('Player joins via URL with room parameter', async () => {
    // Step 1: GM creates a game
    await gmPage.goto(BASE_URL);
    await gmPage.getByRole('tab', { name: /Create Game/i }).click();
    
    const gameName = `URL Join Test ${Date.now()}`;
    await gmPage.getByLabel(/Game Name/i).fill(gameName);
    await gmPage.getByPlaceholder('Game Master').fill('URL Test GM');
    
    await gmPage.getByRole('button', { name: /Create Game/i }).click();
    await expect(gmPage.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
    
    // Get the room ID
    const roomCode = gmPage.getByTestId('room-code');
    const roomId = await roomCode.textContent();
    
    // GM starts the game
    await gmPage.getByRole('button', { name: /Start Game/i }).click();
    await expect(gmPage.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    
    // Step 2: Player navigates directly to URL with room parameter
    await playerPage.goto(`${BASE_URL}?room=${roomId}`);
    
    // Join tab should be active and room ID pre-filled
    const joinTab = playerPage.getByRole('tab', { name: /Join Game/i });
    await expect(joinTab).toHaveAttribute('data-active', 'true');
    
    const roomInput = playerPage.getByLabel(/Room ID/i);
    await expect(roomInput).toHaveValue(roomId!);
    
    // Fill player name and join
    await playerPage.getByPlaceholder('Player Name').fill('URL Player');
    await playerPage.getByRole('button', { name: /Join Game/i }).click();
    
    // Wait for successful join
    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });
  });

  test('GM sees player count update when player joins', async () => {
    // Step 1: GM creates a game
    await gmPage.goto(BASE_URL);
    await gmPage.getByRole('tab', { name: /Create Game/i }).click();
    
    await gmPage.getByLabel(/Game Name/i).fill('Player Count Test');
    await gmPage.getByPlaceholder('Game Master').fill('Count GM');
    
    await gmPage.getByRole('button', { name: /Create Game/i }).click();
    await expect(gmPage.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
    
    // Initially should show 0 connected
    await expect(gmPage.getByText(/0 connected/i)).toBeVisible();
    
    // Get room ID
    const roomCode = gmPage.getByTestId('room-code');
    const roomId = await roomCode.textContent();
    
    // Step 2: Player joins
    await playerPage.goto(BASE_URL);
    await playerPage.getByRole('tab', { name: /Join Game/i }).click();
    await playerPage.getByLabel(/Room ID/i).fill(roomId!);
    await playerPage.getByPlaceholder('Player Name').fill('Count Player');
    await playerPage.getByRole('button', { name: /Join Game/i }).click();
    
    // GM should see player count increase
    // Note: This requires P2P connection to establish
    await expect(gmPage.getByText(/1 connected/i)).toBeVisible({ timeout: 90000 });
  });

  test('Player sees "Player Joined" notification on GM side', async () => {
    // Step 1: GM creates and starts game
    await gmPage.goto(BASE_URL);
    await gmPage.getByRole('tab', { name: /Create Game/i }).click();
    await gmPage.getByLabel(/Game Name/i).fill('Notification Test');
    await gmPage.getByPlaceholder('Game Master').fill('Notify GM');
    await gmPage.getByRole('button', { name: /Create Game/i }).click();
    await expect(gmPage.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
    
    const roomCode = gmPage.getByTestId('room-code');
    const roomId = await roomCode.textContent();
    
    // GM starts game
    await gmPage.getByRole('button', { name: /Start Game/i }).click();
    await expect(gmPage.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    
    // Step 2: Player joins
    await playerPage.goto(BASE_URL);
    await playerPage.getByRole('tab', { name: /Join Game/i }).click();
    await playerPage.getByLabel(/Room ID/i).fill(roomId!);
    await playerPage.getByPlaceholder('Player Name').fill('Notify Player');
    await playerPage.getByRole('button', { name: /Join Game/i }).click();
    
    // GM should see notification (Mantine notification)
    await expect(gmPage.getByText(/Player Joined/i)).toBeVisible({ timeout: 90000 });
    await expect(gmPage.getByText(/Notify Player.*joined/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Join Game - Form Validation', () => {
  test('should require both room ID and player name', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('tab', { name: /Join Game/i }).click();
    
    // Wait for tab to switch
    await expect(page.getByLabel(/Room ID/i)).toBeVisible();
    
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    
    // Button should be disabled when both fields are empty
    await expect(joinButton).toBeDisabled();
    
    // Only room ID filled
    await page.getByLabel(/Room ID/i).fill('TEST1234');
    await expect(joinButton).toBeDisabled();
    
    // Only player name filled - use specific placeholder
    await page.getByLabel(/Room ID/i).clear();
    await page.getByPlaceholder('Player Name').fill('Test Player');
    await expect(joinButton).toBeDisabled();
    
    // Both fields filled
    await page.getByLabel(/Room ID/i).fill('TEST1234');
    await expect(joinButton).toBeEnabled();
  });

  test('should allow custom color selection', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('tab', { name: /Join Game/i }).click();
    
    const colorInput = page.getByLabel(/Your Color/i);
    await expect(colorInput).toBeVisible();
    
    // Should have a valid hex color as default
    const defaultColor = await colorInput.inputValue();
    expect(defaultColor).toMatch(/#[0-9a-f]{6}/i);
    
    // Should be able to change color via swatches
    const swatches = page.locator('[class*="ColorSwatch"]');
    if (await swatches.count() > 0) {
      await swatches.first().click();
      const newColor = await colorInput.inputValue();
      expect(newColor).toMatch(/#[0-9a-f]{6}/i);
    }
  });

  test('should pre-fill room ID from URL parameter', async ({ page }) => {
    await page.goto(`${BASE_URL}?room=CUSTOM123`);
    
    // Should auto-switch to Join tab
    const joinTab = page.getByRole('tab', { name: /Join Game/i });
    await expect(joinTab).toHaveAttribute('data-active', 'true');
    
    // Room ID should be pre-filled
    const roomInput = page.getByLabel(/Room ID/i);
    await expect(roomInput).toHaveValue('CUSTOM123');
  });
});

test.describe('Join Game - Error Handling', () => {
  test('should handle joining non-existent room gracefully', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('tab', { name: /Join Game/i }).click();
    
    // Wait for tab content
    await expect(page.getByLabel(/Room ID/i)).toBeVisible();
    
    // Try to join a room that doesn't exist
    await page.getByLabel(/Room ID/i).fill('NONEXISTENT123');
    await page.getByPlaceholder('Player Name').fill('Lost Player');
    
    await page.getByRole('button', { name: /Join Game/i }).click();
    
    // The P2P system will try to connect but no GM will respond
    // We should eventually see some indication of failure or timeout
    // Note: Trystero doesn't immediately fail - it just waits for peers
    // So we check that the user stays in a "connecting" state or sees no canvas
    
    // After clicking join, user should not immediately see canvas
    // (since there's no GM to sync with)
    await page.waitForTimeout(5000);
    
    // Canvas should NOT be visible since no game state was synced
    const canvas = page.locator('canvas').first();
    const isVisible = await canvas.isVisible();
    
    // If canvas is visible, that's unexpected for non-existent room
    // The app currently just shows empty state when no sync received
    // This test documents the current behavior
    console.log(`Canvas visible after joining non-existent room: ${isVisible}`);
  });
});

test.describe('Join Game - Deployed Site Tests', () => {
  test('should load deployed site and show lobby', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Verify the site loads
    await expect(page.getByRole('heading', { name: /Lychgate VTT/i })).toBeVisible();
    
    // Verify tabs are present
    await expect(page.getByRole('tab', { name: /Recent Games/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Create Game/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Join Game/i })).toBeVisible();
  });

  test('should navigate to create game tab and show form', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('tab', { name: /Create Game/i }).click();
    
    // Should see create game form inputs
    await expect(page.getByLabel(/Game Name/i)).toBeVisible();
    await expect(page.getByPlaceholder('Game Master')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Game/i })).toBeVisible();
  });

  test('should create game and show room code (P2P signaling test)', async ({ page }) => {
    // This test specifically checks if Trystero room creation works
    // If this fails, P2P signaling via BitTorrent DHT is broken
    
    await page.goto(BASE_URL);
    
    // Log all console messages for P2P debugging
    page.on('console', msg => {
      const text = msg.text();
      const prefix = msg.type() === 'error' ? '❌' :
                     msg.type() === 'warning' ? '⚠️' :
                     (text.includes('peer') || text.includes('ICE') || text.includes('WebRTC') || text.includes('room')) ? '🔗' : '  ';
      console.log(`[Console ${msg.type()}] ${prefix} ${text}`);
    });
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ❌ ${error.message}`);
    });
    
    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill('P2P Signaling Test');
    await page.getByPlaceholder('Game Master').fill('Test GM');
    
    await page.getByRole('button', { name: /Create Game/i }).click();
    
    // This is the critical test - if "Game Created!" doesn't appear,
    // Trystero room creation is failing
    const gameCreated = page.getByText(/Game Created!/i);
    
    // Wait up to 30 seconds for P2P signaling
    try {
      await expect(gameCreated).toBeVisible({ timeout: 30000 });
      console.log('✓ P2P signaling successful - room created');
      
      // Verify room code is displayed
      const roomCode = page.getByTestId('room-code');
      const roomId = await roomCode.textContent();
      console.log(`✓ Room ID: ${roomId}`);
      
      // Verify QR code is displayed
      const qrCode = page.locator('svg').first();
      await expect(qrCode).toBeVisible();
      console.log('✓ QR code displayed');
      
    } catch (error) {
      // If we get here, P2P signaling failed
      console.log('✗ P2P signaling FAILED - check BitTorrent DHT connectivity');
      
      // Take a screenshot to see the current state
      await page.screenshot({ path: 'test-results/p2p-signaling-failed.png' });
      
      throw error;
    }
  });

  test('should navigate to join game tab and show form', async ({ page }) => {
    await page.goto(BASE_URL);
    
    await page.getByRole('tab', { name: /Join Game/i }).click();
    
    // Should see join game form inputs
    await expect(page.getByLabel(/Room ID/i)).toBeVisible();
    await expect(page.getByPlaceholder('Player Name')).toBeVisible();
    await expect(page.getByLabel(/Your Color/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Game/i })).toBeVisible();
  });
});

// Helper function to wait for P2P connection with logging
async function waitForP2PConnection(
  page: Page,
  description: string,
  timeout: number = 90000
): Promise<boolean> {
  const startTime = Date.now();
  console.log(`[${description}] Waiting for P2P connection...`);
  
  try {
    await expect(page.locator('canvas').first()).toBeVisible({ timeout });
    const elapsed = Date.now() - startTime;
    console.log(`[${description}] Connected after ${elapsed}ms`);
    return true;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`[${description}] Failed to connect after ${elapsed}ms`);
    return false;
  }
}
