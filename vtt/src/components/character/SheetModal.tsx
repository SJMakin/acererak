import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Group } from '@mantine/core';
import { useSheetStore } from '../../stores/sheetStore';
import { SheetContent } from './SheetContent';
import { FloatingPanel } from './FloatingPanel';
import { WindowPortal } from './WindowPortal';
import type { Sheet } from '../../types';
import './SheetModal.css';

const DEFAULT_FLOATING_BOUNDS = {
  x: Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2 - 350),
  y: 80,
  width: 700,
  height: typeof window !== 'undefined' ? window.innerHeight * 0.8 : 700,
};

export function SheetModal() {
  const {
    addSheet,
    updateSheet,
    getSheetById,
    deleteSheet,
    sheetId,
    sheetDisplayMode,
    sheetFloatingBounds,
    closeSheet,
    setSheetDisplayMode,
    setSheetFloatingBounds,
  } = useSheetStore();

  const opened = sheetId !== null;
  const currentSheetId = sheetId === 'new' ? null : sheetId;

  const [name, setName] = useState('');
  const [content, setContent] = useState('{"type":"doc","content":[{"type":"paragraph"}]}');
  const [shadowState, setShadowState] = useState<Record<string, number | string>>({});
  const [projections, setProjections] = useState<Sheet['projections']>({});
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

  // Load existing sheet data
  useEffect(() => {
    if (currentSheetId) {
      const sheet = getSheetById(currentSheetId);
      if (sheet) {
        setName(sheet.name);
        setContent(sheet.content);
        setShadowState(sheet.shadowState);
        setProjections(sheet.projections);
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
  }, [currentSheetId, opened, getSheetById]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    if (isEditing && currentSheetId) {
      updateSheet(currentSheetId, {
        name: name.trim(),
        content,
        shadowState,
        projections,
      });
    } else {
      addSheet({
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
    closeSheet();
  }, [name, content, shadowState, projections, isEditing, currentSheetId, addSheet, updateSheet, closeSheet]);

  const handleClose = useCallback(() => {
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
      popupWindowRef.current = null;
    }
    localStorage.removeItem('pendingTemplate');
    closeSheet();
  }, [closeSheet]);

  const handleDelete = useCallback(() => {
    if (currentSheetId) {
      deleteSheet(currentSheetId);
      setShowDeleteConfirm(false);
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
        popupWindowRef.current = null;
      }
      closeSheet();
    }
  }, [currentSheetId, deleteSheet, closeSheet]);

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
    <SheetContent
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
            content: 'sheet-modal',
            body: 'sheet-modal__body',
            overlay: 'sheet-modal__overlay',
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
          <div className="sheet-modal" style={{ height: '100vh', maxHeight: '100vh' }}>
            {sheetContent}
          </div>
        </WindowPortal>
      )}

      {/* Delete Confirmation — always in parent document */}
      <Modal
        opened={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Sheet?"
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
