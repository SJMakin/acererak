import { useState, useEffect, useMemo } from 'react';
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
} from '../types';

// Current export format version
const EXPORT_VERSION = 2;

// Enhanced export format with selective data
interface EnhancedExport {
  version: number;
  exportedAt: string;
  format: 'full' | 'selective';
  // Game data (optional)
  gameSettings?: {
    gridSettings?: GameState['gridSettings'];
    fogOfWar?: GameState['fogOfWar'];
  };
  // Elements by type (optional)
  elements?: {
    tokens: CanvasElement[];
    images: CanvasElement[];
    shapes: CanvasElement[];
    text: CanvasElement[];
  };
  // Campaign notes (optional)
  campaignNotes?: CampaignNote[];
  // Library items (optional)
  libraryItems?: LibraryItem[];
  // Combat state (optional)
  combat?: GameState['combat'];
}

interface SelectionState {
  // Game settings
  gridSettings: boolean;
  fogOfWar: boolean;
  // Elements by type
  tokens: Set<string>;
  images: Set<string>;
  shapes: Set<string>;
  text: Set<string>;
  // All elements toggle
  allTokens: boolean;
  allImages: boolean;
  allShapes: boolean;
  allText: boolean;
  // Campaign notes
  campaignNotes: Set<string>;
  allNotes: boolean;
  // Library items
  libraryItems: Set<string>;
  allLibrary: boolean;
  // Combat
  combat: boolean;
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
    settings: true,
    elements: true,
    tokens: false,
    images: false,
    shapes: false,
    text: false,
    notes: false,
    library: false,
  });
  
  // Selection state for export
  const [selection, setSelection] = useState<SelectionState>({
    gridSettings: true,
    fogOfWar: true,
    tokens: new Set(),
    images: new Set(),
    shapes: new Set(),
    text: new Set(),
    allTokens: true,
    allImages: true,
    allShapes: true,
    allText: true,
    campaignNotes: new Set(),
    allNotes: true,
    libraryItems: new Set(),
    allLibrary: false,
    combat: true,
  });
  
  // Categorize elements
  const elementsByType = useMemo(() => {
    if (!game) {
      return { tokens: [], images: [], shapes: [], text: [] };
    }
    return {
      tokens: game.elements.filter((e) => e.type === 'token'),
      images: game.elements.filter((e) => e.type === 'image'),
      shapes: game.elements.filter((e) => e.type === 'shape'),
      text: game.elements.filter((e) => e.type === 'text'),
    };
  }, [game]);
  
  const campaignNotes = game?.campaignNotes || [];
  
  // Track if we've initialized for this modal session
  const [initialized, setInitialized] = useState(false);
  
  // Initialize selection with all elements when opening (only once per modal open)
  useEffect(() => {
    if (opened && game && !initialized) {
      const tokens = game.elements.filter((e) => e.type === 'token');
      const images = game.elements.filter((e) => e.type === 'image');
      const shapes = game.elements.filter((e) => e.type === 'shape');
      const text = game.elements.filter((e) => e.type === 'text');
      const notes = game.campaignNotes || [];
      
      setSelection({
        gridSettings: true,
        fogOfWar: true,
        tokens: new Set(tokens.map((e) => e.id)),
        images: new Set(images.map((e) => e.id)),
        shapes: new Set(shapes.map((e) => e.id)),
        text: new Set(text.map((e) => e.id)),
        allTokens: true,
        allImages: true,
        allShapes: true,
        allText: true,
        campaignNotes: new Set(notes.map((n) => n.id)),
        allNotes: true,
        libraryItems: new Set(),
        allLibrary: false,
        combat: true,
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
    type: 'tokens' | 'images' | 'shapes' | 'text' | 'campaignNotes' | 'libraryItems',
    items: { id: string }[],
    allKey: 'allTokens' | 'allImages' | 'allShapes' | 'allText' | 'allNotes' | 'allLibrary'
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
    type: 'tokens' | 'images' | 'shapes' | 'text' | 'campaignNotes' | 'libraryItems',
    id: string,
    allItems: { id: string }[],
    allKey: 'allTokens' | 'allImages' | 'allShapes' | 'allText' | 'allNotes' | 'allLibrary'
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
    setKey: 'tokens' | 'images' | 'shapes' | 'text' | 'campaignNotes' | 'libraryItems',
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
    
    // Add game settings if selected
    if (selection.gridSettings || selection.fogOfWar) {
      exportData.gameSettings = {
        gridSettings: selection.gridSettings ? game.gridSettings : undefined,
        fogOfWar: selection.fogOfWar ? game.fogOfWar : undefined,
      };
    }
    
    // Add selected elements
    const selectedTokens = elementsByType.tokens.filter((e) => selection.tokens.has(e.id));
    const selectedImages = elementsByType.images.filter((e) => selection.images.has(e.id));
    const selectedShapes = elementsByType.shapes.filter((e) => selection.shapes.has(e.id));
    const selectedText = elementsByType.text.filter((e) => selection.text.has(e.id));
    
    if (
      selectedTokens.length > 0 ||
      selectedImages.length > 0 ||
      selectedShapes.length > 0 ||
      selectedText.length > 0
    ) {
      exportData.elements = {
        tokens: selectedTokens,
        images: selectedImages,
        shapes: selectedShapes,
        text: selectedText,
      };
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
        
        // Handle both old (version 1) and new formats
        if (data.version === 1 && data.game) {
          // Convert old format to new format
          const oldData = data as GameExport;
          const converted: EnhancedExport = {
            version: EXPORT_VERSION,
            exportedAt: oldData.exportedAt,
            format: 'full',
            gameSettings: {
              gridSettings: oldData.game.gridSettings,
              fogOfWar: oldData.game.fogOfWar,
            },
            elements: {
              tokens: oldData.game.elements.filter((e) => e.type === 'token'),
              images: oldData.game.elements.filter((e) => e.type === 'image'),
              shapes: oldData.game.elements.filter((e) => e.type === 'shape'),
              text: oldData.game.elements.filter((e) => e.type === 'text'),
            },
            campaignNotes: oldData.game.campaignNotes,
            combat: oldData.game.combat,
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
  const initializeImportSelection = (data: EnhancedExport | GameExport) => {
    let enhancedData: EnhancedExport;
    
    if ('game' in data) {
      // Old format
      const oldData = data as GameExport;
      enhancedData = {
        version: EXPORT_VERSION,
        exportedAt: oldData.exportedAt,
        format: 'full',
        gameSettings: {
          gridSettings: oldData.game.gridSettings,
          fogOfWar: oldData.game.fogOfWar,
        },
        elements: {
          tokens: oldData.game.elements.filter((e) => e.type === 'token'),
          images: oldData.game.elements.filter((e) => e.type === 'image'),
          shapes: oldData.game.elements.filter((e) => e.type === 'shape'),
          text: oldData.game.elements.filter((e) => e.type === 'text'),
        },
        campaignNotes: oldData.game.campaignNotes,
        combat: oldData.game.combat,
      };
    } else {
      enhancedData = data as EnhancedExport;
    }
    
    setSelection({
      gridSettings: !!enhancedData.gameSettings?.gridSettings,
      fogOfWar: !!enhancedData.gameSettings?.fogOfWar,
      tokens: new Set(enhancedData.elements?.tokens?.map((e) => e.id) || []),
      images: new Set(enhancedData.elements?.images?.map((e) => e.id) || []),
      shapes: new Set(enhancedData.elements?.shapes?.map((e) => e.id) || []),
      text: new Set(enhancedData.elements?.text?.map((e) => e.id) || []),
      allTokens: true,
      allImages: true,
      allShapes: true,
      allText: true,
      campaignNotes: new Set(enhancedData.campaignNotes?.map((n) => n.id) || []),
      allNotes: true,
      libraryItems: new Set(enhancedData.libraryItems?.map((i) => i.id) || []),
      allLibrary: true,
      combat: !!enhancedData.combat,
    });
  };
  
  // Import handler
  const handleImport = async () => {
    if (!importData || !game) return;
    
    const data = importData as EnhancedExport;
    const gameStore = useGameStore.getState();
    const libraryStore = useLibraryStore.getState();
    
    // Prepare elements to import
    const elementsToImport: CanvasElement[] = [];
    
    if (data.elements) {
      if (selection.allTokens || selection.tokens.size > 0) {
        elementsToImport.push(
          ...data.elements.tokens.filter((e) => selection.tokens.has(e.id))
        );
      }
      if (selection.allImages || selection.images.size > 0) {
        elementsToImport.push(
          ...data.elements.images.filter((e) => selection.images.has(e.id))
        );
      }
      if (selection.allShapes || selection.shapes.size > 0) {
        elementsToImport.push(
          ...data.elements.shapes.filter((e) => selection.shapes.has(e.id))
        );
      }
      if (selection.allText || selection.text.size > 0) {
        elementsToImport.push(
          ...data.elements.text.filter((e) => selection.text.has(e.id))
        );
      }
    }
    
    if (importMode === 'replace') {
      // Replace mode: load entire game state
      const newGame: GameState = {
        ...game,
        updatedAt: new Date().toISOString(),
      };
      
      if (selection.gridSettings && data.gameSettings?.gridSettings) {
        newGame.gridSettings = data.gameSettings.gridSettings;
      }
      if (selection.fogOfWar && data.gameSettings?.fogOfWar) {
        newGame.fogOfWar = data.gameSettings.fogOfWar;
      }
      
      // Replace elements of selected types
      const existingElements = game.elements.filter((e) => {
        if (e.type === 'token' && selection.allTokens) return false;
        if (e.type === 'image' && selection.allImages) return false;
        if (e.type === 'shape' && selection.allShapes) return false;
        if (e.type === 'text' && selection.allText) return false;
        return true;
      });
      
      newGame.elements = [...existingElements, ...elementsToImport];
      
      if (selection.allNotes && data.campaignNotes) {
        newGame.campaignNotes = data.campaignNotes.filter((n) =>
          selection.campaignNotes.has(n.id)
        );
      }
      
      if (selection.combat && data.combat) {
        newGame.combat = data.combat;
      }
      
      gameStore.loadGame(newGame);
    } else {
      // Merge mode: add elements with conflict detection
      for (const element of elementsToImport) {
        const existing = game.elements.find((e) => e.id === element.id);
        if (!existing) {
          // No conflict, add directly
          gameStore.addElement(element, true);
        } else {
          // Conflict: generate new ID and add
          const { id: _oldId, ...elementWithoutId } = element;
          gameStore.addElement(elementWithoutId, true);
        }
      }
      
      // Merge campaign notes
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
      
      // Merge settings if selected
      if (selection.gridSettings && data.gameSettings?.gridSettings) {
        gameStore.updateGridSettings(data.gameSettings.gridSettings);
      }
      if (selection.fogOfWar && data.gameSettings?.fogOfWar) {
        gameStore.toggleFog(data.gameSettings.fogOfWar.enabled);
      }
    }
    
    // Import library items
    if (data.libraryItems) {
      const itemsToImport = data.libraryItems.filter((i) =>
        selection.libraryItems.has(i.id)
      );
      for (const item of itemsToImport) {
        const existing = libraryItems.find((i) => i.id === item.id);
        if (!existing) {
          // Add to library store (using direct method)
          if (item.type === 'token') {
            await libraryStore.addTokenToLibrary(
              item.data as any,
              item.name,
              item.description,
              item.tags
            );
          } else if (item.type === 'map') {
            await libraryStore.addMapToLibrary(
              item.data as any,
              item.name,
              item.description,
              item.tags
            );
          } else if (item.type === 'scene') {
            await libraryStore.addSceneToLibrary(
              item.data as any,
              item.name,
              item.description,
              item.tags
            );
          }
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
    tokens: selection.tokens.size,
    images: selection.images.size,
    shapes: selection.shapes.size,
    text: selection.text.size,
    notes: selection.campaignNotes.size,
    library: selection.libraryItems.size,
    total:
      selection.tokens.size +
      selection.images.size +
      selection.shapes.size +
      selection.text.size,
  };
  
  // Get import data counts
  const importCounts = useMemo(() => {
    if (!importData) return null;
    
    const data = importData as EnhancedExport;
    return {
      tokens: data.elements?.tokens?.length || 0,
      images: data.elements?.images?.length || 0,
      shapes: data.elements?.shapes?.length || 0,
      text: data.elements?.text?.length || 0,
      notes: data.campaignNotes?.length || 0,
      library: data.libraryItems?.length || 0,
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
                {/* Game Settings */}
                <TreeItem
                  label="Game Settings"
                  icon="⚙️"
                  checked={selection.gridSettings && selection.fogOfWar}
                  indeterminate={selection.gridSettings !== selection.fogOfWar}
                  onChange={(checked) =>
                    setSelection((prev) => ({
                      ...prev,
                      gridSettings: checked,
                      fogOfWar: checked,
                    }))
                  }
                  expanded={expanded.settings}
                  onToggleExpand={() =>
                    setExpanded((prev) => ({ ...prev, settings: !prev.settings }))
                  }
                >
                  <TreeItem
                    label="Grid Configuration"
                    icon="🗺️"
                    checked={selection.gridSettings}
                    onChange={(checked) =>
                      setSelection((prev) => ({ ...prev, gridSettings: checked }))
                    }
                  />
                  <TreeItem
                    label="Fog of War State"
                    icon="🌫️"
                    checked={selection.fogOfWar}
                    onChange={(checked) =>
                      setSelection((prev) => ({ ...prev, fogOfWar: checked }))
                    }
                  />
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
                </TreeItem>
                
                <Divider />
                
                {/* Elements */}
                <TreeItem
                  label="Canvas Elements"
                  icon="🖼️"
                  checked={selectedCount.total === game?.elements.length}
                  indeterminate={
                    selectedCount.total > 0 &&
                    selectedCount.total < (game?.elements.length || 0)
                  }
                  onChange={(checked) => {
                    if (checked) {
                      setSelection((prev) => ({
                        ...prev,
                        tokens: new Set(elementsByType.tokens.map((e) => e.id)),
                        images: new Set(elementsByType.images.map((e) => e.id)),
                        shapes: new Set(elementsByType.shapes.map((e) => e.id)),
                        text: new Set(elementsByType.text.map((e) => e.id)),
                        allTokens: true,
                        allImages: true,
                        allShapes: true,
                        allText: true,
                      }));
                    } else {
                      setSelection((prev) => ({
                        ...prev,
                        tokens: new Set(),
                        images: new Set(),
                        shapes: new Set(),
                        text: new Set(),
                        allTokens: false,
                        allImages: false,
                        allShapes: false,
                        allText: false,
                      }));
                    }
                  }}
                  count={game?.elements.length || 0}
                  expanded={expanded.elements}
                  onToggleExpand={() =>
                    setExpanded((prev) => ({ ...prev, elements: !prev.elements }))
                  }
                >
                  {/* Tokens */}
                  {elementsByType.tokens.length > 0 && (
                    <TreeItem
                      label="Tokens"
                      icon="👤"
                      checked={selection.allTokens}
                      indeterminate={getIndeterminate('tokens', elementsByType.tokens)}
                      onChange={() =>
                        toggleAllOfType('tokens', elementsByType.tokens, 'allTokens')
                      }
                      count={elementsByType.tokens.length}
                      expanded={expanded.tokens}
                      onToggleExpand={() =>
                        setExpanded((prev) => ({ ...prev, tokens: !prev.tokens }))
                      }
                    >
                      {elementsByType.tokens.map((token) => (
                        <TreeItem
                          key={token.id}
                          label={(token as any).name || 'Unnamed Token'}
                          icon="•"
                          checked={selection.tokens.has(token.id)}
                          onChange={() =>
                            toggleItem(
                              'tokens',
                              token.id,
                              elementsByType.tokens,
                              'allTokens'
                            )
                          }
                        />
                      ))}
                    </TreeItem>
                  )}
                  
                  {/* Images */}
                  {elementsByType.images.length > 0 && (
                    <TreeItem
                      label="Map Images"
                      icon="🗺️"
                      checked={selection.allImages}
                      indeterminate={getIndeterminate('images', elementsByType.images)}
                      onChange={() =>
                        toggleAllOfType('images', elementsByType.images, 'allImages')
                      }
                      count={elementsByType.images.length}
                      expanded={expanded.images}
                      onToggleExpand={() =>
                        setExpanded((prev) => ({ ...prev, images: !prev.images }))
                      }
                    >
                      {elementsByType.images.map((img) => (
                        <TreeItem
                          key={img.id}
                          label={(img as any).name || 'Map Image'}
                          icon="•"
                          checked={selection.images.has(img.id)}
                          onChange={() =>
                            toggleItem(
                              'images',
                              img.id,
                              elementsByType.images,
                              'allImages'
                            )
                          }
                        />
                      ))}
                    </TreeItem>
                  )}
                  
                  {/* Shapes */}
                  {elementsByType.shapes.length > 0 && (
                    <TreeItem
                      label="Drawings"
                      icon="✏️"
                      checked={selection.allShapes}
                      indeterminate={getIndeterminate('shapes', elementsByType.shapes)}
                      onChange={() =>
                        toggleAllOfType('shapes', elementsByType.shapes, 'allShapes')
                      }
                      count={elementsByType.shapes.length}
                      expanded={expanded.shapes}
                      onToggleExpand={() =>
                        setExpanded((prev) => ({ ...prev, shapes: !prev.shapes }))
                      }
                    >
                      {elementsByType.shapes.map((shape, index) => (
                        <TreeItem
                          key={shape.id}
                          label={`${(shape as any).shapeType} ${index + 1}`}
                          icon="•"
                          checked={selection.shapes.has(shape.id)}
                          onChange={() =>
                            toggleItem(
                              'shapes',
                              shape.id,
                              elementsByType.shapes,
                              'allShapes'
                            )
                          }
                        />
                      ))}
                    </TreeItem>
                  )}
                  
                  {/* Text */}
                  {elementsByType.text.length > 0 && (
                    <TreeItem
                      label="Text Labels"
                      icon="📝"
                      checked={selection.allText}
                      indeterminate={getIndeterminate('text', elementsByType.text)}
                      onChange={() =>
                        toggleAllOfType('text', elementsByType.text, 'allText')
                      }
                      count={elementsByType.text.length}
                      expanded={expanded.text}
                      onToggleExpand={() =>
                        setExpanded((prev) => ({ ...prev, text: !prev.text }))
                      }
                    >
                      {elementsByType.text.map((txt) => (
                        <TreeItem
                          key={txt.id}
                          label={(txt as any).content?.substring(0, 20) || 'Text'}
                          icon="•"
                          checked={selection.text.has(txt.id)}
                          onChange={() =>
                            toggleItem(
                              'text',
                              txt.id,
                              elementsByType.text,
                              'allText'
                            )
                          }
                        />
                      ))}
                    </TreeItem>
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
                    gridSettings: true,
                    fogOfWar: true,
                    tokens: new Set(elementsByType.tokens.map((e) => e.id)),
                    images: new Set(elementsByType.images.map((e) => e.id)),
                    shapes: new Set(elementsByType.shapes.map((e) => e.id)),
                    text: new Set(elementsByType.text.map((e) => e.id)),
                    allTokens: true,
                    allImages: true,
                    allShapes: true,
                    allText: true,
                    campaignNotes: new Set(campaignNotes.map((n) => n.id)),
                    allNotes: true,
                    libraryItems: new Set(libraryItems.map((i) => i.id)),
                    allLibrary: true,
                    combat: true,
                  }));
                }}>
                  Select All
                </Button>
                <Button variant="subtle" size="xs" onClick={() => {
                  setSelection({
                    gridSettings: false,
                    fogOfWar: false,
                    tokens: new Set(),
                    images: new Set(),
                    shapes: new Set(),
                    text: new Set(),
                    allTokens: false,
                    allImages: false,
                    allShapes: false,
                    allText: false,
                    campaignNotes: new Set(),
                    allNotes: false,
                    libraryItems: new Set(),
                    allLibrary: false,
                    combat: false,
                  });
                }}>
                  Select None
                </Button>
              </Group>
              <Button onClick={handleExport} disabled={selectedCount.total === 0 && !selection.gridSettings && !selection.fogOfWar}>
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
                        {importCounts.tokens > 0 && (
                          <Checkbox
                            label={`Tokens (${importCounts.tokens})`}
                            checked={selection.allTokens}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allTokens: !prev.allTokens,
                              }))
                            }
                          />
                        )}
                        {importCounts.images > 0 && (
                          <Checkbox
                            label={`Map Images (${importCounts.images})`}
                            checked={selection.allImages}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allImages: !prev.allImages,
                              }))
                            }
                          />
                        )}
                        {importCounts.shapes > 0 && (
                          <Checkbox
                            label={`Drawings (${importCounts.shapes})`}
                            checked={selection.allShapes}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allShapes: !prev.allShapes,
                              }))
                            }
                          />
                        )}
                        {importCounts.text > 0 && (
                          <Checkbox
                            label={`Text Labels (${importCounts.text})`}
                            checked={selection.allText}
                            onChange={() =>
                              setSelection((prev) => ({
                                ...prev,
                                allText: !prev.allText,
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
                        {(importData as EnhancedExport).gameSettings && (
                          <>
                            <Divider label="Settings" labelPosition="left" />
                            <Checkbox
                              label="Grid Settings"
                              checked={selection.gridSettings}
                              onChange={() =>
                                setSelection((prev) => ({
                                  ...prev,
                                  gridSettings: !prev.gridSettings,
                                }))
                              }
                            />
                            <Checkbox
                              label="Fog of War State"
                              checked={selection.fogOfWar}
                              onChange={() =>
                                setSelection((prev) => ({
                                  ...prev,
                                  fogOfWar: !prev.fogOfWar,
                                }))
                              }
                            />
                          </>
                        )}
                        {(importData as EnhancedExport).combat && (
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
