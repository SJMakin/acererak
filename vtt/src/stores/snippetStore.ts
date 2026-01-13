import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Snippet, SnippetCategory, SnippetCreateInput, SnippetUpdateInput } from '../types/snippet';
import { 
  saveSnippets, 
  loadSnippets, 
  addSnippet as dbAddSnippet, 
  updateSnippet as dbUpdateSnippet,
  deleteSnippet as dbDeleteSnippet 
} from '../db/database';

interface SnippetStore {
  snippets: Snippet[];
  isLoading: boolean;
  isGM: boolean;

  // CRUD operations
  addSnippet: (input: SnippetCreateInput) => string;
  updateSnippet: (id: string, updates: SnippetUpdateInput) => void;
  deleteSnippet: (id: string) => void;

  // Queries
  getSnippetById: (id: string) => Snippet | undefined;
  getSnippetByName: (name: string) => Snippet | undefined;
  getSnippetsByCategory: (category: SnippetCategory) => Snippet[];
  getAllSnippets: () => Snippet[];

  // Search
  searchSnippets: (query: string) => Snippet[];

  // Bulk operations
  setSnippets: (snippets: Snippet[]) => void;
  loadFromDB: () => Promise<void>;

  // P2P sync setup
  setP2PHandlers: (onUpdate: (snippet: Snippet) => void, onDelete: (snippetId: string) => void) => void;
  
  // P2P handlers
  onP2PUpdate?: (snippet: Snippet) => void;
  onP2PDelete?: (snippetId: string) => void;
}

export const useSnippetStore = create<SnippetStore>((set, get) => ({
  snippets: [],
  isLoading: false,
  isGM: false,

  addSnippet: (input) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    const snippet: Snippet = {
      id,
      ...input,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newSnippets = [...state.snippets, snippet];
      // Persist to IndexedDB if GM
      if (state.isGM) {
        dbAddSnippet(snippet).catch((err) => {
          console.error('Failed to save snippet:', err);
        });
      }
      return { snippets: newSnippets };
    });

    // Broadcast to P2P peers
    const { onP2PUpdate } = get();
    if (onP2PUpdate) {
      onP2PUpdate(snippet);
    }

    return id;
  },

  updateSnippet: (id, updates) => {
    set((state) => {
      const now = new Date().toISOString();
      const updatedSnippets = state.snippets.map((snippet) =>
        snippet.id === id ? { ...snippet, ...updates, updatedAt: now } : snippet
      );

      // Persist to IndexedDB if GM
      if (state.isGM) {
        const updatedSnippet = updatedSnippets.find((s) => s.id === id);
        if (updatedSnippet) {
          dbUpdateSnippet(updatedSnippet).catch((err) => {
            console.error('Failed to update snippet:', err);
          });
        }
      }

      return { snippets: updatedSnippets };
    });

    // Broadcast to P2P peers
    const { onP2PUpdate, snippets } = get();
    const updatedSnippet = snippets.find((s) => s.id === id);
    if (onP2PUpdate && updatedSnippet) {
      onP2PUpdate(updatedSnippet);
    }
  },

  deleteSnippet: (id) => {
    set((state) => {
      const filteredSnippets = state.snippets.filter((snippet) => snippet.id !== id);

      // Persist to IndexedDB if GM
      if (state.isGM) {
        dbDeleteSnippet(id).catch((err) => {
          console.error('Failed to delete snippet:', err);
        });
      }

      return { snippets: filteredSnippets };
    });

    // Broadcast to P2P peers
    const { onP2PDelete } = get();
    if (onP2PDelete) {
      onP2PDelete(id);
    }
  },

  getSnippetById: (id) => {
    return get().snippets.find((snippet) => snippet.id === id);
  },

  getSnippetByName: (name) => {
    return get().snippets.find((snippet) => snippet.name === name);
  },

  getSnippetsByCategory: (category) => {
    return get().snippets.filter((snippet) => snippet.category === category);
  },

  getAllSnippets: () => {
    return get().snippets;
  },

  searchSnippets: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().snippets.filter(
      (snippet) =>
        snippet.name.toLowerCase().includes(lowerQuery) ||
        snippet.description?.toLowerCase().includes(lowerQuery) ||
        snippet.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  setSnippets: (snippets) => {
    set({ snippets });
  },

  loadFromDB: async () => {
    set({ isLoading: true });
    try {
      const snippets = await loadSnippets();
      // Add default snippets if none exist
      if (snippets.length === 0) {
        const defaultSnippets = getDefaultSnippets();
        set({ snippets: defaultSnippets });
        if (get().isGM) {
          await saveSnippets(defaultSnippets);
        }
      } else {
        set({ snippets });
      }
    } catch (err) {
      console.error('Failed to load snippets from DB:', err);
      // Load default snippets on error
      const defaultSnippets = getDefaultSnippets();
      set({ snippets: defaultSnippets });
    } finally {
      set({ isLoading: false });
    }
  },

  setP2PHandlers: (onUpdate, onDelete) => {
    set({ onP2PUpdate: onUpdate, onP2PDelete: onDelete });
  },
}));

