import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Group,
} from '@mantine/core';
import ImageInput, { type ImageInputValue } from './ImageInput';

export interface ImageConfig {
  imageUrl: string;
  imageId?: string;
  name?: string;
  width: number;
  height: number;
}

interface ImageModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (config: ImageConfig) => void;
  aiAvailable?: boolean;
}

export default function ImageModal({
  opened,
  onClose,
  onSubmit,
  aiAvailable,
}: ImageModalProps) {
  const [imageValue, setImageValue] = useState<ImageInputValue>({});
  const [name, setName] = useState('');
  const [width, setWidth] = useState<number | string>(400);
  const [height, setHeight] = useState<number | string>(400);

  // Reset form when modal opens
  useEffect(() => {
    if (opened) {
      setImageValue({});
      setName('');
      setWidth(400);
      setHeight(400);
    }
  }, [opened]);

  // Auto-fill dimensions from embedded image
  const handleImageChange = (value: ImageInputValue) => {
    setImageValue(value);
    if (value.width && value.height) {
      setWidth(value.width);
      setHeight(value.height);
    }
  };

  const hasImage = !!(imageValue.imageUrl || imageValue.imageId);

  const handleSubmit = () => {
    if (!hasImage) return;

    const config: ImageConfig = {
      imageUrl: imageValue.imageUrl?.trim() || '',
      imageId: imageValue.imageId,
      width: typeof width === 'number' ? width : 400,
      height: typeof height === 'number' ? height : 400,
    };

    if (name.trim()) {
      config.name = name.trim();
    }

    onSubmit(config);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasImage) {
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
        <ImageInput
          value={imageValue}
          onChange={handleImageChange}
          label="Image URL"
          placeholder="https://example.com/image.png"
          required
          autoFocus
          aiAvailable={aiAvailable}
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
          <Button onClick={handleSubmit} disabled={!hasImage}>
            Place Image
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
