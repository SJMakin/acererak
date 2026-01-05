import { useState } from 'react';
import {
  Stack,
  Textarea,
  SegmentedControl,
  Box,
  Paper,
  Text,
} from '@mantine/core';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
}

// Simple markdown to HTML converter (basic support)
function parseMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (must be before bold to avoid conflicts)
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Inline code
    .replace(/`(.+?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px;">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: #7c3aed;">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 8px 0;">')
    // Unordered lists
    .replace(/^\* (.+)$/gm, '<li style="margin-left: 16px;">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin-left: 16px;">$1</li>')
    // Ordered lists (basic - numbers)
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 16px; list-style-type: decimal;">$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote style="border-left: 3px solid #7c3aed; padding-left: 12px; margin: 8px 0; color: rgba(255,255,255,0.7);">$1</blockquote>')
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, '</p><p>')
    // Single line breaks
    .replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

export default function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder = 'Write notes in Markdown...',
  minRows = 4,
  maxRows = 10,
  disabled = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  return (
    <Stack gap="xs">
      {label && (
        <Text size="sm" fw={500}>
          {label}
        </Text>
      )}
      
      <SegmentedControl
        size="xs"
        value={mode}
        onChange={(val) => setMode(val as 'edit' | 'preview')}
        data={[
          { value: 'edit', label: '✏️ Edit' },
          { value: 'preview', label: '👁️ Preview' },
        ]}
      />

      {mode === 'edit' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          autosize
          disabled={disabled}
          styles={{
            input: {
              fontFamily: 'monospace',
              fontSize: '13px',
            },
          }}
        />
      ) : (
        <Paper
          p="sm"
          withBorder
          style={{
            minHeight: minRows * 24,
            maxHeight: maxRows * 24,
            overflowY: 'auto',
          }}
        >
          {value ? (
            <Box
              style={{ fontSize: '14px', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
            />
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              No content yet
            </Text>
          )}
        </Paper>
      )}

      {mode === 'edit' && (
        <Text size="xs" c="dimmed">
          Supports: **bold**, *italic*, # headers, - lists, [links](url), `code`, {'>'} quotes
        </Text>
      )}
    </Stack>
  );
}

// Export the markdown parser for use elsewhere
export { parseMarkdown };
