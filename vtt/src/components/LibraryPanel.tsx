import { useEffect, useState } from 'react';
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
  Textarea,
  TagsInput,
} from '@mantine/core';
import { useLibraryStore } from '../stores/libraryStore';
import { useGameStore } from '../stores/gameStore';
import { useCharacterStore } from '../stores/characterStore';
import type {
  LibraryItem,
  LibraryItemType,
  TokenTemplateData,
  TokenElement,
  CanvasElement,
} from '../types';
interface LibraryPanelProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
  };
}

export default function LibraryPanel({ room }: LibraryPanelProps) {
  const {
    isLoading,
    filter,
    searchQuery,
    loadLibrary,
    setFilter,
    setSearchQuery,
    getFilteredItems,
    deleteLibraryItem,
    updateLibraryItem,
  } = useLibraryStore();

  const { characters, deleteCharacter, openCharacterSheet } = useCharacterStore();

  const { game, addElement } = useGameStore();

  // Get active scene
  const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];

  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filteredItems = getFilteredItems();

  const handlePlaceOnCanvas = (item: LibraryItem) => {
    if (!game || !activeScene) return;

    if (item.type === 'token') {
      const templateData = item.data as TokenTemplateData;
      const cellSize = activeScene.gridSettings.cellSize;
      
      // Place token at center of current viewport
      const newToken: Omit<TokenElement, 'id'> = {
        ...templateData,
        x: cellSize * 5, // Default position
        y: cellSize * 5,
        zIndex: activeScene.elements.length,
      };

      const id = addElement(newToken);
      const fullToken = { ...newToken, id } as TokenElement;
      room.broadcastElementUpdate(fullToken);
    }
  };

  const handleEditItem = (item: LibraryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditTags(item.tags);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    await updateLibraryItem(editingItem.id, {
      name: editName,
      description: editDescription,
      tags: editTags,
    });

    setEditingItem(null);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Delete this library item?')) {
      await deleteLibraryItem(id);
    }
  };

  const handleCreateCharacter = () => {
    openCharacterSheet(null);
  };

  const handleEditCharacter = (characterId: string) => {
    openCharacterSheet(characterId);
  };

  const handleDeleteCharacter = (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this character?')) {
      deleteCharacter(characterId);
    }
  };

  const getItemIcon = () => {
    return '👤';
  };

  const getItemStats = (item: LibraryItem) => {
    if (item.type === 'token') {
      const data = item.data as TokenTemplateData;
      const stats: string[] = [];
      if (data.hp) stats.push(`HP: ${data.hp.max}`);
      if (data.ac) stats.push(`AC: ${data.ac}`);
      return stats.join(' | ');
    }
    return '';
  };

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Text size="sm" c="dimmed">Loading library...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      {/* Create Character Button */}
      <Button
        variant="light"
        color="violet"
        size="xs"
        onClick={handleCreateCharacter}
        fullWidth
      >
        + Create Character
      </Button>

      {/* Search */}
      <TextInput
        placeholder="Search library..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="xs"
      />

      {/* Filter */}
      <SegmentedControl
        value={filter}
        onChange={(val) => setFilter(val as LibraryItemType | 'all')}
        size="xs"
        data={[
          { label: 'All', value: 'all' },
          { label: '👤 Tokens', value: 'token' },
        ]}
        fullWidth
      />

      {/* Items list */}
      <ScrollArea h="calc(100vh - 400px)">
        <Stack gap="xs">
          {filteredItems.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              {searchQuery ? 'No matching items' : 'Library is empty'}
            </Text>
          ) : (
            filteredItems.map((item) => (
              <Paper
                key={item.id}
                p="xs"
                withBorder
                style={{ cursor: 'pointer' }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <Text size="lg">{getItemIcon()}</Text>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text size="xs" c="dimmed" truncate>
                          {item.description}
                        </Text>
                      )}
                      {getItemStats(item) && (
                        <Text size="xs" c="blue">
                          {getItemStats(item)}
                        </Text>
                      )}
                      {item.tags.length > 0 && (
                        <Group gap={4}>
                          {item.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} size="xs" variant="light">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge size="xs" variant="light" color="gray">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </Group>
                      )}
                    </Stack>
                  </Group>

                  <Group gap={4}>
                    <Tooltip label="Place on canvas">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="green"
                        onClick={() => handlePlaceOnCanvas(item)}
                      >
                        ➕
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Edit">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleEditItem(item)}
                      >
                        ✏️
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        🗑️
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            ))
          )}

          {/* Character List Section */}
          {characters.length > 0 && (
            <>
              <Text size="sm" fw={500} mt="md" c="dimmed">
                Characters ({characters.length})
              </Text>
              {characters.map((character) => (
                <Paper
                  key={character.id}
                  p="xs"
                  withBorder
                  style={{ cursor: 'pointer' }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs">
                      <Text size="lg">📜</Text>
                      <Stack gap={2}>
                        <Text size="sm" fw={500} truncate>
                          {character.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Updated {new Date(character.updatedAt).toLocaleDateString()}
                        </Text>
                      </Stack>
                    </Group>
                    <Group gap={4}>
                      <Tooltip label="Edit Character">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="violet"
                          onClick={() => handleEditCharacter(character.id)}
                        >
                          ✏️
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete Character">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          onClick={(e) => handleDeleteCharacter(character.id, e)}
                        >
                          🗑️
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </>
          )}
        </Stack>
      </ScrollArea>

      {/* Stats */}
      <Text size="xs" c="dimmed" ta="center">
        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in library
      </Text>

      {/* Edit Modal */}
      <Modal
        opened={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title="Edit Library Item"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
          />
          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.currentTarget.value)}
            rows={3}
          />
          <TagsInput
            label="Tags"
            value={editTags}
            onChange={setEditTags}
            placeholder="Add tags..."
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Stack>
  );
}
