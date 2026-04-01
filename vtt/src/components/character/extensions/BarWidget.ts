import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { BarWidgetComponent } from './BarWidgetComponent';

const BAR_REGEX = /\[bar:\s*([^/\]]+)\/([^\]]+)\]/g;

export interface BarWidgetMarkdownToken {
  type: 'barWidget';
  raw: string;
  current: string;
  max: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    barWidget: {
      insertBarWidget: (attrs: { current: string; max: string }) => ReturnType;
      setBarWidgetValue: (attrs: { current: number; max: number }) => ReturnType;
    };
  }
}

export const BarWidget = Node.create({
  name: 'barWidget',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      current: {
        default: '0',
        parseHTML: (element) => element.getAttribute('data-current'),
        renderHTML: (attributes) => ({
          'data-current': attributes.current,
        }),
      },
      max: {
        default: '100',
        parseHTML: (element) => element.getAttribute('data-max'),
        renderHTML: (attributes) => ({
          'data-max': attributes.max,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-widget="bar"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-widget': 'bar' })];
  },

  renderText({ node }) {
    const current = node.attrs.current || '0';
    const max = node.attrs.max || '100';
    return `[bar: ${current}/${max}]`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(BarWidgetComponent);
  },

  addCommands() {
    return {
      insertBarWidget:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      setBarWidgetValue:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;

    return [
      new Plugin({
        key: new PluginKey('barWidgetPaste'),
        appendTransaction(transactions, _oldState, newState) {
          const isPaste = transactions.some(tr => tr.getMeta('paste'));
          if (!isPaste) return null;

          const { tr } = newState;
          const replacements: { pos: number; end: number; children: import('@tiptap/pm/model').Node[]; node: import('@tiptap/pm/model').Node }[] = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return true;

            let found = false;
            const newChildren: import('@tiptap/pm/model').Node[] = [];

            node.forEach((child) => {
              if (child.isText && child.text) {
                const text = child.text;
                BAR_REGEX.lastIndex = 0;
                let lastIndex = 0;
                let m;

                while ((m = BAR_REGEX.exec(text)) !== null) {
                  found = true;
                  if (m.index > lastIndex) {
                    newChildren.push(child.cut(lastIndex, m.index));
                  }
                  newChildren.push(nodeType.create({ current: m[1].trim(), max: m[2].trim() }));
                  lastIndex = BAR_REGEX.lastIndex;
                }

                if (lastIndex < text.length) {
                  newChildren.push(child.cut(lastIndex, text.length));
                }
              } else {
                newChildren.push(child);
              }
            });

            if (found) {
              replacements.push({ pos, end: pos + node.nodeSize, children: newChildren, node });
            }
            return false;
          });

          if (replacements.length === 0) return null;

          for (let i = replacements.length - 1; i >= 0; i--) {
            const { pos, end, children, node } = replacements[i];
            const newBlock = node.type.create(node.attrs, children);
            tr.replaceWith(tr.mapping.map(pos), tr.mapping.map(end), newBlock);
          }

          return tr;
        },
      }),
    ];
  },

  addInputRules() {
    return [
      {
        find: /\[bar:\s*([^/]+)\/([^\]]+)\]$/,
        handler: ({ state, match, range }) => {
          const current = match[1].trim();
          const max = match[2].trim();
          const start = range.from;
          const end = range.to;

          state.tr.replaceWith(start, end, this.type.create({ current, max }));
        },
        undoable: true,
      },
    ];
  },

  parseMarkdown() {
    return {
      block: 'barWidget',
      getAttrs: (token: BarWidgetMarkdownToken) => ({
        current: token.current,
        max: token.max,
      }),
    };
  },

  renderMarkdown({ node }) {
    const current = node.attrs.current || '0';
    const max = node.attrs.max || '100';
    return `[bar: ${current}/${max}]`;
  },
});
