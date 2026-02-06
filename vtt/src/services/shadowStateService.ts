import type { JSONContent } from '@tiptap/react';

export interface ShadowState {
  stats: Record<string, string | number>;
  projections: {
    bar?: string;
    barMax?: string;
    badge?: string;
  };
}

export interface ParseOptions {
  debounceMs?: number;
}

interface NodeWithAttrs {
  type: string;
  attrs?: {
    key?: string;
    value?: string | number;
    projections?: string[];
    [key: string]: unknown;
  };
  content?: NodeWithAttrs[];
}

/**
 * Recursively find all statDeclaration nodes in the document
 */
function findStatDeclarations(node: NodeWithAttrs): NodeWithAttrs[] {
  const results: NodeWithAttrs[] = [];
  
  if (node.type === 'statDeclaration' && node.attrs) {
    results.push(node);
  }
  
  if (node.content) {
    for (const child of node.content) {
      results.push(...findStatDeclarations(child));
    }
  }
  
  return results;
}

/**
 * Parse a TipTap JSON document and extract all stat declarations
 * Returns shadow state with stats and projection metadata
 */
export function parseShadowState(document: JSONContent): ShadowState {
  const stats: Record<string, string | number> = {};
  const projections: ShadowState['projections'] = {};
  
  // Handle both direct node and wrapped content
  const rootContent = document.content || [document];
  
  for (const node of rootContent) {
    const statNodes = findStatDeclarations(node as NodeWithAttrs);
    
    for (const statNode of statNodes) {
      const { key = '', value = '', projections: nodeProjections = [] } = statNode.attrs || {};
      
      if (key) {
        // Convert value to number if possible
        const parsedValue = typeof value === 'string' ? parseNumber(value) : value;
        stats[key] = parsedValue;
        
        // Track projections
        for (const projection of nodeProjections) {
          if (projection === 'bar') {
            // Use first bar as main HP bar, second could be Max
            if (!projections.bar) {
              projections.bar = key;
            } else if (!projections.barMax && key.toLowerCase().includes('max')) {
              projections.barMax = key;
            }
          } else if (projection === 'badge') {
            if (!projections.badge) {
              projections.badge = key;
            }
          }
        }
      }
    }
  }
  
  return { stats, projections };
}

/**
 * Parse a string value to number if possible
 */
function parseNumber(value: string | number): string | number {
  if (typeof value === 'number') return value;
  
  const trimmed = value.trim();
  
  // Try to parse as integer
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  // Try to parse as float
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  
  // Return original string if not a number
  return value;
}

/**
 * Parse stat declaration text in the format "Key:: Value"
 * Used for initial import/conversion
 */
export function parseStatDeclarationText(text: string): { key: string; value: string; projections: string[] } {
  const result = {
    key: '',
    value: '',
    projections: [] as string[],
  };
  
  // Pattern: "Key:: Value #bar #badge"
  const match = text.match(/^([^:]+)::\s*(.+?)(\s+#\w+)*$/);
  
  if (match) {
    result.key = match[1].trim();
    const valueAndProjections = match[2].trim();
    
    // Extract projection tags
    const projectionMatches = valueAndProjections.matchAll(/#(\w+)/g);
    for (const pm of projectionMatches) {
      const tag = pm[1].toLowerCase();
      if (tag === 'bar' || tag === 'badge') {
        result.projections.push(tag);
      }
    }
    
    // Remove projection tags from value
    result.value = valueAndProjections.replace(/#\w+/g, '').trim();
  }
  
  return result;
}

/**
 * Convert shadow state back to TipTap JSON document format
 * Useful for migration or export
 */
export function shadowStateToJSON(shadowState: ShadowState): JSONContent {
  const content: JSONContent[] = [];
  
  for (const [key, value] of Object.entries(shadowState.stats)) {
    // Check if this key is a projection
    const projections: string[] = [];
    if (shadowState.projections.bar === key) projections.push('bar');
    if (shadowState.projections.barMax === key) projections.push('bar');
    if (shadowState.projections.badge === key) projections.push('badge');
    
    content.push({
      type: 'statDeclaration',
      attrs: {
        key,
        value,
        projections,
      },
    });
    
    // Add paragraph after each stat for spacing
    content.push({
      type: 'paragraph',
    });
  }
  
  return {
    type: 'doc',
    content,
  };
}

// Debounce utility for avoiding excessive updates
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedParse(
  document: JSONContent,
  callback: (result: ShadowState) => void,
  debounceMs: number = 300
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    const result = parseShadowState(document);
    callback(result);
  }, debounceMs);
}

export function cancelDebouncedParse(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
