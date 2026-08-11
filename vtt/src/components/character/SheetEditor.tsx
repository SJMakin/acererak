import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { DOMSerializer } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  IconHeart,
  IconShield,
  IconSword,
  IconWand,
  IconEye,
  IconBrain,
  IconRun,
  IconFlame,
  IconMask,
  IconChartBar,
  IconCircleDot,
  IconMathFunction,
  IconDice5,
  IconFileImport,
  IconSquarePlus,
  IconNote,
  IconTemplate,
} from '@tabler/icons-react';
import { StatDeclaration } from './extensions/StatDeclaration';
import { Expression } from './extensions/Expression';
import { ActionButton } from './extensions/ActionButton';
import { BarWidget } from './extensions/BarWidget';
import { DotsWidget } from './extensions/DotsWidget';
import { Transclusion } from './extensions/Transclusion';
import { parseShadowState, type ShadowState } from '../../services/shadowStateService';
import { getAllTemplates } from '../../services/sheetTemplates';
import { ShadowStateContext } from './extensions/ShadowStateContext';
import { BubbleToolbar } from './BubbleToolbar';
import { FloatingInsertMenu } from './FloatingInsertMenu';
import { DslHelpPopover } from './DslHelpPopover';
import './SheetEditor.css';

interface SheetEditorProps {
  content: string;
  contentVersion?: number;
  onChange: (content: string, shadowState?: ShadowState) => void;
  readOnly?: boolean;
  shadowState?: ShadowState;
}

interface CommandItem {
  label: string;
  description?: string;
  hint?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'stats' | 'widgets' | 'actions' | 'utility' | 'templates';
}

