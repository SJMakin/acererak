import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { useCallback, useState, useRef, useEffect } from 'react';
import { StatDeclaration } from './extensions/StatDeclaration';
import { Expression } from './extensions/Expression';
import { ActionButton } from './extensions/ActionButton';
import { BarWidget } from './extensions/BarWidget';
import { DotsWidget } from './extensions/DotsWidget';
import { Transclusion } from './extensions/Transclusion';
import { parseShadowState, type ShadowState } from '../../services/shadowStateService';
import { useSnippetStore } from '../../stores/snippetStore';
import './CharacterSheetEditor.css';

interface CharacterSheetEditorProps {
  content: string;
  onChange: (content: string, shadowState?: ShadowState) => void;
  readOnly?: boolean;
  showMarkdownPanel?: boolean;
  shadowState?: ShadowState;
}

interface CommandItem {
  label: string;
  description?: string;
  icon: string;
  action: () => void;
  category: 'stat' | 'action' | 'widget' | 'format';
}

export function CharacterSheetEditor({
  content,
  onChange,
  readOnly = false,
  showMarkdownPanel = false,
  shadowState: externalShadowState,
}: CharacterSheetEditorProps) {
  const [showMarkdown, setShowMarkdown] = useState(showMarkdownPanel);
  const [markdownText, setMarkdownText] = useState('');
  const [localShadowState, setLocalShadowState] = useState<ShadowState>({ stats: {}, projections: {} });
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [commandCategory, setCommandCategory] = useState<string>('all');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousJsonRef = useRef<string>('');
  const { snippets } = useSnippetStore();
  
  // Use external shadowState if provided, otherwise use local
  const currentShadowState = externalShadowState || localShadowState;

  const commandItems: CommandItem[] = [
    // Stat declarations
    { label: 'Stat: HP', description: 'Hit points', icon: '❤️', category: 'stat', action: () => insertStatDeclaration('HP', '10', ['bar']) },
    { label: 'Stat: AC', description: 'Armor class', icon: '🛡️', category: 'stat', action: () => insertStatDeclaration('AC', '10', ['badge']) },
    { label: 'Stat: Strength', description: 'Strength score', icon: '💪', category: 'stat', action: () => insertStatDeclaration('STR', '10') },
    { label: 'Stat: Dexterity', description: 'Dexterity score', icon: '🏃', category: 'stat', action: () => insertStatDeclaration('DEX', '10') },
    { label: 'Stat: Constitution', description: 'Constitution score', icon: '❤️', category: 'stat', action: () => insertStatDeclaration('CON', '10') },
    { label: 'Stat: Intelligence', description: 'Intelligence score', icon: '🧠', category: 'stat', action: () => insertStatDeclaration('INT', '10') },
    { label: 'Stat: Wisdom', description: 'Wisdom score', icon: '👁️', category: 'stat', action: () => insertStatDeclaration('WIS', '10') },
    { label: 'Stat: Charisma', description: 'Charisma score', icon: '🎭', category: 'stat', action: () => insertStatDeclaration('CHA', '10') },
    
    // Actions
    { label: 'Action: Attack', description: 'Melee attack', icon: '⚔️', category: 'action', action: () => insertActionButton('Attack', '1d20 + @STR', '1 action') },
    { label: 'Action: Dash', description: 'Move extra distance', icon: '💨', category: 'action', action: () => insertActionButton('Dash', '@DEX * 2', '1 action') },
    { label: 'Action: Hide', description: 'Attempt to hide', icon: '👁️', category: 'action', action: () => insertActionButton('Hide', '@DEX + @PROF', '1 action') },
    
    // Widgets
    { label: 'Widget: HP Bar', description: 'Health bar', icon: '📊', category: 'widget', action: () => insertBarWidget('HP', 'MaxHP') },
    { label: 'Widget: Spell Slots', description: 'Spell slots dots', icon: '✨', category: 'widget', action: () => insertDotsWidget('3', '4') },
  ];

  const filteredCommands = commandItems.filter(cmd => {
    const matchesSearch = cmd.label.toLowerCase().includes(commandFilter.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(commandFilter.toLowerCase());
    const matchesCategory = commandCategory === 'all' || cmd.category === commandCategory;
    return matchesSearch && matchesCategory;
  });

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
        
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

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
      Markdown.configure(),
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
      Transclusion.configure({
        HTMLAttributes: {
          class: 'transclusion-node',
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
        // Handle "/" for command palette
        if (event.key === '/' && !readOnly) {
          const { from } = view.state.selection;
          const textBefore = view.state.doc.textBetween(Math.max(0, from - 1), from);
          
          if (!textBefore || textBefore === '/') {
            event.preventDefault();
            setCommandFilter('');
            setCommandCategory('all');
            setShowCommandPalette(true);
            setSelectedCommandIndex(0);
            return true;
          }
        }

        // Handle "[[" for transclusion autocomplete
        if (event.key === '[' && !readOnly) {
          const { from } = view.state.selection;
          const textBefore = view.state.doc.textBetween(Math.max(0, from - 1), from);
          
          if (textBefore === '[') {
            // Open transclusion autocomplete - simplified for now
            const snippetNames = snippets.map(s => s.name);
            console.log('Available snippets:', snippetNames);
          }
        }

        // Handle keyboard navigation in command palette
        if (showCommandPalette) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedCommandIndex(i => Math.min(i + 1, filteredCommands.length - 1));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedCommandIndex(i => Math.max(i - 1, 0));
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredCommands[selectedCommandIndex]) {
              filteredCommands[selectedCommandIndex].action();
              setShowCommandPalette(false);
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setShowCommandPalette(false);
            return true;
          }
        }

        // Standard keyboard shortcuts
        if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
          event.preventDefault();
          editor.chain().focus().toggleBold().run();
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
          event.preventDefault();
          editor.chain().focus().toggleItalic().run();
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          const url = prompt('Enter link URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
          return true;
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
    const markdown = editor.getMarkdown();
    setMarkdownText(markdown);
    setShowMarkdown(true);
  }, [editor]);

  const importMarkdown = useCallback(() => {
    if (!editor || !markdownText) return;
    editor.commands.setContent(markdownText, { contentType: 'markdown' });
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

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette__header">
              <input
                type="text"
                placeholder="Search commands... (/)"
                value={commandFilter}
                onChange={(e) => {
                  setCommandFilter(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                autoFocus
              />
              <select
                value={commandCategory}
                onChange={(e) => {
                  setCommandCategory(e.target.value);
                  setSelectedCommandIndex(0);
                }}
              >
                <option value="all">All</option>
                <option value="stat">Stats</option>
                <option value="action">Actions</option>
                <option value="widget">Widgets</option>
                <option value="format">Format</option>
              </select>
            </div>
            <div className="command-palette__list">
              {filteredCommands.length === 0 ? (
                <div className="command-palette__empty">No commands found</div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.label}
                    className={`command-palette__item ${
                      index === selectedCommandIndex ? 'command-palette__item--selected' : ''
                    }`}
                    onClick={() => {
                      cmd.action();
                      setShowCommandPalette(false);
                    }}
                    onMouseEnter={() => setSelectedCommandIndex(index)}
                  >
                    <span className="command-palette__icon">{cmd.icon}</span>
                    <div className="command-palette__content">
                      <span className="command-palette__label">{cmd.label}</span>
                      {cmd.description && (
                        <span className="command-palette__description">{cmd.description}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="command-palette__footer">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}

      {/* Shadow State Debug Panel (development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="character-sheet-editor__debug">
          <details>
            <summary>Shadow State ({Object.keys(currentShadowState.stats).length} stats)</summary>
            <pre>{JSON.stringify(currentShadowState, null, 2)}</pre>
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
          <button
            onClick={() => insertExpression('STR + PROF')}
            title="Insert expression {{ STR + PROF }}"
          >
            {null}
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
