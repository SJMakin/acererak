import Dexie, { Table } from 'dexie';
import type { GameState } from '../types';

export interface SavedGame {
  id: string;
  name: string;
  gameState: GameState;
  lastUpdated: string;
  playerCount: number;
  isDM: boolean;
}

export class GameDatabase extends Dexie {
  games!: Table<SavedGame, string>;

  constructor() {
    super('AcerekVTTDatabase');
    
    this.version(1).stores({
      games: 'id, name, lastUpdated, isDM',
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
