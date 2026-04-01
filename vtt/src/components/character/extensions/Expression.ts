import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ExpressionComponent } from './ExpressionComponent';

const EXPRESSION_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

export interface ExpressionOptions {
  HTMLAttributes: Record<string, string>;
}

export interface ExpressionMarkdownToken {
  type: 'expression';
  raw: string;
  formula: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    expression: {
      insertExpression: (options: { formula: string }) => ReturnType;
      setExpressionFormula: (formula: string) => ReturnType;
    };
  }
}

export const Expression = Node.create<ExpressionOptions>({
  name: 'expression',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      formula: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-formula'),
        renderHTML: (attributes) => ({ 'data-formula': attributes.formula }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-component="expression"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-component': 'expression' }), 0];
  },

  renderText({ node }) {
    const formula = node.attrs.formula || '';
    return `{{ ${formula} }}`;
  },

  addCommands() {
    return {
      insertExpression:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              formula: options.formula,
            },
          });
        },
      setExpressionFormula:
        (formula) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { formula });
        },
    };
  },

  addNodeView() {
    const ExpressionWrapper = (props: ReactNodeViewProps) => {
      return React.createElement(ExpressionComponent, {
        node: props.node as unknown as { attrs: { formula: string } },
        updateAttributes: props.updateAttributes as (attrs: { formula?: string }) => void,
        selected: props.selected,
        extension: props.extension,
      });
    };
    return ReactNodeViewRenderer(ExpressionWrapper);
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;

    return [
      new Plugin({
        key: new PluginKey('expressionPaste'),
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
                EXPRESSION_REGEX.lastIndex = 0;
                let lastIndex = 0;
                let m;

                while ((m = EXPRESSION_REGEX.exec(text)) !== null) {
                  found = true;
                  if (m.index > lastIndex) {
                    newChildren.push(child.cut(lastIndex, m.index));
                  }
                  newChildren.push(nodeType.create({ formula: m[1].trim() }));
                  lastIndex = EXPRESSION_REGEX.lastIndex;
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
        find: /\{\{([^}]+)\}\}$/,
        handler: ({ state, match, range }) => {
          const formula = match[1].trim();
          const start = range.from;
          const end = range.to;

          state.tr.replaceWith(start, end, this.type.create({ formula }));
        },
        undoable: true,
      },
    ];
  },

  parseMarkdown() {
    return {
      block: 'expression',
      getAttrs: (token: ExpressionMarkdownToken) => ({
        formula: token.formula,
      }),
    };
  },

  renderMarkdown({ node }) {
    const formula = node.attrs.formula || '';
    return `{{ ${formula} }}`;
  },
});
