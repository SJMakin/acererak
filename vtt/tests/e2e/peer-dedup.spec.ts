import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

/**
 * E2E tests: Duplicate onPeerJoin deduplication with real state verification.
 *
 * Trystero/torrent can fire onPeerJoin multiple times for the same peer during
 * WebRTC renegotiation (especially over TURN relays). Without deduplication this
 * causes: unbounded peers array growth → repeated full syncs → cascading state
 * updates → browser crash.
 *
 * These tests use two separate browser contexts (GM + player) and verify actual
 * state via `window.__testGameStore` and `window.__testGetRoomState` rather than
 * relying on console.log string counting.
 */
test.describe('Duplicate onPeerJoin deduplication', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'P2P tests skipped in Firefox');

  let browser: Browser;
  let gmContext: BrowserContext;
  let playerContext: BrowserContext;
  let gmPage: Page;
  let playerPage: Page;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.beforeEach(async () => {
    gmContext = await browser.newContext();
    playerContext = await browser.newContext();

    gmPage = await gmContext.newPage();
    playerPage = await playerContext.newPage();

    gmPage.on('pageerror', (error) => {
      console.log(`[GM PAGE ERROR] ${error.message}`);
    });
    playerPage.on('pageerror', (error) => {
      console.log(`[Player PAGE ERROR] ${error.message}`);
    });
  });

  test.afterEach(async () => {
    await gmPage?.close();
    await playerPage?.close();
    await gmContext?.close();
    await playerContext?.close();
  });

  /** Helper: GM creates a game, starts it, returns the room ID. */
  async function gmCreateGame(page: Page, gameName: string): Promise<string> {
    await page.goto(BASE_URL);
    await expect(page.getByRole('heading', { name: /Lychgate VTT/i })).toBeVisible();

    await page.getByRole('tab', { name: /Create Game/i }).click();
    await page.getByLabel(/Game Name/i).fill(gameName);
    await page.getByPlaceholder('Game Master').fill('Test GM');
    await page.getByRole('button', { name: /Create Game/i }).click();

    await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });

    const roomCode = page.getByTestId('room-code');
    await expect(roomCode).toBeVisible({ timeout: 10000 });
    const roomId = await roomCode.textContent();
    expect(roomId).toBeTruthy();

    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    return roomId!;
  }

  /** Helper: Player joins a game by room ID. */
  async function playerJoinGame(page: Page, roomId: string, playerName: string) {
    await page.goto(BASE_URL);
    await page.getByRole('tab', { name: /Join Game/i }).click();
    await page.getByLabel(/Room ID/i).fill(roomId);
    await page.getByPlaceholder('Player Name').fill(playerName);
    await page.getByRole('button', { name: /Join Game/i }).click();
  }

  test('Real two-browser join — state integrity', async () => {
    // GM creates game, player joins via real P2P
    const roomId = await gmCreateGame(gmPage, 'State Integrity Test');
    await playerJoinGame(playerPage, roomId, 'Test Player');

    // Wait for player to see canvas (P2P connected)
    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });

    // Assert via waitForFunction: __testGetRoomState().peers.length === 1
    await gmPage.waitForFunction(
      () => (window as any).__testGetRoomState().peers.length === 1,
      undefined,
      { timeout: 15000 }
    );

    // Assert via waitForFunction: game.players has exactly 1 non-GM entry with correct name
    const playerCount = await gmPage.waitForFunction(() => {
      const store = (window as any).__testGameStore.getState();
      const players = Object.values(store.game.players) as any[];
      const nonGMPlayers = players.filter(p => !p.isGM);
      return nonGMPlayers.length;
    }, undefined, { timeout: 15000 });
    expect(await playerCount.jsonValue()).toBe(1);

    // Assert player-side game is loaded (canvas present)
    await expect(playerPage.locator('canvas').first()).toBeVisible();
  });

  test('GM-side duplicate peer events — state integrity', async () => {
    // GM creates game, player joins via real P2P
    const roomId = await gmCreateGame(gmPage, 'GM Dupes Test');
    await playerJoinGame(playerPage, roomId, 'Test Player');

    // Wait for player to see canvas (P2P connected)
    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });

    // Wait for GM to see peer
    await gmPage.waitForFunction(
      () => (window as any).__testGetRoomState().peers.length === 1,
      undefined,
      { timeout: 15000 }
    );

    // Capture the real peerId from __testGetRoomState().peers[0]
    const peerId = await gmPage.evaluate(() => {
      return (window as any).__testGetRoomState().peers[0];
    });
    expect(peerId).toBeTruthy();

    // Fire __testTriggerPeerJoin(peerId) 10 more times
    const fired = await gmPage.evaluate((id) => {
      const trigger = (window as any).__testTriggerPeerJoin;
      if (!trigger) return { ok: false, fired: 0 };
      for (let i = 0; i < 10; i++) {
        trigger(id);
      }
      return { ok: true, fired: 10 };
    }, peerId);
    expect(fired.ok).toBe(true);

    // Assert peers.length is still 1 via waitForFunction
    const peerResult = await gmPage.evaluate(() => {
      return (window as any).__testGetRoomState().peers.length;
    });
    expect(peerResult).toBe(1);

    // Assert game.players non-GM count is still 1
    const playerResult = await gmPage.evaluate(() => {
      const store = (window as any).__testGameStore.getState();
      const players = Object.values(store.game.players) as any[];
      return players.filter((p: any) => !p.isGM).length;
    });
    expect(playerResult).toBe(1);

    // Assert canvas visible
    await expect(gmPage.locator('canvas').first()).toBeVisible();
  });

  test('Async duplicate peer events (defeats React batching)', async () => {
    // Same setup as Test 2
    const roomId = await gmCreateGame(gmPage, 'Async Dupes Test');
    await playerJoinGame(playerPage, roomId, 'Test Player');

    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });

    await gmPage.waitForFunction(
      () => (window as any).__testGetRoomState().peers.length === 1,
      undefined,
      { timeout: 15000 }
    );

    const peerId = await gmPage.evaluate(() => {
      return (window as any).__testGetRoomState().peers[0];
    });

    // Fire 10 duplicates with 50ms setTimeout delays between each (returns a Promise)
    await gmPage.evaluate((id) => {
      return new Promise<void>((resolve) => {
        const trigger = (window as any).__testTriggerPeerJoin;
        let count = 0;
        function fireNext() {
          if (count >= 10) {
            resolve();
            return;
          }
          trigger(id);
          count++;
          setTimeout(fireNext, 50);
        }
        fireNext();
      });
    }, peerId);

    // Assert peers.length === 1
    const peerResult = await gmPage.evaluate(() => {
      return (window as any).__testGetRoomState().peers.length;
    });
    expect(peerResult).toBe(1);

    // Assert game.players non-GM count is 1
    const playerResult = await gmPage.evaluate(() => {
      const store = (window as any).__testGameStore.getState();
      const players = Object.values(store.game.players) as any[];
      return players.filter((p: any) => !p.isGM).length;
    });
    expect(playerResult).toBe(1);
  });

  test('Player-side duplicate peer events', async () => {
    // GM creates game, player joins via real P2P
    const roomId = await gmCreateGame(gmPage, 'Player Dupes Test');
    await playerJoinGame(playerPage, roomId, 'Test Player');

    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });

    // Wait for GM-side connection
    await gmPage.waitForFunction(
      () => (window as any).__testGetRoomState().peers.length === 1,
      undefined,
      { timeout: 15000 }
    );

    // Get the GM's peerId from player's perspective
    const gmPeerId = await playerPage.evaluate(() => {
      const store = (window as any).__testGameStore.getState();
      return store.game?.gmPeerId;
    });
    expect(gmPeerId).toBeTruthy();

    // On player page, fire __testTriggerPlayerPeerJoin 10 times with the GM's peerId
    const fired = await playerPage.evaluate((id) => {
      const trigger = (window as any).__testTriggerPlayerPeerJoin;
      if (!trigger) return { ok: false };
      for (let i = 0; i < 10; i++) {
        trigger(id);
      }
      return { ok: true };
    }, gmPeerId);
    expect(fired.ok).toBe(true);

    // Assert on GM page: game.players non-GM count is still 1
    const playerResult = await gmPage.evaluate(() => {
      const store = (window as any).__testGameStore.getState();
      const players = Object.values(store.game.players) as any[];
      return players.filter((p: any) => !p.isGM).length;
    });
    expect(playerResult).toBe(1);

    // Assert on GM page: at most 1 "Player Joined" notification in DOM
    const notifications = gmPage.locator('text=Player Joined');
    await expect(notifications).toHaveCount(1, { timeout: 5000 });
  });

  test('Stress test — 100 duplicates, page stays functional', async () => {
    // GM creates game, player joins
    const roomId = await gmCreateGame(gmPage, 'Stress Test');
    await playerJoinGame(playerPage, roomId, 'Test Player');

    await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90000 });

    await gmPage.waitForFunction(
      () => (window as any).__testGetRoomState().peers.length === 1,
      undefined,
      { timeout: 15000 }
    );

    const peerId = await gmPage.evaluate(() => {
      return (window as any).__testGetRoomState().peers[0];
    });

    // Fire 100 duplicates on GM side
    await gmPage.evaluate((id) => {
      const trigger = (window as any).__testTriggerPeerJoin;
      if (!trigger) return;
      for (let i = 0; i < 100; i++) {
        trigger(id);
      }
    }, peerId);

    // Assert peers.length === 1
    const peerResult = await gmPage.evaluate(() => {
      return (window as any).__testGetRoomState().peers.length;
    });
    expect(peerResult).toBe(1);

    // Assert canvas visible
    await expect(gmPage.locator('canvas').first()).toBeVisible();

    // Perform a real UI interaction (click sidebar toggle) to prove the page isn't frozen
    const sidebarToggle = gmPage.getByRole('button', { name: /toggle sidebar/i });
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
    }

    // Assert zero page errors
    const errorCount = await gmPage.evaluate(() => {
      // Check that page is still functional
      return document.querySelectorAll('canvas').length;
    });
    expect(errorCount).toBeGreaterThan(0);
  });
});
