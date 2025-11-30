/**
 * Simple utility for applying text edits to markdown documents.
 * Uses line-based matching similar to AI file editing tools.
 */

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

interface EditResult {
  text: string;
  found: boolean;
}

/**
 * Applies a text replacement to a document.
 * First tries exact match, then falls back to line-by-line matching with whitespace normalization.
 */
export function findAndReplaceMarkdownText(
  document: string,
  oldText: string,
  newText: string
): EditResult {
  const content = normalizeLineEndings(document);
  const normalizedOld = normalizeLineEndings(oldText);
  const normalizedNew = normalizeLineEndings(newText);

  // Try exact match first
  if (content.includes(normalizedOld)) {
    return {
      text: content.replace(normalizedOld, normalizedNew),
      found: true,
    };
  }

  // Fallback: line-by-line matching with whitespace normalization
  const oldLines = normalizedOld.split('\n');
  const contentLines = content.split('\n');

  for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
    const potentialMatch = contentLines.slice(i, i + oldLines.length);

    const isMatch = oldLines.every(
      (oldLine, j) => oldLine.trim() === potentialMatch[j].trim()
    );

    if (isMatch) {
      // Preserve original indentation of first line
      const originalIndent = contentLines[i].match(/^\s*/)?.[0] || '';
      const newLines = normalizedNew.split('\n').map((line, j) => {
        if (j === 0) return originalIndent + line.trimStart();
        return line;
      });

      contentLines.splice(i, oldLines.length, ...newLines);
      return {
        text: contentLines.join('\n'),
        found: true,
      };
    }
  }

  return { text: document, found: false };
}

/**
 * Checks if text exists in the document (exact or whitespace-normalized match).
 */
export function markdownTextExists(document: string, text: string): boolean {
  const content = normalizeLineEndings(document);
  const normalizedText = normalizeLineEndings(text);

  // Try exact match
  if (content.includes(normalizedText)) {
    return true;
  }

  // Try line-by-line matching
  const textLines = normalizedText.split('\n');
  const documentLines = content.split('\n');

  for (let i = 0; i <= documentLines.length - textLines.length; i++) {
    const potentialMatch = documentLines.slice(i, i + textLines.length);
    const isMatch = textLines.every(
      (line, j) => line.trim() === potentialMatch[j].trim()
    );
    if (isMatch) return true;
  }

  return false;
}
