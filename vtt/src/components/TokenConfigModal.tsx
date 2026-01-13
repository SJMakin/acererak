import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Group,
  Select,
  Divider,
  Text,
  Badge,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useCharacterStore } from '../stores/characterStore';

export interface TokenConfig {
  name: string;
  imageUrl: string;
  size: number;
  hp?: { current: number; max: number };
  ac?: number;
  characterId?: string;
}

interface TokenConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (config: TokenConfig) => void;
  existingCharacterId?: string | null; // For editing: pre-link character
}

export default function TokenConfigModal({
  opened,
  onClose,
  onSubmit,
  existingCharacterId,
}: TokenConfigModalProps) {
  const { settings } = useGameStore();
  const { characters, getCharacterById, addCharacter } = useCharacterStore();
  
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [size, setSize] = useState(settings.defaultTokenSize);
  const [hpMax, setHpMax] = useState<number | string>(settings.defaultHP.max);
  const [ac, setAc] = useState<number | string>('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(existingCharacterId || null);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');

  // Get selected character data
  const selectedCharacter = selectedCharacterId 
    ? getCharacterById(selectedCharacterId) 
    : undefined;

  // Reset form when modal opens
  useEffect(() => {
    if (opened) {
      setName(selectedCharacter?.name || '');
      setImageUrl(selectedCharacter?.projections ? '' : ''); // Clear image if character linked
      setSize(settings.defaultTokenSize);
      setHpMax(settings.defaultHP.max);
      setAc('');
      setSelectedCharacterId(existingCharacterId || null);
      setShowCreateCharacter(false);
      setNewCharacterName('');
    }
  }, [opened, settings.defaultTokenSize, settings.defaultHP.max, existingCharacterId, selectedCharacter]);

  // Auto-fill from character when selected
  useEffect(() => {
    if (selectedCharacter) {
      setName(selectedCharacter.name);
      // Auto-fill HP from character projections
      if (selectedCharacter.shadowState && selectedCharacter.projections) {
        const barKey = selectedCharacter.projections.bar || 'HP';
        const barMaxKey = selectedCharacter.projections.barMax || 'MaxHP';
        const hp = selectedCharacter.shadowState[barKey];
        const maxHp = selectedCharacter.shadowState[barMaxKey];
        if (hp !== undefined) {
          setHpMax(typeof maxHp === 'number' ? maxHp : parseInt(String(maxHp)) || 10);
        }
      }
      // Auto-fill AC from character projections
      if (selectedCharacter.projections?.badge) {
        const ac = selectedCharacter.shadowState[selectedCharacter.projections.badge];
        if (ac !== undefined) {
          setAc(typeof ac === 'number' ? ac : parseInt(String(ac)) || 10);
        }
      }
    }
  }, [selectedCharacter]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const config: TokenConfig = {
      name: name.trim(),
      imageUrl: imageUrl.trim(),
      size,
    };

    // Add HP if provided
    if (hpMax && typeof hpMax === 'number' && hpMax > 0) {
      config.hp = { current: hpMax, max: hpMax };
    }

    // Add AC if provided
    if (ac && typeof ac === 'number') {
      config.ac = ac;
    }

    // Add character link if selected
    if (selectedCharacterId) {
      config.characterId = selectedCharacterId;
    }

    onSubmit(config);
    onClose();
  };

  const handleCreateCharacter = () => {
    if (!newCharacterName.trim()) return;

    const newId = addCharacter({
      name: newCharacterName.trim(),
      content: '{"type":"doc","content":[{"type":"paragraph"}]}',
      shadowState: {
        HP: hpMax && typeof hpMax === 'number' ? hpMax : 10,
        MaxHP: hpMax && typeof hpMax === 'number' ? hpMax : 10,
        AC: ac && typeof ac === 'number' ? ac : 10,
      },
      projections: {
        bar: 'HP',
        barMax: 'MaxHP',
        badge: 'AC',
      },
    });

    setSelectedCharacterId(newId);
    setShowCreateCharacter(false);
    setNewCharacterName('');
  };

  const handleUnlinkCharacter = () => {
    setSelectedCharacterId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSubmit();
    }
  };

  // Prepare character options for dropdown
  const characterOptions = characters.map((char) => ({
    value: char.id,
    label: char.name,
  }));

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title="Configure Token"
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Token Name"
          placeholder="Enter token name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
          required
          autoFocus
          data-autofocus
        />
        
        <TextInput
          label="Image URL"
          placeholder="https://example.com/token.png (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
        />
        
        <NumberInput
          label="Size (grid cells)"
          placeholder="1"
          value={size}
          onChange={(val) => setSize(Number(val) || 1)}
          min={1}
          max={10}
          required
        />

        {/* Character Linking Section */}
        <Divider label="Character Link (Optional)" labelPosition="center" />
        
        {!showCreateCharacter ? (
          <>
            <Select
              label="Link Character"
              placeholder="Select a character sheet..."
              value={selectedCharacterId}
              onChange={(val) => setSelectedCharacterId(val)}
              data={characterOptions}
              clearable
              searchable
            />

            {/* Show linked character info */}
            {selectedCharacter && (
              <Paper p="sm" withBorder style={{ backgroundColor: 'rgba(124, 58, 237, 0.05)' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Linked Character</Text>
                  <Badge color="violet">{selectedCharacter.name}</Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  HP: {selectedCharacter.shadowState[selectedCharacter.projections.bar || 'HP'] || '—'} / 
                  {selectedCharacter.shadowState[selectedCharacter.projections.barMax || 'MaxHP'] || '—'} • 
                  AC: {selectedCharacter.shadowState[selectedCharacter.projections.badge || 'AC'] || '—'}
                </Text>
                <Button 
                  size="xs" 
                  variant="subtle" 
                  color="red" 
                  mt="xs"
                  onClick={handleUnlinkCharacter}
                >
                  Unlink Character
                </Button>
              </Paper>
            )}

            {/* Create new character option */}
            <Button 
              variant="subtle" 
              size="sm"
              onClick={() => {
                setShowCreateCharacter(true);
                setSelectedCharacterId(null);
              }}
            >
              + Create New Character
            </Button>
          </>
        ) : (
          <>
            <TextInput
              label="New Character Name"
              placeholder="Enter character name..."
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCharacter()}
              autoFocus
            />

            {/* Preview HP/AC for new character */}
            <Group grow>
              <NumberInput
                label="HP"
                value={hpMax}
                onChange={setHpMax}
                min={1}
              />
              <NumberInput
                label="AC"
                value={ac}
                onChange={setAc}
                min={0}
              />
            </Group>

            <Group gap="xs">
              <Button 
                variant="subtle" 
                size="sm"
                onClick={() => setShowCreateCharacter(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleCreateCharacter}
                disabled={!newCharacterName.trim()}
              >
                Create & Link
              </Button>
            </Group>
          </>
        )}

        {/* HP and AC - only show when not linked or as fallback */}
        {!selectedCharacter && (
          <>
            <Divider label="Stats" labelPosition="center" />
            <Group grow>
              <NumberInput
                label="HP"
                placeholder="Optional"
                value={hpMax}
                onChange={setHpMax}
                min={1}
              />
              
              <NumberInput
                label="AC"
                placeholder="Optional"
                value={ac}
                onChange={setAc}
                min={0}
              />
            </Group>
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Place Token
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Simple Paper component helper since we're in a modal already
function Paper({ children, p, withBorder, style }: { children: React.ReactNode; p?: string; withBorder?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: p || '8px',
      border: withBorder ? '1px solid #e5e7eb' : undefined,
      borderRadius: '4px',
      ...style,
    }}>
      {children}
    </div>
  );
}
