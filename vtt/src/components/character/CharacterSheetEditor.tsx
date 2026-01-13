import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useState } from 'react';
import './CharacterSheetEditor.css';

interface CharacterSheetEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  showMarkdownPanel?: boolean;
}

export function CharacterSheetEditor({
  content,
  onChange,
  readOnly = false,
  showMarkdownPanel = false,
}: CharacterSheetEditorProps) {
  const [showMarkdown, setShowMarkdown] = useState(showMarkdownPanel);
  const [markdownText, setMarkdownText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      onChange(json);
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
  });

  const exportMarkdown = useCallback(() => {
    if (!editor) return;
    // Simple markdown export (TipTap doesn't have built-in markdown export)
    const json = editor.getJSON();
    // Convert to basic markdown representation
    let markdown = '';
    
    json.content?.forEach((node) => {
      const nodeAny = node as { type: string; text?: string; attrs?: Record<string, unknown>; content?: unknown[] };
      switch (nodeAny.type) {
        case 'paragraph':
          markdown += nodeAny.text || '' + '\n\n';
          break;
        case 'heading':
          const level = (nodeAny.attrs?.level as number) || 1;
          markdown += '#'.repeat(level) + ' ' + (nodeAny.text || '') + '\n\n';
          break;
        case 'bulletList':
          markdown += '- List item\n';
          break;
        case 'orderedList':
          markdown += '1. List item\n';
          break;
        case 'blockquote':
          markdown += '> Quote\n\n';
          break;
        case 'codeBlock':
          markdown += '```\ncode\n```\n\n';
          break;
        case 'horizontalRule':
          markdown += '---\n\n';
          break;
      }
    });
    
    setMarkdownText(markdown);
    setShowMarkdown(true);
  }, [editor]);

  const importMarkdown = useCallback(() => {
    if (!editor || !markdownText) return;
    
    // Simple markdown import (converts basic markdown to HTML)
    // For a real implementation, you'd use a markdown parser library
    const lines = markdownText.split('\n');
    let html = '';
    
    lines.forEach((line) => {
      if (line.startsWith('# ')) {
        html += `<h1>${line.slice(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${line.slice(3)}</h2>`;
      } else if (line.startsWith('### ')) {
        html += `<h3>${line.slice(4)}</h3>`;
      } else if (line.startsWith('- ')) {
        html += `<ul><li>${line.slice(2)}</li></ul>`;
      } else if (line.match(/^\d+\. /)) {
        html += `<ol><li>${line.slice(line.indexOf('. ') + 2)}</li></ol>`;
      } else if (line.startsWith('> ')) {
        html += `<blockquote>${line.slice(2)}</blockquote>`;
      } else if (line === '---') {
        html += '<hr>';
      } else if (line.trim()) {
        html += `<p>${line}</p>`;
      }
    });
    
    editor.commands.setContent(html);
    setShowMarkdown(false);
    setMarkdownText('');
  }, [editor, markdownText]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  if (!editor) {
    return <div className="character-sheet-editor">Loading editor...</div>;
  }

  return (
    <div className="character-sheet-editor">
      {!readOnly && (
        <div className="character-sheet-editor__toolbar">
          <button
            onClick={setParagraph}
            className={!editor.isActive('paragraph') ? '' : 'active'}
          >
            P
          </button>
          <button
            onClick={() => setHeading(1)}
            className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
          >
            H1
          </button>
          <button
            onClick={() => setHeading(2)}
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
          >
            H2
          </button>
          <button
            onClick={() => setHeading(3)}
            className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
          >
            H3
          </button>
          <span style={{ width: 1, background: '#0f3460', margin: '0 8px' }} />
          <button
            onClick={toggleBold}
            className={editor.isActive('bold') ? 'active' : ''}
          >
            B
          </button>
          <button
            onClick={toggleItalic}
            className={editor.isActive('italic') ? 'active' : ''}
          >
            I
          </button>
          <button
            onClick={toggleStrike}
            className={editor.isActive('strike') ? 'active' : ''}
          >
            S
          </button>
          <button
            onClick={toggleCode}
            className={editor.isActive('code') ? 'active' : ''}
          >
            {'</>'}
          </button>
          <span style={{ width: 1, background: '#0f3460', margin: '0 8px' }} />
          <button
            onClick={toggleBulletList}
            className={editor.isActive('bulletList') ? 'active' : ''}
          >
            • List
          </button>
          <button
            onClick={toggleOrderedList}
            className={editor.isActive('orderedList') ? 'active' : ''}
          >
            1. List
          </button>
          <button
            onClick={toggleBlockquote}
            className={editor.isActive('blockquote') ? 'active' : ''}
          >
            "
          </button>
          <button
            onClick={toggleCodeBlock}
            className={editor.isActive('codeBlock') ? 'active' : ''}
          >
            {'{ }'}
          </button>
          <span style={{ width: 1, background: '#0f3460', margin: '0 8px' }} />
          <button onClick={exportMarkdown} disabled={readOnly}>
            ↓ MD
          </button>
        </div>
      )}
      
      <div className="character-sheet-editor__content">
        <EditorContent editor={editor} />
      </div>

      {showMarkdown && (
        <div className="character-sheet-editor__markdown-panel">
          <textarea
            value={markdownText}
            onChange={(e) => setMarkdownText(e.target.value)}
            placeholder="Paste Markdown here..."
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={importMarkdown}>Import Markdown</button>
            <button onClick={() => setShowMarkdown(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
