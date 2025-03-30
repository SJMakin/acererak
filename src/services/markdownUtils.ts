/**
 * Utility functions for handling markdown text matching and replacement
 * with a simplified regex-based approach.
 */

// Debug flag - set to true to enable debug logging
let DEBUG = false;

/**
 * Enables or disables debug logging for markdown text matching
 */
export function setMarkdownDebugMode(enable: boolean): void {
  DEBUG = enable;
  console.log(`Markdown debug mode ${enable ? 'enabled' : 'disabled'}`);
}

/**
 * Normalizes markdown text for comparison by:
 * - Trimming whitespace
 * - Normalizing list markers and headers
 * - Standardizing whitespace
 */
function normalizeMarkdown(text: string): string {
  return text
    .trim()
    // Normalize list markers to have exactly one space after
    .replace(/^(\s*)([*\-+]|(\d+\.))[\s]+/gm, '$1$2 ')
    // Normalize header spacing
    .replace(/^(#+)[\s]+/gm, '$1 ')
    // Normalize multiple spaces to single space (except at line start for indentation)
    .replace(/(?<!^)[ \t]+/gm, ' ');
}

/**
 * Finds and replaces text in a markdown document with tolerance for markdown formatting
 * Returns the updated text if a match was found, or the original text if no match was found
 */
export function findAndReplaceMarkdownText(
  document: string, 
  oldText: string, 
  newText: string,
  documentName: string = "unknown"
): { 
  text: string; 
  found: boolean;
} {
  // Try exact match first for efficiency
  if (document.includes(oldText)) {
    const result = {
      text: document.replace(oldText, newText),
      found: true
    };
    
    if (DEBUG) {
      console.log(JSON.stringify({
        document: documentName,
        oldText,
        newText,
        content: document
      }));
    }
    
    return result;
  }
  
  // Normalize both texts for comparison
  const normalizedDocument = normalizeMarkdown(document);
  const normalizedOldText = normalizeMarkdown(oldText);
  
  // If normalized text doesn't match, try regex pattern matching
  if (!normalizedDocument.includes(normalizedOldText)) {
    // Create regex patterns for common markdown structures
    const oldTextLines = oldText.split('\n');
    const documentLines = document.split('\n');
    
    // Try to find a match line by line
    for (let i = 0; i <= documentLines.length - oldTextLines.length; i++) {
      let allLinesMatch = true;
      
      for (let j = 0; j < oldTextLines.length; j++) {
        const docLine = documentLines[i + j];
        const oldLine = oldTextLines[j];
        
        // Skip empty lines
        if (!docLine.trim() && !oldLine.trim()) continue;
        
        // Check if lines match with markdown awareness
        if (!linesMatch(docLine, oldLine)) {
          allLinesMatch = false;
          break;
        }
      }
      
      if (allLinesMatch) {
        // Found a match, replace the lines
        const beforeLines = documentLines.slice(0, i);
        const afterLines = documentLines.slice(i + oldTextLines.length);
        const newTextLines = newText.split('\n');
        
        const result = {
          text: [...beforeLines, ...newTextLines, ...afterLines].join('\n'),
          found: true
        };
        
        if (DEBUG) {
          console.log(JSON.stringify({
            document: documentName,
            oldText,
            newText,
            content: document
          }));
        }
        
        return result;
      }
    }
    
    return { text: document, found: false };
  }
  
  // Handle normalized match
  const parts = normalizedDocument.split(normalizedOldText);
  let result = document;
  let lastIndex = 0;
  
  // Replace each occurrence
  for (let i = 0; i < parts.length - 1; i++) {
    const beforePart = parts[i];
    const startIndex = normalizedDocument.indexOf(beforePart, lastIndex) + beforePart.length;
    const endIndex = normalizedDocument.indexOf(parts[i + 1], startIndex);
    
    // Find the corresponding indices in the original document
    const originalStartIndex = findOriginalIndex(document, normalizedDocument, startIndex);
    const originalEndIndex = findOriginalIndex(document, normalizedDocument, endIndex);
    
    // Replace the text
    result = result.substring(0, originalStartIndex) + 
             newText + 
             result.substring(originalEndIndex);
    
    // Update lastIndex for next iteration
    lastIndex = endIndex;
  }
  
  if (DEBUG) {
    console.log(JSON.stringify({
      document: documentName,
      oldText,
      newText,
      content: document
    }));
  }
  
  return { text: result, found: true };
}

/**
 * Checks if two lines match with markdown-aware comparison
 */
function linesMatch(line1: string, line2: string): boolean {
  // Check if lines match exactly after normalization
  if (normalizeMarkdown(line1) === normalizeMarkdown(line2)) {
    return true;
  }
  
  // Check list items
  const listRegex = /^(\s*)([*\-+]|(\d+\.))(\s+)(.*)$/;
  const list1 = line1.match(listRegex);
  const list2 = line2.match(listRegex);
  
  if (list1 && list2) {
    // For list items, compare content ignoring marker type and whitespace
    return list1[5].trim() === list2[5].trim();
  }
  
  // Check headers
  const headerRegex = /^(#+)(\s+)(.*)$/;
  const header1 = line1.match(headerRegex);
  const header2 = line2.match(headerRegex);
  
  if (header1 && header2) {
    // For headers, compare level and content
    return header1[1] === header2[1] && header1[3].trim() === header2[3].trim();
  }
  
  return false;
}

/**
 * Maps an index in the normalized text to the corresponding index in the original text
 */
function findOriginalIndex(originalText: string, normalizedText: string, normalizedIndex: number): number {
  let originalIndex = 0;
  let normalizedPos = 0;
  
  while (normalizedPos < normalizedIndex && originalIndex < originalText.length) {
    // Skip characters in original that would be normalized away
    if (isWhitespaceNormalized(originalText, originalIndex, normalizedText, normalizedPos)) {
      originalIndex++;
    } else {
      originalIndex++;
      normalizedPos++;
    }
  }
  
  return originalIndex;
}

/**
 * Determines if a character would be normalized away
 */
function isWhitespaceNormalized(
  originalText: string, 
  originalIndex: number,
  normalizedText: string,
  normalizedIndex: number
): boolean {
  // If we're at the end of either text, it's not normalized
  if (originalIndex >= originalText.length || normalizedIndex >= normalizedText.length) {
    return false;
  }
  
  // If the characters match, it's not normalized
  if (originalText[originalIndex] === normalizedText[normalizedIndex]) {
    return false;
  }
  
  // If the original character is whitespace and the next non-whitespace character
  // matches the current normalized character, then this is normalized whitespace
  if (/\s/.test(originalText[originalIndex])) {
    let nextOriginalIndex = originalIndex + 1;
    while (nextOriginalIndex < originalText.length && /\s/.test(originalText[nextOriginalIndex])) {
      nextOriginalIndex++;
    }
    
    if (nextOriginalIndex < originalText.length && 
        originalText[nextOriginalIndex] === normalizedText[normalizedIndex]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if the text exists in the document with markdown-aware matching
 */
export function markdownTextExists(document: string, text: string): boolean {
  // Try exact match first
  if (document.includes(text)) {
    return true;
  }
  
  // Try normalized match
  const normalizedDocument = normalizeMarkdown(document);
  const normalizedText = normalizeMarkdown(text);
  
  if (normalizedDocument.includes(normalizedText)) {
    return true;
  }
  
  // Try line-by-line matching
  const textLines = text.split('\n');
  const documentLines = document.split('\n');
  
  for (let i = 0; i <= documentLines.length - textLines.length; i++) {
    let allLinesMatch = true;
    
    for (let j = 0; j < textLines.length; j++) {
      if (!linesMatch(documentLines[i + j], textLines[j])) {
        allLinesMatch = false;
        break;
      }
    }
    
    if (allLinesMatch) {
      return true;
    }
  }
  
  return false;
}

/**
 * Dumps the document and search text to the console for debugging
 */
export function dumpSheetAndSearchText(document: string, searchText: string, documentName: string = "unknown"): void {
  if (DEBUG) {
    console.log(JSON.stringify({
      document: documentName,
      searchText,
      content: document
    }));
  }
}
