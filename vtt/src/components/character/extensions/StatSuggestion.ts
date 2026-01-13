import { Extension, Editor } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { SuggestionMenu, STAT_SUGGESTIONS, SuggestionItem } from './SuggestionMenu';

interface CommandProps {
  editor: Editor;
  range: { from: number; to: number };
  item: SuggestionItem;
}

interface SuggestionConfig {
  char: string;
  command: (props: CommandProps) => void;
  items: (options: { query: string }) => SuggestionItem[];
  render: () => {
    onStart: (props: { editor: Editor; clientRect: () => DOMRect }) => void;
    onUpdate: (props: { editor: Editor }) => void;
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
    onExit: () => void;
  };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    statSuggestion: {
      insertStatSuggestion: (options: { stat: string }) => ReturnType;
    };
  }
}

export const StatSuggestion = Extension.create({
  name: 'statSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: ':',
        command: ({ editor, range }) => {
          // Get the text before the colon
          const { from } = range;
          const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from);
          
          // Check if we're in a "Key::" pattern (we already have one colon, add another)
          const match = textBefore.match(/(\w+):$/);
          if (match) {
            // Insert the second colon and space
            editor.commands.insertContent(': ');
          } else if (textBefore.trim() === '') {
            // If nothing before, just insert ":: "
            editor.commands.insertContent(':: ');
          }
        },
        items: ({ query }) => {
          return STAT_SUGGESTIONS.filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: { destroy: () => void } | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SuggestionMenu, {
                props,
                editor: props.editor,
              });

              const { editor, clientRect } = props;
              if (!clientRect || !editor) return;

              const rect = clientRect();
              popup = {
                destroy: () => {
                  component?.destroy();
                  popup = null;
                },
              };
            },

            onUpdate: (props) => {
              component?.updateProps(props);
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.destroy();
                return true;
              }
              return (component?.ref as { onKeyDown: (event: KeyboardEvent) => boolean })?.onKeyDown(props.event) ?? false;
            },

            onExit: () => {
              popup?.destroy();
              component = null;
              popup = null;
            },
          };
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertStatSuggestion:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'text',
            text: options.stat,
          });
        },
    };
  },
});

// Auto-complete extension that triggers after "::"
export const StatDeclarationCompletion = Extension.create({
  name: 'statDeclarationCompletion',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: ' ',
        command: ({ editor, range }) => {
          // Get text around cursor
          const { from } = range;
          const textBefore = editor.state.doc.textBetween(Math.max(0, from - 100), from);
          
          // Check if we just typed ":: " (stat declaration trigger)
          if (textBefore.endsWith(':: ')) {
            // Show suggestions - the suggestion plugin will handle it
          }
        },
        items: ({ query }) => {
          // If query is empty after ":: ", show all stats
          if (!query.trim()) {
            return STAT_SUGGESTIONS;
          }
          return STAT_SUGGESTIONS.filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: { destroy: () => void } | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SuggestionMenu, {
                props,
                editor: props.editor,
              });

              const { editor, clientRect } = props;
              if (!clientRect || !editor) return;

              popup = {
                destroy: () => {
                  component?.destroy();
                  popup = null;
                },
              };
            },

            onUpdate: (props) => {
              component?.updateProps(props);
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.destroy();
                return true;
              }
              return (component?.ref as { onKeyDown: (event: KeyboardEvent) => boolean })?.onKeyDown(props.event) ?? false;
            },

            onExit: () => {
              popup?.destroy();
              component = null;
              popup = null;
            },
          };
        },
      }),
    ];
  },
});
