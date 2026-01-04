import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  GameState,
  CanvasElement,
  GridSettings,
  Player,
  ToolType,
  Point,
  DEFAULT_GRID_SETTINGS,
} from '../types';

interface GameStore {
  // Game state
  game: GameState | null;
  isConnected: boolean;
  myPeerId: string | null;
  isDM: boolean;

  // UI state
  selectedTool: ToolType;
  selectedElementId: string | null;
  viewportOffset: Point;
  viewportScale: number;

  // Actions - Game management
  createGame: (name: string, playerName: string) => void;
  loadGame: (game: GameState) => void;
  setConnected: (connected: boolean, peerId?: string) => void;

  // Actions - Elements
  addElement: (element: Omit<CanvasElement, 'id'>) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;

  // Actions - Players
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;

  // Actions - Grid
  updateGridSettings: (settings: Partial<GridSettings>) => void;

  // Actions - Fog of War
  revealFog: (polygon: Point[]) => void;
  hideFog: (polygon: Point[]) => void;
  toggleFog: (enabled: boolean) => void;

  // Actions - UI
  setTool: (tool: ToolType) => void;
  setViewport: (offset: Point, scale: number) => void;
  panViewport: (delta: Point) => void;
  zoomViewport: (delta: number, center: Point) => void;
}

const DEFAULT_GRID: GridSettings = {
  cellSize: 50,
  width: 30,
  height: 30,
  showGrid: true,
  snapToGrid: true,
  gridColor: 'rgba(255, 255, 255, 0.2)',
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  game: null,
  isConnected: false,
  myPeerId: null,
  isDM: false,
  selectedTool: 'select',
  selectedElementId: null,
  viewportOffset: { x: 0, y: 0 },
  viewportScale: 1,

  // Game management
  createGame: (name, playerName) => {
    const peerId = nanoid(10);
    const game: GameState = {
      id: nanoid(12),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gridSettings: DEFAULT_GRID,
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
  },

  loadGame: (game) => {
    set({ game });
  },

  setConnected: (connected, peerId) => {
    set({ isConnected: connected, myPeerId: peerId || get().myPeerId });
  },

  // Element management
  addElement: (elementData) => {
    const id = nanoid(10);
    const element = { ...elementData, id } as CanvasElement;

    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          elements: [...state.game.elements, element],
          updatedAt: new Date().toISOString(),
        },
      };
    });

    return id;
  },

  updateElement: (id, updates) => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          elements: state.game.elements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  deleteElement: (id) => {
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          elements: state.game.elements.filter((el) => el.id !== id),
          updatedAt: new Date().toISOString(),
        },
        selectedElementId:
          state.selectedElementId === id ? null : state.selectedElementId,
      };
    });
  },

  selectElement: (id) => {
    set({ selectedElementId: id });
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
  revealFog: (polygon) => {
    set((state) => {
      if (!state.game) return state;
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

  hideFog: (_polygon) => {
    // TODO: Implement fog hiding by subtracting polygon from revealed areas
    console.log('hideFog not yet implemented');
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
}));
