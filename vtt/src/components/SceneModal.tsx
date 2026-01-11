import { useState, useEffect } from 'react';
import { Modal, TextInput, Stack, Button, Group, Checkbox, NumberInput, ColorInput, Select } from '@mantine/core';
import type { Scene, GridSettings } from '../types';

interface SceneModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    backgroundUrl?: string;
    gridSettings: GridSettings;
    copyFromCurrent: boolean;
  }) => void;
  scene?: Scene; // If editing existing scene
  defaultGridSettings: GridSettings;
}

export default function SceneModal({ opened, onClose, onSubmit, scene, defaultGridSettings }: SceneModalProps) {
  const [name, setName] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [copyFromCurrent, setCopyFromCurrent] = useState(false);

  // Grid settings
  const [cellSize, setCellSize] = useState(50);
  const [gridWidth, setGridWidth] = useState(30);
  const [gridHeight, setGridHeight] = useState(30);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridColor, setGridColor] = useState('rgba(255, 255, 255, 0.2)');
  const [gridType, setGridType] = useState<'square' | 'hex' | 'none'>('square');

  // Initialize form when modal opens or scene changes
  useEffect(() => {
    if (opened) {
      if (scene) {
        // Editing existing scene
        setName(scene.name);
        setBackgroundUrl(scene.backgroundUrl || '');
        setCellSize(scene.gridSettings.cellSize);
        setGridWidth(scene.gridSettings.width);
        setGridHeight(scene.gridSettings.height);
        setShowGrid(scene.gridSettings.showGrid);
        setSnapToGrid(scene.gridSettings.snapToGrid);
        setGridColor(scene.gridSettings.gridColor);
        setGridType(scene.gridSettings.gridType);
        setCopyFromCurrent(false);
      } else {
        // Creating new scene - use defaults
        setName('');
        setBackgroundUrl('');
        setCellSize(defaultGridSettings.cellSize);
        setGridWidth(defaultGridSettings.width);
        setGridHeight(defaultGridSettings.height);
        setShowGrid(defaultGridSettings.showGrid);
        setSnapToGrid(defaultGridSettings.snapToGrid);
        setGridColor(defaultGridSettings.gridColor);
        setGridType(defaultGridSettings.gridType);
        setCopyFromCurrent(false);
      }
    }
  }, [opened, scene, defaultGridSettings]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const gridSettings: GridSettings = {
      cellSize,
      width: gridWidth,
      height: gridHeight,
      showGrid,
      snapToGrid,
      gridColor,
      gridType,
    };

    onSubmit({
      name: name.trim(),
      backgroundUrl: backgroundUrl.trim() || undefined,
      gridSettings,
      copyFromCurrent,
    });

    // Reset form
    setName('');
    setBackgroundUrl('');
    setCopyFromCurrent(false);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={scene ? 'Edit Scene' : 'Create New Scene'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Scene Name"
          placeholder="e.g., Goblin Cave, Town Square"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          data-autofocus
        />

        <TextInput
          label="Background Image URL (optional)"
          placeholder="https://..."
          value={backgroundUrl}
          onChange={(e) => setBackgroundUrl(e.currentTarget.value)}
          description="Paste a URL to an image to use as the map background"
        />

        {!scene && (
          <Checkbox
            label="Copy elements and fog from current scene"
            checked={copyFromCurrent}
            onChange={(e) => setCopyFromCurrent(e.currentTarget.checked)}
            description="Creates a duplicate of the current scene with a new name"
          />
        )}

        {!copyFromCurrent && (
          <>
            <Select
              label="Grid Type"
              value={gridType}
              onChange={(value) => setGridType(value as 'square' | 'hex' | 'none')}
              data={[
                { value: 'square', label: 'Square Grid' },
                { value: 'hex', label: 'Hex Grid' },
                { value: 'none', label: 'No Grid (Gridless)' },
              ]}
            />

            <Group grow>
              <NumberInput
                label="Cell Size (pixels)"
                value={cellSize}
                onChange={(val) => setCellSize(Number(val) || 50)}
                min={10}
                max={200}
                step={5}
              />
              <NumberInput
                label="Grid Width (cells)"
                value={gridWidth}
                onChange={(val) => setGridWidth(Number(val) || 30)}
                min={5}
                max={100}
              />
              <NumberInput
                label="Grid Height (cells)"
                value={gridHeight}
                onChange={(val) => setGridHeight(Number(val) || 30)}
                min={5}
                max={100}
              />
            </Group>

            <Group grow>
              <Checkbox
                label="Show Grid"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.currentTarget.checked)}
              />
              <Checkbox
                label="Snap to Grid"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.currentTarget.checked)}
              />
            </Group>

            <ColorInput
              label="Grid Color"
              value={gridColor}
              onChange={setGridColor}
              format="rgba"
              swatches={[
                'rgba(255, 255, 255, 0.1)',
                'rgba(255, 255, 255, 0.2)',
                'rgba(255, 255, 255, 0.3)',
                'rgba(0, 0, 0, 0.2)',
                'rgba(0, 0, 0, 0.3)',
              ]}
            />
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {scene ? 'Save Changes' : 'Create Scene'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
