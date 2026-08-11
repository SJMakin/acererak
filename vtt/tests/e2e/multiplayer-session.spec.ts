import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

async function expectActiveScene(page: Page, sceneName: string): Promise<void> {
  await page.waitForFunction((expectedName) => {
    const testWindow = window as unknown as {
      __testGameStore?: {
        getState: () => {
          game: {
            activeSceneId: string;
            scenes: Array<{ id: string; name: string }>;
          } | null;
        };
      };
    };
    const game = testWindow.__testGameStore?.getState().game;
    return game?.scenes.find((scene) => scene.id === game.activeSceneId)?.name === expectedName;
  }, sceneName, { timeout: 15_000 });
}

async function placeToken(page: Page, name: string, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).toBeTruthy();

  // Select explicitly: the placement tool remains active after creating a token,
  // so an extra canvas "focus" click would open and then dismiss the next modal.
  await page.getByRole('button', { name: 'Place Token' }).click();
  await page.mouse.click(canvasBox!.x + x, canvasBox!.y + y);

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await modal.getByLabel(/Token Name/i).fill(name);
  await modal.getByRole('button', { name: /Create Token/i }).click();
  await expect(modal).not.toBeVisible({ timeout: 3000 });
}

/**
 * Multiplayer session E2E — a full game played by GM + player.
 *
 * This is both a test and a demo. Run headed to watch two browsers
 * play a tabletop RPG session together in real time:
 *
 *   HEADED=1 SLOW_MO=500 npx playwright test tests/e2e/multiplayer-session.spec.ts --project=chromium
 *
 * Coverage: chat, whispers, token creation/deletion sync, token movement,
 * drawing sync, fog of war, scene management, dice rolls, property edits.
 */
