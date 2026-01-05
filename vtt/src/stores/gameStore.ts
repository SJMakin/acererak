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
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 1000;

function debouncedSave(game: GameState, isDM: boolean) {
  if (!isDM) return; // Only save if current user is DM
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveGame(game, isDM).catch((err) => {
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
  isDM: boolean;

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

  // DM Layer visibility and preview mode
  layerVisibility: LayerVisibility;
  previewAsPlayer: boolean;

  // Actions - Game management
  createGame: (name: string, playerName: string) => void;
  loadGame: (game: GameState) => void;
  setConnected: (connected: boolean, peerId?: string) => void;

  // Actions - Elements
  addElement: (element: Omit<CanvasElement, 'id'>, skipHistory?: boolean) => string;
  addElements: (elements: Omit<CanvasElement, 'id'>[]) => string[];
  updateElement: (id: string, updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
  deleteElement: (id: string, skipHistory?: boolean) => void;
  deleteElements: (ids: string[]) => void;
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
  isDM: false,
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
    const game: GameState = {
      id: nanoid(12),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gridSettings: {
        cellSize: state.settings.cellSize,
        width: state.settings.gridSize.width,
        height: state.settings.gridSize.height,
        showGrid: state.settings.showGridByDefault,
        snapToGrid: state.settings.snapToGridByDefault,
        gridColor: state.settings.gridColor,
      },
      elements: [],
      fogOfWar: { enabled: false, revealed: [] },
      players: {
        [peerId]: {
          id: peerId,
          name: playerName,
          color: '#7c3aed',
          isDM: true,
          controlledTokens: [],
        },
      },
      dmPeerId: peerId,
    };
    set({ game, myPeerId: peerId, isDM: true });
    debouncedSave(game, true);
  },

  loadGame: (game) => {
    set({ game });
  },

  setConnected: (connected, peerId) => {
    set({ isConnected: connected, myPeerId: peerId || get().myPeerId });
  },

  // Element management
  addElement: (elementData, skipHistory = false) => {
    const id = nanoid(10);
    const element = { ...elementData, id } as CanvasElement;

    set((state) => {
      if (!state.game) return state;
      
      // Track action in history
      if (!skipHistory) {
        useHistoryStore.getState().pushAction({
          type: 'add',
          timestamp: Date.now(),
          before: { elements: state.game.elements },
          after: { elements: [...state.game.elements, element] },
          elementId: id,
          description: `Added ${element.type}`,
        });
      }
      
      const updatedGame = {
        ...state.game,
        elements: [...state.game.elements, element],
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isDM);
      return {
        game: updatedGame,
      };
    });

    return id;
  },

  updateElement: (id, updates, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      
      const oldElement = state.game.elements.find(el => el.id === id);
      if (!oldElement) return state;
      
      // Track action in history (only for significant updates like position or properties)
      const isPositionUpdate = updates.x !== undefined || updates.y !== undefined;
      const isPropertyUpdate = 'hp' in updates && updates.hp !== undefined;
      
      if (!skipHistory && (isPositionUpdate || isPropertyUpdate)) {
        useHistoryStore.getState().pushAction({
          type: isPositionUpdate ? 'move' : 'update',
          timestamp: Date.now(),
          before: { elements: state.game.elements },
          after: { elements: state.game.elements.map((el) =>
            el.id === id ? { ...el, ...updates } as CanvasElement : el
          ) },
          elementId: id,
          description: `Updated ${oldElement.type}`,
        });
      }
      
      const updatedGame: GameState = {
        ...state.game,
        elements: state.game.elements.map((el) =>
          el.id === id ? { ...el, ...updates } as CanvasElement : el
        ),
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isDM);
      return {
        game: updatedGame,
      };
    });
  },

  deleteElement: (id, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      
      const deletedElement = state.game.elements.find(el => el.id === id);
      
      // Track action in history
      if (!skipHistory && deletedElement) {
        useHistoryStore.getState().pushAction({
          type: 'delete',
          timestamp: Date.now(),
          before: { elements: state.game.elements },
          after: { elements: state.game.elements.filter((el) => el.id !== id) },
          elementId: id,
          description: `Deleted ${deletedElement.type}`,
        });
      }
      
      const updatedGame = {
        ...state.game,
        elements: state.game.elements.filter((el) => el.id !== id),
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isDM);
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
      
      const newElements = elementsData.map(elementData => {
        const id = nanoid(10);
        ids.push(id);
        return { ...elementData, id } as CanvasElement;
      });
      
      const updatedGame = {
        ...state.game,
        elements: [...state.game.elements, ...newElements],
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isDM);
      return { game: updatedGame };
    });
    return ids;
  },

  deleteElements: (ids) => {
    set((state) => {
      if (!state.game) return state;
      
      const updatedGame = {
        ...state.game,
        elements: state.game.elements.filter((el) => !ids.includes(el.id)),
        updatedAt: new Date().toISOString(),
      };
      debouncedSave(updatedGame, state.isDM);
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

  // Grid management
  updateGridSettings: (settings) => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          gridSettings: { ...state.game.gridSettings, ...settings },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // Fog of War management
  revealFog: (polygon, skipHistory = false) => {
    set((state) => {
      if (!state.game) return state;
      
      // Track action in history
      if (!skipHistory) {
        useHistoryStore.getState().pushAction({
          type: 'fog-reveal',
          timestamp: Date.now(),
          before: { fogOfWar: state.game.fogOfWar },
          after: { fogOfWar: {
            ...state.game.fogOfWar,
            revealed: [...state.game.fogOfWar.revealed, polygon],
          } },
          description: 'Revealed fog area',
        });
      }
      
      return {
        game: {
          ...state.game,
          fogOfWar: {
            ...state.game.fogOfWar,
            revealed: [...state.game.fogOfWar.revealed, polygon],
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  hideFog: (polygon, skipHistory = false) => {
    set((state) => {
      if (!state.game) return {};
      
      // Simple implementation: remove revealed areas that intersect with hide polygon
      // For a quick implementation, we'll filter out polygons whose first point
      // is inside the hide polygon (simplified collision detection)
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
      
      const filteredRevealed = state.game.fogOfWar.revealed.filter((revealedPoly) => {
        // Keep the revealed polygon if its center is NOT in the hide polygon
        if (revealedPoly.length === 0) return false;
        
        // Calculate center point
        const centerX = revealedPoly.reduce((sum, p) => sum + p.x, 0) / revealedPoly.length;
        const centerY = revealedPoly.reduce((sum, p) => sum + p.y, 0) / revealedPoly.length;
        
        return !isPointInPolygon({ x: centerX, y: centerY }, polygon);
      });
      
      // Track action in history
      if (!skipHistory) {
        useHistoryStore.getState().pushAction({
          type: 'fog-hide',
          timestamp: Date.now(),
          before: { fogOfWar: state.game.fogOfWar },
          after: { fogOfWar: {
            ...state.game.fogOfWar,
            revealed: filteredRevealed,
          } },
          description: 'Hid fog area',
        });
      }
      
      return {
        game: {
          ...state.game,
          fogOfWar: {
            ...state.game.fogOfWar,
            revealed: filteredRevealed,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  toggleFog: (enabled) => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          fogOfWar: { ...state.game.fogOfWar, enabled },
          updatedAt: new Date().toISOString(),
        },
      };
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
      const token = state.game.elements.find(e => e.id === tokenId) as TokenElement;
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
      debouncedSave(updatedGame, state.isDM);
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
      debouncedSave(updatedGame, state.isDM);
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
      debouncedSave(updatedGame, state.isDM);
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
