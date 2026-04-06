import { useState, useMemo } from 'react';
import {
  Stack,
  TextInput,
  SegmentedControl,
  Paper,
  Text,
  Group,
  ActionIcon,
  Badge,
  ScrollArea,
  Tooltip,
  Modal,
  Button,
  Select,
} from '@mantine/core';
import { useSheetStore } from '../stores/sheetStore';
import { useGameStore } from '../stores/gameStore';
import type {
  TokenElement,
  CanvasElement,
  Sheet,
} from '../types';
import { getAllTemplates, type TemplateId } from '../services/sheetTemplates';

type CategoryFilter = 'all' | 'Character' | 'Token' | 'Location' | 'Note';

const CATEGORY_ICONS: Record<string, string> = {
  Character: '\u{1F464}',
  Token: '\u{1F3AD}',
  Location: '\u{1F4CD}',
  Note: '\u{1F4DD}',
};

const CATEGORY_TO_TEMPLATE: Record<string, TemplateId> = {
  Character: 'dnd5e',
  Token: 'token-stat',
  Location: 'location',
  Note: 'note',
};

interface LibraryPanelProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
  };
}

export default function LibraryPanel({ room }: LibraryPanelProps) {
  const { sheets, deleteSheet, openSheet, addSheet } = useSheetStore();
  const { game, addElement } = useGameStore();

  const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // New sheet creation
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetCategory, setNewSheetCategory] = useState<string>('Character');
  const [newSheetTemplate, setNewSheetTemplate] = useState<TemplateId>('dnd5e');

  // Filter sheets by search and category
  const filteredSheets = useMemo(() => {
    let result = sheets;

    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [sheets, categoryFilter, searchQuery]);

  const handleCreateSheet = () => {
    setNewSheetName('');
    setNewSheetCategory('Character');
    setNewSheetTemplate('dnd5e');
    setShowNewSheetModal(true);
  };

  const handleCategoryChange = (category: string) => {
    setNewSheetCategory(category);
    // Auto-select a matching template
    const defaultTemplate = CATEGORY_TO_TEMPLATE[category] || 'blank';
    setNewSheetTemplate(defaultTemplate);
  };

  const handleSaveNewSheet = () => {
    if (!newSheetName.trim()) return;

    const templates = getAllTemplates();
    const template = templates.find(t => t.id === newSheetTemplate);

    const id = addSheet({
      name: newSheetName.trim(),
      content: template?.content || '{"type":"doc","content":[{"type":"paragraph"}]}',
      shadowState: template?.defaultStats || {},
      projections: {},
      category: newSheetCategory,
      tags: [],
    });

    setShowNewSheetModal(false);

    // Open the newly created sheet for editing
    openSheet(id);
  };

  const handleDeleteSheet = (sheetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this sheet? This cannot be undone.')) {
      deleteSheet(sheetId);
    }
  };

  const handlePlaceToken = (sheet: Sheet, e: React.MouseEvent) => {
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
  };

  const getCategoryIcon = (category?: string) => CATEGORY_ICONS[category || ''] || '\u{1F4C4}';

  const templateOptions = getAllTemplates().map(t => ({
    value: t.id,
    label: t.name,
    description: t.description,
  }));

  return (
    <Stack gap="sm">
      {/* Create Sheet */}
      <Button
        variant="light"
        color="violet"
        size="xs"
        onClick={handleCreateSheet}
        fullWidth
      >
        + New Sheet
      </Button>

      {/* Search */}
      <TextInput
        placeholder="Search sheets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="xs"
      />

      {/* Category Filter */}
      <SegmentedControl
        value={categoryFilter}
        onChange={(val) => setCategoryFilter(val as CategoryFilter)}
        size="xs"
        data={[
          { label: 'All', value: 'all' },
          { label: '\u{1F464}', value: 'Character' },
          { label: '\u{1F3AD}', value: 'Token' },
          { label: '\u{1F4CD}', value: 'Location' },
          { label: '\u{1F4DD}', value: 'Note' },
        ]}
        fullWidth
      />

      {/* Sheets List */}
      <ScrollArea h="calc(100vh - 340px)">
        <Stack gap="xs">
          {filteredSheets.length === 0 && (
            <Stack align="center" py="xl" gap="xs">
              <Text size="sm" c="dimmed" ta="center">
                {searchQuery ? 'No matching sheets' : 'No sheets yet'}
              </Text>
              {!searchQuery && (
                <Text size="xs" c="dimmed" ta="center">
                  Create a sheet to get started
                </Text>
              )}
            </Stack>
          )}

          {filteredSheets.map((sheet) => (
            <Paper
              key={sheet.id}
              p="xs"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => openSheet(sheet.id)}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Text size="lg">{getCategoryIcon(sheet.category)}</Text>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {sheet.name}
                    </Text>
                    <Group gap={6}>
                      {sheet.category && (
                        <Text size="xs" c="dimmed">{sheet.category}</Text>
                      )}
                      {sheet.tags && sheet.tags.length > 0 && (
                        <>
                          {sheet.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} size="xs" variant="light" color="gray">{tag}</Badge>
                          ))}
                          {sheet.tags.length > 2 && (
                            <Badge size="xs" variant="light" color="gray">+{sheet.tags.length - 2}</Badge>
                          )}
                        </>
                      )}
                    </Group>
                  </Stack>
                </Group>
                <Group gap={4}>
                  <Tooltip label="Place on map">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="green"
                      onClick={(e) => handlePlaceToken(sheet, e)}
                    >
                      +
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="red"
                      onClick={(e) => handleDeleteSheet(sheet.id, e)}
                    >
                      ×
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          ))}

        </Stack>
      </ScrollArea>

      {/* Item count */}
      <Text size="xs" c="dimmed" ta="center">
        {filteredSheets.length} sheet{filteredSheets.length !== 1 ? 's' : ''}
      </Text>

      {/* New Sheet Modal */}
      <Modal
        opened={showNewSheetModal}
        onClose={() => setShowNewSheetModal(false)}
        title="New Sheet"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.currentTarget.value)}
            placeholder="Enter a name..."
            data-autofocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSheetName.trim()) handleSaveNewSheet();
            }}
          />
          <Select
            label="Category"
            value={newSheetCategory}
            onChange={(val) => handleCategoryChange(val || 'Character')}
            data={[
              { value: 'Character', label: '\u{1F464} Character' },
              { value: 'Token', label: '\u{1F3AD} Token / NPC' },
              { value: 'Location', label: '\u{1F4CD} Location' },
              { value: 'Note', label: '\u{1F4DD} Note' },
            ]}
          />
          <Select
            label="Template"
            value={newSheetTemplate}
            onChange={(val) => setNewSheetTemplate((val as TemplateId) || 'blank')}
            data={templateOptions}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setShowNewSheetModal(false)}>
              Cancel
            </Button>
            <Button
              color="violet"
              onClick={handleSaveNewSheet}
              disabled={!newSheetName.trim()}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
