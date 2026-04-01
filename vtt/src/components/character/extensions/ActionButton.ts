import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ActionButtonComponent } from './ActionButtonComponent';

const ACTION_BUTTON_REGEX = /\[([^\]]+)\]\(action:\s*([^)]+)\)/g;

export interface ActionButtonOptions {
  HTMLAttributes: Record<string, string>;
}

export interface ActionButtonAttributes {
  label: string;
  action: string;
  cost?: string;
}

export interface ActionButtonMarkdownToken {
  type: 'actionButton';
  raw: string;
  label: string;
  action: string;
  cost?: string;
}

// Wrapper component to bridge ReactNodeViewProps to our custom component
const ActionButtonWrapper = (props: ReactNodeViewProps) => {
  return React.createElement(ActionButtonComponent, {
    node: props.node as ProseMirrorNode & { attrs: { label: string; action: string; cost?: string } },
    updateAttributes: props.updateAttributes as (attrs: { label?: string; action?: string; cost?: string }) => void,
    selected: props.selected,
    extension: props.extension,
  });
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    actionButton: {
      insertActionButton: (options: { label: string; action: string; cost?: string }) => ReturnType;
      setActionButtonLabel: (label: string) => ReturnType;
      setActionButtonAction: (action: string) => ReturnType;
      setActionButtonCost: (cost?: string) => ReturnType;
    };
  }
}

export const ActionButton = Node.create<ActionButtonOptions>({
  name: 'actionButton',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: 'Action',
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => ({ 'data-label': attributes.label }),
      },
      action: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-action'),
        renderHTML: (attributes) => ({ 'data-action': attributes.action }),
      },
      cost: {
        default: undefined,
        parseHTML: (element) => element.getAttribute('data-cost') || undefined,
        renderHTML: (attributes) => ({ 'data-cost': attributes.cost }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'button[data-component="action-button"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['button', mergeAttributes(HTMLAttributes, { 'data-component': 'action-button' }), 0];
  },

  renderText({ node }) {
    const label = node.attrs.label || 'Action';
    const action = node.attrs.action || '';
    const cost = node.attrs.cost;
    const costPart = cost ? `; cost: ${cost}` : '';
    return `[${label}](action: ${action}${costPart})`;
  },

  addCommands() {
    return {
      insertActionButton:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              label: options.label,
              action: options.action,
              cost: options.cost,
            },
          });
        },
      setActionButtonLabel:
        (label) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { label });
        },
      setActionButtonAction:
        (action) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { action });
        },
      setActionButtonCost:
        (cost) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { cost });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ActionButtonWrapper);
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;

    function parseActionMatch(match: RegExpExecArray) {
      const label = match[1].trim();
      const actionPart = match[2].trim();
      const costMatch = actionPart.match(/;\s*cost:\s*(.+)/i);
      let action = actionPart;
      let cost: string | undefined;
      if (costMatch) {
        action = actionPart.replace(/;\s*cost:\s*.+/i, '').trim();
        cost = costMatch[1].trim();
      }
      return { label, action, cost };
    }

    return [
      new Plugin({
        key: new PluginKey('actionButtonPaste'),
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
                ACTION_BUTTON_REGEX.lastIndex = 0;
                let lastIndex = 0;
                let m;

                while ((m = ACTION_BUTTON_REGEX.exec(text)) !== null) {
                  found = true;
                  if (m.index > lastIndex) {
                    newChildren.push(child.cut(lastIndex, m.index));
                  }
                  const { label, action, cost } = parseActionMatch(m);
                  newChildren.push(nodeType.create({ label, action, cost }));
                  lastIndex = ACTION_BUTTON_REGEX.lastIndex;
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
        find: /\[([^\]]+)\]\(action:\s*([^)]+)\)$/,
        handler: ({ state, match, range }) => {
          const label = match[1].trim();
          const actionPart = match[2].trim();

          // Check for cost parameter
          const costMatch = actionPart.match(/;\s*cost:\s*(\w+)/i);
          let action = actionPart;
          let cost: string | undefined;

          if (costMatch) {
            action = actionPart.replace(/;\s*cost:\s*\w+/i, '').trim();
            cost = costMatch[1];
          }

          const start = range.from;
          const end = range.to;

          state.tr.replaceWith(start, end, this.type.create({ label, action, cost }));
        },
        undoable: true,
      },
    ];
  },

  parseMarkdown() {
    return {
      block: 'actionButton',
      getAttrs: (token: ActionButtonMarkdownToken) => ({
        label: token.label,
        action: token.action,
        cost: token.cost,
      }),
    };
  },

  renderMarkdown({ node }) {
    const label = node.attrs.label || 'Action';
    const action = node.attrs.action || '';
    const cost = node.attrs.cost;
    const costPart = cost ? `; cost: ${cost}` : '';
    return `[${label}](action: ${action}${costPart})`;
  },
});

/**
 * Parse action button syntax from text
 * Format: [Label](action: diceFormula) or [Label](action: diceFormula; cost: Variable)
 */
export function parseActionButtonSyntax(text: string): { label: string; action: string; cost?: string } | null {
  // Match [Label](action: formula) or [Label](action: formula; cost: Variable)
  const regex = /\[([^\]]+)\]\(action:\s*([^)]+)\)/;
  const match = text.match(regex);
  
  if (!match) return null;
  
  const label = match[1].trim();
  const actionPart = match[2].trim();
  
  // Check for cost parameter
  const costMatch = actionPart.match(/;\s*cost:\s*(\w+)/i);
  let action = actionPart;
  let cost: string | undefined;
  
  if (costMatch) {
    action = actionPart.replace(/;\s*cost:\s*\w+/i, '').trim();
    cost = costMatch[1];
  }
  
  return { label, action, cost };
}
