// Token migration service for converting old tokens to Sheets

import { useSheetStore } from '../stores/sheetStore';

interface LegacyTokenData {
  id: string;
  name: string;
  notes?: string; // Legacy HTML notes field
  hp?: string | number;
  ac?: string | number;
  conditions?: string[];
  imageUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface MigrationResult {
  success: boolean;
  sheetId?: string;
  error?: string;
}

/**
 * Migrate a legacy token to a Sheet
 */
export async function migrateTokenToSheet(
  tokenData: LegacyTokenData,
  options: {
    keepHpOnToken?: boolean;
    keepAcOnToken?: boolean;
    keepConditionsOnToken?: boolean;
  } = {}
): Promise<MigrationResult> {
  const { addSheet } = useSheetStore.getState();
  
  try {
    // Convert legacy notes HTML to TipTap JSON
    const content = convertHtmlToTipTap(tokenData.notes || '');
    
    // Create the sheet
    const sheetId = addSheet({
      name: tokenData.name,
      content,
      shadowState: {},
      projections: {
        bar: options.keepHpOnToken ? 'HP' : undefined,
        barMax: options.keepHpOnToken ? 'MaxHP' : undefined,
        badge: options.keepAcOnToken ? 'AC' : undefined,
      },
    });

    return {
      success: true,
      sheetId,
    };
  } catch (error) {
    console.error('Failed to migrate token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert legacy HTML notes to TipTap JSON document
 */
function convertHtmlToTipTap(html: string): string {
  if (!html) {
    return JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  }

  const plainText = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/gi, '')
    .trim();

  if (!plainText) {
    return JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  }

  const paragraphs = plainText.split('\n\n').filter(Boolean);
  const content = paragraphs.map((text) => ({
    type: 'paragraph' as const,
    content: [{ type: 'text' as const, text: text.trim() }],
  }));

  return JSON.stringify({
    type: 'doc',
    content,
  });
}

/**
 * Batch migrate multiple tokens
 */
export async function migrateTokensToSheets(
  tokens: LegacyTokenData[],
  options: {
    keepHpOnToken?: boolean;
    keepAcOnToken?: boolean;
    keepConditionsOnToken?: boolean;
  } = {}
): Promise<{
  migrated: number;
  failed: number;
  results: MigrationResult[];
}> {
  const results: MigrationResult[] = [];
  let migrated = 0;
  let failed = 0;

  for (const token of tokens) {
    const result = await migrateTokenToSheet(token, options);
    results.push(result);
    
    if (result.success) {
      migrated++;
    } else {
      failed++;
    }
  }

  return { migrated, failed, results };
}

/**
 * Check if a game needs migration
 */
export function checkGameNeedsMigration(gameData: {
  elements?: Array<{
    type: string;
    notes?: string;
    hp?: string | number;
    ac?: string | number;
  }>;
}): {
  needsMigration: boolean;
  tokenCount: number;
} {
  const tokens = gameData.elements?.filter(
    (el) => el.type === 'token' && (el.notes || el.hp || el.ac)
  ) || [];
  
  return {
    needsMigration: tokens.length > 0,
    tokenCount: tokens.length,
  };
}
