import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Sheet } from '../types';
import { saveSheets, loadSheets } from '../db/database';
import { parseShadowState } from '../services/shadowStateService';

interface SheetFloatingBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type SheetDisplayMode = 'modal' | 'floating' | 'window';

interface SheetStore {
  sheets: Sheet[];
  isLoading: boolean;
  isGM: boolean;
  onP2PUpdate?: (sheet: Sheet) => void;
  onP2PDelete?: (sheetId: string) => void;

  // Sheet UI state
  sheetId: string | null; // null = closed; 'new' = create new
  sheetDisplayMode: SheetDisplayMode;
  sheetFloatingBounds: SheetFloatingBounds | null;
  openSheet: (sheetId: string | null, tokenId?: string) => void;
  closeSheet: () => void;
  setSheetDisplayMode: (mode: SheetDisplayMode) => void;
  setSheetFloatingBounds: (bounds: SheetFloatingBounds) => void;

  // CRUD operations
  addSheet: (sheet: Omit<Sheet, 'id' | 'createdAt' | 'updatedAt'>) => string;
  addFolder: (name: string, parentId?: string) => string;
  moveItem: (id: string, newParentId: string | null) => void;
  updateSheet: (id: string, updates: Partial<Sheet>) => void;
  deleteSheet: (id: string) => void;

  // Stat operations (for action buttons)
  updateSheetStat: (sheetId: string, statKey: string, statValue: string | number) => void;

  // Queries
  getSheetById: (id: string) => Sheet | undefined;

  // Bulk operations (hydration only; does not persist or broadcast)
  setSheets: (sheets: Sheet[]) => void;
  loadFromDB: () => Promise<void>;

  // Sync with game state
  syncToGameState: () => Sheet[];

  // P2P sync setup
  setP2PHandlers: (onUpdate: (sheet: Sheet) => void, onDelete: (sheetId: string) => void) => void;
}

const FLOATING_BOUNDS_KEY = 'sheet.panelBounds';

function loadFloatingBounds(): SheetFloatingBounds | null {
  try {
    const raw = localStorage.getItem(FLOATING_BOUNDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useSheetStore = create<SheetStore>((set, get) => ({
  sheets: [],
  isLoading: false,
  isGM: false,

  // Sheet UI state
  sheetId: null,
  sheetDisplayMode: 'modal',
  sheetFloatingBounds: loadFloatingBounds(),

  openSheet: (id) => {
    set({ sheetId: id ?? 'new', sheetDisplayMode: 'modal' });
  },

  closeSheet: () => {
    set({ sheetId: null, sheetDisplayMode: 'modal' });
  },

  setSheetDisplayMode: (mode) => {
    set({ sheetDisplayMode: mode });
  },

  setSheetFloatingBounds: (bounds) => {
    set({ sheetFloatingBounds: bounds });
    try {
      localStorage.setItem(FLOATING_BOUNDS_KEY, JSON.stringify(bounds));
    } catch { /* ignore quota errors */ }
  },

  addSheet: (sheetData) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    const sheet: Sheet = {
      ...sheetData,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newSheets = [...state.sheets, sheet];
      // Persist to IndexedDB if GM
      if (state.isGM) {
        saveSheets(newSheets).catch((err) => {
          console.error('Failed to save sheets:', err);
        });
      }
      return { sheets: newSheets };
    });

    // Broadcast to P2P peers
    const { onP2PUpdate } = get();
    if (onP2PUpdate) {
      onP2PUpdate(sheet);
    }

    return id;
  },

  addFolder: (name, parentId) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    const folder: Sheet = {
      id,
      version: 1,
      name,
      content: '',
      shadowState: {},
      projections: {},
      isFolder: true,
      parentId: parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newSheets = [...state.sheets, folder];
      if (state.isGM) {
        saveSheets(newSheets).catch((err) => console.error('Failed to save sheets:', err));
      }
      return { sheets: newSheets };
    });

    const { onP2PUpdate } = get();
    if (onP2PUpdate) onP2PUpdate(folder);

    return id;
  },

  moveItem: (id, newParentId) => {
    set((state) => {
      const now = new Date().toISOString();
      const existing = state.sheets.find((s) => s.id === id);
      if (!existing) return state;
      const updatedSheets = state.sheets.map((s) =>
        s.id === id
          ? { ...s, parentId: newParentId, version: (s.version || 0) + 1, updatedAt: now }
          : s
      );
      if (state.isGM) {
        saveSheets(updatedSheets).catch((err) => console.error('Failed to save sheets:', err));
      }
      return { sheets: updatedSheets };
    });

    const { onP2PUpdate, sheets } = get();
    const updated = sheets.find((s) => s.id === id);
    if (onP2PUpdate && updated) onP2PUpdate(updated);
  },

  updateSheet: (id, updates) => {
    set((state) => {
      const now = new Date().toISOString();
      const existing = state.sheets.find((s) => s.id === id);
      if (!existing) return state;
      const newVersion = (existing.version || 0) + 1;
      const { id: _id, createdAt: _createdAt, version: _version, updatedAt: _updatedAt, ...safeUpdates } = updates;
      const updatedSheets = state.sheets.map((s) =>
        s.id === id
          ? {
              ...s,
              ...safeUpdates,
              version: newVersion,
              updatedAt: now,
            }
          : s
      );

      // Persist to IndexedDB if GM
      if (state.isGM) {
        saveSheets(updatedSheets).catch((err) => {
          console.error('Failed to save sheets:', err);
        });
      }

      return { sheets: updatedSheets };
    });

    // Broadcast to P2P peers
    const { onP2PUpdate, sheets } = get();
    const updatedSheet = sheets.find((s) => s.id === id);
    if (onP2PUpdate && updatedSheet) {
      onP2PUpdate(updatedSheet);
    }
  },

  deleteSheet: (id) => {
    // Collect all descendant IDs (for folder deletion)
    const collectDescendants = (parentId: string, sheets: Sheet[]): string[] => {
      const children = sheets.filter((s) => s.parentId === parentId);
      return children.flatMap((c) => [c.id, ...collectDescendants(c.id, sheets)]);
    };

    const state = get();
    const idsToDelete = new Set([id, ...collectDescendants(id, state.sheets)]);

    set((state) => {
      const filteredSheets = state.sheets.filter((s) => !idsToDelete.has(s.id));
      if (state.isGM) {
        saveSheets(filteredSheets).catch((err) => console.error('Failed to save sheets:', err));
      }
      return { sheets: filteredSheets };
    });

    const { onP2PDelete } = get();
    if (onP2PDelete) {
      for (const deletedId of idsToDelete) {
        onP2PDelete(deletedId);
      }
    }
  },

  updateSheetStat: (sheetId, statKey, statValue) => {
    set((state) => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (!sheet) return state;

      // Parse the content to update the stat in the sheet
      try {
        const content = JSON.parse(sheet.content);
        
        // Recursively find and update stat declarations
        const updateStatInNode = (node: { type: string; attrs?: Record<string, unknown>; content?: unknown[] }): boolean => {
          if (node.type === 'statDeclaration' && node.attrs) {
            const attrs = node.attrs as { key?: string };
            if (attrs.key === statKey) {
              (node.attrs as Record<string, unknown>).value = statValue;
              return true;
            }
          }
          if (node.content) {
            for (const child of node.content) {
              if (updateStatInNode(child as { type: string; attrs?: Record<string, unknown>; content?: unknown[] })) {
                return true;
              }
            }
          }
          return false;
        };

        if (content.content) {
          for (const node of content.content) {
            if (updateStatInNode(node as { type: string; attrs?: Record<string, unknown>; content?: unknown[] })) {
              break;
            }
          }
        }

        const now = new Date().toISOString();
        const newVersion = (sheet.version || 0) + 1;
        const parsedShadow = parseShadowState(content);
        const updatedSheets = state.sheets.map((s) =>
          s.id === sheetId
            ? {
                ...s,
                content: JSON.stringify(content),
                shadowState: parsedShadow.stats,
                projections: parsedShadow.projections,
                version: newVersion,
                updatedAt: now,
              }
            : s
        );

        // Persist to IndexedDB if GM
        if (state.isGM) {
          saveSheets(updatedSheets).catch((err) => {
            console.error('Failed to save sheets:', err);
          });
        }

        return { sheets: updatedSheets };
      } catch (e) {
        console.error('Failed to update sheet stat:', e);
        return state;
      }
    });

    // Broadcast to P2P peers
    const { onP2PUpdate, sheets } = get();
    const updatedSheet = sheets.find((s) => s.id === sheetId);
    if (onP2PUpdate && updatedSheet) {
      onP2PUpdate(updatedSheet);
    }
  },

  getSheetById: (id) => {
    return get().sheets.find((s) => s.id === id);
  },

  setSheets: (sheets) => {
    set({ sheets });
  },

  loadFromDB: async () => {
    set({ isLoading: true });
    try {
      const sheets = await loadSheets();
      set({ sheets });
    } catch (err) {
      console.error('Failed to load sheets from DB:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  syncToGameState: () => {
    return get().sheets;
  },

  setP2PHandlers: (onUpdate, onDelete) => {
    set({ onP2PUpdate: onUpdate, onP2PDelete: onDelete });
  },
}));

