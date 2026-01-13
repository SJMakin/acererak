import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ExpressionComponent } from './ExpressionComponent';

export interface ExpressionOptions {
  HTMLAttributes: Record<string, string>;
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
    return ReactNodeViewRenderer(ExpressionComponent);
  },
});
