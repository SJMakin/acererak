import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Character } from '../types';
import { saveCharacters, loadCharacters } from '../db/database';
import { parseShadowState } from '../services/shadowStateService';

interface CharacterStore {
  characters: Character[];
  isLoading: boolean;
  isGM: boolean;
  onP2PUpdate?: (character: Character) => void;
  onP2PDelete?: (characterId: string) => void;

  // CRUD operations
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  // Stat operations (for action buttons)
  updateCharacterStat: (characterId: string, statKey: string, statValue: string | number) => void;

  // Queries
  getCharacterById: (id: string) => Character | undefined;

  // Bulk operations (hydration only; does not persist or broadcast)
  setCharacters: (characters: Character[]) => void;
  loadFromDB: () => Promise<void>;

  // Sync with game state
  syncToGameState: () => Character[];

  // P2P sync setup
  setP2PHandlers: (onUpdate: (character: Character) => void, onDelete: (characterId: string) => void) => void;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  isLoading: false,
  isGM: false,

  addCharacter: (characterData) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    const character: Character = {
      ...characterData,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newCharacters = [...state.characters, character];
      // Persist to IndexedDB if GM
      if (state.isGM) {
        saveCharacters(newCharacters).catch((err) => {
          console.error('Failed to save characters:', err);
        });
      }
      return { characters: newCharacters };
    });

    // Broadcast to P2P peers
    const { onP2PUpdate } = get();
    if (onP2PUpdate) {
      onP2PUpdate(character);
    }

    return id;
  },

  updateCharacter: (id, updates) => {
    set((state) => {
      const now = new Date().toISOString();
      const existing = state.characters.find((char) => char.id === id);
      if (!existing) return state;
      const newVersion = (existing.version || 0) + 1;
      const { id: _id, createdAt: _createdAt, version: _version, updatedAt: _updatedAt, ...safeUpdates } = updates;
      const updatedCharacters = state.characters.map((char) =>
        char.id === id
          ? {
              ...char,
              ...safeUpdates,
              version: newVersion,
              updatedAt: now,
            }
          : char
      );

      // Persist to IndexedDB if GM
      if (state.isGM) {
        saveCharacters(updatedCharacters).catch((err) => {
          console.error('Failed to save characters:', err);
        });
      }

      return { characters: updatedCharacters };
    });

    // Broadcast to P2P peers
    const { onP2PUpdate, characters } = get();
    const updatedCharacter = characters.find((char) => char.id === id);
    if (onP2PUpdate && updatedCharacter) {
      onP2PUpdate(updatedCharacter);
    }
  },

  deleteCharacter: (id) => {
    set((state) => {
      const filteredCharacters = state.characters.filter((char) => char.id !== id);

      // Persist to IndexedDB if GM
      if (state.isGM) {
        saveCharacters(filteredCharacters).catch((err) => {
          console.error('Failed to save characters:', err);
        });
      }

      return { characters: filteredCharacters };
    });

    // Broadcast to P2P peers
    const { onP2PDelete } = get();
    if (onP2PDelete) {
      onP2PDelete(id);
    }
  },

  updateCharacterStat: (characterId, statKey, statValue) => {
    set((state) => {
      const character = state.characters.find((char) => char.id === characterId);
      if (!character) return state;

      // Parse the content to update the stat in the sheet
      try {
        const content = JSON.parse(character.content);
        
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
        const newVersion = (character.version || 0) + 1;
        const parsedShadow = parseShadowState(content);
        const updatedCharacters = state.characters.map((char) =>
          char.id === characterId
            ? {
                ...char,
                content: JSON.stringify(content),
                shadowState: parsedShadow.stats,
                projections: parsedShadow.projections,
                version: newVersion,
                updatedAt: now,
              }
            : char
        );

        // Persist to IndexedDB if GM
        if (state.isGM) {
          saveCharacters(updatedCharacters).catch((err) => {
            console.error('Failed to save characters:', err);
          });
        }

        return { characters: updatedCharacters };
      } catch (e) {
        console.error('Failed to update character stat:', e);
        return state;
      }
    });

    // Broadcast to P2P peers
    const { onP2PUpdate, characters } = get();
    const updatedCharacter = characters.find((char) => char.id === characterId);
    if (onP2PUpdate && updatedCharacter) {
      onP2PUpdate(updatedCharacter);
    }
  },

  getCharacterById: (id) => {
    return get().characters.find((char) => char.id === id);
  },

  setCharacters: (characters) => {
    set({ characters });
  },

  loadFromDB: async () => {
    set({ isLoading: true });
    try {
      const characters = await loadCharacters();
      set({ characters });
    } catch (err) {
      console.error('Failed to load characters from DB:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  syncToGameState: () => {
    return get().characters;
  },

  setP2PHandlers: (onUpdate, onDelete) => {
    set({ onP2PUpdate: onUpdate, onP2PDelete: onDelete });
  },
}));

// Helper function to handle incoming P2P character updates
export function handleIncomingCharacterUpdate(character: Character) {
  const store = useCharacterStore.getState();
  const existing = store.getCharacterById(character.id);

  const applyCharacters = (characters: Character[]) => {
    useCharacterStore.setState({ characters });
    if (store.isGM) {
      saveCharacters(characters).catch((err) => {
        console.error('Failed to save characters:', err);
      });
    }
  };
  
  if (existing) {
    // Version-based conflict resolution: ignore stale updates; equal version uses LWW semantics
    const incomingVersion = character.version || 0;
    const localVersion = existing.version || 0;

    if (incomingVersion < localVersion) {
      return;
    }

    // Update existing character
    const updatedCharacters = store.characters.map((char) =>
      char.id === character.id ? { ...char, ...character } : char
    );
    applyCharacters(updatedCharacters);
  } else {
    // Add new character
    const now = new Date().toISOString();
    applyCharacters([
      ...store.characters,
      {
        ...character,
        version: character.version || 1,
        createdAt: character.createdAt || now,
        updatedAt: character.updatedAt || now,
      },
    ]);
  }
}

// Helper function to handle incoming P2P character deletions
export function handleIncomingCharacterDelete(characterId: string) {
  const store = useCharacterStore.getState();
  const existing = store.getCharacterById(characterId);
  
  if (existing) {
    const remaining = store.characters.filter((char) => char.id !== characterId);
    useCharacterStore.setState({ characters: remaining });
    if (store.isGM) {
      saveCharacters(remaining).catch((err) => {
        console.error('Failed to save characters:', err);
      });
    }
  }
}

// Helper function to set GM mode (called from game initialization)
export function setCharacterStoreGM(isGM: boolean) {
  useCharacterStore.setState({ isGM });
  if (isGM) {
    // Load from IndexedDB when becoming GM
    useCharacterStore.getState().loadFromDB();
  }
}
