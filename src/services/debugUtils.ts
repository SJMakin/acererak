/**
 * Utility functions for debugging
 */
import { setMarkdownDebugMode } from './markdownUtils';

// Make debug utilities available globally for console access
declare global {
  interface Window {
    debugUtils: {
      enableDebug: (mode: string | string[]) => void;
      disableDebug: (mode: string | string[]) => void;
    };
  }
}

/**
 * Debug modes that can be enabled
 */
export enum DebugMode {
  MARKDOWN = 'markdown',
  CHARACTER_UPDATES = 'character-updates',
  COMBAT_UPDATE = 'combat-update',
  ALL = 'all',
}

/**
 * Enables or disables debug mode for specific features
 * @param mode The debug mode to enable/disable
 * @param enable Whether to enable or disable the mode
 */
export function setDebugMode(
  mode: DebugMode | DebugMode[],
  enable: boolean
): void {
  const modes = Array.isArray(mode) ? mode : [mode];

  if (modes.includes(DebugMode.MARKDOWN) || modes.includes(DebugMode.ALL)) {
    setMarkdownDebugMode(enable);
  }

  // Add more debug modes here as needed
  // Note: COMBAT_UPDATE and CHARACTER_UPDATES don't need special initialization,
  // they just control whether debugLog messages with those categories are logged

  console.log(
    `Debug mode ${enable ? 'enabled' : 'disabled'} for: ${modes.join(', ')}`
  );
}

/**
 * Utility function to log debug information with a consistent format
 * @param category The category of the debug message
 * @param message The debug message
 * @param data Additional data to log
 */
export function debugLog(category: string, message: string, data?: any): void {
  console.log(`[DEBUG:${category}] ${message}`, data !== undefined ? data : '');
}

/**
 * Initialize debug utilities for global access in the browser console
 * This allows developers to enable debug mode by running:
 * window.debugUtils.enableDebug('markdown')
 */
export function initDebugUtils(): void {
  if (typeof window !== 'undefined') {
    window.debugUtils = {
      enableDebug: (mode: string | string[]) => {
        const modes = Array.isArray(mode) ? mode : [mode];
        const debugModes = modes
          .map(m => {
            // Convert string to enum
            switch (m.toLowerCase()) {
              case 'markdown':
                return DebugMode.MARKDOWN;
              case 'character-updates':
                return DebugMode.CHARACTER_UPDATES;
              case 'combat-update':
                return DebugMode.COMBAT_UPDATE;
              case 'all':
                return DebugMode.ALL;
              default:
                console.warn(`Unknown debug mode: ${m}`);
                return null;
            }
          })
          .filter(m => m !== null) as DebugMode[];

        if (debugModes.length > 0) {
          setDebugMode(debugModes, true);
        }
      },
      disableDebug: (mode: string | string[]) => {
        const modes = Array.isArray(mode) ? mode : [mode];
        const debugModes = modes
          .map(m => {
            // Convert string to enum
            switch (m.toLowerCase()) {
              case 'markdown':
                return DebugMode.MARKDOWN;
              case 'character-updates':
                return DebugMode.CHARACTER_UPDATES;
              case 'combat-update':
                return DebugMode.COMBAT_UPDATE;
              case 'all':
                return DebugMode.ALL;
              default:
                console.warn(`Unknown debug mode: ${m}`);
                return null;
            }
          })
          .filter(m => m !== null) as DebugMode[];

        if (debugModes.length > 0) {
          setDebugMode(debugModes, false);
        }
      },
    };

    console.log(
      'Debug utilities initialized. Use window.debugUtils.enableDebug() to enable debug mode.'
    );
  }
}
