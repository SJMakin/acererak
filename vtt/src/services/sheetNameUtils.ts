export const BLANK_SHEET_CONTENT = JSON.stringify({
  type: 'doc',
  content: [{ type: 'heading', attrs: { level: 1 } }],
});

interface TipTapNode {
  type?: unknown;
  attrs?: { level?: unknown };
  content?: unknown[];
  text?: unknown;
}

function isTipTapNode(value: unknown): value is TipTapNode {
  return typeof value === 'object' && value !== null;
}

export function extractNameFromContent(content: string): string {
  try {
    const doc: unknown = JSON.parse(content);
    if (!isTipTapNode(doc) || !Array.isArray(doc.content)) {
      return 'Untitled Sheet';
    }

    const h1 = doc.content.find(
      (node): node is TipTapNode => (
        isTipTapNode(node)
        && node.type === 'heading'
        && node.attrs?.level === 1
      ),
    );
    const text = h1?.content
      ?.map((child) => (
        isTipTapNode(child) && typeof child.text === 'string' ? child.text : ''
      ))
      .join('') ?? '';
    return text.trim() || 'Untitled Sheet';
  } catch {
    return 'Untitled Sheet';
  }
}
