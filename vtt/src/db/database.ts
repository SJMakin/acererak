import Dexie, { Table } from 'dexie';
import type { GameState, LibraryItem, LibraryItemType } from '../types';

export interface SavedGame {
  id: string;
  name: string;
  gameState: GameState;
  lastUpdated: string;
  playerCount: number;
  isDM: boolean;
}

export interface SavedLibraryItem extends LibraryItem {
  // Additional DB-specific fields if needed
}

export class GameDatabase extends Dexie {
  games!: Table<SavedGame, string>;
  library!: Table<SavedLibraryItem, string>;

  constructor() {
    super('AcerekVTTDatabase');
    
    this.version(1).stores({
      games: 'id, name, lastUpdated, isDM',
    });
    
    // Version 2: Add library table
    this.version(2).stores({
      games: 'id, name, lastUpdated, isDM',
      library: 'id, type, name, *tags, createdAt, updatedAt',
    });
  }
}

export const db = new GameDatabase();

// Database operations
export async function saveGame(game: GameState, isDM: boolean): Promise<void> {
  const playerCount = Object.keys(game.players).length;
  
  await db.games.put({
    id: game.id,
    name: game.name,
    gameState: game,
    lastUpdated: game.updatedAt,
    playerCount,
    isDM,
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

export async function getDMGames(): Promise<SavedGame[]> {
  return db.games
    .where('isDM')
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
