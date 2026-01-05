import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  saveLibraryItem,
  deleteLibraryItem as dbDeleteLibraryItem,
  getAllLibraryItems,
} from '../db/database';
import type {
  LibraryItem,
  LibraryItemType,
  TokenElement,
  ImageElement,
  SceneExport,
  TokenTemplateData,
  ImageTemplateData,
} from '../types';

interface LibraryStore {
  // State
  items: LibraryItem[];
  isLoading: boolean;
  filter: LibraryItemType | 'all';
  searchQuery: string;

  // Actions - Loading
  loadLibrary: () => Promise<void>;
  
  // Actions - CRUD
  addTokenToLibrary: (token: TokenElement, name?: string, description?: string, tags?: string[]) => Promise<string>;
  addMapToLibrary: (image: ImageElement, name?: string, description?: string, tags?: string[]) => Promise<string>;
  addSceneToLibrary: (scene: SceneExport, name: string, description?: string, tags?: string[]) => Promise<string>;
  updateLibraryItem: (id: string, updates: Partial<Omit<LibraryItem, 'id' | 'type' | 'data'>>) => Promise<void>;
  deleteLibraryItem: (id: string) => Promise<void>;
  
  // Actions - Filtering
  setFilter: (filter: LibraryItemType | 'all') => void;
  setSearchQuery: (query: string) => void;
  
  // Selectors
  getFilteredItems: () => LibraryItem[];
  getTokenTemplates: () => LibraryItem[];
  getMapTemplates: () => LibraryItem[];
  getSceneTemplates: () => LibraryItem[];
}

// Default token templates
const DEFAULT_TOKEN_TEMPLATES: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'token',
    name: 'Goblin',
    description: 'A small, green-skinned creature',
    tags: ['monster', 'humanoid', 'cr1/4'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Goblin',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 7, max: 7 },
      ac: 15,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Orc',
    description: 'A brutish, grey-skinned humanoid',
    tags: ['monster', 'humanoid', 'cr1/2'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Orc',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 15, max: 15 },
      ac: 13,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Skeleton',
    description: 'An animated undead corpse',
    tags: ['monster', 'undead', 'cr1/4'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Skeleton',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 13, max: 13 },
      ac: 13,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Zombie',
    description: 'A shambling undead corpse',
    tags: ['monster', 'undead', 'cr1/4'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Zombie',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 22, max: 22 },
      ac: 8,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Bandit',
    description: 'A common thug or brigand',
    tags: ['npc', 'humanoid', 'cr1/8'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Bandit',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 11, max: 11 },
      ac: 12,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Guard',
    description: 'A city guard or soldier',
    tags: ['npc', 'humanoid', 'cr1/8'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Guard',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 11, max: 11 },
      ac: 16,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Wolf',
    description: 'A wild canine predator',
    tags: ['beast', 'cr1/4'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Wolf',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 11, max: 11 },
      ac: 13,
      conditions: [],
    } as TokenTemplateData,
  },
  {
    type: 'token',
    name: 'Giant Spider',
    description: 'A horse-sized arachnid',
    tags: ['beast', 'cr1'],
    data: {
      type: 'token',
      layer: 'token',
      name: 'Giant Spider',
      imageUrl: '',
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      visibleTo: 'all',
      locked: false,
      zIndex: 0,
      hp: { current: 26, max: 26 },
      ac: 14,
      conditions: [],
    } as TokenTemplateData,
  },
];

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  // Initial state
  items: [],
  isLoading: false,
  filter: 'all',
  searchQuery: '',

  // Load library from IndexedDB
  loadLibrary: async () => {
    set({ isLoading: true });
    try {
      let items = await getAllLibraryItems();
      
      // If library is empty, initialize with default templates
      if (items.length === 0) {
        const now = new Date().toISOString();
        const defaultItems: LibraryItem[] = DEFAULT_TOKEN_TEMPLATES.map(template => ({
          ...template,
          id: nanoid(10),
          createdAt: now,
          updatedAt: now,
        }));
        
        // Save defaults to DB
        for (const item of defaultItems) {
          await saveLibraryItem(item);
        }
        
        items = defaultItems;
      }
      
      set({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load library:', error);
      set({ isLoading: false });
    }
  },

  // Add a token to the library
  addTokenToLibrary: async (token, name, description, tags = []) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    
    // Strip id from token data (template doesn't have id until placed)
    const { id: _tokenId, ...tokenWithoutId } = token;
    const tokenData: TokenTemplateData = {
      ...tokenWithoutId,
      x: 0,
      y: 0,
      zIndex: 0,
    };
    
    const item: LibraryItem = {
      id,
      type: 'token',
      name: name || token.name,
      description,
      tags,
      createdAt: now,
      updatedAt: now,
      data: tokenData,
    };
    
    await saveLibraryItem(item);
    set(state => ({ items: [...state.items, item] }));
    
    return id;
  },

  // Add a map image to the library
  addMapToLibrary: async (image, name, description, tags = []) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    
    // Strip id from image data
    const { id: _imageId, ...imageWithoutId } = image;
    const imageData: ImageTemplateData = {
      ...imageWithoutId,
      x: 0,
      y: 0,
      zIndex: 0,
    };
    
    const item: LibraryItem = {
      id,
      type: 'map',
      name: name || 'Unnamed Map',
      description,
      tags,
      createdAt: now,
      updatedAt: now,
      data: imageData,
    };
    
    await saveLibraryItem(item);
    set(state => ({ items: [...state.items, item] }));
    
    return id;
  },

  // Add a scene to the library
  addSceneToLibrary: async (scene, name, description, tags = []) => {
    const id = nanoid(10);
    const now = new Date().toISOString();
    
    const item: LibraryItem = {
      id,
      type: 'scene',
      name,
      description,
      tags,
      createdAt: now,
      updatedAt: now,
      data: scene,
    };
    
    await saveLibraryItem(item);
    set(state => ({ items: [...state.items, item] }));
    
    return id;
  },

  // Update library item metadata
  updateLibraryItem: async (id, updates) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;
    
    const updatedItem: LibraryItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await saveLibraryItem(updatedItem);
    set(state => ({
      items: state.items.map(i => i.id === id ? updatedItem : i),
    }));
  },

  // Delete library item
  deleteLibraryItem: async (id) => {
    await dbDeleteLibraryItem(id);
    set(state => ({
      items: state.items.filter(i => i.id !== id),
    }));
  },

  // Set type filter
  setFilter: (filter) => {
    set({ filter });
  },

  // Set search query
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Get filtered items based on current filter and search
  getFilteredItems: () => {
    const { items, filter, searchQuery } = get();
    
    let filtered = items;
    
    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.type === filter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  },

  // Get token templates only
  getTokenTemplates: () => {
    return get().items.filter(item => item.type === 'token');
  },

  // Get map templates only
  getMapTemplates: () => {
    return get().items.filter(item => item.type === 'map');
  },

  // Get scene templates only
  getSceneTemplates: () => {
    return get().items.filter(item => item.type === 'scene');
  },
}));
