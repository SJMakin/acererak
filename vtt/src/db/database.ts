import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { GameState, LibraryItem, LibraryItemType } from '../types';

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

// Use factory function pattern instead of class extension to avoid bundling issues
const db = new Dexie('LychgateVTTDatabase') as Dexie & {
  games: Table<SavedGame, string>;
  library: Table<SavedLibraryItem, string>;
};

db.version(1).stores({
  games: 'id, name, lastUpdated, isGM',
});

// Version 2: Add library table
db.version(2).stores({
  games: 'id, name, lastUpdated, isGM',
  library: 'id, type, name, *tags, createdAt, updatedAt',
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
