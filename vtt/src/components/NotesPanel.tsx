import { useState, useEffect } from 'react';
import {
  Stack,
  Paper,
  Text,
  Button,
  TextInput,
  Select,
  Group,
  ActionIcon,
  Badge,
  ScrollArea,
  Modal,
  Divider,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useGameStore } from '../stores/gameStore';
import type { CampaignNote, Visibility } from '../types';
import MarkdownEditor, { parseMarkdown } from './MarkdownEditor';

// Note categories
const NOTE_CATEGORIES = [
  { value: 'session', label: '📅 Session' },
  { value: 'npc', label: '👤 NPC' },
  { value: 'location', label: '🗺️ Location' },
  { value: 'lore', label: '📚 Lore' },
  { value: 'plot', label: '🎭 Plot' },
  { value: 'item', label: '⚔️ Item' },
  { value: 'quest', label: '📜 Quest' },
  { value: 'other', label: '📝 Other' },
];

interface NotesEditModalProps {
  note: CampaignNote | null;
  opened: boolean;
  onClose: () => void;
  onSave: (note: Omit<CampaignNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

function NotesEditModal({ note, opened, onClose, onSave }: NotesEditModalProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [category, setCategory] = useState(note?.category || 'other');
  const [visibility, setVisibility] = useState<Visibility>(note?.visibleTo || 'gm');
  
  // Reset form when modal opens with new note
  useEffect(() => {
    if (opened) {
      setTitle(note?.title || '');
      setContent(note?.content || '');
      setCategory(note?.category || 'other');
      setVisibility(note?.visibleTo || 'gm');
    }
  }, [opened, note]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      content,
      category,
      visibleTo: visibility,
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={note ? 'Edit Note' : 'New Note'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />

        <Group grow>
          <Select
            label="Category"
            value={category}
            onChange={(val) => setCategory(val || 'other')}
            data={NOTE_CATEGORIES}
          />
          <Select
            label="Visibility"
            value={visibility === 'all' ? 'all' : 'gm'}
            onChange={(val) => setVisibility(val === 'all' ? 'all' : 'gm')}
            data={[
              { value: 'gm', label: '🔒 GM Only' },
              { value: 'all', label: '👁️ Visible to All' },
            ]}
          />
        </Group>

        <MarkdownEditor
          label="Content"
          value={content}
          onChange={setContent}
          placeholder="Write your note content here..."
          minRows={8}
          maxRows={15}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {note ? 'Save Changes' : 'Create Note'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function NotesPanel() {
  const { game, isGM, addCampaignNote, updateCampaignNote, deleteCampaignNote } = useGameStore();

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingNote, setEditingNote] = useState<CampaignNote | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const notes = game?.campaignNotes || [];

  // Filter notes based on visibility, category, and search
  const filteredNotes = notes.filter((note) => {
    // Visibility filter: non-GMs only see 'all' notes
    if (!isGM && note.visibleTo !== 'all') return false;
    
    // Category filter
    if (filterCategory && note.category !== filterCategory) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = note.title.toLowerCase().includes(query);
      const matchesContent = note.content.toLowerCase().includes(query);
      if (!matchesTitle && !matchesContent) return false;
    }
    
    return true;
  });

  // Selected note for viewing
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleNewNote = () => {
    setEditingNote(null);
    openModal();
  };

  const handleEditNote = (note: CampaignNote) => {
    setEditingNote(note);
    openModal();
  };

  const handleSaveNote = (noteData: Omit<CampaignNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      updateCampaignNote(editingNote.id, noteData);
    } else {
      addCampaignNote(noteData);
    }
  };

  const handleDeleteNote = (id: string) => {
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
    deleteCampaignNote(id);
  };

  const getCategoryIcon = (category: string | undefined) => {
    const cat = NOTE_CATEGORIES.find((c) => c.value === category);
    return cat?.label.split(' ')[0] || '📝';
  };

  const getCategoryLabel = (category: string | undefined) => {
    const cat = NOTE_CATEGORIES.find((c) => c.value === category);
    return cat?.label.split(' ')[1] || 'Other';
  };

  return (
    <Stack gap="sm" h="100%">
      {/* Header Actions */}
      <Paper p="xs" withBorder>
        <Stack gap="xs">
          {isGM && (
            <Button size="xs" onClick={handleNewNote} fullWidth>
              ➕ New Note
            </Button>
          )}
          
          <TextInput
            placeholder="Search notes..."
            size="xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
          
          <Select
            placeholder="All categories"
            size="xs"
            value={filterCategory}
            onChange={setFilterCategory}
            data={[
              { value: '', label: 'All Categories' },
              ...NOTE_CATEGORIES,
            ]}
            clearable
          />
        </Stack>
      </Paper>

      {/* Notes List or Detail View */}
      {selectedNote ? (
        // Note Detail View
        <Paper p="sm" withBorder style={{ flex: 1, overflow: 'auto' }}>
          <Stack gap="sm">
            <Group justify="space-between">
              <Button size="xs" variant="subtle" onClick={() => setSelectedNoteId(null)}>
                ← Back to list
              </Button>
              {isGM && (
                <Group gap="xs">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => handleEditNote(selectedNote)}
                    title="Edit"
                  >
                    ✏️
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="subtle"
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    title="Delete"
                  >
                    🗑️
                  </ActionIcon>
                </Group>
              )}
            </Group>

            <Divider />

            <Group gap="xs">
              <Badge size="sm" color="violet">
                {getCategoryIcon(selectedNote.category)} {getCategoryLabel(selectedNote.category)}
              </Badge>
              {selectedNote.visibleTo === 'gm' && (
                <Badge size="sm" color="orange">🔒 GM Only</Badge>
              )}
            </Group>

            <Text fw={700} size="lg">{selectedNote.title}</Text>

            <Text size="xs" c="dimmed">
              Created: {new Date(selectedNote.createdAt).toLocaleDateString()}
              {selectedNote.updatedAt !== selectedNote.createdAt && (
                <> • Updated: {new Date(selectedNote.updatedAt).toLocaleDateString()}</>
              )}
            </Text>

            <Divider />

            <Box
              style={{ fontSize: '14px', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedNote.content) }}
            />
          </Stack>
        </Paper>
      ) : (
        // Notes List View
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="xs">
            {filteredNotes.length === 0 ? (
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed" ta="center">
                  {notes.length === 0
                    ? 'No campaign notes yet'
                    : 'No notes match your filters'}
                </Text>
              </Paper>
            ) : (
              filteredNotes.map((note) => (
                <Paper
                  key={note.id}
                  p="xs"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNoteId(note.id)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap="xs" mb={4}>
                        <Text size="xs">{getCategoryIcon(note.category)}</Text>
                        <Text size="sm" fw={500} truncate>
                          {note.title}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {note.content.replace(/[#*_`>\[\]]/g, '').slice(0, 80)}
                        {note.content.length > 80 ? '...' : ''}
                      </Text>
                    </Box>
                    <Group gap={4}>
                      {note.visibleTo === 'gm' && isGM && (
                        <Badge size="xs" color="orange">🔒</Badge>
                      )}
                      {isGM && (
                        <>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNote(note);
                            }}
                          >
                            ✏️
                          </ActionIcon>
                          <ActionIcon
                            size="xs"
                            color="red"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                          >
                            🗑️
                          </ActionIcon>
                        </>
                      )}
                    </Group>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>
        </ScrollArea>
      )}

      {/* Edit Modal */}
      <NotesEditModal
        note={editingNote}
        opened={modalOpened}
        onClose={closeModal}
        onSave={handleSaveNote}
      />
    </Stack>
  );
}
