import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { GameState, LibraryItem, LibraryItemType, Character } from '../types';
import type { Snippet } from '../types/snippet';
import type { AIImage } from '../types/ai';

export interface SavedAIImage extends AIImage {
  // Additional DB-specific fields if needed
}

export interface SavedEmbeddedImage {
  id: string;           // SHA-256 hex of the WebP blob
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
  source: 'upload' | 'ai' | 'p2p';
  prompt?: string;
}

export interface SavedGame {
  id: string;
  name: string;
  gameState: GameState;
  lastUpdated: string;
  playerCount: number;
  isGM: boolean;
}

export interface SavedLibraryItem extends LibraryItem {
  // Additional DB-specific fields if needed
}

export interface SavedCharacter extends Character {
  // Additional DB-specific fields if needed
}

export interface SavedSnippet extends Snippet {
  // Additional DB-specific fields if needed
}

// Use factory function pattern instead of class extension to avoid bundling issues
const db = new Dexie('LychgateVTTDatabase') as Dexie & {
  games: Table<SavedGame, string>;
  library: Table<SavedLibraryItem, string>;
  characters: Table<SavedCharacter, string>;
  snippets: Table<SavedSnippet, string>;
  aiImages: Table<SavedAIImage, string>;
  images: Table<SavedEmbeddedImage, string>;
};

db.version(1).stores({
  games: 'id, name, lastUpdated, isGM',
  library: 'id, type, name, *tags, createdAt, updatedAt',
  characters: 'id, name, createdAt, updatedAt',
  snippets: 'id, name, category, *tags, createdAt, updatedAt',
  aiImages: 'id, imageId, modelId, createdAt',
  images: 'id, createdAt, source, sizeBytes',
});

export { db };

// Database operations
export async function saveGame(game: GameState, isGM: boolean): Promise<void> {
  const playerCount = Object.keys(game.players).length;

  await db.games.put({
    id: game.id,
    name: game.name,
    gameState: game,
    lastUpdated: game.updatedAt,
    playerCount,
    isGM,
  });
}

export async function loadGame(id: string): Promise<GameState | undefined> {
  const saved = await db.games.get(id);
  return saved?.gameState;
}

export async function deleteGame(id: string): Promise<void> {
  await db.games.delete(id);
}

export async function getRecentGames(limit = 10): Promise<SavedGame[]> {
  return db.games
    .orderBy('lastUpdated')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getGMGames(): Promise<SavedGame[]> {
  return db.games
    .where('isGM')
    .equals(1)
    .reverse()
    .sortBy('lastUpdated');
}

// Library operations
export async function saveLibraryItem(item: SavedLibraryItem): Promise<void> {
  await db.library.put(item);
}

export async function getLibraryItem(id: string): Promise<SavedLibraryItem | undefined> {
  return db.library.get(id);
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await db.library.delete(id);
}

export async function getAllLibraryItems(): Promise<SavedLibraryItem[]> {
  return db.library.toArray();
}

export async function getLibraryItemsByType(type: LibraryItemType): Promise<SavedLibraryItem[]> {
  return db.library.where('type').equals(type).toArray();
}

export async function getLibraryItemsByTag(tag: string): Promise<SavedLibraryItem[]> {
  return db.library.where('tags').equals(tag).toArray();
}

export async function searchLibraryItems(query: string): Promise<SavedLibraryItem[]> {
  const lowerQuery = query.toLowerCase();
  return db.library.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.description?.toLowerCase().includes(lowerQuery) ||
    item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  ).toArray();
}

// Character operations
export async function saveCharacters(characters: Character[]): Promise<void> {
  // Clear existing and bulk add for simplicity
  await db.characters.clear();
  await db.characters.bulkPut(characters as SavedCharacter[]);
}

export async function loadCharacters(): Promise<Character[]> {
  return db.characters.toArray() as Promise<Character[]>;
}

export async function saveCharacter(character: Character): Promise<void> {
  await db.characters.put(character as SavedCharacter);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return db.characters.get(id) as Promise<Character | undefined>;
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.characters.delete(id);
}

// Snippet operations (GM only)
export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await db.snippets.clear();
  await db.snippets.bulkPut(snippets as SavedSnippet[]);
}

export async function loadSnippets(): Promise<Snippet[]> {
  return db.snippets.toArray() as Promise<Snippet[]>;
}

export async function addSnippet(snippet: Snippet): Promise<void> {
  await db.snippets.put(snippet as SavedSnippet);
}

export async function updateSnippet(snippet: Snippet): Promise<void> {
  await db.snippets.put(snippet as SavedSnippet);
}

export async function deleteSnippet(id: string): Promise<void> {
  await db.snippets.delete(id);
}

export async function getSnippet(id: string): Promise<Snippet | undefined> {
  return db.snippets.get(id) as Promise<Snippet | undefined>;
}

export async function searchSnippets(query: string): Promise<Snippet[]> {
  const lowerQuery = query.toLowerCase();
  const results: Snippet[] = [];
  await db.snippets.each((snippet) => {
    if (snippet.name.toLowerCase().includes(lowerQuery) ||
        (snippet.description && snippet.description.toLowerCase().includes(lowerQuery)) ||
        (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))) {
      results.push(snippet);
    }
  });
  return results;
}

// AI Image operations
export async function saveAIImage(image: SavedAIImage): Promise<void> {
  await db.aiImages.put(image);
}

export async function getAIImage(id: string): Promise<SavedAIImage | undefined> {
  return db.aiImages.get(id);
}

export async function deleteAIImage(id: string): Promise<void> {
  await db.aiImages.delete(id);
}

export async function getRecentAIImages(limit = 20): Promise<SavedAIImage[]> {
  return db.aiImages
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function deleteOldAIImages(olderThan: string): Promise<number> {
  const old = await db.aiImages
    .where('createdAt')
    .below(olderThan)
    .toArray();
  const ids = old.map(img => img.id);
  await db.aiImages.bulkDelete(ids);
  return ids.length;
}