// Default snippets for D&D 5e
function getDefaultSnippets(): Snippet[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: 'snippet-fireball',
      name: 'Fireball',
      category: 'spell',
      description: 'A bright streak flashes from your pointing finger to a point you choose',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Fireball' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '3rd-level evocation' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'A bright streak flashes from your pointing finger to a point you choose within range then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes ' },
              { type: 'text', marks: [{ type: 'bold' }], text: '8d6 fire damage' },
              { type: 'text', text: ' on a failed save, or half as much damage on a successful one.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'At Higher Levels. ' },
              { type: 'text', text: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.' },
            ],
          },
        ],
      }),
      tags: ['evocation', 'damage', 'area'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'snippet-cure-wounds',
      name: 'Cure Wounds',
      category: 'spell',
      description: 'A creature you touch regains a number of hit points',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Cure Wounds' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '1st-level evocation' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'A creature you touch regains a number of hit points equal to ' },
              { type: 'text', marks: [{ type: 'bold' }], text: '1d8 + your spellcasting ability modifier' },
              { type: 'text', text: '. This spell has no effect on undead or constructs.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'At Higher Levels. ' },
              { type: 'text', text: 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.' },
            ],
          },
        ],
      }),
      tags: ['evocation', 'healing'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'snippet-sneak-attack',
      name: 'Sneak Attack',
      category: 'ability',
      description: 'Once per turn, deal extra damage when you have advantage',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Sneak Attack' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Beginning at 1st level, you know how to strike subtly and exploit a foe\'s distraction. Once per turn, you can deal an extra ' },
              { type: 'text', marks: [{ type: 'bold' }], text: '1d6 damage' },
              { type: 'text', text: ' to one creature you hit with an attack roll if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'The extra damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6).' },
            ],
          },
        ],
      }),
      tags: ['rogue', 'damage', 'once-per-turn'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'snippet-second-wind',
      name: 'Second Wind',
      category: 'ability',
      description: 'On your turn, regain hit points as a bonus action',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Second Wind' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain ' },
              { type: 'text', marks: [{ type: 'bold' }], text: '1d10 + your Fighter level' },
              { type: 'text', text: ' hit points.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Once you use this feature, you must finish a short or long rest before you can use it again.' },
            ],
          },
        ],
      }),
      tags: ['fighter', 'healing', 'bonus-action', 'short-rest'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'snippet-opportunity-attack',
      name: 'Opportunity Attack',
      category: 'rule',
      description: 'When a creature moves away, you can strike them',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Opportunity Attack' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'You can make an opportunity attack when a hostile creature that you can see moves out of your reach. To make the opportunity attack, you use your reaction to make one melee attack against the threatening creature. The attack occurs right before the creature leaves your reach.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'You can avoid provoking opportunity attacks by taking the ' },
              { type: 'text', marks: [{ type: 'italic' }], text: 'Disengage' },
              { type: 'text', text: ' action.' },
            ],
          },
        ],
      }),
      tags: ['combat', 'reaction', 'melee'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// Helper function to handle incoming P2P snippet updates
export function handleIncomingSnippetUpdate(snippet: Snippet) {
  const store = useSnippetStore.getState();
  const existing = store.getSnippetById(snippet.id);
  
  if (existing) {
    store.updateSnippet(snippet.id, snippet);
  } else {
    store.addSnippet({
      name: snippet.name,
      content: snippet.content,
      category: snippet.category,
      description: snippet.description,
      tags: snippet.tags,
    });
  }
}

// Helper function to handle incoming P2P snippet deletions
export function handleIncomingSnippetDelete(snippetId: string) {
  const store = useSnippetStore.getState();
  const existing = store.getSnippetById(snippetId);
  
  if (existing) {
    store.deleteSnippet(snippetId);
  }
}

// Helper function to set GM mode (called from game initialization)
export function setSnippetStoreGM(isGM: boolean) {
  useSnippetStore.setState({ isGM });
  if (isGM) {
    useSnippetStore.getState().loadFromDB();
  }
}
