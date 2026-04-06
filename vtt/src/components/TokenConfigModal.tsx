import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Divider,
  Group,
  Text,
  Paper,
  Badge,
  Select,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useSheetStore } from '../stores/sheetStore';
import ImageInput, { type ImageInputValue } from './ImageInput';

export interface TokenConfig {
  name: string;
  imageUrl?: string;
  imageId?: string;
  size: number;
  hp?: { current: number; max: number };
  ac?: number;
  sheetId?: string;
}

interface TokenConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (config: TokenConfig) => void;
  existingCharacterId?: string | null; // For editing: pre-link sheet
  aiAvailable?: boolean;
}

export default function TokenConfigModal({
  opened,
  onClose,
  onSubmit,
  existingCharacterId,
  aiAvailable,
}: TokenConfigModalProps) {
  const { settings } = useGameStore();
  const { sheets, getSheetById } = useSheetStore();
  
  const [name, setName] = useState('');
  const [imageValue, setImageValue] = useState<ImageInputValue>({});
  const [size, setSize] = useState(settings.defaultTokenSize);
  const [hpMax, setHpMax] = useState<number | string>(settings.defaultHP.max);
  const [ac, setAc] = useState<number | string>('');
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(existingCharacterId || null);

  // Get selected sheet data
  const selectedSheet = selectedSheetId 
    ? getSheetById(selectedSheetId) 
    : undefined;

  // Reset form when modal opens
  useEffect(() => {
    if (opened) {
      const existingSheet = existingCharacterId ? getSheetById(existingCharacterId) : undefined;
      setName(existingSheet?.name || '');
      setImageValue({}); // Clear image
      setSize(settings.defaultTokenSize);
      setHpMax(settings.defaultHP.max);
      setAc('');
      setSelectedSheetId(existingCharacterId || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Auto-fill from sheet when selected
  useEffect(() => {
    if (selectedSheet) {
      setName(selectedSheet.name);
      // Auto-fill HP from sheet projections
      if (selectedSheet.shadowState && selectedSheet.projections) {
        const barKey = selectedSheet.projections.bar || 'HP';
        const barMaxKey = selectedSheet.projections.barMax || 'MaxHP';
        const hp = selectedSheet.shadowState[barKey];
        const maxHp = selectedSheet.shadowState[barMaxKey];
        if (hp !== undefined) {
          setHpMax(typeof maxHp === 'number' ? maxHp : parseInt(String(maxHp)) || 10);
        }
      }
      // Auto-fill AC from sheet projections
      if (selectedSheet.projections?.badge) {
        const ac = selectedSheet.shadowState[selectedSheet.projections.badge];
        if (ac !== undefined) {
          setAc(typeof ac === 'number' ? ac : parseInt(String(ac)) || 10);
        }
      }
    }
  }, [selectedSheet]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const config: TokenConfig = {
      name: name.trim(),
      imageUrl: imageValue.imageUrl?.trim() || '',
      imageId: imageValue.imageId,
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

    // Add sheet link if selected
    if (selectedSheetId) {
      config.sheetId = selectedSheetId;
    }

    onSubmit(config);
    onClose();
  };

  const handleUnlinkSheet = () => {
    setSelectedSheetId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSubmit();
    }
  };

  // Prepare sheet options for dropdown
  const sheetOptions = sheets.map((s) => ({
    value: s.id,
    label: s.name,
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
        
        <ImageInput
          value={imageValue}
          onChange={setImageValue}
          label="Image URL"
          placeholder="https://example.com/token.png (optional)"
          aiAvailable={aiAvailable}
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

        {/* Sheet Linking Section */}
        <Divider label="Link Sheet (Optional)" labelPosition="center" />
        
        <Select
          label="Link Sheet"
          placeholder={sheetOptions.length > 0 ? "Select a sheet..." : "No sheets yet — create one in the Library"}
          value={selectedSheetId}
          onChange={(val) => setSelectedSheetId(val)}
          data={sheetOptions}
          clearable
          searchable
          nothingFoundMessage="No sheets found"
          comboboxProps={{ withinPortal: true, zIndex: 1000 }}
        />

        {/* Show linked sheet info */}
        {selectedSheet && (
          <Paper p="sm" withBorder style={{ backgroundColor: 'rgba(124, 58, 237, 0.05)' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600}>Linked Sheet</Text>
              <Badge color="violet">{selectedSheet.name}</Badge>
            </Group>
            <Text size="xs" c="dimmed">
              HP: {selectedSheet.shadowState[selectedSheet.projections.bar || 'HP'] || '—'} / 
              {selectedSheet.shadowState[selectedSheet.projections.barMax || 'MaxHP'] || '—'} • 
              AC: {selectedSheet.shadowState[selectedSheet.projections.badge || 'AC'] || '—'}
            </Text>
            <Button 
              size="xs" 
              variant="subtle" 
              color="red" 
              mt="xs"
              onClick={handleUnlinkSheet}
            >
              Unlink Sheet
            </Button>
          </Paper>
        )}

        {/* HP and AC - only show when not linked or as fallback */}
        {!selectedSheet && (
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

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create Token
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
