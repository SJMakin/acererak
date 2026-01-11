import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Group,
} from '@mantine/core';

export interface ImageConfig {
  imageUrl: string;
  name?: string;
  width: number;
  height: number;
}

interface ImageModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (config: ImageConfig) => void;
}

export default function ImageModal({
  opened,
  onClose,
  onSubmit
}: ImageModalProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [name, setName] = useState('');
  const [width, setWidth] = useState<number | string>(400);
  const [height, setHeight] = useState<number | string>(400);

  // Reset form when modal opens
  useEffect(() => {
    if (opened) {
      setImageUrl('');
      setName('');
      setWidth(400);
      setHeight(400);
    }
  }, [opened]);

  const handleSubmit = () => {
    if (!imageUrl.trim()) return;

    const config: ImageConfig = {
      imageUrl: imageUrl.trim(),
      width: typeof width === 'number' ? width : 400,
      height: typeof height === 'number' ? height : 400,
    };

    // Add name if provided
    if (name.trim()) {
      config.name = name.trim();
    }

    onSubmit(config);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && imageUrl.trim()) {
      handleSubmit();
    }
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title="Place Image"
      size="md"
    >
      <Stack gap="md">
        <TextInput
          label="Image URL"
          placeholder="https://example.com/image.png"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
          required
          autoFocus
          data-autofocus
        />
        
        <TextInput
          label="Name (optional)"
          placeholder="e.g., Treasure Map, Handout"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyPress={handleKeyPress}
        />
        
        <Group grow>
          <NumberInput
            label="Width (pixels)"
            placeholder="400"
            value={width}
            onChange={setWidth}
            min={10}
            max={5000}
            required
          />
          
          <NumberInput
            label="Height (pixels)"
            placeholder="400"
            value={height}
            onChange={setHeight}
            min={10}
            max={5000}
            required
          />
        </Group>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!imageUrl.trim()}>
            Place Image
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