export function SheetEditor({
  content,
  contentVersion = 0,
  onChange,
  readOnly = false,
  shadowState: externalShadowState,
}: SheetEditorProps) {
  const [localShadowState, setLocalShadowState] = useState<ShadowState>({ stats: {}, projections: {} });
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [commandPosition, setCommandPosition] = useState<{ top: number; left: number } | null>(null);
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const [markdownText, setMarkdownText] = useState('');

  const previousJsonRef = useRef<string>('');
  const commandInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const currentShadowState = externalShadowState || localShadowState;

  const iconSize = 16;

  // Stable callback — uses a ref to avoid re-creating the editor when the
  // parent's callback identity changes.
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

        // Keep the document and its derived values in the same notification so
        // saving immediately after a keystroke cannot persist stale stats.
        onChangeRef.current(json, result);
      } catch (e) {
        console.error('Failed to parse shadow state:', e);
        onChangeRef.current(json);
      }
    },
    [externalShadowState]
  );

  // Parse content prop — handle both JSON string and pre-parsed object.
  // This component is remounted via key when character changes, so content is always fresh.
  const [parsedContent] = useState(() => {
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }
    return content;
  });

  // Enforce that the first block in the document is always an h1
  const EnforceH1FirstBlock = useMemo(() => Extension.create({
    name: 'enforceH1FirstBlock',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('enforceH1FirstBlock'),
          appendTransaction(_transactions, _oldState, newState) {
            const first = newState.doc.firstChild;
            if (!first) return null;
            if (first.type.name === 'heading' && first.attrs.level === 1) return null;
            return newState.tr.setNodeMarkup(0, newState.schema.nodes.heading, { level: 1 });
          },
        }),
      ];
    },
  }), []);

  // Memoize extensions to avoid TipTap view recreation on re-render
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Markdown.configure(),
    StatDeclaration.configure({
      HTMLAttributes: { class: 'stat-declaration' },
    }),
    Expression.configure({
      HTMLAttributes: { class: 'expression' },
    }),
    ActionButton.configure({
      HTMLAttributes: { class: 'action-button' },
    }),
    BarWidget.configure({
      HTMLAttributes: { class: 'bar-widget' },
    }),
    DotsWidget.configure({
      HTMLAttributes: { class: 'dots-widget' },
    }),
    Transclusion.configure({
      HTMLAttributes: { class: 'transclusion-node' },
    }),
    EnforceH1FirstBlock,
  ], [EnforceH1FirstBlock]);

  const editor = useEditor({
    extensions,
    content: parsedContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      parseAndNotifyShadowState(json);
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
  });

  // Expose editor on window for e2e debugging (dev only)
  useEffect(() => {
    if (!import.meta.env.DEV || !editor) return;

    const debugWindow = window as Window & { __tiptapEditor?: typeof editor };
    debugWindow.__tiptapEditor = editor;
    return () => {
      if (debugWindow.__tiptapEditor === editor) {
        delete debugWindow.__tiptapEditor;
      }
    };
  }, [editor]);

  // Callback to update a stat declaration in the editor document.
  const onUpdateStat = useCallback((key: string, newValue: string | number) => {
    if (!editor) return;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'statDeclaration' && node.attrs.key === key) {
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, value: newValue })
        );
        return false; // stop after first match
      }
    });
  }, [editor]);

  // When contentVersion changes, the parent has loaded new data — sync editor content.
  // This avoids the React batching race where the editor would initialize with stale content.
  const appliedVersionRef = useRef(contentVersion);
  useEffect(() => {
    if (!editor) return;
    if (appliedVersionRef.current === contentVersion) return;
    appliedVersionRef.current = contentVersion;

    try {
      const propDoc = typeof content === 'string' ? JSON.parse(content) : content;
      editor.commands.setContent(propDoc);
      const result = parseShadowState(propDoc);
      setLocalShadowState(result);
    } catch {
      // Ignore parse errors
    }
  }, [contentVersion, content, editor]);

  // Initialize shadow state from content on first mount
  useEffect(() => {
    if (!editor || !parsedContent) return;
    try {
      const document = typeof parsedContent === 'string'
        ? JSON.parse(parsedContent)
        : parsedContent;
      const result = parseShadowState(document);
      setLocalShadowState(result);
    } catch {
      // Ignore parse errors on initial load
    }
  }, [editor, parsedContent]);

  // Custom copy handler — sets text/plain to DSL syntax and text/html via
  // ProseMirror's serializer (which preserves marks, headings, data attributes).
  // We use a capture-phase listener because ProseMirror's own copy handler may
  // not fire in all environments (e.g. Playwright keyboard simulation).
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const handleCopy = (e: ClipboardEvent) => {
      const { from, to, empty } = editor.state.selection;
      if (empty || !e.clipboardData) return;

      // Get DSL plain text via TipTap's clipboardTextSerializer
      let plainText = '';
      const slice = editor.state.doc.slice(from, to);
      editor.view.someProp('clipboardTextSerializer', (f: (s: typeof slice, v: typeof editor.view) => string) => {
        plainText = f(slice, editor.view);
        return true;
      });
      if (!plainText) {
        plainText = slice.content.textBetween(0, slice.content.size, '\n\n');
      }

      // Get HTML via ProseMirror's DOMSerializer (preserves marks + data attrs)
      let html = '';
      try {
        const serializer = DOMSerializer.fromSchema(editor.schema);
        const fragment = serializer.serializeFragment(slice.content);
        const wrapper = document.createElement('div');
        wrapper.appendChild(fragment);
        html = wrapper.innerHTML;
      } catch {
        // Fallback — no HTML
      }

      e.preventDefault();
      e.clipboardData.setData('text/plain', plainText);
      if (html) {
        e.clipboardData.setData('text/html', html);
      }
    };

    dom.addEventListener('copy', handleCopy, { capture: true });
    return () => dom.removeEventListener('copy', handleCopy, { capture: true });
  }, [editor]);

  // Focus command input when palette opens, and capture Escape at the document
  // level (capture phase) so it doesn't propagate to Mantine's Modal listener.
  // Uses ownerDocument so it works in popup windows too.
  useEffect(() => {
    if (!showCommandPalette) return;
    setTimeout(() => commandInputRef.current?.focus(), 0);
    const doc = editorContainerRef.current?.ownerDocument ?? document;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setShowCommandPalette(false);
        editor?.commands.focus();
      }
    };
    doc.addEventListener('keydown', handleEscape, true);
    return () => doc.removeEventListener('keydown', handleEscape, true);
  }, [showCommandPalette, editor]);

  // Handle "/" keydown on the editor content area to open command palette
  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === '/' && !readOnly && !showCommandPalette && editor) {
        const { from } = editor.state.selection;
        let textBefore = '';
        try {
          textBefore = from > 0 ? editor.state.doc.textBetween(from - 1, from) : '';
        } catch {
          // textBetween can throw if position is at node boundary
        }

        // Open palette unless cursor is mid-word (letter/digit before cursor)
        const isMidWord = /\w/.test(textBefore);
        if (!isMidWord) {
          e.preventDefault();
          setCommandFilter('');
          setSelectedCommandIndex(0);

          // Position near cursor — use viewport coords directly (fixed positioning)
          try {
            const coords = editor.view.coordsAtPos(from);
            setCommandPosition({
              top: coords.bottom + 4,
              left: coords.left,
            });
          } catch {
            setCommandPosition(null);
          }

          setShowCommandPalette(true);
        }
      }
    },
    [editor, readOnly, showCommandPalette]
  );

  // After inserting an atom node, add a trailing space so the cursor has
  // a text node to land in (prevents ReactNodeViewRenderer from eating keystrokes).
  const insertAndCursor = useCallback(
    (insertFn: () => void) => {
      if (!editor) return;
      insertFn();
      // Insert a zero-width space after the atom so the browser has a text node
      editor.commands.insertContent(' ');
    },
    [editor]
  );

  const insertStatDeclaration = useCallback(
    (key: string, value: string | number = '', projections: string[] = []) => {
      insertAndCursor(() => editor?.commands.insertStatDeclaration({ key, value, projections }));
    },
    [editor, insertAndCursor]
  );

  const insertExpression = useCallback(
    (formula: string) => {
      insertAndCursor(() => editor?.commands.insertExpression({ formula }));
    },
    [editor, insertAndCursor]
  );

  const insertActionButton = useCallback(
    (label: string, action: string, cost?: string) => {
      insertAndCursor(() => editor?.commands.insertActionButton({ label, action, cost }));
    },
    [editor, insertAndCursor]
  );

  const insertBarWidget = useCallback(
    (current: string, max: string) => {
      insertAndCursor(() => editor?.commands.insertBarWidget({ current, max }));
    },
    [editor, insertAndCursor]
  );

  const insertDotsWidget = useCallback(
    (current: string, max: string) => {
      insertAndCursor(() => editor?.commands.insertDotsWidget({ current, max }));
    },
    [editor, insertAndCursor]
  );

  const importMarkdown = useCallback(() => {
    if (!editor || !markdownText) return;
    editor.commands.setContent(markdownText, { contentType: 'markdown' });
    setShowMarkdownImport(false);
    setMarkdownText('');
  }, [editor, markdownText]);

  const commandItems: CommandItem[] = [
    // Stats
    { label: 'HP Stat', description: 'Hit points with bar projection', hint: 'HP:: 10 #bar', icon: <IconHeart size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('HP', '10', ['bar']) },
    { label: 'AC Stat', description: 'Armor class with badge projection', hint: 'AC:: 10 #badge', icon: <IconShield size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('AC', '10', ['badge']) },
    { label: 'Strength', description: 'STR ability score', hint: 'STR:: 10', icon: <IconSword size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('STR', '10') },
    { label: 'Dexterity', description: 'DEX ability score', hint: 'DEX:: 10', icon: <IconRun size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('DEX', '10') },
    { label: 'Constitution', description: 'CON ability score', hint: 'CON:: 10', icon: <IconFlame size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('CON', '10') },
    { label: 'Intelligence', description: 'INT ability score', hint: 'INT:: 10', icon: <IconBrain size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('INT', '10') },
    { label: 'Wisdom', description: 'WIS ability score', hint: 'WIS:: 10', icon: <IconEye size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('WIS', '10') },
    { label: 'Charisma', description: 'CHA ability score', hint: 'CHA:: 10', icon: <IconMask size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('CHA', '10') },
    { label: 'Custom Stat', description: 'Define your own stat', hint: 'Name:: value', icon: <IconSquarePlus size={iconSize} />, category: 'stats', action: () => insertStatDeclaration('Stat', '0') },

    // Widgets
    { label: 'HP Bar', description: 'Health bar linked to stats', hint: '[bar: HP/MaxHP]', icon: <IconChartBar size={iconSize} />, category: 'widgets', action: () => insertBarWidget('HP', 'MaxHP') },
    { label: 'Dot Tracker', description: 'Clickable dot tracker (max 10)', hint: '[dots: 3/5]', icon: <IconCircleDot size={iconSize} />, category: 'widgets', action: () => insertDotsWidget('3', '5') },
    { label: 'Expression', description: 'Live computed value', hint: '{{ STR + PROF }}', icon: <IconMathFunction size={iconSize} />, category: 'widgets', action: () => insertExpression('STR + PROF') },

    // Actions
    { label: 'Attack Roll', description: 'Melee attack action', hint: '[Attack](action: 1d20 + STR)', icon: <IconSword size={iconSize} />, category: 'actions', action: () => insertActionButton('Attack', '1d20 + STR', '1 action') },
    { label: 'Spell Attack', description: 'Spell attack action', hint: '[Spell](action: 1d20 + INT)', icon: <IconWand size={iconSize} />, category: 'actions', action: () => insertActionButton('Spell Attack', '1d20 + INT', '1 action') },
    { label: 'Custom Action', description: 'Dice roll with custom formula', hint: '[Name](action: formula)', icon: <IconDice5 size={iconSize} />, category: 'actions', action: () => insertActionButton('Custom', '1d20') },

    // Utility
    { label: 'Import Markdown', description: 'Paste markdown to import', icon: <IconFileImport size={iconSize} />, category: 'utility', action: () => { setShowCommandPalette(false); setShowMarkdownImport(true); } },
    { label: 'Snippet', description: 'Embed a snippet from library', hint: '[[SnippetName]]', icon: <IconNote size={iconSize} />, category: 'utility', action: () => { /* TODO: open snippet picker */ } },

    // Templates
    ...getAllTemplates()
      .filter(t => t.id !== 'blank')
      .map(t => ({
        label: t.name,
        description: t.description,
        icon: <IconTemplate size={iconSize} />,
        category: 'templates' as const,
        action: () => {
          if (!editor) return;
          try {
            const doc = JSON.parse(t.content);
            editor.commands.setContent(doc);
            const json = JSON.stringify(editor.getJSON());
            const result = parseShadowState(JSON.parse(json));
            onChangeRef.current(json, result);
          } catch (e) {
            console.error('Failed to apply template:', e);
          }
        },
      })),
  ];

  const filteredCommands = commandItems.filter(cmd => {
    const matchesSearch = !commandFilter ||
      cmd.label.toLowerCase().includes(commandFilter.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(commandFilter.toLowerCase()) ||
      cmd.hint?.toLowerCase().includes(commandFilter.toLowerCase());
    return matchesSearch;
  });

  // Group filtered commands by category
  const categoryOrder: CommandItem['category'][] = ['stats', 'widgets', 'actions', 'utility', 'templates'];
  const categoryLabels: Record<string, string> = {
    stats: 'Stats',
    widgets: 'Widgets',
    actions: 'Actions',
    utility: 'Utility',
    templates: 'Templates',
  };

  const groupedCommands: { category: string; label: string; items: CommandItem[] }[] = [];
  let flatIndex = 0;
  const flatMap: number[] = []; // maps flat index to grouped item

  for (const cat of categoryOrder) {
    const items = filteredCommands.filter(c => c.category === cat);
    if (items.length > 0) {
      groupedCommands.push({ category: cat, label: categoryLabels[cat], items });
      for (let i = 0; i < items.length; i++) {
        flatMap.push(flatIndex);
        flatIndex++;
      }
    }
  }

  if (!editor) {
    return (
      <div className="sheet-editor">
        <div className="sheet-editor__loading">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="sheet-editor" ref={editorContainerRef}>
      <div className="sheet-editor__content" onKeyDown={handleEditorKeyDown}>
        <ShadowStateContext.Provider value={{ shadowState: currentShadowState, onUpdateStat }}>
          <EditorContent editor={editor} />
        </ShadowStateContext.Provider>

        {!readOnly && <BubbleToolbar editor={editor} />}
        {!readOnly && <FloatingInsertMenu editor={editor} />}
      </div>

      {!readOnly && <DslHelpPopover />}

      {/* Command Palette — portaled to document.body so it escapes overflow:hidden
           and transform containing blocks (floating panel uses transform) */}
      {showCommandPalette && editorContainerRef.current &&
        createPortal(
        <div
          className="command-palette-backdrop"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="command-palette"
            style={commandPosition ? {
              position: 'fixed',
              // Flip upward if palette would overflow the viewport bottom
              ...(commandPosition.top + 420 > (editorContainerRef.current?.ownerDocument.defaultView?.innerHeight ?? 800)
                ? { bottom: (editorContainerRef.current?.ownerDocument.defaultView?.innerHeight ?? 800) - commandPosition.top + 8 }
                : { top: commandPosition.top }),
              left: Math.min(commandPosition.left, 300),
            } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-palette__header">
              <input
                ref={commandInputRef}
                type="text"
                placeholder="Search commands..."
                value={commandFilter}
                onChange={(e) => {
                  setCommandFilter(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedCommandIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedCommandIndex(i => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCommands[selectedCommandIndex]) {
                      filteredCommands[selectedCommandIndex].action();
                      setShowCommandPalette(false);
                      // Re-focus editor after inserting content
                      setTimeout(() => editor?.commands.focus(), 0);
                    }
                  }
                }}
              />
            </div>
            <div className="command-palette__list">
              {filteredCommands.length === 0 ? (
                <div className="command-palette__empty">No commands found</div>
              ) : (
                (() => {
                  let globalIdx = 0;
                  return groupedCommands.map((group) => (
                    <div key={group.category} className="command-palette__group">
                      <div className="command-palette__group-label">{group.label}</div>
                      {group.items.map((cmd) => {
                        const idx = globalIdx++;
                        return (
                          <button
                            key={cmd.label}
                            className={`command-palette__item ${
                              idx === selectedCommandIndex ? 'command-palette__item--selected' : ''
                            }`}
                            onClick={() => {
                              cmd.action();
                              setShowCommandPalette(false);
                              setTimeout(() => editor?.commands.focus(), 0);
                            }}
                            onMouseEnter={() => setSelectedCommandIndex(idx)}
                          >
                            <span className="command-palette__icon">{cmd.icon}</span>
                            <div className="command-palette__content">
                              <span className="command-palette__label">{cmd.label}</span>
                              {cmd.description && (
                                <span className="command-palette__description">{cmd.description}</span>
                              )}
                            </div>
                            {cmd.hint && (
                              <code className="command-palette__hint">{cmd.hint}</code>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()
              )}
            </div>
            <div className="command-palette__footer">
              <span><kbd>↑↓</kbd> Navigate</span>
              <span><kbd>Enter</kbd> Select</span>
              <span><kbd>Esc</kbd> Close</span>
            </div>
          </div>
        </div>,
        editorContainerRef.current.ownerDocument.body,
      )}

      {/* Markdown Import Panel */}
      {showMarkdownImport && (
        <div className="markdown-import-overlay" onClick={() => setShowMarkdownImport(false)}>
          <div className="markdown-import" onClick={(e) => e.stopPropagation()}>
            <div className="markdown-import__title">Import Markdown</div>
            <textarea
              className="markdown-import__textarea"
              value={markdownText}
              onChange={(e) => setMarkdownText(e.target.value)}
              placeholder="Paste markdown content here..."
              rows={10}
              autoFocus
            />
            <div className="markdown-import__actions">
              <button
                className="markdown-import__cancel"
                onClick={() => setShowMarkdownImport(false)}
              >
                Cancel
              </button>
              <button
                className="markdown-import__import"
                onClick={importMarkdown}
                disabled={!markdownText.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shadow State Debug Panel (development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="sheet-editor__debug">
          <details>
            <summary>Shadow State ({Object.keys(currentShadowState.stats).length} stats)</summary>
            <pre>{JSON.stringify(currentShadowState, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
