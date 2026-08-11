import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

type TestWindow = Window & {
  __testGameStore: {
    getState: () => {
      game: {
        activeSceneId: string;
        scenes: Array<{
          id: string;
          elements: Array<Record<string, unknown>>;
          fogOfWar: { enabled: boolean; revealed: Array<Array<{ x: number; y: number }>> };
          gridSettings: Record<string, unknown>;
        }>;
      } | null;
      addElement: (element: Record<string, unknown>, skipHistory?: boolean) => string;
      updateElement: (id: string, updates: Record<string, unknown>, skipHistory?: boolean) => void;
      toggleFog: (enabled: boolean) => void;
      revealFog: (polygon: Array<{ x: number; y: number }>, skipHistory?: boolean) => void;
    };
  };
  __testGetRoomState: () => {
    peers: string[];
    gmPeerId: string | null;
    isDesynced: boolean;
    broadcastElementUpdate: (element: Record<string, unknown>) => void;
    broadcastFogUpdate: (fog: { enabled: boolean; revealed: Array<Array<{ x: number; y: number }>> }) => void;
  };
  __testInjectNetworkMessage: (
    action: string,
    data: unknown,
    peerId: string,
  ) => void | Promise<void>;
};

async function createGame(page: Page): Promise<string> {
  await page.goto(BASE_URL);
  await page.getByRole('tab', { name: /Create Game/i }).click();
  await page.getByLabel(/Game Name/i).fill('Four Player Desync Test');
  await page.getByPlaceholder('Game Master').fill('GM');
  await page.getByRole('button', { name: /Create Game/i }).click();
  await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });

  const roomId = await page.getByTestId('room-code').textContent();
  expect(roomId).toBeTruthy();

  await page.getByRole('button', { name: /Start Game/i }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
  return roomId!;
}

async function joinGame(page: Page, roomId: string, playerName: string): Promise<void> {
  await page.goto(BASE_URL);
  await page.getByRole('tab', { name: /Join Game/i }).click();
  await page.getByLabel(/Room ID/i).fill(roomId);
  await page.getByPlaceholder('Player Name').fill(playerName);
  await page.getByRole('button', { name: /Join Game/i }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90000 });
}

async function getActiveSceneSnapshot(page: Page) {
  return page.evaluate(() => {
    const store = (window as unknown as TestWindow).__testGameStore.getState();
    const game = store.game;
    if (!game) return null;
    const scene = game.scenes.find((candidate) => candidate.id === game.activeSceneId) || game.scenes[0];
    return {
      activeSceneId: game.activeSceneId,
      elements: [...scene.elements].sort((a, b) => String(a.id).localeCompare(String(b.id))),
      fogOfWar: scene.fogOfWar,
      gridSettings: scene.gridSettings,
    };
  });
}

