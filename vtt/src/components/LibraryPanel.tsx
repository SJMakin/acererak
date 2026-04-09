import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Paper,
  Text,
  Group,
  ActionIcon,
  Badge,
  ScrollArea,
  Tooltip,
  Button,
} from '@mantine/core';
import { useSheetStore } from '../stores/sheetStore';
import { useGameStore } from '../stores/gameStore';
import type {
  TokenElement,
  CanvasElement,
  Sheet,
} from '../types';

interface LibraryPanelProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
  };
}

// ---------------------------------------------------------------------------
// Inline rename input
// ---------------------------------------------------------------------------

function InlineRename({
  initialName,
  onConfirm,
  onCancel,
}: {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = ref.current?.value.trim();
      onConfirm(val || initialName);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={ref}
      defaultValue={initialName}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const val = ref.current?.value.trim();
        onConfirm(val || initialName);
      }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(124, 58, 237, 0.4)',
        borderRadius: 4,
        color: '#e8e8f0',
        fontSize: 13,
        padding: '2px 6px',
        width: '100%',
        outline: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ---------------------------------------------------------------------------
// Folder tree item (recursive)
// ---------------------------------------------------------------------------

function FolderTreeItem({
  folder,
  allSheets,
  depth,
  expanded,
  onToggle,
  onOpenSheet,
  onDeleteSheet,
  onPlaceToken,
  onMoveItem,
  dragId,
  dropTargetId,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDropOnFolder,
  renamingId,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  expandedSet,
  activeScene,
}: {
  folder: Sheet;
  allSheets: Sheet[];
  depth: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onOpenSheet: (id: string) => void;
  onDeleteSheet: (id: string, e: React.MouseEvent) => void;
  onPlaceToken: (sheet: Sheet, e: React.MouseEvent) => void;
  onMoveItem: (id: string, parentId: string | null) => void;
  dragId: string | null;
  dropTargetId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverFolder: (id: string) => void;
  onDropOnFolder: (id: string) => void;
  renamingId: string | null;
  onStartRename: (id: string) => void;
  onConfirmRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  expandedSet: Set<string>;
  activeScene: { gridSettings: { cellSize: number }; elements: unknown[] } | undefined;
}) {
  const children = allSheets.filter((s) => s.parentId === folder.id);
  const childFolders = children.filter((s) => s.isFolder);
  const childSheets = children.filter((s) => !s.isFolder);
  const isDropTarget = dropTargetId === folder.id && dragId !== folder.id;

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {/* Folder header */}
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(folder.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOverFolder(folder.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropOnFolder(folder.id);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 6px',
          borderRadius: 6,
          cursor: 'pointer',
          background: isDropTarget ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
          border: isDropTarget ? '1px dashed rgba(124, 58, 237, 0.4)' : '1px solid transparent',
          transition: 'background 0.15s, border 0.15s',
        }}
        onClick={() => onToggle(folder.id)}
      >
        <Text size="xs" c="dimmed" style={{ width: 14, flexShrink: 0, userSelect: 'none' }}>
          {expanded ? '▼' : '▶'}
        </Text>
        <Text size="xs" style={{ flexShrink: 0, userSelect: 'none' }}>📁</Text>
        <div style={{ flex: 1, minWidth: 0 }}>
          {renamingId === folder.id ? (
            <InlineRename
              initialName={folder.name}
              onConfirm={(name) => onConfirmRename(folder.id, name)}
              onCancel={onCancelRename}
            />
          ) : (
            <Text
              size="sm"
              fw={500}
              truncate
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartRename(folder.id);
              }}
            >
              {folder.name}
            </Text>
          )}
        </div>
        <Tooltip label="Delete folder">
          <ActionIcon
            size="xs"
            variant="subtle"
            color="red"
            onClick={(e) => onDeleteSheet(folder.id, e)}
          >
            ×
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Children */}
      {expanded && (
        <div style={{ paddingLeft: 8 }}>
          {childFolders.map((f) => (
            <FolderTreeItem
              key={f.id}
              folder={f}
              allSheets={allSheets}
              depth={depth + 1}
              expanded={expandedSet.has(f.id)}
              onToggle={onToggle}
              onOpenSheet={onOpenSheet}
              onDeleteSheet={onDeleteSheet}
              onPlaceToken={onPlaceToken}
              onMoveItem={onMoveItem}
              dragId={dragId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverFolder={onDragOverFolder}
              onDropOnFolder={onDropOnFolder}
              renamingId={renamingId}
              onStartRename={onStartRename}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              expandedSet={expandedSet}
              activeScene={activeScene}
            />
          ))}
          {childSheets.map((sheet) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              onOpen={onOpenSheet}
              onDelete={onDeleteSheet}
              onPlace={onPlaceToken}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              dragId={dragId}
            />
          ))}
          {childFolders.length === 0 && childSheets.length === 0 && (
            <Text size="xs" c="dimmed" pl={22} py={2}>Empty</Text>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheet card (leaf item)
// ---------------------------------------------------------------------------

function SheetCard({
  sheet,
  onOpen,
  onDelete,
  onPlace,
  onDragStart,
  onDragEnd,
  dragId,
}: {
  sheet: Sheet;
  onOpen: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onPlace: (sheet: Sheet, e: React.MouseEvent) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dragId: string | null;
}) {
  return (
    <Paper
      p="xs"
      withBorder
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(sheet.id);
      }}
      onDragEnd={onDragEnd}
      style={{
        cursor: 'pointer',
        opacity: dragId === sheet.id ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
      onClick={() => onOpen(sheet.id)}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>
              {sheet.name}
            </Text>
            {sheet.tags && sheet.tags.length > 0 && (
              <Group gap={6}>
                {sheet.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} size="xs" variant="light" color="gray">{tag}</Badge>
                ))}
                {sheet.tags.length > 2 && (
                  <Badge size="xs" variant="light" color="gray">+{sheet.tags.length - 2}</Badge>
                )}
              </Group>
            )}
          </Stack>
        </Group>
        <Group gap={4}>
          <Tooltip label="Place on map">
            <ActionIcon
              size="sm"
              variant="light"
              color="green"
              onClick={(e) => onPlace(sheet, e)}
            >
              +
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon
              size="sm"
              variant="light"
              color="red"
              onClick={(e) => onDelete(sheet.id, e)}
            >
              ×
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function LibraryPanel({ room }: LibraryPanelProps) {
  const { sheets, deleteSheet, openSheet, addFolder, moveItem, updateSheet } = useSheetStore();
  const { game, addElement } = useGameStore();

  const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Filter sheets by search
  const filteredSheets = useMemo(() => {
    if (!searchQuery.trim()) return null; // null = show tree
    const q = searchQuery.toLowerCase();
    return sheets.filter(s =>
      !s.isFolder && (
        s.name.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      )
    );
  }, [sheets, searchQuery]);

  const rootFolders = useMemo(
    () => sheets.filter(s => s.isFolder && !s.parentId),
    [sheets],
  );
  const rootSheets = useMemo(
    () => sheets.filter(s => !s.isFolder && !s.parentId),
    [sheets],
  );

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSheet = useCallback((sheetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = sheets.find(s => s.id === sheetId);
    const label = item?.isFolder ? 'folder and all its contents' : 'sheet';
    if (confirm(`Delete this ${label}? This cannot be undone.`)) {
      deleteSheet(sheetId);
    }
  }, [sheets, deleteSheet]);

  const handlePlaceToken = useCallback((sheet: Sheet, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!game || !activeScene) return;

    const cellSize = activeScene.gridSettings.cellSize;
    const newToken: Omit<TokenElement, 'id'> = {
      type: 'token',
      layer: 'token',
      name: sheet.name,
      imageUrl: '',
      x: cellSize * 5,
      y: cellSize * 5,
      width: 1,
      height: 1,
      visibleTo: 'all',
      locked: false,
      zIndex: activeScene.elements.length,
      sheetId: sheet.id,
    };

    const id = addElement(newToken);
    const fullToken = { ...newToken, id } as TokenElement;
    room.broadcastElementUpdate(fullToken);
  }, [game, activeScene, addElement, room]);

  const handleNewFolder = useCallback(() => {
    const id = addFolder('New Folder');
    setExpandedFolders((prev) => new Set(prev));
    setRenamingId(id);
  }, [addFolder]);

  const handleConfirmRename = useCallback((id: string, name: string) => {
    updateSheet(id, { name });
    setRenamingId(null);
  }, [updateSheet]);

  // Drag-drop handlers
  const handleDragStart = useCallback((id: string) => setDragId(id), []);
  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetId(null);
  }, []);
  const handleDragOverFolder = useCallback((id: string) => setDropTargetId(id), []);
  const handleDropOnFolder = useCallback((folderId: string) => {
    if (dragId && dragId !== folderId) {
      moveItem(dragId, folderId);
    }
    setDragId(null);
    setDropTargetId(null);
  }, [dragId, moveItem]);

  const handleDropOnRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragId) {
      moveItem(dragId, null);
    }
    setDragId(null);
    setDropTargetId(null);
  }, [dragId, moveItem]);

  const totalSheets = sheets.filter(s => !s.isFolder).length;

  return (
    <Stack gap="sm">
      {/* Create buttons */}
      <Group gap="xs">
        <Button
          variant="light"
          color="violet"
          size="xs"
          onClick={() => openSheet('new')}
          style={{ flex: 1 }}
        >
          + New Sheet
        </Button>
        <Button
          variant="light"
          color="gray"
          size="xs"
          onClick={handleNewFolder}
        >
          + Folder
        </Button>
      </Group>

      {/* Search */}
      <TextInput
        placeholder="Search sheets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="xs"
      />

      {/* Tree / Search results */}
      <ScrollArea
        h="calc(100vh - 280px)"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnRoot}
      >
        <Stack gap="xs">
          {filteredSheets !== null ? (
            // Flat search results
            <>
              {filteredSheets.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  No matching sheets
                </Text>
              )}
              {filteredSheets.map((sheet) => (
                <SheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onOpen={openSheet}
                  onDelete={handleDeleteSheet}
                  onPlace={handlePlaceToken}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  dragId={dragId}
                />
              ))}
            </>
          ) : (
            // Tree view
            <>
              {rootFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  allSheets={sheets}
                  depth={0}
                  expanded={expandedFolders.has(folder.id)}
                  onToggle={toggleFolder}
                  onOpenSheet={openSheet}
                  onDeleteSheet={handleDeleteSheet}
                  onPlaceToken={handlePlaceToken}
                  onMoveItem={moveItem}
                  dragId={dragId}
                  dropTargetId={dropTargetId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOverFolder={handleDragOverFolder}
                  onDropOnFolder={handleDropOnFolder}
                  renamingId={renamingId}
                  onStartRename={setRenamingId}
                  onConfirmRename={handleConfirmRename}
                  onCancelRename={() => setRenamingId(null)}
                  expandedSet={expandedFolders}
                  activeScene={activeScene}
                />
              ))}
              {rootSheets.map((sheet) => (
                <SheetCard
                  key={sheet.id}
                  sheet={sheet}
                  onOpen={openSheet}
                  onDelete={handleDeleteSheet}
                  onPlace={handlePlaceToken}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  dragId={dragId}
                />
              ))}
              {rootFolders.length === 0 && rootSheets.length === 0 && (
                <Stack align="center" py="xl" gap="xs">
                  <Text size="sm" c="dimmed" ta="center">
                    No sheets yet
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    Create a sheet to get started
                  </Text>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </ScrollArea>

      {/* Item count */}
      <Text size="xs" c="dimmed" ta="center">
        {totalSheets} sheet{totalSheets !== 1 ? 's' : ''}
      </Text>
    </Stack>
  );
}
