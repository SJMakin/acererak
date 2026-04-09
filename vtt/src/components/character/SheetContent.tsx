import { Button, Group } from '@mantine/core';
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconExternalLink,
} from '@tabler/icons-react';
import { SheetEditor } from './SheetEditor';
import type { ShadowState } from '../../services/shadowStateService';

export type SheetMode = 'modal' | 'floating' | 'window';

interface SheetContentProps {
  content: string;
  contentVersion: number;
  onContentChange: (
    content: string,
    shadowState?: ShadowState,
  ) => void;
  isEditing: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  mode: SheetMode;
  onFloat?: () => void;
  onPopIn?: () => void;
  onPopOutWindow?: () => void;
}

export function SheetContent({
  content,
  contentVersion,
  onContentChange,
  isEditing,
  onSave,
  onDelete,
  onClose,
  mode,
  onFloat,
  onPopIn,
  onPopOutWindow,
}: SheetContentProps) {
  return (
    <>
      {/* Editor */}
      <div className="sheet-modal__editor">
        {/* Toolbar overlay — floats over the h1 area */}
        <div className="sheet-modal__toolbar">
          <div className="sheet-modal__mode-buttons">
            {mode === 'modal' && onFloat && (
              <button
                className="sheet-modal__mode-btn"
                onClick={onFloat}
                aria-label="Float"
                title="Float panel"
              >
                <IconArrowsMaximize size={16} />
              </button>
            )}
            {(mode === 'floating' || mode === 'window') && onPopIn && (
              <button
                className="sheet-modal__mode-btn"
                onClick={onPopIn}
                aria-label="Pop in"
                title="Return to modal"
              >
                <IconArrowsMinimize size={16} />
              </button>
            )}
            {mode !== 'window' && onPopOutWindow && (
              <button
                className="sheet-modal__mode-btn"
                onClick={onPopOutWindow}
                aria-label="Pop out"
                title="Open in new window"
              >
                <IconExternalLink size={16} />
              </button>
            )}
          </div>
          <button
            className="sheet-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <SheetEditor
          key={mode}
          content={content}
          contentVersion={contentVersion}
          onChange={onContentChange}
        />
      </div>

      {/* Footer */}
      <div className="sheet-modal__footer">
        {isEditing ? (
          <Button
            variant="subtle"
            color="red"
            size="sm"
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : (
          <div />
        )}
        <Group gap="sm">
          <Button variant="subtle" color="gray" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" color="violet" size="sm" onClick={onSave}>
            {isEditing ? 'Save Changes' : 'Create Sheet'}
          </Button>
        </Group>
      </div>
    </>
  );
}
