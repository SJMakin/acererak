import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5174';

interface NetworkDebugState {
  handlerRegistrations: number;
  activePeers: string[];
  peerPlayerIds: Record<string, string>;
}

interface ProjectedGame {
  scenes: Array<{
    id: string;
    name: string;
    backgroundUrl?: string;
    elements: Array<{ id: string; notes?: string }>;
  }>;
  campaignNotes: Array<{ id: string }>;
  chatMessages: Array<{ id: string }>;
  sheets?: Array<{ id: string }>;
  combat?: { combatants: Array<{ id: string }> };
  elements?: unknown[];
}

interface NetworkValidators {
  isValidPoint: (value: unknown) => boolean;
  isValidCanvasElement: (value: unknown) => boolean;
  isValidGameState: (value: unknown) => boolean;
  isValidImageTransferMeta: (value: unknown) => boolean;
  imageTransferKey: (peerId: string, metadata: Record<string, unknown>) => string;
  projectGameForPlayer: (game: Record<string, unknown>, playerId: string) => ProjectedGame;
}

interface TestGameStore {
  getState: () => {
    myPeerId: string | null;
    game: {
      activeSceneId?: string;
      scenes: Array<{ id?: string; elements: Array<Record<string, unknown>> }>;
      players?: Record<string, { isGM: boolean }>;
    };
    addElement: (element: Record<string, unknown>, skipHistory?: boolean) => string;
  };
}

declare global {
  interface Window {
    __testNetworkValidators?: NetworkValidators;
    __testInjectNetworkMessage?: (action: string, data: unknown, peerId?: string, metadata?: unknown) => void | Promise<void>;
    __testGetNetworkDebug?: () => NetworkDebugState;
    __testGetRoomState?: () => { peers: string[] };
    __testGameStore?: TestGameStore;
  }
}

async function openApp(page: Page) {
  await page.goto(BASE_URL);
  await expect(page.getByRole('heading', { name: /Lychgate VTT/i })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__testNetworkValidators));
}

async function createRoomWithoutStarting(page: Page, gameName: string): Promise<string> {
  await openApp(page);
  await page.getByRole('tab', { name: /Create Game/i }).click();
  await page.getByLabel(/Game Name/i).fill(gameName);
  await page.getByPlaceholder('Game Master').fill('Network GM');
  await page.getByRole('button', { name: /Create Game/i }).click();
  await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 30_000 });
  const roomId = await page.getByTestId('room-code').textContent();
  expect(roomId).toBeTruthy();
  return roomId!;
}

async function joinRoom(page: Page, roomId: string) {
  await openApp(page);
  await page.getByRole('tab', { name: /Join Game/i }).click();
  await page.getByLabel(/Room ID/i).fill(roomId);
  await page.getByPlaceholder('Player Name').fill('Network Player');
  await page.getByRole('button', { name: /Join Game/i }).click();
}

