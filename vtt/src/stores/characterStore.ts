import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Character } from '../types';
import { saveCharacters, loadCharacters } from '../db/database';

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

  // Bulk operations
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
      const updatedCharacters = state.characters.map((char) =>
        char.id === id ? { ...char, ...updates, updatedAt: now } : char
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
        const updatedCharacters = state.characters.map((char) =>
          char.id === characterId
            ? { ...char, content: JSON.stringify(content), updatedAt: now }
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
  
  if (existing) {
    // Update existing character
    store.updateCharacter(character.id, character);
  } else {
    // Add new character
    store.addCharacter({
      name: character.name,
      content: character.content,
      shadowState: character.shadowState,
      projections: character.projections,
    });
  }
}

// Helper function to handle incoming P2P character deletions
export function handleIncomingCharacterDelete(characterId: string) {
  const store = useCharacterStore.getState();
  const existing = store.getCharacterById(characterId);
  
  if (existing) {
    store.deleteCharacter(characterId);
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