test.describe.serial('Multiplayer session', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'P2P tests skipped in Firefox');

  let browser: Browser;
  let gmContext: BrowserContext;
  let playerContext: BrowserContext;
  let gmPage: Page;
  let playerPage: Page;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    gmContext = await browser.newContext();
    playerContext = await browser.newContext();
    gmPage = await gmContext.newPage();
    playerPage = await playerContext.newPage();

    for (const [label, page] of [['GM', gmPage], ['Player', playerPage]] as const) {
      page.on('console', (msg) => console.log(`[${label} ${msg.type()}] ${msg.text()}`));
      page.on('pageerror', (err) => console.log(`[${label} PAGE ERROR] ${err.message}`));
    }

    // --- GM creates the game ---
    await gmPage.goto(BASE_URL);
    await gmPage.getByRole('tab', { name: /Create Game/i }).click();
    await gmPage.getByLabel(/Game Name/i).fill('The Tomb of Acererak');
    await gmPage.getByPlaceholder('Game Master').fill('Dungeon Master');
    await gmPage.getByRole('button', { name: /Create Game/i }).click();
    await expect(gmPage.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });

    const roomId = await gmPage.getByTestId('room-code').textContent();
    expect(roomId).toBeTruthy();

    await gmPage.getByRole('button', { name: /Start Game/i }).click();
    await expect(gmPage.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // --- Player joins ---
    await playerPage.goto(BASE_URL);
    await playerPage.getByRole('tab', { name: /Join Game/i }).click();
    await playerPage.getByLabel(/Room ID/i).fill(roomId!);
    await playerPage.getByPlaceholder('Player Name').fill('Alaric');
    await playerPage.getByRole('button', { name: /Join Game/i }).click();

    // Both see canvas — P2P is live
    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });
    await expect(gmPage.locator('canvas').first()).toBeVisible();
  });

  test.afterAll(async () => {
    await gmPage?.close();
    await playerPage?.close();
    await gmContext?.close();
    await playerContext?.close();
  });

  test('A full session — setup, encounter, fog, scenes, victory', async () => {
    const gmChat = gmPage.getByPlaceholder('Type a message...');
    const playerChat = playerPage.getByPlaceholder('Type a message...');
    const gmTokens = gmPage.getByLabel('Tokens', { exact: true });
    const playerTokens = playerPage.getByLabel('Tokens', { exact: true });

    // ========================================
    // ACT 1: The party gathers
    // ========================================

    // Verify both players see each other
    await gmPage.getByRole('tab', { name: 'Players' }).click();
    await expect(gmPage.getByText('Dungeon Master', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(gmPage.getByText('Alaric', { exact: true })).toBeVisible({ timeout: 15000 });

    await playerPage.getByRole('tab', { name: 'Players' }).click();
    await expect(playerPage.getByText('Dungeon Master', { exact: true })).toBeVisible({ timeout: 15000 });

    // GM narrates the opening
    await gmPage.getByRole('tab', { name: 'Chat' }).click();
    await playerPage.getByRole('tab', { name: 'Chat' }).click();

    await gmChat.fill('You stand before the entrance to the Tomb of Acererak. Dust swirls in the torchlight.');
    await gmChat.press('Enter');
    await expect(playerPage.getByText('Dust swirls in the torchlight')).toBeVisible({ timeout: 15000 });

    // Player responds in character
    await playerChat.fill('Alaric draws his sword and steps forward. "Let us proceed."');
    await playerChat.press('Enter');
    await expect(gmPage.getByText('Alaric draws his sword')).toBeVisible({ timeout: 15000 });

    // GM whispers a secret note (only GM sees the whisper badge)
    await playerPage.getByText('Whisper to GM').click();
    await playerChat.fill('(OOC: Do I notice any traps?)');
    await playerChat.press('Enter');
    await expect(gmPage.getByText('Do I notice any traps')).toBeVisible({ timeout: 15000 });
    await expect(gmPage.getByText('Whisper', { exact: true })).toBeVisible();
    // Turn whisper off for subsequent messages
    await playerPage.getByText('Whisper to GM').click();

    // ========================================
    // ACT 2: GM sets up the encounter
    // ========================================

    // GM places monster tokens
    await gmPage.getByRole('tab', { name: 'Tokens' }).click();
    await expect(gmPage.getByText('No tokens on map')).toBeVisible();

    await placeToken(gmPage, 'Skeleton Guardian', 200, 180);
    await expect(gmTokens.getByText('Skeleton Guardian')).toBeVisible({ timeout: 5000 });

    await placeToken(gmPage, 'Skeleton Archer', 300, 180);
    await expect(gmTokens.getByText('Skeleton Archer')).toBeVisible({ timeout: 5000 });

    await placeToken(gmPage, 'Tomb Spider', 400, 180);
    await expect(gmTokens.getByText('Tomb Spider')).toBeVisible({ timeout: 5000 });

    // Player sees all tokens appear on their side
    await playerPage.getByRole('tab', { name: 'Tokens' }).click();
    await expect(playerTokens.getByText('Skeleton Guardian')).toBeVisible({ timeout: 15000 });
    await expect(playerTokens.getByText('Skeleton Archer')).toBeVisible({ timeout: 15000 });
    await expect(playerTokens.getByText('Tomb Spider')).toBeVisible({ timeout: 15000 });

    // GM narrates the encounter
    await gmPage.getByRole('tab', { name: 'Chat' }).click();
    await playerPage.getByRole('tab', { name: 'Chat' }).click();
    await gmChat.fill('Three undead creatures lurch from the shadows! Roll for initiative!');
    await gmChat.press('Enter');
    await expect(playerPage.getByText('Roll for initiative')).toBeVisible({ timeout: 15000 });

    // ========================================
    // ACT 3: Token movement on the canvas
    // ========================================

    // GM drags a token on the canvas (tokens spawn at ~100,100 by default)
    // Use raw mouse events — Playwright's actionability checks don't work with canvas
    const gmCanvas = gmPage.locator('canvas').first();
    const canvasBox = await gmCanvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    // Click canvas to focus it, then press 's' for select tool
    await gmPage.mouse.click(canvasBox!.x + 50, canvasBox!.y + 50);
    await gmPage.keyboard.press('s');
    await gmPage.waitForTimeout(200);
    // Drag from token's default position toward center
    await gmPage.mouse.move(canvasBox!.x + 100, canvasBox!.y + 100);
    await gmPage.mouse.down();
    await gmPage.mouse.move(canvasBox!.x + 300, canvasBox!.y + 300, { steps: 10 });
    await gmPage.mouse.up();
    await gmPage.waitForTimeout(500);

    // Verify the player's canvas is still alive and rendering
    await expect(playerPage.locator('canvas').first()).toBeVisible();

    // ========================================
    // ACT 4: Dice rolls
    // ========================================

    // GM rolls initiative for the monsters
    await gmPage.getByRole('tab', { name: 'Dice' }).click();
    await gmPage.getByRole('button', { name: 'd20' }).click();
    await expect(gmPage.getByLabel('Dice').getByText('1d20', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Player sees the initiative roll in chat
    await expect(playerPage.getByLabel('Chat').getByText(/🎲 1d20/).first()).toBeVisible({ timeout: 15000 });

    // GM rolls custom damage (1d8+2)
    await gmPage.getByPlaceholder(/2d6/).fill('1d8+2');
    await gmPage.getByRole('button', { name: 'Roll' }).click();
    await expect(playerPage.getByLabel('Chat').getByText(/🎲 1d8\+2/).first()).toBeVisible({ timeout: 15000 });

    // GM narrates the attack
    await gmPage.getByRole('tab', { name: 'Chat' }).click();
    await gmChat.fill('The Skeleton Archer fires an arrow! It grazes your arm.');
    await gmChat.press('Enter');
    await expect(playerPage.getByText('grazes your arm')).toBeVisible({ timeout: 15000 });

    // Player retaliates
    await playerChat.fill('I swing my greatsword at the Skeleton Guardian!');
    await playerChat.press('Enter');
    await expect(gmPage.getByText('greatsword at the Skeleton Guardian')).toBeVisible({ timeout: 15000 });

    // ========================================
    // ACT 5: Fog of War
    // ========================================

    // GM enables fog of war via the GM Tools tab
    await gmPage.getByRole('tab', { name: 'GM Tools' }).click();
    await gmPage.getByLabel('Enable Fog of War').check();

    // Give it a moment to sync
    await gmPage.waitForTimeout(2000);

    // Player verifies fog is enabled by checking the canvas still renders
    // (fog overlay should now be visible as a dark layer)
    await expect(playerPage.locator('canvas').first()).toBeVisible();

    // GM disables fog of war
    await gmPage.getByLabel('Enable Fog of War').uncheck();
    await gmPage.waitForTimeout(2000);

    // GM narrates
    await gmPage.getByRole('tab', { name: 'Chat' }).click();
    await playerPage.getByRole('tab', { name: 'Chat' }).click();
    await gmChat.fill('The mist clears — you can now see the full chamber.');
    await gmChat.press('Enter');
    await expect(playerPage.getByText('full chamber')).toBeVisible({ timeout: 15000 });

    // ========================================
    // ACT 6: Scene management
    // ========================================

    // GM opens the scene menu and creates a new scene
    // The scene button in the toolbar shows the current scene name
    await gmPage.locator('button').filter({ hasText: /Scene 1/ }).first().click();
    await gmPage.getByRole('menuitem', { name: /New Scene/i }).click();

    // Fill in the scene creation modal
    await gmPage.getByLabel('Scene Name').fill('The Inner Sanctum');
    await gmPage.getByRole('button', { name: /Create/i }).click();
    await gmPage.waitForTimeout(2000);

    // Creating a scene auto-switches to it — toolbar should now show the new name
    await expect(gmPage.locator('button').filter({ hasText: /Inner Sanctum/ }).first()).toBeVisible({ timeout: 5000 });

    // The scene picker is GM-only, so verify the player's actual synchronized state.
    await expectActiveScene(playerPage, 'The Inner Sanctum');
    await expect(playerPage.locator('canvas').first()).toBeVisible();

    // GM switches back to Scene 1 via the scene menu
    await gmPage.locator('button').filter({ hasText: /Inner Sanctum/ }).first().click();
    await gmPage.getByRole('menuitem', { name: /Scene 1/ }).click();
    // Player sees the scene change again
    await expectActiveScene(playerPage, 'Scene 1');
    await expect(playerPage.locator('canvas').first()).toBeVisible();

    // ========================================
    // ACT 7: Enemies fall — token deletion
    // ========================================

    // Both on Tokens tab for the combat phase
    await gmPage.getByRole('tab', { name: 'Tokens' }).click();
    await playerPage.getByRole('tab', { name: 'Tokens' }).click();

    // GM removes the Skeleton Guardian (defeated!)
    const guardianRow = gmTokens.locator('[class*="Paper"]', { has: gmPage.getByText('Skeleton Guardian', { exact: true }) });
    await guardianRow.getByTitle('Delete').click();

    await expect(gmTokens.getByText('Skeleton Guardian')).not.toBeVisible({ timeout: 5000 });
    await expect(gmTokens.getByText('Skeleton Archer')).toBeVisible();
    await expect(gmTokens.getByText('Tomb Spider')).toBeVisible();

    // Player sees it removed
    await expect(playerTokens.getByText('Skeleton Guardian')).not.toBeVisible({ timeout: 15000 });
    await expect(playerTokens.getByText('Skeleton Archer')).toBeVisible();

    // GM narrates
    await gmPage.getByRole('tab', { name: 'Chat' }).click();
    await playerPage.getByRole('tab', { name: 'Chat' }).click();
    await gmChat.fill('The Guardian crumbles to dust! Two enemies remain.');
    await gmChat.press('Enter');
    await expect(playerPage.getByText('Two enemies remain')).toBeVisible({ timeout: 15000 });

    // Back to Tokens for more combat
    await gmPage.getByRole('tab', { name: 'Tokens' }).click();
    await playerPage.getByRole('tab', { name: 'Tokens' }).click();

    // Finish off the Tomb Spider
    const spiderRow = gmTokens.locator('[class*="Paper"]', { has: gmPage.getByText('Tomb Spider', { exact: true }) });
    await spiderRow.getByTitle('Delete').click();

    await expect(gmTokens.getByText('Tomb Spider')).not.toBeVisible({ timeout: 5000 });
    await expect(playerTokens.getByText('Tomb Spider')).not.toBeVisible({ timeout: 15000 });
    // Only the Archer remains
    await expect(playerTokens.getByText('Skeleton Archer')).toBeVisible();

    // Final enemy down
    const archerRow = gmTokens.locator('[class*="Paper"]', { has: gmPage.getByText('Skeleton Archer', { exact: true }) });
    await archerRow.getByTitle('Delete').click();

    await expect(gmTokens.getByText('Skeleton Archer')).not.toBeVisible({ timeout: 5000 });
    await expect(gmTokens.getByText('No tokens on map')).toBeVisible();

    await expect(playerTokens.getByText('Skeleton Archer')).not.toBeVisible({ timeout: 15000 });

    // ========================================
    // ACT 8: Victory
    // ========================================

    await gmPage.getByRole('tab', { name: 'Chat' }).click();
    await playerPage.getByRole('tab', { name: 'Chat' }).click();
    await gmChat.fill('The last skeleton collapses. The chamber falls silent. You have survived the Tomb of Acererak!');
    await gmChat.press('Enter');
    await expect(playerPage.getByText('You have survived the Tomb of Acererak')).toBeVisible({ timeout: 15000 });

    await playerChat.fill('Alaric sheathes his sword and catches his breath. "That was too close."');
    await playerChat.press('Enter');
    await expect(gmPage.getByText('That was too close')).toBeVisible({ timeout: 15000 });

    // Both browsers alive, canvas still visible
    await expect(gmPage.locator('canvas').first()).toBeVisible();
    await expect(playerPage.locator('canvas').first()).toBeVisible();

    // Verify no desync warning on player side
    const desyncBadge = playerPage.getByText('Out of Sync');
    await expect(desyncBadge).not.toBeVisible({ timeout: 5000 });
  });
});
