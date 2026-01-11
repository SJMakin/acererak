import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { saveGame } from '../db/database';
import { useHistoryStore } from './historyStore';
import type {
  GameState,
  CanvasElement,
  GridSettings,
  Player,
  ToolType,
  Point,
  CombatTracker,
  Combatant,
  TokenElement,
  DiceRoll,
  Settings,
  CampaignNote,
  ChatMessage,
  Scene,
  FogOfWar,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 1000;

function debouncedSave(game: GameState, isGM: boolean) {
  if (!isGM) return; // Only save if current user is GM

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveGame(game, isGM).catch((err) => {
      console.error('Failed to save game:', err);
    });
  }, SAVE_DEBOUNCE_MS);
}

// Settings localStorage helpers
const SETTINGS_STORAGE_KEY = 'vtt-settings';

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Helper to get active scene from game state
function getActiveScene(game: GameState | null): Scene | null {
  if (!game) return null;
  return game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0] || null;
}

// Helper to update the active scene in game state
function updateActiveScene(game: GameState, sceneUpdates: Partial<Scene>): GameState {
  return {
    ...game,
    scenes: game.scenes.map(s =>
      s.id === game.activeSceneId
        ? { ...s, ...sceneUpdates, updatedAt: new Date().toISOString() }
        : s
    ),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create a default scene
function createDefaultScene(name: string, settings: Settings): Scene {
  const now = new Date().toISOString();
  return {
    id: nanoid(10),
    name,
    gridSettings: {
      cellSize: settings.cellSize,
      width: settings.gridSize.width,
      height: settings.gridSize.height,
      showGrid: settings.showGridByDefault,
      snapToGrid: settings.snapToGridByDefault,
      gridColor: settings.gridColor,
      gridType: 'square',
    },
    elements: [],
    fogOfWar: { enabled: false, revealed: [] },
    createdAt: now,
    updatedAt: now,
  };
}

interface LayerVisibility {
  grid: boolean;
  map: boolean;
  tokens: boolean;
  drawings: boolean;
  text: boolean;
  fog: boolean;
}

interface GameStore {
  // Game state
  game: GameState | null;
  isConnected: boolean;
  myPeerId: string | null;
  isGM: boolean;

  // UI state
  selectedTool: ToolType;
  selectedElementId: string | null;
  selectedElementIds: string[];
  viewportOffset: Point;
  viewportScale: number;

  // Drawing style state
  drawingStrokeColor: string;
  drawingFillColor: string;
  drawingFillEnabled: boolean;
  drawingStrokeWidth: number;

  // Settings state
  settings: Settings;

  // GM Layer visibility and preview mode
  layerVisibility: LayerVisibility;
  previewAsPlayer: boolean;

  // Actions - Game management
  createGame: (name: string, playerName: string) => void;
  loadGame: (game: GameState) => void;
  setConnected: (connected: boolean, peerId?: string) => void;

  // Actions - Elements
  addElement: (element: Omit<CanvasElement, 'id'>, skipHistory?: boolean) => string;
  addElements: (elements: Omit<CanvasElement, 'id'>[]) => string[];
  addOrUpdateElement: (element: CanvasElement, skipHistory?: boolean) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
  updateElements: (updates: Array<{ id: string; updates: Partial<CanvasElement> }>, skipHistory?: boolean) => void;
  deleteElement: (id: string, skipHistory?: boolean) => void;
  deleteElements: (ids: string[], skipHistory?: boolean) => void;
  selectElement: (id: string | null) => void;
  selectElements: (ids: string[]) => void;
  toggleElementSelection: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;

  // Actions - Players
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;

  // Actions - Grid
  updateGridSettings: (settings: Partial<GridSettings>) => void;

  // Actions - Scenes
  getActiveScene: () => Scene | null;
  createScene: (name: string, backgroundUrl?: string, copyFromCurrent?: boolean) => string;
  switchScene: (sceneId: string) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  duplicateScene: (sceneId: string) => string;
  reorderScenes: (sceneIds: string[]) => void;

  // Actions - Fog of War
  revealFog: (polygon: Point[], skipHistory?: boolean) => void;
  hideFog: (polygon: Point[], skipHistory?: boolean) => void;
  toggleFog: (enabled: boolean) => void;

  // Actions - Combat
  startCombat: () => void;
  endCombat: () => void;
  addCombatant: (tokenId: string, initiative: number, dexterity?: number) => void;
  removeCombatant: (combatantId: string) => void;
  updateCombatant: (combatantId: string, updates: Partial<Combatant>) => void;
  nextTurn: () => void;
  previousTurn: () => void;
  updateCombatState: (combat: CombatTracker) => void;

  // Actions - Dice
  addDiceRoll: (roll: DiceRoll) => void;
  clearDiceHistory: () => void;

  // Actions - Chat
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;

  // Actions - Campaign Notes
  addCampaignNote: (note: Omit<CampaignNote, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCampaignNote: (id: string, updates: Partial<CampaignNote>) => void;
  deleteCampaignNote: (id: string) => void;

  // Actions - Settings
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;

  // Actions - UI
  setTool: (tool: ToolType) => void;
  setViewport: (offset: Point, scale: number) => void;
  panViewport: (delta: Point) => void;
  zoomViewport: (delta: number, center: Point) => void;

  // Actions - Drawing Style
  setDrawingStrokeColor: (color: string) => void;
  setDrawingFillColor: (color: string) => void;
  setDrawingFillEnabled: (enabled: boolean) => void;
  setDrawingStrokeWidth: (width: number) => void;

  // Actions - Undo/Redo
  performUndo: () => void;
  performRedo: () => void;

  // Actions - Layer Visibility
  toggleLayerVisibility: (layer: keyof LayerVisibility) => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
  setPreviewAsPlayer: (preview: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  game: null,
  isConnected: false,
  myPeerId: null,
  isGM: false,
  selectedTool: 'select',
  selectedElementId: null,
  selectedElementIds: [],
  viewportOffset: { x: 0, y: 0 },
  viewportScale: 1,
  drawingStrokeColor: '#ffffff',
  drawingFillColor: '#3b82f6',
  drawingFillEnabled: false,
  drawingStrokeWidth: 3,
  settings: loadSettings(),
  layerVisibility: {
    grid: true,
    map: true,
    tokens: true,
    drawings: true,
    text: true,
    fog: true,
  },
  previewAsPlayer: false,

  // Game management
  createGame: (name, playerName) => {
    const peerId = nanoid(10);
    const state = get();
    const now = new Date().toISOString();

    // Create initial scene with default settings
    const initialScene = createDefaultScene('Scene 1', state.settings);

    const game: GameState = {
      id: nanoid(12),
      name,
      createdAt: now,
      updatedAt: now,
      // Multi-scene architecture
      scenes: [initialScene],
      activeSceneId: initialScene.id,
      // Global state
      players: {
        [peerId]: {
          id: peerId,
          name: playerName,
          color: '#7c3aed',
          isGM: true,
          controlledTokens: [],
        },
      },
      gmPeerId: peerId,
    };
    set({ game, myPeerId: peerId, isGM: true });
    debouncedSave(game, true);
  },

  loadGame: (game) => {
    set({ game });
  },

  setConnected: (connected, peerId) => {
    set({ isConnected: connected, myPeerId: peerId || get().myPeerId });
  },

  // Element management (operates on active scene)
  addElement: (elementData, skipHistory = false) => {
    const id = nanoid(10);
    // Initialize version to 1 for new elements
    const element = { ...elementData, id, version: 1 } as CanvasElement;

    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      // Track action in history
      if (!skipHistory) {
        useHistoryStore.getState().pushAction({
          type: 'add',
          timestamp: Date.now(),
          before: { elements: activeScene.elements },
          after: { elements: [...activeScene.elements, element] },
          elementId: id,
          description: `Added ${element.type}`,
        });
      }

      const updatedGame = updateActiveScene(state.game, {
        elements: [...activeScene.elements, element],
      });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });

    return id;
  },

  addOrUpdateElement: (element, _skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const existing = activeScene.elements.find(e => e.id === element.id);

      if (existing) {
        // Version-based conflict resolution: only update if incoming version is >= local
        const incomingVersion = element.version || 0;
        const localVersion = existing.version || 0;

        if (incomingVersion < localVersion) {
          // Ignore stale updates
          return state;
        }

        // Update existing element
        const updatedElements = activeScene.elements.map(el =>
          el.id === element.id ? { ...el, ...element } : el
        );

        const updatedGame = updateActiveScene(state.game, { elements: updatedElements });
        debouncedSave(updatedGame, state.isGM);
        return { game: updatedGame };
      } else {
        // Add new element with existing ID (P2P sync case)
        // Ensure version is set
        const elementWithVersion = { ...element, version: element.version || 1 };
        const updatedGame = updateActiveScene(state.game, {
          elements: [...activeScene.elements, elementWithVersion],
        });

        debouncedSave(updatedGame, state.isGM);
        return { game: updatedGame };
      }
    });
  },

  updateElement: (id, updates, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const oldElement = activeScene.elements.find(el => el.id === id);
      if (!oldElement) return state;

      // Track action in history (only for significant updates like position or properties)
      const isPositionUpdate = updates.x !== undefined || updates.y !== undefined;
      const isPropertyUpdate = 'hp' in updates && updates.hp !== undefined;

      // Increment version for conflict resolution
      const newVersion = (oldElement.version || 0) + 1;
      const updatedElement = { ...oldElement, ...updates, version: newVersion } as CanvasElement;

      if (!skipHistory && (isPositionUpdate || isPropertyUpdate)) {
        useHistoryStore.getState().pushAction({
          type: isPositionUpdate ? 'move' : 'update',
          timestamp: Date.now(),
          before: { elements: activeScene.elements },
          after: { elements: activeScene.elements.map((el) =>
            el.id === id ? updatedElement : el
          ) },
          elementId: id,
          description: `Updated ${oldElement.type}`,
        });
      }

      const updatedGame = updateActiveScene(state.game, {
        elements: activeScene.elements.map((el) =>
          el.id === id ? updatedElement : el
        ),
      });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  updateElements: (updates, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      // Build map of updates for efficient lookup
      const updateMap = new Map(updates.map(u => [u.id, u.updates]));

      // Track action in history
      const hasPositionUpdates = updates.some(u => u.updates.x !== undefined || u.updates.y !== undefined);

      if (!skipHistory && hasPositionUpdates) {
        useHistoryStore.getState().pushAction({
          type: 'move',
          timestamp: Date.now(),
          before: { elements: activeScene.elements },
          after: {
            elements: activeScene.elements.map((el) => {
              const elUpdates = updateMap.get(el.id);
              return elUpdates ? { ...el, ...elUpdates } as CanvasElement : el;
            })
          },
          description: `Moved ${updates.length} element${updates.length > 1 ? 's' : ''}`,
        });
      }

      const updatedGame = updateActiveScene(state.game, {
        elements: activeScene.elements.map((el) => {
          const elUpdates = updateMap.get(el.id);
          return elUpdates ? { ...el, ...elUpdates } as CanvasElement : el;
        }),
      });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  deleteElement: (id, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const deletedElement = activeScene.elements.find(el => el.id === id);

      // Track action in history
      if (!skipHistory && deletedElement) {
        useHistoryStore.getState().pushAction({
          type: 'delete',
          timestamp: Date.now(),
          before: { elements: activeScene.elements },
          after: { elements: activeScene.elements.filter((el) => el.id !== id) },
          elementId: id,
          description: `Deleted ${deletedElement.type}`,
        });
      }

      const updatedGame = updateActiveScene(state.game, {
        elements: activeScene.elements.filter((el) => el.id !== id),
      });
      debouncedSave(updatedGame, state.isGM);
      return {
        game: updatedGame,
        selectedElementId:
          state.selectedElementId === id ? null : state.selectedElementId,
      };
    });
  },

  selectElement: (id) => {
    set({ selectedElementId: id, selectedElementIds: id ? [id] : [] });
  },

  selectElements: (ids) => {
    set({ selectedElementIds: ids, selectedElementId: ids.length === 1 ? ids[0] : null });
  },

  toggleElementSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedElementIds.includes(id);
      const newIds = isSelected
        ? state.selectedElementIds.filter(eid => eid !== id)
        : [...state.selectedElementIds, id];
      return {
        selectedElementIds: newIds,
        selectedElementId: newIds.length === 1 ? newIds[0] : null,
      };
    });
  },

  addToSelection: (id) => {
    set((state) => {
      if (state.selectedElementIds.includes(id)) return state;
      const newIds = [...state.selectedElementIds, id];
      return {
        selectedElementIds: newIds,
        selectedElementId: newIds.length === 1 ? newIds[0] : null,
      };
    });
  },

  clearSelection: () => {
    set({ selectedElementIds: [], selectedElementId: null });
  },

  addElements: (elementsData) => {
    const ids: string[] = [];
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const newElements = elementsData.map(elementData => {
        const id = nanoid(10);
        ids.push(id);
        return { ...elementData, id, version: 1 } as CanvasElement;
      });

      const updatedGame = updateActiveScene(state.game, {
        elements: [...activeScene.elements, ...newElements],
      });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
    return ids;
  },

  deleteElements: (ids, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      // Track action in history
      if (!skipHistory && ids.length > 0) {
        useHistoryStore.getState().pushAction({
          type: 'delete',
          timestamp: Date.now(),
          before: { elements: activeScene.elements },
          after: { elements: activeScene.elements.filter((el) => !ids.includes(el.id)) },
          description: `Deleted ${ids.length} element${ids.length > 1 ? 's' : ''}`,
        });
      }

      const updatedGame = updateActiveScene(state.game, {
        elements: activeScene.elements.filter((el) => !ids.includes(el.id)),
      });
      debouncedSave(updatedGame, state.isGM);
      return {
        game: updatedGame,
        selectedElementId: ids.includes(state.selectedElementId || '') ? null : state.selectedElementId,
        selectedElementIds: state.selectedElementIds.filter(id => !ids.includes(id)),
      };
    });
  },

  // Player management
  addPlayer: (player) => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [player.id]: player },
        },
      };
    });
  },

  removePlayer: (playerId) => {
    set((state) => {
      if (!state.game) return state;
      const { [playerId]: _, ...players } = state.game.players;
      return {
        game: { ...state.game, players },
      };
    });
  },

  updatePlayer: (playerId, updates) => {
    set((state) => {
      if (!state.game) return state;
      const player = state.game.players[playerId];
      if (!player) return state;
      return {
        game: {
          ...state.game,
          players: {
            ...state.game.players,
            [playerId]: { ...player, ...updates },
          },
        },
      };
    });
  },

  // Grid management (operates on active scene)
  updateGridSettings: (settings) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const updatedGame = updateActiveScene(state.game, {
        gridSettings: { ...activeScene.gridSettings, ...settings },
      });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  // Scene management
  getActiveScene: () => {
    const state = get();
    return getActiveScene(state.game);
  },

  createScene: (name, backgroundUrl, copyFromCurrent = false) => {
    const state = get();
    const now = new Date().toISOString();
    let newScene: Scene;

    if (copyFromCurrent && state.game) {
      const currentScene = getActiveScene(state.game);
      if (currentScene) {
        newScene = {
          ...currentScene,
          id: nanoid(10),
          name,
          backgroundUrl: backgroundUrl || currentScene.backgroundUrl,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        newScene = createDefaultScene(name, state.settings);
        if (backgroundUrl) newScene.backgroundUrl = backgroundUrl;
      }
    } else {
      newScene = createDefaultScene(name, state.settings);
      if (backgroundUrl) newScene.backgroundUrl = backgroundUrl;
    }

    set((s) => {
      if (!s.game) return s;
      const updatedGame = {
        ...s.game,
        scenes: [...s.game.scenes, newScene],
        activeSceneId: newScene.id,
        updatedAt: now,
      };
      debouncedSave(updatedGame, s.isGM);
      return { game: updatedGame };
    });

    return newScene.id;
  },

  switchScene: (sceneId) => {
    set((state) => {
      if (!state.game) return state;
      const sceneExists = state.game.scenes.some(s => s.id === sceneId);
      if (!sceneExists) return state;

      const updatedGame = {
        ...state.game,
        activeSceneId: sceneId,
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame, selectedElementId: null, selectedElementIds: [] };
    });
  },

  updateScene: (sceneId, updates) => {
    set((state) => {
      if (!state.game) return state;
      const now = new Date().toISOString();
      const updatedGame = {
        ...state.game,
        scenes: state.game.scenes.map(s =>
          s.id === sceneId ? { ...s, ...updates, updatedAt: now } : s
        ),
        updatedAt: now,
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  deleteScene: (sceneId) => {
    set((state) => {
      if (!state.game) return state;
      // Don't delete the last scene
      if (state.game.scenes.length <= 1) return state;

      const filteredScenes = state.game.scenes.filter(s => s.id !== sceneId);
      const newActiveId = state.game.activeSceneId === sceneId
        ? filteredScenes[0].id
        : state.game.activeSceneId;

      const updatedGame = {
        ...state.game,
        scenes: filteredScenes,
        activeSceneId: newActiveId,
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame, selectedElementId: null, selectedElementIds: [] };
    });
  },

  duplicateScene: (sceneId) => {
    const state = get();
    if (!state.game) return '';

    const sceneToCopy = state.game.scenes.find(s => s.id === sceneId);
    if (!sceneToCopy) return '';

    const now = new Date().toISOString();
    const newScene: Scene = {
      ...sceneToCopy,
      id: nanoid(10),
      name: `${sceneToCopy.name} (Copy)`,
      elements: sceneToCopy.elements.map(el => ({ ...el, id: nanoid(10) })),
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      if (!s.game) return s;
      const updatedGame = {
        ...s.game,
        scenes: [...s.game.scenes, newScene],
        updatedAt: now,
      };
      debouncedSave(updatedGame, s.isGM);
      return { game: updatedGame };
    });

    return newScene.id;
  },

  reorderScenes: (sceneIds) => {
    set((state) => {
      if (!state.game) return state;
      // Create map of scene id -> scene
      const sceneMap = new Map(state.game.scenes.map(s => [s.id, s]));
      // Reorder based on provided IDs
      const reorderedScenes = sceneIds
        .map(id => sceneMap.get(id))
        .filter((s): s is Scene => s !== undefined);
      // Add any scenes that weren't in the provided list
      const includedIds = new Set(sceneIds);
      const remainingScenes = state.game.scenes.filter(s => !includedIds.has(s.id));

      const updatedGame = {
        ...state.game,
        scenes: [...reorderedScenes, ...remainingScenes],
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  // Fog of War management (operates on active scene)
  revealFog: (polygon, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const newFogOfWar = {
        ...activeScene.fogOfWar,
        revealed: [...activeScene.fogOfWar.revealed, polygon],
      };

      // Track action in history
      if (!skipHistory) {
        useHistoryStore.getState().pushAction({
          type: 'fog-reveal',
          timestamp: Date.now(),
          before: { fogOfWar: activeScene.fogOfWar },
          after: { fogOfWar: newFogOfWar },
          description: 'Revealed fog area',
        });
      }

      const updatedGame = updateActiveScene(state.game, { fogOfWar: newFogOfWar });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  hideFog: (polygon, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      // Simple implementation: remove revealed areas that intersect with hide polygon
      const isPointInPolygon = (point: Point, poly: Point[]): boolean => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i].x, yi = poly[i].y;
          const xj = poly[j].x, yj = poly[j].y;
          const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      const filteredRevealed = activeScene.fogOfWar.revealed.filter((revealedPoly) => {
        if (revealedPoly.length === 0) return false;
        const centerX = revealedPoly.reduce((sum, p) => sum + p.x, 0) / revealedPoly.length;
        const centerY = revealedPoly.reduce((sum, p) => sum + p.y, 0) / revealedPoly.length;
        return !isPointInPolygon({ x: centerX, y: centerY }, polygon);
      });

      const newFogOfWar = {
        ...activeScene.fogOfWar,
        revealed: filteredRevealed,
      };

      // Track action in history
      if (!skipHistory) {
        useHistoryStore.getState().pushAction({
          type: 'fog-hide',
          timestamp: Date.now(),
          before: { fogOfWar: activeScene.fogOfWar },
          after: { fogOfWar: newFogOfWar },
          description: 'Hid fog area',
        });
      }

      const updatedGame = updateActiveScene(state.game, { fogOfWar: newFogOfWar });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  toggleFog: (enabled) => {
    set((state) => {
      if (!state.game) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const updatedGame = updateActiveScene(state.game, {
        fogOfWar: { ...activeScene.fogOfWar, enabled },
      });
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  // Combat management
  startCombat: () => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          combat: {
            active: true,
            round: 1,
            currentTurn: 0,
            combatants: [],
          },
        },
      };
    });
  },

  endCombat: () => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          combat: undefined,
        },
      };
    });
  },

  addCombatant: (tokenId, initiative, dexterity) => {
    set((state) => {
      if (!state.game?.combat) return state;
      const activeScene = getActiveScene(state.game);
      if (!activeScene) return state;

      const token = activeScene.elements.find(e => e.id === tokenId) as TokenElement;
      if (!token || token.type !== 'token') return state;

      const combatant: Combatant = {
        id: tokenId,
        name: token.name,
        initiative,
        dexterity,
        hp: token.hp || { current: 10, max: 10 },
        conditions: token.conditions || [],
      };

      const combatants = [...state.game.combat.combatants, combatant].sort((a, b) => {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return (b.dexterity || 0) - (a.dexterity || 0);
      });

      return {
        game: {
          ...state.game,
          combat: {
            ...state.game.combat,
            combatants,
          },
        },
      };
    });
  },

  removeCombatant: (combatantId) => {
    set((state) => {
      if (!state.game?.combat) return state;
      return {
        game: {
          ...state.game,
          combat: {
            ...state.game.combat,
            combatants: state.game.combat.combatants.filter(c => c.id !== combatantId),
          },
        },
      };
    });
  },

  updateCombatant: (combatantId, updates) => {
    set((state) => {
      if (!state.game?.combat) return state;
      return {
        game: {
          ...state.game,
          combat: {
            ...state.game.combat,
            combatants: state.game.combat.combatants.map(c =>
              c.id === combatantId ? { ...c, ...updates } : c
            ),
          },
        },
      };
    });
  },

  nextTurn: () => {
    set((state) => {
      if (!state.game?.combat) return state;
      const currentTurn = state.game.combat.currentTurn + 1;
      const round = currentTurn >= state.game.combat.combatants.length
        ? state.game.combat.round + 1
        : state.game.combat.round;
      return {
        game: {
          ...state.game,
          combat: {
            ...state.game.combat,
            currentTurn: currentTurn % state.game.combat.combatants.length,
            round,
          },
        },
      };
    });
  },

  previousTurn: () => {
    set((state) => {
      if (!state.game?.combat) return state;
      let currentTurn = state.game.combat.currentTurn - 1;
      let round = state.game.combat.round;
      if (currentTurn < 0) {
        currentTurn = state.game.combat.combatants.length - 1;
        round = Math.max(1, round - 1);
      }
      return {
        game: {
          ...state.game,
          combat: {
            ...state.game.combat,
            currentTurn,
            round,
          },
        },
      };
    });
  },

  updateCombatState: (combat) => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          combat,
        },
      };
    });
  },

  // Dice management
  addDiceRoll: (roll) => {
    set((state) => {
      if (!state.game) return state;
      const diceRolls = state.game.diceRolls || [];
      // Keep only last 50 rolls
      const updatedRolls = [...diceRolls, roll].slice(-50);
      return {
        game: {
          ...state.game,
          diceRolls: updatedRolls,
        },
      };
    });
  },

  clearDiceHistory: () => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          diceRolls: [],
        },
      };
    });
  },

  // Chat actions
  addChatMessage: (message) => {
    set((state) => {
      if (!state.game) return state;
      const chatMessages = state.game.chatMessages || [];
      // Keep only last 100 messages
      const updatedMessages = [...chatMessages, message].slice(-100);
      return {
        game: {
          ...state.game,
          chatMessages: updatedMessages,
        },
      };
    });
  },

  clearChatMessages: () => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          chatMessages: [],
        },
      };
    });
  },

  // Campaign Notes actions
  addCampaignNote: (noteData) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    const note: CampaignNote = {
      ...noteData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      if (!state.game) return state;
      const campaignNotes = state.game.campaignNotes || [];
      const updatedGame = {
        ...state.game,
        campaignNotes: [...campaignNotes, note],
        updatedAt: now,
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });

    return id;
  },

  updateCampaignNote: (id, updates) => {
    set((state) => {
      if (!state.game) return state;
      const campaignNotes = state.game.campaignNotes || [];
      const now = new Date().toISOString();
      const updatedGame = {
        ...state.game,
        campaignNotes: campaignNotes.map((note) =>
          note.id === id ? { ...note, ...updates, updatedAt: now } : note
        ),
        updatedAt: now,
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  deleteCampaignNote: (id) => {
    set((state) => {
      if (!state.game) return state;
      const campaignNotes = state.game.campaignNotes || [];
      const updatedGame = {
        ...state.game,
        campaignNotes: campaignNotes.filter((note) => note.id !== id),
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isGM);
      return { game: updatedGame };
    });
  },

  // Settings actions
  updateSettings: (updates) => {
    set((state) => {
      const newSettings = { ...state.settings, ...updates };
      saveSettings(newSettings);
      return { settings: newSettings };
    });
  },

  resetSettings: () => {
    saveSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },

  // UI actions
  setTool: (tool) => {
    set({ selectedTool: tool, selectedElementId: null });
  },

  setViewport: (offset, scale) => {
    set({ viewportOffset: offset, viewportScale: scale });
  },

  panViewport: (delta) => {
    set((state) => ({
      viewportOffset: {
        x: state.viewportOffset.x + delta.x,
        y: state.viewportOffset.y + delta.y,
      },
    }));
  },

  zoomViewport: (delta, center) => {
    set((state) => {
      const newScale = Math.min(Math.max(state.viewportScale + delta, 0.25), 3);
      const scaleFactor = newScale / state.viewportScale;

      // Zoom towards the center point
      const newOffset = {
        x: center.x - (center.x - state.viewportOffset.x) * scaleFactor,
        y: center.y - (center.y - state.viewportOffset.y) * scaleFactor,
      };

      return {
        viewportScale: newScale,
        viewportOffset: newOffset,
      };
    });
  },

  // Drawing style actions
  setDrawingStrokeColor: (color) => {
    set({ drawingStrokeColor: color });
  },

  setDrawingFillColor: (color) => {
    set({ drawingFillColor: color });
  },

  setDrawingFillEnabled: (enabled) => {
    set({ drawingFillEnabled: enabled });
  },

  setDrawingStrokeWidth: (width) => {
    set({ drawingStrokeWidth: Math.max(1, Math.min(10, width)) });
  },

  // Undo/Redo actions
  performUndo: () => {
    const action = useHistoryStore.getState().undo();
    if (!action) return;

    const state = get();
    if (!state.game) return;

    // Apply the before state
    set({
      game: {
        ...state.game,
        ...action.before,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  performRedo: () => {
    const action = useHistoryStore.getState().redo();
    if (!action) return;

    const state = get();
    if (!state.game) return;

    // Apply the after state
    set({
      game: {
        ...state.game,
        ...action.after,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  // Layer visibility actions
  toggleLayerVisibility: (layer) => {
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    }));
  },

  setLayerVisibility: (layer, visible) => {
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: visible,
      },
    }));
  },

  setPreviewAsPlayer: (preview) => {
    set({ previewAsPlayer: preview });
  },
}));
