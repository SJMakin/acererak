import React from 'react';
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { TransclusionComponent } from './TransclusionComponent';

export interface TransclusionOptions {
  HTMLAttributes: Record<string, string>;
}

export interface TransclusionMarkdownToken {
  type: 'transclusion';
  raw: string;
  snippetName: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    transclusion: {
      insertTransclusion: (options: { snippetName: string }) => ReturnType;
      setTransclusionSnippet: (snippetName: string) => ReturnType;
    };
  }
}

export const Transclusion = Node.create<TransclusionOptions>({
  name: 'transclusion',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      snippetName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-snippet-name'),
        renderHTML: (attributes) => ({ 'data-snippet-name': attributes.snippetName }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-component="transclusion"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-component': 'transclusion' }), 0];
  },

  addCommands() {
    return {
      insertTransclusion:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              snippetName: options.snippetName,
            },
          });
        },
      setTransclusionSnippet:
        (snippetName) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { snippetName });
        },
    };
  },

  addNodeView() {
    const TransclusionWrapper = (props: ReactNodeViewProps) => {
      return React.createElement(TransclusionComponent, {
        node: props.node as unknown as { attrs: { snippetName: string } },
        updateAttributes: props.updateAttributes as (attrs: { snippetName: string }) => void,
        readOnly: false,
      });
    };
    return ReactNodeViewRenderer(TransclusionWrapper);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const snippetName = match[1];
          const { tr } = state;
          tr.replaceWith(range.from, range.to, [
            this.type.create({ snippetName }),
          ]);
        },
      }),
    ];
  },

  parseMarkdown() {
    return {
      block: 'transclusion',
      getAttrs: (token: TransclusionMarkdownToken) => ({
        snippetName: token.snippetName,
      }),
    };
  },

  renderMarkdown({ node }) {
    const snippetName = node.attrs.snippetName || '';
    return `![[${snippetName}]]`;
  },
});
