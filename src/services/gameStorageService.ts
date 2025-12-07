/**
 * Game Storage Service
 *
 * Handles file-based save/load for games and localStorage for settings only.
 * Games are kept in memory during session and exported/imported as JSON files.
 */

import type {
  SavedGame,
  ChatMessage,
  SelectedTheme,
  ImageSettings,
  DisplaySettings,
} from '../types';

// ============================================================================
// STORAGE KEYS (for settings only, not game data)
// ============================================================================

const STORAGE_KEYS = {
  IMAGE_SETTINGS: 'acererak:imageSettings',
  DISPLAY_SETTINGS: 'acererak:displaySettings',
} as const;

// ============================================================================
// FILE FORMAT VERSION
// ============================================================================

const SAVE_FILE_VERSION = 1;

export interface SaveFileFormat {
  version: number;
  exportedAt: string;
  game: SavedGame;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  generateStoryImages: true,
  generateChoiceImages: false,
};

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showCostTracking: true,
  showLlmCallInfo: true,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Revives Date objects from JSON strings during parsing.
 * Matches ISO 8601 date strings and converts them back to Date objects.
 */
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    // Match ISO 8601 date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    if (dateRegex.test(value)) {
      return new Date(value);
    }
  }
  return value;
}

/**
 * Safely parse JSON with date revival.
 */
function parseJSON<T>(json: string): T | null {
  try {
    return JSON.parse(json, dateReviver) as T;
  } catch (error) {
    console.error('Failed to parse JSON from storage:', error);
    return null;
  }
}

/**
 * Safely stringify to JSON.
 */
function stringifyJSON<T>(value: T): string {
  return JSON.stringify(value);
}

/**
 * Generate a unique ID for new games.
 */
function generateId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// FILE EXPORT/IMPORT
// ============================================================================

/**
 * Export a game to a JSON file download.
 */
export function exportGameToFile(game: SavedGame): void {
  const saveFile: SaveFileFormat = {
    version: SAVE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    game: {
      ...game,
      updatedAt: new Date(),
    },
  };

  const json = JSON.stringify(saveFile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(game.name)}.acererak.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import a game from a JSON file.
 * Returns a promise that resolves with the loaded game.
 */
export function importGameFromFile(): Promise<SavedGame> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.acererak.json';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const parsed = parseJSON<SaveFileFormat>(text);

        if (!parsed) {
          reject(new Error('Invalid JSON file'));
          return;
        }

        // Handle versioning for future compatibility
        if (parsed.version !== SAVE_FILE_VERSION) {
          console.warn(`Save file version ${parsed.version} differs from current ${SAVE_FILE_VERSION}`);
          // Future: add migration logic here
        }

        if (!parsed.game || !parsed.game.id) {
          reject(new Error('Invalid save file format'));
          return;
        }

        // Generate new ID to avoid conflicts
        const importedGame: SavedGame = {
          ...parsed.game,
          id: generateId(),
          updatedAt: new Date(),
        };

        resolve(importedGame);
      } catch (error) {
        reject(new Error('Failed to parse save file'));
      }
    };

    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };

    input.click();
  });
}

/**
 * Sanitize a string for use as a filename.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
}

// ============================================================================
// GAME CREATION & BRANCHING
// ============================================================================

/**
 * Generate a game name from themes.
 * Combines theme values into a descriptive name like "Desert Revenge" or "Haunted Tower".
 */
export function generateGameName(themes: SelectedTheme[]): string {
  if (themes.length === 0) {
    return `Adventure ${new Date().toLocaleDateString()}`;
  }

  // Take first 2-3 themes and combine their values
  const themeWords = themes
    .slice(0, 3)
    .map((t) => t.theme)
    .filter((t) => t && t.length > 0);

  if (themeWords.length === 0) {
    return `Adventure ${new Date().toLocaleDateString()}`;
  }

  // Capitalize first letter of each word
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return themeWords.map(capitalize).join(' ');
}

/**
 * Create a new saved game.
 * Note: This creates a game object in memory - it's not persisted until exported.
 */
export function createGame(
  characterSheet: string,
  storyPlan: string,
  themes: SelectedTheme[],
  initialMessages: ChatMessage[] = []
): SavedGame {
  const now = new Date();
  const game: SavedGame = {
    id: generateId(),
    name: generateGameName(themes),
    createdAt: now,
    updatedAt: now,
    characterSheet,
    storyPlan,
    themes,
    messages: initialMessages,
    totalCost: 0,
    totalTokens: 0,
    llmCallCount: 0,
  };

  return game;
}

/**
 * Create a branch from an existing game at a specific message index.
 * Copies messages up to (but not including) the specified index.
 * Sets parentGameId and branchFromMessageIndex for tracking.
 * Note: This now returns a new game object without saving to storage.
 */
export function createBranch(
  sourceGame: SavedGame,
  fromMessageIndex: number,
  branchNumber: number = 1
): SavedGame {
  const now = new Date();
  const branchedMessages = sourceGame.messages.slice(0, fromMessageIndex);

  // Calculate cost/tokens up to this point
  let totalCost = 0;
  let totalTokens = 0;
  let llmCallCount = 0;

  for (const msg of branchedMessages) {
    if (msg.type === 'story' && msg.llmCall) {
      totalCost += msg.llmCall.estimatedCost;
      totalTokens += msg.llmCall.totalTokens;
      llmCallCount++;
    }
  }

  const branch: SavedGame = {
    id: generateId(),
    name: `${sourceGame.name} - Branch ${branchNumber}`,
    createdAt: now,
    updatedAt: now,
    characterSheet: sourceGame.characterSheet,
    storyPlan: sourceGame.storyPlan,
    themes: [...sourceGame.themes],
    messages: branchedMessages,
    parentGameId: sourceGame.id,
    branchFromMessageIndex: fromMessageIndex,
    totalCost,
    totalTokens,
    llmCallCount,
  };

  return branch;
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Get image generation settings.
 */
export function getImageSettings(): ImageSettings {
  const json = localStorage.getItem(STORAGE_KEYS.IMAGE_SETTINGS);
  if (!json) {
    return { ...DEFAULT_IMAGE_SETTINGS };
  }

  const settings = parseJSON<ImageSettings>(json);
  return settings ?? { ...DEFAULT_IMAGE_SETTINGS };
}

/**
 * Save image generation settings.
 */
export function setImageSettings(settings: ImageSettings): void {
  localStorage.setItem(STORAGE_KEYS.IMAGE_SETTINGS, stringifyJSON(settings));
}

/**
 * Get display settings.
 */
export function getDisplaySettings(): DisplaySettings {
  const json = localStorage.getItem(STORAGE_KEYS.DISPLAY_SETTINGS);
  if (!json) {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }

  const settings = parseJSON<DisplaySettings>(json);
  return settings ?? { ...DEFAULT_DISPLAY_SETTINGS };
}

/**
 * Save display settings.
 */
export function setDisplaySettings(settings: DisplaySettings): void {
  localStorage.setItem(STORAGE_KEYS.DISPLAY_SETTINGS, stringifyJSON(settings));
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const gameStorageService = {
  // File operations
  exportGameToFile,
  importGameFromFile,

  // Creation & branching
  generateGameName,
  createGame,
  createBranch,

  // Settings
  getImageSettings,
  setImageSettings,
  getDisplaySettings,
  setDisplaySettings,
};

export default gameStorageService;