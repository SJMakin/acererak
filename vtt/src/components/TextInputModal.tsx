import { Modal, Stack, Group, Button, Textarea } from '@mantine/core';
import { useState, useEffect } from 'react';

interface TextInputModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  initialText?: string;
}

export default function TextInputModal({ opened, onClose, onSubmit, initialText = '' }: TextInputModalProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (opened) {
      setText(initialText);
    }
  }, [opened, initialText]);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add Text"
      size="md"
      centered
    >
      <Stack gap="md">
        <Textarea
          placeholder="Enter text..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          autosize
          minRows={3}
          maxRows={8}
          autoFocus
          data-autofocus
        />

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!text.trim()}>
            Add Text
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
