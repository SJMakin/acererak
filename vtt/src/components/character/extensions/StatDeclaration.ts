import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { StatDeclarationComponent } from './StatDeclarationComponent';

export interface StatDeclarationOptions {
  HTMLAttributes: Record<string, string>;
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
    return ReactNodeViewRenderer(StatDeclarationComponent);
  },
});
