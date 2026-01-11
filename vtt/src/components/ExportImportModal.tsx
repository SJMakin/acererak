import { useState, useEffect, useMemo } from 'react';
import { nanoid } from 'nanoid';
import {
  Modal,
  Tabs,
  Stack,
  Checkbox,
  Button,
  Group,
  Text,
  Paper,
  ScrollArea,
  Divider,
  Collapse,
  Badge,
  SegmentedControl,
  Alert,
  FileButton,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useLibraryStore } from '../stores/libraryStore';
import type {
  GameState,
  CanvasElement,
  LibraryItem,
  CampaignNote,
  GameExport,
  Scene,
  CombatTracker,
  ChatMessage,
} from '../types';

// Current export format version
const EXPORT_VERSION = 3;

// Enhanced export format with selective data (v3)
interface EnhancedExport {
  version: 3;
  exportedAt: string;
  format: 'full' | 'selective';
  // Scenes (new for v3)
  scenes?: Scene[];
  // Global state (persists across scenes)
  combat?: CombatTracker;
  chatMessages?: ChatMessage[];
  campaignNotes?: CampaignNote[];
  libraryItems?: LibraryItem[];
}

// Legacy v2 format for backward compatibility
interface EnhancedExportV2 {
  version: 2;
  exportedAt: string;
  format: 'full' | 'selective';
  gameSettings?: {
    gridSettings?: GameState['gridSettings'];
    fogOfWar?: GameState['fogOfWar'];
  };
  elements?: {
    tokens: CanvasElement[];
    images: CanvasElement[];
    shapes: CanvasElement[];
    text: CanvasElement[];
  };
  campaignNotes?: CampaignNote[];
  libraryItems?: LibraryItem[];
  combat?: GameState['combat'];
}

interface SelectionState {
  // Scenes
  scenes: Set<string>;
  allScenes: boolean;
  // Campaign notes
  campaignNotes: Set<string>;
  allNotes: boolean;
  // Library items
  libraryItems: Set<string>;
  allLibrary: boolean;
  // Combat
  combat: boolean;
  // Chat messages
  chatMessages: boolean;
}

interface ExportImportModalProps {
  opened: boolean;
  onClose: () => void;
  mode: 'export' | 'import';
  onImportComplete?: () => void;
  room?: {
    broadcastSync: () => void;
  };
}

interface TreeItemProps {
  label: string;
  icon: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
  count?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

function TreeItem({
  label,
  icon,
  checked,
  indeterminate,
  onChange,
  children,
  count,
  expanded,
  onToggleExpand,
}: TreeItemProps) {
  return (
    <div>
      <Group
        gap="xs"
        style={{ cursor: children ? 'pointer' : 'default' }}
        onClick={children && onToggleExpand ? onToggleExpand : undefined}
      >
        {children && (
          <Text size="xs" c="dimmed" style={{ width: 16 }}>
            {expanded ? '▼' : '▶'}
          </Text>
        )}
        {!children && <div style={{ width: 16 }} />}
        <Checkbox
          size="xs"
          checked={checked}
          indeterminate={indeterminate}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.currentTarget.checked);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <Text size="sm">
          {icon} {label}
        </Text>
        {count !== undefined && (
          <Badge size="xs" variant="light">
            {count}
          </Badge>
        )}
      </Group>
      {children && (
        <Collapse in={expanded ?? false}>
          <Stack gap={4} pl={32} mt={4}>
            {children}
          </Stack>
        </Collapse>
      )}
    </div>
  );
}