// Helper function to handle incoming P2P sheet updates
export function handleIncomingSheetUpdate(sheet: Sheet) {
  const store = useSheetStore.getState();
  const existing = store.getSheetById(sheet.id);

  const applySheets = (sheets: Sheet[]) => {
    useSheetStore.setState({ sheets });
    if (store.isGM) {
      saveSheets(sheets).catch((err) => {
        console.error('Failed to save sheets:', err);
      });
    }
  };
  
  if (existing) {
    // Version-based conflict resolution: ignore stale updates; equal version uses LWW semantics
    const incomingVersion = sheet.version || 0;
    const localVersion = existing.version || 0;

    if (incomingVersion < localVersion) {
      return;
    }

    // Update existing sheet
    const updatedSheets = store.sheets.map((s) =>
      s.id === sheet.id ? { ...s, ...sheet } : s
    );
    applySheets(updatedSheets);
  } else {
    // Add new sheet
    const now = new Date().toISOString();
    applySheets([
      ...store.sheets,
      {
        ...sheet,
        version: sheet.version || 1,
        createdAt: sheet.createdAt || now,
        updatedAt: sheet.updatedAt || now,
      },
    ]);
  }
}

// Helper function to handle incoming P2P sheet deletions
export function handleIncomingSheetDelete(sheetId: string) {
  const store = useSheetStore.getState();
  const existing = store.getSheetById(sheetId);
  
  if (existing) {
    const remaining = store.sheets.filter((s) => s.id !== sheetId);
    useSheetStore.setState({ sheets: remaining });
    if (store.isGM) {
      saveSheets(remaining).catch((err) => {
        console.error('Failed to save sheets:', err);
      });
    }
  }
}

// Helper function to set GM mode (called from game initialization)
export function setSheetStoreGM(isGM: boolean) {
  useSheetStore.setState({ isGM });
  if (isGM) {
    // Load from IndexedDB when becoming GM
    useSheetStore.getState().loadFromDB();
  }
}