test.describe('network transport hardening', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Real tracker tests run in Chromium');

  test('validators reject malformed payloads and projections remove GM-only state', async ({ page }) => {
    await openApp(page);

    const result = await page.evaluate(() => {
      const api = window.__testNetworkValidators!;
      const baseElement = {
        type: 'shape', layer: 'drawing', x: 1, y: 2, visibleTo: 'all', locked: false,
        zIndex: 1, shapeType: 'line', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], style: {},
      };
      const scene = {
        id: 'scene-1', name: 'Active Scene', backgroundUrl: 'https://example.test/active.png', gridSettings: {
          cellSize: 50, width: 20, height: 20, showGrid: true, snapToGrid: true,
          gridColor: '#ffffff', gridType: 'square',
        },
        elements: [
          { ...baseElement, id: 'public' },
          { ...baseElement, id: 'gm-layer', layer: 'gm' },
          { ...baseElement, id: 'gm-only', visibleTo: 'gm' },
          { ...baseElement, id: 'private', visibleTo: ['p-recipient'] },
          { ...baseElement, id: 'other-private', visibleTo: ['p-other'] },
          {
            id: 'public-token', type: 'token', layer: 'token', x: 5, y: 5,
            visibleTo: 'all', locked: false, zIndex: 2, imageUrl: '', width: 1,
            height: 1, name: 'Hero', notes: 'GM-only token notes', sheetId: 'public-sheet',
          },
          {
            id: 'gm-token', type: 'token', layer: 'gm', x: 6, y: 6,
            visibleTo: 'gm', locked: false, zIndex: 3, imageUrl: '', width: 1,
            height: 1, name: 'Secret', notes: 'Hidden encounter', sheetId: 'secret-sheet',
          },
        ],
        fogOfWar: { enabled: true, revealed: [] },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const game = {
        id: 'game-1', name: 'Game', roomId: 'room-1',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        scenes: [scene, {
          ...scene,
          id: 'scene-secret',
          name: 'Future Boss Room',
          backgroundUrl: 'https://example.test/secret.png',
          elements: [{ ...baseElement, id: 'future-secret', layer: 'gm' }],
        }], activeSceneId: scene.id,
        players: {
          'p-recipient': { id: 'p-recipient', name: 'P', color: '#123456', isGM: false, controlledTokens: [] },
        },
        campaignNotes: [
          { id: 'public-note', title: 'Public', content: '', createdAt: 'now', updatedAt: 'now', visibleTo: 'all' },
          { id: 'gm-note', title: 'GM', content: '', createdAt: 'now', updatedAt: 'now', visibleTo: 'gm' },
        ],
        chatMessages: [
          { id: 'public-chat', playerId: 'p-other', playerName: 'O', playerColor: '#654321', timestamp: 1, content: 'hi', isGMOnly: false },
          { id: 'own-whisper', playerId: 'p-recipient', playerName: 'P', playerColor: '#123456', timestamp: 2, content: 'secret', isGMOnly: true },
          { id: 'other-whisper', playerId: 'p-other', playerName: 'O', playerColor: '#654321', timestamp: 3, content: 'secret', isGMOnly: true },
        ],
        combat: {
          active: true, round: 1, currentTurn: 0,
          combatants: [
            { id: 'public-token', name: 'Hero', initiative: 20, hp: { current: 10, max: 10 }, conditions: [] },
            { id: 'gm-token', name: 'Secret', initiative: 19, hp: { current: 99, max: 99 }, conditions: ['hidden'] },
          ],
        },
        sheets: [
          { id: 'sheet-folder', version: 1, name: 'Characters', content: '', shadowState: {}, projections: {}, isFolder: true, createdAt: 'now', updatedAt: 'now' },
          { id: 'public-sheet', version: 1, name: 'Hero', content: '{}', shadowState: {}, projections: {}, parentId: 'sheet-folder', createdAt: 'now', updatedAt: 'now' },
          { id: 'secret-sheet', version: 1, name: 'Boss', content: '{}', shadowState: {}, projections: {}, createdAt: 'now', updatedAt: 'now' },
        ],
        elements: [{ ...baseElement, id: 'legacy-gm-secret', layer: 'gm' }],
      };
      const projected = api.projectGameForPlayer(game, 'p-recipient');
      const metaA = { transferId: 'transfer-a', imageId: 'a'.repeat(64), mime: 'image/png', width: 10, height: 10, size: 100 };
      const metaB = { ...metaA, transferId: 'transfer-b' };
      const malformedToken = {
        id: 'bad-token', type: 'token', layer: 'token', x: 0, y: 0,
        visibleTo: 'all', locked: false, zIndex: 1, imageUrl: '', width: 1,
        height: 1, name: 'Bad', conditions: { crash: true },
      };
      return {
        nanPoint: api.isValidPoint({ x: Number.NaN, y: 0 }),
        hugePoint: api.isValidPoint({ x: 1e20, y: 0 }),
        validMeta: api.isValidImageTransferMeta(metaA),
        invalidMime: api.isValidImageTransferMeta({ ...metaA, mime: 'image/svg+xml' }),
        malformedToken: api.isValidCanvasElement(malformedToken),
        malformedCombat: api.isValidGameState({
          ...game,
          combat: { active: true, round: 1, currentTurn: 0, combatants: [{ conditions: {} }] },
        }),
        transferKeysDistinct: api.imageTransferKey('gm-peer', metaA) !== api.imageTransferKey('gm-peer', metaB),
        sceneIds: projected.scenes.map((projectedScene) => projectedScene.id),
        sceneNames: projected.scenes.map((projectedScene) => projectedScene.name),
        elementIds: projected.scenes[0].elements.map((element) => element.id),
        tokenNotesPresent: 'notes' in projected.scenes[0].elements.find((element) => element.id === 'public-token')!,
        noteIds: projected.campaignNotes.map((note) => note.id),
        chatIds: projected.chatMessages.map((message) => message.id),
        sheetIds: projected.sheets?.map((sheet) => sheet.id),
        combatantIds: projected.combat?.combatants.map((combatant) => combatant.id),
        legacyElementsPresent: 'elements' in projected,
      };
    });

    expect(result.nanPoint).toBe(false);
    expect(result.hugePoint).toBe(false);
    expect(result.validMeta).toBe(true);
    expect(result.invalidMime).toBe(false);
    expect(result.malformedToken).toBe(false);
    expect(result.malformedCombat).toBe(false);
    expect(result.transferKeysDistinct).toBe(true);
    expect(result.sceneIds).toEqual(['scene-1']);
    expect(result.sceneNames).toEqual(['Active Scene']);
    expect(result.elementIds).toEqual(['public', 'private', 'public-token']);
    expect(result.tokenNotesPresent).toBe(false);
    expect(result.noteIds).toEqual(['public-note']);
    expect(result.chatIds).toEqual(['public-chat', 'own-whisper']);
    expect(result.sheetIds).toEqual(['sheet-folder', 'public-sheet']);
    expect(result.combatantIds).toEqual(['public-token']);
    expect(result.legacyElementsPresent).toBe(false);
  });

  test('unmapped senders cannot mutate host state', async ({ page }) => {
    await createRoomWithoutStarting(page, 'Sender Validation');
    await page.getByRole('button', { name: /Start Game/i }).click();
    await expect(page.locator('canvas').first()).toBeVisible();
    await page.waitForFunction(() => window.__testGetNetworkDebug?.().handlerRegistrations === 1);

    const counts = await page.evaluate(async () => {
      const store = window.__testGameStore!;
      const before = store.getState().game.scenes[0].elements.length;
      await window.__testInjectNetworkMessage?.('elUpdate', {
        id: 'attacker-shape', type: 'shape', layer: 'drawing', x: 0, y: 0,
        visibleTo: 'all', locked: false, zIndex: 1, shapeType: 'line',
        points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], style: {},
      }, 'unmapped-attacker');
      return { before, after: store.getState().game.scenes[0].elements.length };
    });

    expect(counts.after).toBe(counts.before);
  });

  test('early player join receives the game later and both sides track one composed callback', async ({ browser }) => {
    let gmContext: BrowserContext | undefined;
    let playerContext: BrowserContext | undefined;
    try {
      gmContext = await browser.newContext();
      playerContext = await browser.newContext();
      const gmPage = await gmContext.newPage();
      const playerPage = await playerContext.newPage();

      const roomId = await createRoomWithoutStarting(gmPage, 'Early Join');
      await joinRoom(playerPage, roomId);

      await gmPage.waitForFunction(() => window.__testGetRoomState?.().peers.length === 1, undefined, { timeout: 90_000 });
      await playerPage.waitForFunction(() => window.__testGetRoomState?.().peers.length === 1, undefined, { timeout: 30_000 });

      await gmPage.getByRole('button', { name: /Start Game/i }).click();
      await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 30_000 });

      const [gmDebug, playerDebug] = await Promise.all([
        gmPage.evaluate(() => window.__testGetNetworkDebug!()),
        playerPage.evaluate(() => window.__testGetNetworkDebug!()),
      ]);
      expect(gmDebug.handlerRegistrations).toBe(1);
      expect(playerDebug.handlerRegistrations).toBe(1);
      expect(gmDebug.activePeers).toHaveLength(1);
      expect(playerDebug.activePeers).toHaveLength(1);
      expect(Object.keys(gmDebug.peerPlayerIds)).toHaveLength(1);

      const canonicalToken = await gmPage.evaluate(async (mappedPeerId) => {
        const store = window.__testGameStore!.getState();
        const tokenId = store.addElement({
          type: 'token', layer: 'token', x: 10, y: 20, visibleTo: 'all', locked: false,
          zIndex: 1, imageUrl: '', width: 1, height: 1, name: 'Guardian',
          hp: { current: 10, max: 10 }, conditions: [],
        }, true);
        const afterAdd = window.__testGameStore!.getState();
        const scene = afterAdd.game.scenes.find((candidate) => candidate.id === afterAdd.game.activeSceneId)!;
        const token = scene.elements.find((element) => element.id === tokenId)!;
        await window.__testInjectNetworkMessage?.('elUpdate', {
          ...token,
          x: 222,
          name: 'Injected Name',
          hp: { current: 999, max: 999 },
          conditions: ['injected'],
          version: Number.MAX_SAFE_INTEGER,
        }, mappedPeerId);
        const canonicalState = window.__testGameStore!.getState();
        return canonicalState.game.scenes
          .find((candidate) => candidate.id === canonicalState.game.activeSceneId)!
          .elements.find((element) => element.id === tokenId);
      }, gmDebug.activePeers[0]);

      expect(canonicalToken).toMatchObject({
        x: 222,
        name: 'Guardian',
        hp: { current: 10, max: 10 },
        conditions: [],
        version: 2,
      });
    } finally {
      await playerContext?.close();
      await gmContext?.close();
    }
  });

  test('player identity survives a reload without creating a ghost roster entry', async ({ browser }) => {
    test.setTimeout(240_000);
    let gmContext: BrowserContext | undefined;
    let playerContext: BrowserContext | undefined;
    try {
      gmContext = await browser.newContext();
      playerContext = await browser.newContext();
      const gmPage = await gmContext.newPage();
      let playerPage = await playerContext.newPage();

      const roomId = await createRoomWithoutStarting(gmPage, 'Resume Identity');
      await gmPage.getByRole('button', { name: /Start Game/i }).click();
      await joinRoom(playerPage, roomId);
      await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90_000 });

      const firstPlayerId = await playerPage.evaluate(
        () => window.__testGameStore!.getState().myPeerId,
      );
      expect(firstPlayerId).toBeTruthy();

      await playerPage.close();
      await gmPage.waitForFunction(
        () => window.__testGetRoomState?.().peers.length === 0,
        undefined,
        { timeout: 30_000 },
      );

      playerPage = await playerContext.newPage();
      await joinRoom(playerPage, roomId);
      await expect(playerPage.locator('canvas').first()).toBeVisible({ timeout: 90_000 });
      const resumedPlayerId = await playerPage.evaluate(
        () => window.__testGameStore!.getState().myPeerId,
      );
      expect(resumedPlayerId).toBe(firstPlayerId);

      const roster = await gmPage.evaluate(() => Object.entries(
        window.__testGameStore!.getState().game.players ?? {},
      ).filter(([, player]) => !player.isGM).map(([id]) => id));
      expect(roster).toEqual([firstPlayerId]);
    } finally {
      await playerContext?.close();
      await gmContext?.close();
    }
  });
});