export default function ExportImportModal({
  opened,
  onClose,
  mode: initialMode,
  onImportComplete,
  room,
}: ExportImportModalProps) {
  const { game } = useGameStore();
  const { items: libraryItems } = useLibraryStore();
  
  const [activeTab, setActiveTab] = useState<string | null>(initialMode);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importData, setImportData] = useState<EnhancedExport | GameExport | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  
  // Expanded state for tree sections
  const [expanded, setExpanded] = useState({
    scenes: true,
    notes: false,
    library: false,
    global: false,
  });
  
  // Selection state for export
  const [selection, setSelection] = useState<SelectionState>({
    scenes: new Set(),
    allScenes: true,
    campaignNotes: new Set(),
    allNotes: true,
    libraryItems: new Set(),
    allLibrary: false,
    combat: true,
    chatMessages: false,
  });
  
  const scenes = game?.scenes || [];
  const campaignNotes = game?.campaignNotes || [];
  const chatMessages = game?.chatMessages || [];
  
  // Track if we've initialized for this modal session
  const [initialized, setInitialized] = useState(false);
  
  // Initialize selection with all scenes when opening (only once per modal open)
  useEffect(() => {
    if (opened && game && !initialized) {
      const notes = game.campaignNotes || [];
      
      setSelection({
        scenes: new Set(game.scenes.map((s) => s.id)),
        allScenes: true,
        campaignNotes: new Set(notes.map((n) => n.id)),
        allNotes: true,
        libraryItems: new Set(),
        allLibrary: false,
        combat: true,
        chatMessages: false,
      });
      setInitialized(true);
    }
    
    // Reset initialized flag when modal closes
    if (!opened) {
      setInitialized(false);
    }
  }, [opened, game, initialized]);
  
  // Toggle all items of a type
  const toggleAllOfType = (
    type: 'scenes' | 'campaignNotes' | 'libraryItems',
    items: { id: string }[],
    allKey: 'allScenes' | 'allNotes' | 'allLibrary'
  ) => {
    setSelection((prev) => {
      const newAll = !prev[allKey];
      return {
        ...prev,
        [type]: newAll ? new Set(items.map((i) => i.id)) : new Set(),
        [allKey]: newAll,
      };
    });
  };
  
  // Toggle single item
  const toggleItem = (
    type: 'scenes' | 'campaignNotes' | 'libraryItems',
    id: string,
    allItems: { id: string }[],
    allKey: 'allScenes' | 'allNotes' | 'allLibrary'
  ) => {
    setSelection((prev) => {
      const newSet = new Set(prev[type]);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return {
        ...prev,
        [type]: newSet,
        [allKey]: newSet.size === allItems.length,
      };
    });
  };
  
  // Calculate indeterminate state
  const getIndeterminate = (
    setKey: 'scenes' | 'campaignNotes' | 'libraryItems',
    allItems: { id: string }[]
  ) => {
    const selected = selection[setKey].size;
    return selected > 0 && selected < allItems.length;
  };
  
  // Export handler
  const handleExport = () => {
    if (!game) return;
    
    const exportData: EnhancedExport = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      format: 'selective',
    };
    
    // Add selected scenes
    const selectedScenes = scenes.filter((s) => selection.scenes.has(s.id));
    if (selectedScenes.length > 0) {
      exportData.scenes = selectedScenes;
    }
    
    // Add campaign notes
    const selectedNotes = campaignNotes.filter((n) => selection.campaignNotes.has(n.id));
    if (selectedNotes.length > 0) {
      exportData.campaignNotes = selectedNotes;
    }
    
    // Add library items
    const selectedLibrary = libraryItems.filter((i) => selection.libraryItems.has(i.id));
    if (selectedLibrary.length > 0) {
      exportData.libraryItems = selectedLibrary;
    }
    
    // Add combat state
    if (selection.combat && game.combat) {
      exportData.combat = game.combat;
    }
    
    // Add chat messages
    if (selection.chatMessages && chatMessages.length > 0) {
      exportData.chatMessages = chatMessages;
    }
    
    // Download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name.replace(/\s+/g, '-').toLowerCase()}.vtt.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    onClose();
  };
  
  // Import file handler
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    
    setImportFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Handle different versions
        if (data.version === 1 && data.game) {
          // Convert v1 format to v3
          const oldData = data as GameExport;
          const converted: EnhancedExport = {
            version: 3,
            exportedAt: oldData.exportedAt,
            format: 'full',
            scenes: oldData.game.elements && oldData.game.gridSettings ? [{
              id: nanoid(10),
              name: 'Imported Scene',
              backgroundUrl: undefined,
              gridSettings: oldData.game.gridSettings,
              elements: oldData.game.elements || [],
              fogOfWar: oldData.game.fogOfWar || { enabled: false, revealed: [] },
              createdAt: oldData.exportedAt,
              updatedAt: oldData.exportedAt,
            }] : [],
            campaignNotes: oldData.game.campaignNotes,
            combat: oldData.game.combat,
          };
          setImportData(converted);
        } else if (data.version === 2) {
          // Convert v2 format to v3
          const v2Data = data as EnhancedExportV2;
          const converted: EnhancedExport = {
            version: 3,
            exportedAt: v2Data.exportedAt,
            format: v2Data.format,
            scenes: v2Data.elements && v2Data.gameSettings ? [{
              id: nanoid(10),
              name: 'Imported Scene',
              backgroundUrl: undefined,
              gridSettings: v2Data.gameSettings.gridSettings || {
                cellSize: 50,
                width: 20,
                height: 20,
                showGrid: true,
                snapToGrid: true,
                gridColor: 'rgba(255, 255, 255, 0.2)',
                gridType: 'square',
              },
              elements: [
                ...(v2Data.elements.tokens || []),
                ...(v2Data.elements.images || []),
                ...(v2Data.elements.shapes || []),
                ...(v2Data.elements.text || []),
              ],
              fogOfWar: v2Data.gameSettings.fogOfWar || { enabled: false, revealed: [] },
              createdAt: v2Data.exportedAt,
              updatedAt: v2Data.exportedAt,
            }] : [],
            campaignNotes: v2Data.campaignNotes,
            combat: v2Data.combat,
            libraryItems: v2Data.libraryItems,
          };
          setImportData(converted);
        } else {
          setImportData(data as EnhancedExport);
        }
        
        // Initialize import selection
        initializeImportSelection(data);
      } catch (err) {
        console.error('Failed to parse import file:', err);
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };
  
  // Initialize selection based on import data
  const initializeImportSelection = (data: any) => {
    let enhancedData: EnhancedExport;
    
    if (data.version === 1 && data.game) {
      // v1 format - already converted in handleFileSelect
      return;
    } else if (data.version === 2) {
      // v2 format - already converted in handleFileSelect
      return;
    } else {
      enhancedData = data as EnhancedExport;
    }
    
    setSelection({
      scenes: new Set(enhancedData.scenes?.map((s) => s.id) || []),
      allScenes: true,
      campaignNotes: new Set(enhancedData.campaignNotes?.map((n) => n.id) || []),
      allNotes: true,
      libraryItems: new Set(enhancedData.libraryItems?.map((i) => i.id) || []),
      allLibrary: true,
      combat: !!enhancedData.combat,
      chatMessages: !!enhancedData.chatMessages,
    });
  };
  
  // Import handler
  const handleImport = async () => {
    if (!importData || !game) return;
    
    const data = importData as EnhancedExport;
    const gameStore = useGameStore.getState();
    const libraryStore = useLibraryStore.getState();
    
    // Import scenes (always add, never replace)
    if (data.scenes && selection.allScenes) {
      const scenesToImport = data.scenes.filter((s) => selection.scenes.has(s.id));
      const newScenes: Scene[] = [];
      
      for (const scene of scenesToImport) {
        // Generate new IDs for elements to avoid conflicts
        const sceneWithNewIds: Scene = {
          ...scene,
          id: nanoid(10),
          elements: scene.elements.map((el) => ({
            ...el,
            id: nanoid(10),
          })),
        };
        newScenes.push(sceneWithNewIds);
      }
      
      // Add all scenes in a single update
      if (newScenes.length > 0) {
        const updatedGame = {
          ...game,
          scenes: [...game.scenes, ...newScenes],
          updatedAt: new Date().toISOString(),
        };
        gameStore.loadGame(updatedGame);
      }
    }
    
    // Import campaign notes
    if (data.campaignNotes) {
      const notesToImport = data.campaignNotes.filter((n) =>
        selection.campaignNotes.has(n.id)
      );
      for (const note of notesToImport) {
        const existing = campaignNotes.find((n) => n.id === note.id);
        if (!existing) {
          gameStore.addCampaignNote(note);
        }
        // Skip conflicts for notes in merge mode
      }
    }
    
    // Import combat state
    if (selection.combat && data.combat) {
      gameStore.updateCombatState(data.combat);
    }
    
    // Import chat messages
    if (selection.chatMessages && data.chatMessages) {
      const existingMessages = game.chatMessages || [];
      const newMessages = data.chatMessages.filter(
        (msg) => !existingMessages.some((existing) => existing.id === msg.id)
      );
      for (const msg of newMessages) {
        gameStore.addChatMessage(msg);
      }
    }
    
    // Import library items
    if (data.libraryItems) {
      const itemsToImport = data.libraryItems.filter((i) =>
        selection.libraryItems.has(i.id)
      );
      for (const item of itemsToImport) {
        const existing = libraryItems.find((i) => i.id === item.id);
        if (!existing && item.type === 'token') {
          // Add to library store (using direct method)
          await libraryStore.addTokenToLibrary(
            item.data as any,
            item.name,
            item.description,
            item.tags
          );
        }
      }
    }
    
    // Broadcast sync if room is available
    if (room) {
      room.broadcastSync();
    }
    
    onImportComplete?.();
    onClose();
  };
  
  // Count selected items
  const selectedCount = {
    scenes: selection.scenes.size,
    notes: selection.campaignNotes.size,
    library: selection.libraryItems.size,
  };
  
  // Get import data counts
  const importCounts = useMemo(() => {
    if (!importData) return null;
    
    const data = importData as EnhancedExport;
    return {
      scenes: data.scenes?.length || 0,
      notes: data.campaignNotes?.length || 0,
      library: data.libraryItems?.length || 0,
      combat: data.combat ? 1 : 0,
      chat: data.chatMessages?.length || 0,
    };
  }, [importData]);
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Export / Import"
      size="lg"
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="export">Export</Tabs.Tab>
          <Tabs.Tab value="import">Import</Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="export" pt="md">
          <Stack>
            <Text size="sm" c="dimmed">
              Select what to include in the export file.
            </Text>
            
            <ScrollArea h={400}>
              <Stack gap="xs">
                {/* Scenes */}
                <TreeItem
                  label="Scenes"
                  icon="🎬"
                  checked={selection.allScenes}
                  indeterminate={getIndeterminate('scenes', scenes)}
                  onChange={() =>
                    toggleAllOfType('scenes', scenes, 'allScenes')
                  }
                  count={scenes.length}
                  expanded={expanded.scenes}
                  onToggleExpand={() =>
                    setExpanded((prev) => ({ ...prev, scenes: !prev.scenes }))
                  }
                >
                  {scenes.map((scene) => (
                    <TreeItem
                      key={scene.id}
                      label={scene.name}
                      icon="•"
                      checked={selection.scenes.has(scene.id)}
                      onChange={() =>
                        toggleItem('scenes', scene.id, scenes, 'allScenes')
                      }
                      count={scene.elements.length}
                    />
                  ))}
                </TreeItem>
                
                {/* Global State */}
                <Divider />
                <TreeItem
                  label="Global State"
                  icon="🌐"
                  checked={selection.combat && selection.chatMessages}
                  indeterminate={selection.combat !== selection.chatMessages}
                  onChange={(checked) =>
                    setSelection((prev) => ({
                      ...prev,
                      combat: checked,
                      chatMessages: checked,
                    }))
                  }
                  expanded={expanded.global}
                  onToggleExpand={() =>
                    setExpanded((prev) => ({ ...prev, global: !prev.global }))
                  }
                >
                  {game?.combat && (
                    <TreeItem
                      label="Combat State"
                      icon="⚔️"
                      checked={selection.combat}
                      onChange={(checked) =>
                        setSelection((prev) => ({ ...prev, combat: checked }))
                      }
                    />
                  )}
                  {chatMessages.length > 0 && (
                    <TreeItem
                      label="Chat History"
                      icon="💬"
                      checked={selection.chatMessages}
                      onChange={(checked) =>
                        setSelection((prev) => ({ ...prev, chatMessages: checked }))
                      }
                      count={chatMessages.length}
                    />
                  )}
                </TreeItem>
                
                {/* Campaign Notes */}
                {campaignNotes.length > 0 && (
                  <>
                    <Divider />
                    <TreeItem
                      label="Campaign Notes"
                      icon="📓"
                      checked={selection.allNotes}
                      indeterminate={getIndeterminate('campaignNotes', campaignNotes)}
                      onChange={() =>
                        toggleAllOfType('campaignNotes', campaignNotes, 'allNotes')
                      }
                      count={campaignNotes.length}
                      expanded={expanded.notes}
                      onToggleExpand={() =>
                        setExpanded((prev) => ({ ...prev, notes: !prev.notes }))
                      }
                    >
                      {campaignNotes.map((note) => (
                        <TreeItem
                          key={note.id}
                          label={note.title}
                          icon="•"
                          checked={selection.campaignNotes.has(note.id)}
                          onChange={() =>
                            toggleItem(
                              'campaignNotes',
                              note.id,
                              campaignNotes,
                              'allNotes'
                            )
                          }
                        />
                      ))}
                    </TreeItem>
                  </>
                )}
                
                {/* Library Items */}
                {libraryItems.length > 0 && (
                  <>
                    <Divider />
                    <TreeItem
                      label="Library Items"
                      icon="📚"
                      checked={selection.allLibrary}
                      indeterminate={getIndeterminate('libraryItems', libraryItems)}
                      onChange={() =>
                        toggleAllOfType('libraryItems', libraryItems, 'allLibrary')
                      }
                      count={libraryItems.length}
                      expanded={expanded.library}
                      onToggleExpand={() =>
                        setExpanded((prev) => ({ ...prev, library: !prev.library }))
                      }
                    >
                      {libraryItems.map((item) => (
                        <TreeItem
                          key={item.id}
                          label={item.name}
                          icon={
                            item.type === 'token'
                              ? '👤'
                              : item.type === 'map'
                              ? '🗺️'
                              : '🎬'
                          }
                          checked={selection.libraryItems.has(item.id)}
                          onChange={() =>
                            toggleItem(
                              'libraryItems',
                              item.id,
                              libraryItems,
                              'allLibrary'
                            )
                          }
                        />
                      ))}
                    </TreeItem>
                  </>
                )}
              </Stack>
            </ScrollArea>
            
            <Divider />
            
            <Group justify="space-between">
              <Group gap="xs">
                <Button variant="subtle" size="xs" onClick={() => {
                  setSelection((prev) => ({
                    ...prev,
                    scenes: new Set(scenes.map((s) => s.id)),
                    allScenes: true,
                    campaignNotes: new Set(campaignNotes.map((n) => n.id)),
                    allNotes: true,
                    libraryItems: new Set(libraryItems.map((i) => i.id)),
                    allLibrary: true,
                    combat: true,
                    chatMessages: true,
                  }));
                }}>
                  Select All
                </Button>
                <Button variant="subtle" size="xs" onClick={() => {
                  setSelection({
                    scenes: new Set(),
                    allScenes: false,
                    campaignNotes: new Set(),
                    allNotes: false,
                    libraryItems: new Set(),
                    allLibrary: false,
                    combat: false,
                    chatMessages: false,
                  });
                }}>
                  Select None
                </Button>
              </Group>
              <Button onClick={handleExport} disabled={selectedCount.scenes === 0 && selectedCount.notes === 0 && selectedCount.library === 0 && !selection.combat && !selection.chatMessages}>
                Export Selected
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
        
        <Tabs.Panel value="import" pt="md">
          <Stack>
            <FileButton onChange={handleFileSelect} accept=".json,.vtt.json">
              {(props) => (
                <Button variant="light" {...props}>
                  {importFileName || 'Select File to Import'}
                </Button>
              )}
            </FileButton>
            
            {importData && (
              <>
                <Alert color="blue" variant="light">
                  <Text size="sm" fw={500}>
                    File: {importFileName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Version: {(importData as EnhancedExport).version || 1} | Exported:{' '}
                    {new Date((importData as EnhancedExport).exportedAt).toLocaleString()}
                  </Text>
                </Alert>
                
                <Paper p="sm" withBorder>
                  <Text size="sm" fw={500} mb="xs">
                    Import Mode
                  </Text>
                  <SegmentedControl
                    fullWidth
                    value={importMode}
                    onChange={(val) => setImportMode(val as 'merge' | 'replace')}
                    data={[
                      { value: 'merge', label: 'Merge with Existing' },
                      { value: 'replace', label: 'Replace Selected' },
                    ]}
                  />
                  <Text size="xs" c="dimmed" mt="xs">
                    {importMode === 'merge'
                      ? 'Add imported items to your existing game. Duplicate IDs will be assigned new IDs.'
                      : 'Replace items of selected types with imported data.'}
                  </Text>
                </Paper>
                
                <Divider label="Content to Import" labelPosition="center" />
                
                <ScrollArea h={300}>
                  <Stack gap="xs">
                    {importCounts && (
                      <>
                        {importCounts.scenes > 0 && (
                          <Checkbox
                            label={`Scenes (${importCounts.scenes})`}
                            checked={selection.allScenes}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allScenes: !prev.allScenes,
                              }))
                            }
                          />
                        )}
                        {importCounts.notes > 0 && (
                          <Checkbox
                            label={`Campaign Notes (${importCounts.notes})`}
                            checked={selection.allNotes}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allNotes: !prev.allNotes,
                              }))
                            }
                          />
                        )}
                        {importCounts.library > 0 && (
                          <Checkbox
                            label={`Library Items (${importCounts.library})`}
                            checked={selection.allLibrary}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allLibrary: !prev.allLibrary,
                              }))
                            }
                          />
                        )}
                        {importCounts.combat > 0 && (
                          <Checkbox
                            label="Combat State"
                            checked={selection.combat}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                combat: !prev.combat,
                              }))
                            }
                          />
                        )}
                        {importCounts.chat > 0 && (
                          <Checkbox
                            label={`Chat Messages (${importCounts.chat})`}
                            checked={selection.chatMessages}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                chatMessages: !prev.chatMessages,
                              }))
                            }
                          />
                        )}
                      </>
                    )}
                  </Stack>
                </ScrollArea>
                
                <Divider />
                
                <Group justify="flex-end">
                  <Button variant="subtle" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport}>Import Selected</Button>
                </Group>
              </>
            )}
            
            {!importData && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                Select a .vtt.json file to import
              </Text>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
