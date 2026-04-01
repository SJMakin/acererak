import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Group } from '@mantine/core';
import { useCharacterStore } from '../../stores/characterStore';
import { CharacterSheetContent } from './CharacterSheetContent';
import { FloatingPanel } from './FloatingPanel';
import { WindowPortal } from './WindowPortal';
import type { Character } from '../../types';
import './CharacterSheetModal.css';

const DEFAULT_FLOATING_BOUNDS = {
  x: Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2 - 350),
  y: 80,
  width: 700,
  height: typeof window !== 'undefined' ? window.innerHeight * 0.8 : 700,
};

export function CharacterSheetModal() {
  const {
    addCharacter,
    updateCharacter,
    getCharacterById,
    deleteCharacter,
    sheetCharacterId,
    sheetDisplayMode,
    sheetFloatingBounds,
    closeCharacterSheet,
    setSheetDisplayMode,
    setSheetFloatingBounds,
  } = useCharacterStore();

  const opened = sheetCharacterId !== null;
  const characterId = sheetCharacterId === 'new' ? null : sheetCharacterId;

  const [name, setName] = useState('');
  const [content, setContent] = useState('{"type":"doc","content":[{"type":"paragraph"}]}');
  const [shadowState, setShadowState] = useState<Record<string, number | string>>({});
  const [projections, setProjections] = useState<Character['projections']>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);

  // Window popup ref — must be stored as a ref so WindowPortal can access it
  const popupWindowRef = useRef<Window | null>(null);

  // Close popup on unmount (e.g., navigation away from game)
  useEffect(() => {
    return () => {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
    };
  }, []);

  // Load existing character data
  useEffect(() => {
    if (characterId) {
      const character = getCharacterById(characterId);
      if (character) {
        setName(character.name);
        setContent(character.content);
        setShadowState(character.shadowState);
        setProjections(character.projections);
        setIsEditing(true);
      }
    } else if (opened) {
      const pendingTemplate = localStorage.getItem('pendingTemplate');
      setName('');
      setContent(pendingTemplate || '{"type":"doc","content":[{"type":"paragraph"}]}');
      setShadowState({});
      setProjections({});
      setIsEditing(false);
    }
    setContentVersion((v) => v + 1);
  }, [characterId, opened, getCharacterById]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    if (isEditing && characterId) {
      updateCharacter(characterId, {
        name: name.trim(),
        content,
        shadowState,
        projections,
      });
    } else {
      addCharacter({
        name: name.trim(),
        content,
        shadowState,
        projections,
      });
    }

    // Close popup window if open
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
      popupWindowRef.current = null;
    }
    closeCharacterSheet();
  }, [name, content, shadowState, projections, isEditing, characterId, addCharacter, updateCharacter, closeCharacterSheet]);

  const handleClose = useCallback(() => {
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
      popupWindowRef.current = null;
    }
    localStorage.removeItem('pendingTemplate');
    closeCharacterSheet();
  }, [closeCharacterSheet]);

  const handleDelete = useCallback(() => {
    if (characterId) {
      deleteCharacter(characterId);
      setShowDeleteConfirm(false);
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
        popupWindowRef.current = null;
      }
      closeCharacterSheet();
    }
  }, [characterId, deleteCharacter, closeCharacterSheet]);

  const handleContentChange = useCallback(
    (
      newContent: string,
      newShadowState?: {
        stats: Record<string, string | number>;
        projections: { bar?: string; barMax?: string; badge?: string };
      },
    ) => {
      setContent(newContent);
      if (newShadowState) {
        setShadowState(newShadowState.stats);
        setProjections(newShadowState.projections);
      }
    },
    [],
  );

  // Mode switch handlers
  const handleFloat = useCallback(() => {
    setSheetDisplayMode('floating');
    setContentVersion((v) => v + 1);
  }, [setSheetDisplayMode]);

  const handlePopIn = useCallback(() => {
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
      popupWindowRef.current = null;
    }
    setSheetDisplayMode('modal');
    setContentVersion((v) => v + 1);
  }, [setSheetDisplayMode]);

  const handlePopOutWindow = useCallback(() => {
    // Must call window.open synchronously in click handler to avoid popup blockers
    const popup = window.open('', '_blank', 'popup=yes,width=700,height=800');
    if (!popup) return; // blocked by browser
    popupWindowRef.current = popup;
    setSheetDisplayMode('window');
    setContentVersion((v) => v + 1);
  }, [setSheetDisplayMode]);

  const handleWindowClose = useCallback(() => {
    popupWindowRef.current = null;
    setSheetDisplayMode('modal');
    setContentVersion((v) => v + 1);
  }, [setSheetDisplayMode]);

  if (!opened) return null;

  const floatingBounds = sheetFloatingBounds ?? DEFAULT_FLOATING_BOUNDS;

  const sheetContent = (
    <CharacterSheetContent
      name={name}
      onNameChange={setName}
      content={content}
      contentVersion={contentVersion}
      onContentChange={handleContentChange}
      isEditing={isEditing}
      onSave={handleSave}
      onDelete={() => setShowDeleteConfirm(true)}
      onClose={handleClose}
      mode={sheetDisplayMode}
      onFloat={handleFloat}
      onPopIn={handlePopIn}
      onPopOutWindow={handlePopOutWindow}
    />
  );

  return (
    <>
      {/* Modal mode */}
      {sheetDisplayMode === 'modal' && (
        <Modal
          opened
          onClose={handleClose}
          size="xl"
          withCloseButton={false}
          trapFocus={false}
          closeOnEscape={false}
          padding={0}
          radius="lg"
          classNames={{
            content: 'character-sheet-modal',
            body: 'character-sheet-modal__body',
            overlay: 'character-sheet-modal__overlay',
          }}
          overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}
        >
          {sheetContent}
        </Modal>
      )}

      {/* Floating panel mode */}
      {sheetDisplayMode === 'floating' && (
        <FloatingPanel
          defaultBounds={floatingBounds}
          onBoundsChange={setSheetFloatingBounds}
        >
          {sheetContent}
        </FloatingPanel>
      )}

      {/* Window mode */}
      {sheetDisplayMode === 'window' && (
        <WindowPortal windowRef={popupWindowRef} onClose={handleWindowClose}>
          <div className="character-sheet-modal" style={{ height: '100vh', maxHeight: '100vh' }}>
            {sheetContent}
          </div>
        </WindowPortal>
      )}

      {/* Delete Confirmation — always in parent document */}
      <Modal
        opened={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Character?"
        size="sm"
        centered
      >
        <p style={{ color: '#a0a0b0', margin: '0 0 20px 0' }}>
          Are you sure you want to delete &ldquo;{name}&rdquo;? This action cannot be undone.
        </p>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
}
