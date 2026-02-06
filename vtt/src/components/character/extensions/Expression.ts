import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { ExpressionComponent } from './ExpressionComponent';

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

  addInputRules() {
    return [
      {
        find: /\{\{([^}]+)\}\}/g,
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
