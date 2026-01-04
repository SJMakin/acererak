import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Group,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';

export interface TokenConfig {
  name: string;
  imageUrl: string;
  size: number;
  hp?: { current: number; max: number };
  ac?: number;
}

interface TokenConfigModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (config: TokenConfig) => void;
}

export default function TokenConfigModal({
  opened,
  onClose,
  onSubmit
}: TokenConfigModalProps) {
  const { settings } = useGameStore();
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [size, setSize] = useState(settings.defaultTokenSize);
  const [hpMax, setHpMax] = useState<number | string>(settings.defaultHP.max);
  const [ac, setAc] = useState<number | string>('');

  // Reset form when modal opens with defaults from settings
  useEffect(() => {
    if (opened) {
      setName('');
      setImageUrl('');
      setSize(settings.defaultTokenSize);
      setHpMax(settings.defaultHP.max);
      setAc('');
    }
  }, [opened, settings.defaultTokenSize, settings.defaultHP.max]);

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

    onSubmit(config);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleSubmit();
    }
  };

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
