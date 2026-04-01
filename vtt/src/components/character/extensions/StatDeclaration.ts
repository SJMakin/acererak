import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { StatDeclarationComponent } from './StatDeclarationComponent';

const STAT_REGEX = /(\w+)::\s*([^#]*?)(?:\s+(#\w+(?:\s+#\w+)*))?\s*(?=\w+::|$)/g;

export interface StatDeclarationOptions {
  HTMLAttributes: Record<string, string>;
}

export interface StatDeclarationMarkdownToken {
  type: 'statDeclaration';
  raw: string;
  key: string;
  value: string;
  projections: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    statDeclaration: {
      insertStatDeclaration: (options: { key: string; value: string | number; projections?: string[] }) => ReturnType;
      setStatDeclarationValue: (value: string | number) => ReturnType;
      setStatDeclarationKey: (key: string) => ReturnType;
      addStatDeclarationProjection: (projection: 'bar' | 'badge') => ReturnType;
      removeStatDeclarationProjection: (projection: 'bar' | 'badge') => ReturnType;
    };
  }
}

export const StatDeclaration = Node.create<StatDeclarationOptions>({
  name: 'statDeclaration',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      key: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-key'),
        renderHTML: (attributes) => ({ 'data-key': attributes.key }),
      },
      value: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-value'),
        renderHTML: (attributes) => ({ 'data-value': attributes.value }),
      },
      projections: {
        default: () => [],
        parseHTML: (element) => {
          const projections = element.getAttribute('data-projections');
          return projections ? projections.split(',').filter(Boolean) : [];
        },
        renderHTML: (attributes) => ({ 'data-projections': (attributes.projections as string[]).join(',') }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-component="stat-declaration"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-component': 'stat-declaration' }), 0];
  },

  renderText({ node }) {
    const key = node.attrs.key || '';
    const value = node.attrs.value || '';
    const projections = (node.attrs.projections as string[]) || [];
    const projectionsPart = projections.length > 0 ? projections.map((p: string) => ` #${p}`).join('') : '';
    return `${key}:: ${value}${projectionsPart}`;
  },

  addCommands() {
    return {
      insertStatDeclaration:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              key: options.key,
              value: options.value,
              projections: options.projections || [],
            },
          });
        },
      setStatDeclarationValue:
        (value) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { value });
        },
      setStatDeclarationKey:
        (key) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { key });
        },
      addStatDeclarationProjection:
        (projection) =>
        ({ commands, tr }) => {
          const nodePos = tr.selection.from - 1;
          const node = tr.doc.nodeAt(nodePos);
          if (node && node.type.name === this.name) {
            const current = node.attrs.projections as string[] || [];
            if (!current.includes(projection)) {
              return commands.updateAttributes(this.name, { projections: [...current, projection] });
            }
          }
          return true;
        },
      removeStatDeclarationProjection:
        (projection) =>
        ({ commands, tr }) => {
          const nodePos = tr.selection.from - 1;
          const node = tr.doc.nodeAt(nodePos);
          if (node && node.type.name === this.name) {
            const current = node.attrs.projections as string[] || [];
            return commands.updateAttributes(this.name, {
              projections: current.filter((p) => p !== projection),
            });
          }
          return true;
        },
    };
  },

  addNodeView() {
    const StatDeclarationWrapper = (props: ReactNodeViewProps) => {
      return React.createElement(StatDeclarationComponent, {
        node: props.node as unknown as { attrs: { key: string; value: string | number; projections: string[] } },
        updateAttributes: props.updateAttributes as (attrs: { key?: string; value?: string | number; projections?: string[] }) => void,
        selected: props.selected,
        extension: props.extension,
      });
    };
    return ReactNodeViewRenderer(StatDeclarationWrapper);
  },

  addInputRules() {
    // No character-based input rules — stat conversion happens on Enter
    // via the ProseMirror plugin below to avoid premature triggering
    // (e.g. `HP:: 45 ` firing before the user types `#bar`).
    return [];
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;

    /** Scan a paragraph's children for stat patterns. Returns new child list or null if none found. */
    function convertStatsInParagraph(parent: import('@tiptap/pm/model').Node): import('@tiptap/pm/model').Node[] | null {
      let foundStat = false;
      const newChildren: import('@tiptap/pm/model').Node[] = [];

      parent.forEach((child) => {
        if (child.isText && child.text) {
          const text = child.text;
          STAT_REGEX.lastIndex = 0;
          let lastIndex = 0;
          let m;

          while ((m = STAT_REGEX.exec(text)) !== null) {
            foundStat = true;
            const matchStart = m.index;

            // Preserve any text before this match (with original marks)
            if (matchStart > lastIndex) {
              newChildren.push(child.cut(lastIndex, matchStart));
            }

            const key = m[1].trim();
            const value = m[2].trim();
            const projections = m[3]
              ? m[3].split(/\s+/).map((t: string) => t.replace('#', ''))
              : [];

            newChildren.push(nodeType.create({ key, value, projections }));
            lastIndex = STAT_REGEX.lastIndex;
          }

          // Preserve any trailing text after last match (with original marks)
          if (lastIndex < text.length) {
            newChildren.push(child.cut(lastIndex, text.length));
          }
        } else {
          // Non-text child (existing atom node) — pass through
          newChildren.push(child);
        }
      });

      return foundStat ? newChildren : null;
    }

    return [
      new Plugin({
        key: new PluginKey('statDeclarationEnter'),
        props: {
          handleKeyDown(view, event) {
            if (event.key !== 'Enter') return false;

            const { state } = view;
            const { $from } = state.selection;
            const parent = $from.parent;

            if (parent.type.name !== 'paragraph' && parent.type.name !== 'heading') return false;

            const newChildren = convertStatsInParagraph(parent);
            if (!newChildren) return false;

            const paragraphStart = $from.before();
            const paragraphEnd = $from.after();

            // Preserve the original block type (paragraph or heading with attrs)
            const statParagraph = parent.type.create(parent.attrs, newChildren);
            const emptyParagraph = state.schema.nodes.paragraph.create();

            const { tr } = state;
            tr.replaceWith(paragraphStart, paragraphEnd, [statParagraph, emptyParagraph]);

            const contentSize = newChildren.reduce((sum, n) => sum + n.nodeSize, 0);
            const cursorPos = paragraphStart + 1 + contentSize + 1 + 1;
            tr.setSelection(Selection.near(tr.doc.resolve(cursorPos)));

            view.dispatch(tr);
            return true;
          },
        },

        // Auto-convert stat patterns on paste without requiring Enter
        appendTransaction(transactions, _oldState, newState) {
          const isPaste = transactions.some(tr => tr.getMeta('paste'));
          if (!isPaste) return null;

          const { tr } = newState;
          // Collect replacements (pos + newChildren) then apply in reverse order
          // so earlier positions aren't invalidated by later replacements.
          const replacements: { pos: number; end: number; children: import('@tiptap/pm/model').Node[]; node: import('@tiptap/pm/model').Node }[] = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return true;

            const newChildren = convertStatsInParagraph(node);
            if (newChildren) {
              replacements.push({ pos, end: pos + node.nodeSize, children: newChildren, node });
            }
            return false; // don't descend into textblocks
          });

          if (replacements.length === 0) return null;

          // Apply in reverse document order to keep positions stable
          for (let i = replacements.length - 1; i >= 0; i--) {
            const { pos, end, children, node } = replacements[i];
            // Preserve the original block type (paragraph or heading with attrs)
            const newBlock = node.type.create(node.attrs, children);
            tr.replaceWith(tr.mapping.map(pos), tr.mapping.map(end), newBlock);
          }

          return tr;
        },
      }),
    ];
  },

  parseMarkdown() {
    return {
      block: 'statDeclaration',
      getAttrs: (token: StatDeclarationMarkdownToken) => ({
        key: token.key,
        value: token.value,
        projections: token.projections,
      }),
    };
  },

  renderMarkdown({ node }) {
    const key = node.attrs.key || '';
    const value = node.attrs.value || '';
    const projections = (node.attrs.projections as string[]) || [];
    const projectionsPart = projections.length > 0 ? projections.map((p: string) => ` #${p}`).join('') : '';
    return `${key}:: ${value}${projectionsPart}`;
  },
});
