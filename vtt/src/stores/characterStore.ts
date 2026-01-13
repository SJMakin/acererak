import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Character } from '../types';
import { saveCharacters, loadCharacters } from '../db/database';

interface CharacterStore {
  characters: Character[];
  isLoading: boolean;
  isGM: boolean;

  // CRUD operations
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;

  // Queries
  getCharacterById: (id: string) => Character | undefined;

  // Bulk operations
  setCharacters: (characters: Character[]) => void;
  loadFromDB: () => Promise<void>;

  // Sync with game state
  syncToGameState: () => Character[];
}

const CHARACTERS_STORAGE_KEY = 'vtt-characters';

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
}));

// Helper function to set GM mode (called from game initialization)
export function setCharacterStoreGM(isGM: boolean) {
  useCharacterStore.setState({ isGM });
  if (isGM) {
    // Load from IndexedDB when becoming GM
    useCharacterStore.getState().loadFromDB();
  }
}
