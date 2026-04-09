export const BLANK_SHEET_CONTENT = JSON.stringify({
  type: 'doc',
  content: [{ type: 'heading', attrs: { level: 1 } }],
});

export function extractNameFromContent(content: string): string {
  try {
    const doc = JSON.parse(content);
    const h1 = doc.content?.find(
      (n: any) => n.type === 'heading' && n.attrs?.level === 1,
    );
    const text =
      h1?.content?.map((c: any) => c.text || '').join('') || '';
    return text.trim() || 'Untitled Sheet';
  } catch {
    return 'Untitled Sheet';
  }
}
