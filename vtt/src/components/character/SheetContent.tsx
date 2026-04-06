import { useRef, useCallback } from 'react';
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
  name: string;
  onNameChange: (name: string) => void;
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
  name,
  onNameChange,
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
  const titleRef = useRef<HTMLInputElement>(null);

  const handleSaveClick = useCallback(() => {
    if (!name.trim()) {
      titleRef.current?.focus();
      return;
    }
    onSave();
  }, [name, onSave]);

  return (
    <>
      {/* Header */}
      <div className="sheet-modal__header">
        <input
          ref={titleRef}
          className="sheet-modal__title"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Untitled Sheet"
          spellCheck={false}
        />

        <div className="sheet-modal__mode-buttons">
          {/* Float / Pop-in toggle */}
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

          {/* Pop out to window */}
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

      {/* Editor */}
      <div className="sheet-modal__editor">
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
          <Button variant="filled" color="violet" size="sm" onClick={handleSaveClick}>
            {isEditing ? 'Save Changes' : 'Create Sheet'}
          </Button>
        </Group>
      </div>
    </>
  );
}
