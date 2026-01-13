import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BarWidgetComponent } from './BarWidgetComponent';

// Extend ReactNodeViewProps to include our custom props
declare module '@tiptap/core' {
  interface ReactNodeViewProps {
    shadowState?: Record<string, number | string>;
    onUpdateStat?: (key: string, newValue: string | number) => void;
  }
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

  addInputRules() {
    return [
      {
        find: /\[bar:\s*([^\/]+)\/([^\]]+)\]/g,
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
});
