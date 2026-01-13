import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DotsWidgetComponent } from './DotsWidgetComponent';

declare module '@tiptap/core' {
  interface ReactNodeViewProps {
    shadowState?: Record<string, number | string>;
    onUpdateStat?: (key: string, newValue: string | number) => void;
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dotsWidget: {
      insertDotsWidget: (attrs: { current: string; max: string }) => ReturnType;
      setDotsWidgetValue: (attrs: { current: number; max: number }) => ReturnType;
    };
  }
}

export const DotsWidget = Node.create({
  name: 'dotsWidget',
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
        default: '5',
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
        tag: 'span[data-widget="dots"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-widget': 'dots' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DotsWidgetComponent);
  },

  addCommands() {
    return {
      insertDotsWidget:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      setDotsWidgetValue:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },

  addInputRules() {
    return [
      {
        find: /\[dots:\s*([^\/]+)\/([^\]]+)\]/g,
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