test.describe('Four-player desync resistance', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'P2P tests skipped in Firefox');

  let browser: Browser;
  let contexts: BrowserContext[] = [];
  let gmPage: Page;
  let playerPages: Page[] = [];

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.beforeEach(async () => {
    contexts = await Promise.all(Array.from({ length: 5 }, () => browser.newContext()));
    gmPage = await contexts[0].newPage();
    playerPages = await Promise.all(contexts.slice(1).map((context) => context.newPage()));

    for (const [label, page] of [['GM', gmPage], ...playerPages.map((page, index) => [`P${index + 1}`, page] as const)] as const) {
      page.on('pageerror', (error) => console.log(`[${label} PAGE ERROR] ${error.message}`));
    }
  });

  test.afterEach(async () => {
    await Promise.all(contexts.map((context) => context.close()));
    contexts = [];
    playerPages = [];
  });

  test('four players racing token updates converge while spoofed fog is rejected', async () => {
    test.setTimeout(300_000);
    const roomId = await createGame(gmPage);
    for (const [index, page] of playerPages.entries()) {
      await joinGame(page, roomId, `Player ${index + 1}`);
      await gmPage.waitForFunction(
        (expectedPeers) => (window as unknown as TestWindow).__testGetRoomState().peers.length >= expectedPeers,
        index + 1,
        { timeout: 30_000 },
      );
    }

    await gmPage.waitForFunction(
      () => (window as unknown as TestWindow).__testGetRoomState().peers.length === 4,
      undefined,
      { timeout: 30000 }
    );

    const tokenId = await gmPage.evaluate(() => {
      const testWindow = window as unknown as TestWindow;
      const store = testWindow.__testGameStore.getState();
      const id = store.addElement({
        type: 'token',
        layer: 'token',
        x: 100,
        y: 100,
        visibleTo: 'all',
        locked: false,
        zIndex: 1,
        imageUrl: '',
        width: 1,
        height: 1,
        name: 'Contested Token',
        hp: { current: 10, max: 10 },
        ac: 10,
        conditions: [],
      }, true);
      const scene = store.game!.scenes.find((candidate) => candidate.id === store.game!.activeSceneId)!;
      const token = scene.elements.find((element) => element.id === id)!;
      testWindow.__testGetRoomState().broadcastElementUpdate(token);
      return id;
    });

    await Promise.all(playerPages.map((page) => page.waitForFunction(
      (id) => {
        const store = (window as unknown as TestWindow).__testGameStore.getState();
        const scene = store.game?.scenes.find((candidate) => candidate.id === store.game?.activeSceneId);
        return Boolean(scene?.elements.some((element) => element.id === id));
      },
      tokenId,
      { timeout: 30000 }
    )));

    await Promise.all(playerPages.map((page, index) => page.evaluate(({ id, index: playerIndex }) => {
      const testWindow = window as unknown as TestWindow;
      const store = testWindow.__testGameStore.getState();
      store.updateElement(id, {
        x: 150 + playerIndex * 40,
        y: 180 + playerIndex * 35,
        notes: `player-${playerIndex + 1}-move`,
      }, true);
      const scene = store.game!.scenes.find((candidate) => candidate.id === store.game!.activeSceneId)!;
      const token = scene.elements.find((element) => element.id === id)!;
      testWindow.__testGetRoomState().broadcastElementUpdate(token);
    }, { id: tokenId, index })));

    // Even a mapped player transport must not be able to change authoritative fog.
    await gmPage.evaluate(async () => {
      const testWindow = window as unknown as TestWindow;
      const mappedPlayerPeer = testWindow.__testGetRoomState().peers[0];
      await testWindow.__testInjectNetworkMessage('fogUpdate', {
        enabled: true,
        revealed: [[{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 40 }]],
      }, mappedPlayerPeer);
    });
    const fogAfterSpoof = await gmPage.evaluate(() => {
      const store = (window as unknown as TestWindow).__testGameStore.getState();
      const scene = store.game!.scenes.find((candidate) => candidate.id === store.game!.activeSceneId)!;
      return scene.fogOfWar;
    });
    expect(fogAfterSpoof.enabled).toBe(false);
    expect(fogAfterSpoof.revealed).toEqual([]);

    // The GM then publishes the canonical fog state to every player.
    await gmPage.evaluate(() => {
      const testWindow = window as unknown as TestWindow;
      const store = testWindow.__testGameStore.getState();
      const polygon = [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }];
      store.toggleFog(true);
      store.revealFog(polygon, true);
      const scene = store.game!.scenes.find((candidate) => candidate.id === store.game!.activeSceneId)!;
      testWindow.__testGetRoomState().broadcastFogUpdate(scene.fogOfWar);
    });

    await gmPage.waitForTimeout(3000);
    const gmSnapshot = await getActiveSceneSnapshot(gmPage);
    expect(gmSnapshot).toBeTruthy();

    for (const page of playerPages) {
      await page.waitForFunction(
        (expected) => {
          const store = (window as unknown as TestWindow).__testGameStore.getState();
          const game = store.game;
          if (!game) return false;
          const scene = game.scenes.find((candidate) => candidate.id === game.activeSceneId) || game.scenes[0];
          const snapshot = {
            activeSceneId: game.activeSceneId,
            elements: [...scene.elements].sort((a, b) => String(a.id).localeCompare(String(b.id))),
            fogOfWar: scene.fogOfWar,
            gridSettings: scene.gridSettings,
          };
          return JSON.stringify(snapshot) === JSON.stringify(expected);
        },
        gmSnapshot,
        { timeout: 30000 }
      );

      const roomState = await page.evaluate(() => (window as unknown as TestWindow).__testGetRoomState());
      expect(roomState.isDesynced).toBe(false);
    }
  });
});
