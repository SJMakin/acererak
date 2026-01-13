import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useState, useRef, useEffect } from 'react';
import { StatDeclaration } from './extensions/StatDeclaration';
import { Expression } from './extensions/Expression';
import { ActionButton } from './extensions/ActionButton';
import { BarWidget } from './extensions/BarWidget';
import { DotsWidget } from './extensions/DotsWidget';
import { debouncedParse, parseShadowState, type ShadowState } from '../../services/shadowStateService';
import { useGameStore } from '../../stores/gameStore';
import type { ChatMessage } from '../../types';
import './CharacterSheetEditor.css';

interface CharacterSheetEditorProps {
  content: string;
  onChange: (content: string, shadowState?: ShadowState) => void;
  onUpdateStat?: (key: string, newValue: string | number) => void;
  onBroadcastRoll?: (message: ChatMessage) => void;
  readOnly?: boolean;
  showMarkdownPanel?: boolean;
  shadowState?: ShadowState;
}

export function CharacterSheetEditor({
  content,
  onChange,
  onUpdateStat,
  onBroadcastRoll,
  readOnly = false,
  showMarkdownPanel = false,
  shadowState: externalShadowState,
}: CharacterSheetEditorProps) {
  const [showMarkdown, setShowMarkdown] = useState(showMarkdownPanel);
  const [markdownText, setMarkdownText] = useState('');
  const [localShadowState, setLocalShadowState] = useState<ShadowState>({ stats: {}, projections: {} });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousJsonRef = useRef<string>('');
  
  // Use external shadowState if provided, otherwise use local
  const shadowState = externalShadowState || localShadowState;

  const parseAndNotifyShadowState = useCallback(
    (json: string) => {
      if (json === previousJsonRef.current) return;
      previousJsonRef.current = json;

      try {
        const document = JSON.parse(json);
        const result = parseShadowState(document);
        if (!externalShadowState) {
          setLocalShadowState(result);
        }
        
        // Cancel any pending debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Debounce the callback
        debounceTimerRef.current = setTimeout(() => {
          onChange(json, result);
        }, 300);
      } catch (e) {
        console.error('Failed to parse shadow state:', e);
      }
    },
    [onChange, externalShadowState]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      StatDeclaration.configure({
        HTMLAttributes: {
          class: 'stat-declaration',
        },
      }),
      Expression.configure({
        HTMLAttributes: {
          class: 'expression',
        },
      }),
      ActionButton.configure({
        HTMLAttributes: {
          class: 'action-button',
        },
      }),
      BarWidget.configure({
        HTMLAttributes: {
          class: 'bar-widget',
        },
      }),
      DotsWidget.configure({
        HTMLAttributes: {
          class: 'dots-widget',
        },
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      parseAndNotifyShadowState(json);
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handleKeyDown: (view, event) => {
        // Handle "::" shortcut for stat declarations
        if (event.key === ':') {
          const { from } = view.state.selection;
          const textBefore = view.state.doc.textBetween(Math.max(0, from - 2), from);
          
          if (textBefore.endsWith(':')) {
            // Double colon typed, insert stat declaration
            // We'll let the normal input happen, then trigger suggestion
            return false;
          }
        }
        return false;
      },
    },
  });

  // Initialize shadow state from content
  useEffect(() => {
    if (content && editor) {
      try {
        const document = JSON.parse(content);
        const result = parseShadowState(document);
        setLocalShadowState(result);
      } catch (e) {
        // Ignore parse errors on initial load
      }
    }
  }, [content, editor]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const insertStatDeclaration = useCallback(
    (key: string, value: string | number = '', projections: string[] = []) => {
      if (!editor) return;
      
      editor.commands.insertStatDeclaration({ key, value, projections });
    },
    [editor]
  );

  const insertExpression = useCallback(
    (formula: string) => {
      if (!editor) return;
      
      editor.commands.insertExpression({ formula });
    },
    [editor]
  );

  const insertActionButton = useCallback(
    (label: string, action: string, cost?: string) => {
      if (!editor) return;
      
      editor.commands.insertActionButton({ label, action, cost });
    },
    [editor]
  );

  const insertBarWidget = useCallback(
    (current: string, max: string) => {
      if (!editor) return;
      
      editor.commands.insertBarWidget({ current, max });
    },
    [editor]
  );

  const insertDotsWidget = useCallback(
    (current: string, max: string) => {
      if (!editor) return;
      
      editor.commands.insertDotsWidget({ current, max });
    },
    [editor]
  );

  const exportMarkdown = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
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
        case 'statDeclaration': {
          const attrs = nodeAny.attrs || {};
          const key = (attrs.key as string) || '';
          const value = (attrs.value as string) || '';
          const projections = (attrs.projections as string[]) || [];
          markdown += `${key}:: ${value}${projections.map((p: string) => ` #${p}`).join('')}\n\n`;
          break;
        }
        case 'expression': {
          const attrs = nodeAny.attrs || {};
          const formula = (attrs.formula as string) || '';
          markdown += `{{ ${formula} }}\n\n`;
          break;
        }
        case 'actionButton': {
          const attrs = nodeAny.attrs || {};
          const label = (attrs.label as string) || 'Action';
          const action = (attrs.action as string) || '';
          const cost = (attrs.cost as string);
          const costPart = cost ? `; cost: ${cost}` : '';
          markdown += `[${label}](action: ${action}${costPart})\n\n`;
          break;
        }
        case 'barWidget': {
          const attrs = nodeAny.attrs || {};
          const current = (attrs.current as string) || '0';
          const max = (attrs.max as string) || '100';
          markdown += `[bar: ${current}/${max}]\n\n`;
          break;
        }
        case 'dotsWidget': {
          const attrs = nodeAny.attrs || {};
          const current = (attrs.current as string) || '0';
          const max = (attrs.max as string) || '5';
          markdown += `[dots: ${current}/${max}]\n\n`;
          break;
        }
      }
    });
    
    setMarkdownText(markdown);
    setShowMarkdown(true);
  }, [editor]);

  const importMarkdown = useCallback(() => {
    if (!editor || !markdownText) return;
    
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
      } else if (line.match(/^(\w+)::\s*(.+)$/)) {
        // Stat declaration format - don't convert to HTML, let it be handled by the editor
        html += `<p>${line}</p>`;
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
    return (
      <div className="character-sheet-editor">
        <div className="character-sheet-editor__loading">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="character-sheet-editor">
      {!readOnly && (
        <div className="character-sheet-editor__toolbar">
          <button
            onClick={setParagraph}
            className={!editor.isActive('paragraph') ? '' : 'active'}
            title="Paragraph"
          >
            P
          </button>
          <button
            onClick={() => setHeading(1)}
            className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => setHeading(2)}
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => setHeading(3)}
            className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
            title="Heading 3"
          >
            H3
          </button>
          <span className="toolbar__separator" />
          <button
            onClick={toggleBold}
            className={editor.isActive('bold') ? 'active' : ''}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={toggleItalic}
            className={editor.isActive('italic') ? 'active' : ''}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={toggleStrike}
            className={editor.isActive('strike') ? 'active' : ''}
            title="Strikethrough"
          >
            S
          </button>
          <button
            onClick={toggleCode}
            className={editor.isActive('code') ? 'active' : ''}
            title="Inline Code"
          >
            {'</>'}
          </button>
          <span className="toolbar__separator" />
          <button
            onClick={toggleBulletList}
            className={editor.isActive('bulletList') ? 'active' : ''}
            title="Bullet List"
          >
            • List
          </button>
          <button
            onClick={toggleOrderedList}
            className={editor.isActive('orderedList') ? 'active' : ''}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            onClick={toggleBlockquote}
            className={editor.isActive('blockquote') ? 'active' : ''}
            title="Quote"
          >
            "
          </button>
          <button
            onClick={toggleCodeBlock}
            className={editor.isActive('codeBlock') ? 'active' : ''}
            title="Code Block"
          >
            {'{ }'}
          </button>
          <span className="toolbar__separator" />
          <button
            onClick={exportMarkdown}
            disabled={readOnly}
            title="Export to Markdown"
          >
            ↓ MD
          </button>
        </div>
      )}
      
      <div className="character-sheet-editor__content">
        <EditorContent editor={editor} />
      </div>

      {/* Shadow State Debug Panel (development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="character-sheet-editor__debug">
          <details>
            <summary>Shadow State ({Object.keys(shadowState.stats).length} stats)</summary>
            <pre>{JSON.stringify(shadowState, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* Widget insertion toolbar */}
      {!readOnly && (
        <div className="character-sheet-editor__widget-toolbar">
          <button
            onClick={() => insertBarWidget('HP', 'MaxHP')}
            title="Insert HP bar [bar: HP/MaxHP]"
          >
            ⊞ Bar
          </button>
          <button
            onClick={() => insertDotsWidget('3', '5')}
            title="Insert dots [dots: 3/5]"
          >
            ⊝ Dots
          </button>
        </div>
      )}

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
