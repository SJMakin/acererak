import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ActionButtonComponent } from './ActionButtonComponent';

export interface ActionButtonOptions {
  HTMLAttributes: Record<string, string>;
}

export interface ActionButtonAttributes {
  label: string;
  action: string;
  cost?: string;
}

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
    return ReactNodeViewRenderer(ActionButtonComponent);
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
