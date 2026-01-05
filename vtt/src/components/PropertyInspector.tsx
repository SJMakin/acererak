import { useState, useEffect } from 'react';
import {
  Stack,
  Paper,
  Text,
  Group,
  NumberInput,
  Select,
  Checkbox,
  Button,
  TextInput,
  ColorInput,
  Textarea,
  Divider,
  Badge,
  ActionIcon,
  Box,
  Collapse,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useGameStore } from '../stores/gameStore';
import type { CanvasElement, TokenElement, ShapeElement, TextElement, ImageElement, Visibility } from '../types';
import MarkdownEditor from './MarkdownEditor';

interface PropertyInspectorProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
    broadcastElementDelete: (elementId: string) => void;
  };
}

export default function PropertyInspector({ room }: PropertyInspectorProps) {
  const { game, selectedElementId, isDM, updateElement, deleteElement, selectElement } = useGameStore();

  // Get selected element
  const selectedElement = game?.elements.find((e) => e.id === selectedElementId);

  // Local state for condition input
  const [newCondition, setNewCondition] = useState('');

  // Collapsible notes state
  const [notesOpened, { toggle: toggleNotes }] = useDisclosure(false);

  // Auto-clear condition input when element changes
  useEffect(() => {
    setNewCondition('');
  }, [selectedElementId]);

  if (!selectedElement) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          No element selected
        </Text>
      </Paper>
    );
  }

  // Helper functions for updating and broadcasting
  const handleUpdate = (updates: Partial<CanvasElement>) => {
    updateElement(selectedElement.id, updates);
    room.broadcastElementUpdate({ ...selectedElement, ...updates } as CanvasElement);
  };

  const handleDelete = () => {
    deleteElement(selectedElement.id);
    room.broadcastElementDelete(selectedElement.id);
    selectElement(null);
  };

  const handleVisibilityChange = (value: string | null) => {
    const visibility: Visibility = value === 'all' ? 'all' : 'dm';
    handleUpdate({ visibleTo: visibility });
  };

  const handleZIndexChange = (delta: number) => {
    const newZIndex = Math.max(0, selectedElement.zIndex + delta);
    handleUpdate({ zIndex: newZIndex });
  };

  // Token-specific handlers
  const handleHPChange = (field: 'current' | 'max', value: number | string) => {
    if (selectedElement.type !== 'token') return;
    const token = selectedElement as TokenElement;
    const hp = token.hp || { current: 10, max: 10 };
    const newValue = typeof value === 'number' ? value : parseInt(value) || 0;
    handleUpdate({ hp: { ...hp, [field]: newValue } });
  };

  const handleHPAdjust = (delta: number) => {
    if (selectedElement.type !== 'token') return;
    const token = selectedElement as TokenElement;
    const hp = token.hp || { current: 10, max: 10 };
    const newCurrent = Math.max(0, Math.min(hp.max, hp.current + delta));
    handleUpdate({ hp: { ...hp, current: newCurrent } });
  };

  const handleAddCondition = () => {
    if (selectedElement.type !== 'token' || !newCondition.trim()) return;
    const token = selectedElement as TokenElement;
    const conditions = token.conditions || [];
    handleUpdate({ conditions: [...conditions, newCondition.trim()] });
    setNewCondition('');
  };

  const handleRemoveCondition = (index: number) => {
    if (selectedElement.type !== 'token') return;
    const token = selectedElement as TokenElement;
    const conditions = token.conditions || [];
    handleUpdate({ conditions: conditions.filter((_, i) => i !== index) });
  };

  // Shape-specific handlers
  const handleShapeStyleUpdate = (updates: Partial<ShapeElement['style']>) => {
    if (selectedElement.type !== 'shape') return;
    const shape = selectedElement as ShapeElement;
    handleUpdate({ style: { ...shape.style, ...updates } });
  };

  // Text-specific handlers
  const handleTextStyleUpdate = (updates: Partial<TextElement['style']>) => {
    if (selectedElement.type !== 'text') return;
    const text = selectedElement as TextElement;
    handleUpdate({ style: { ...text.style, ...updates } });
  };

  return (
    <Stack gap="sm">
      <Paper p="sm" withBorder>
        <Stack gap="xs">
          {/* Element Type Indicator */}
          <Group justify="space-between">
            <Text size="sm" fw={700} tt="uppercase" c="dimmed">
              {selectedElement.type}
            </Text>
            <Badge size="xs" color="violet">
              {selectedElement.layer}
            </Badge>
          </Group>

          {/* Common Properties: Position */}
          <Divider label="Position" labelPosition="center" />
          <Group grow>
            <NumberInput
              label="X"
              size="xs"
              value={selectedElement.x}
              onChange={(val) => handleUpdate({ x: Number(val) || 0 })}
              step={game?.gridSettings.snapToGrid ? game.gridSettings.cellSize : 1}
            />
            <NumberInput
              label="Y"
              size="xs"
              value={selectedElement.y}
              onChange={(val) => handleUpdate({ y: Number(val) || 0 })}
              step={game?.gridSettings.snapToGrid ? game.gridSettings.cellSize : 1}
            />
          </Group>

          {/* Common Properties: Visibility, Lock, Layer */}
          <Divider label="Display" labelPosition="center" />
          <Select
            label="Visibility"
            size="xs"
            value={selectedElement.visibleTo === 'all' ? 'all' : 'dm'}
            onChange={handleVisibilityChange}
            data={[
              { value: 'all', label: 'Visible to All' },
              { value: 'dm', label: 'DM Only' },
            ]}
            disabled={!isDM}
          />

          <Checkbox
            label="Locked (prevents dragging)"
            size="xs"
            checked={selectedElement.locked}
            onChange={(e) => handleUpdate({ locked: e.currentTarget.checked })}
          />

          {/* Z-Index Controls */}
          <Box>
            <Text size="xs" fw={500} mb={4}>
              Layer Order (Z-Index: {selectedElement.zIndex})
            </Text>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                onClick={() => handleZIndexChange(1)}
                style={{ flex: 1 }}
              >
                Bring Forward
              </Button>
              <Button
                size="xs"
                variant="light"
                onClick={() => handleZIndexChange(-1)}
                style={{ flex: 1 }}
              >
                Send Backward
              </Button>
            </Group>
          </Box>
        </Stack>
      </Paper>

      {/* Token-Specific Properties */}
      {selectedElement.type === 'token' && (
        <Paper p="sm" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={700} c="violet">
              Token Properties
            </Text>

            <TextInput
              label="Name"
              size="xs"
              value={(selectedElement as TokenElement).name}
              onChange={(e) => handleUpdate({ name: e.currentTarget.value })}
            />

            <TextInput
              label="Image URL"
              size="xs"
              value={(selectedElement as TokenElement).imageUrl}
              onChange={(e) => handleUpdate({ imageUrl: e.currentTarget.value })}
            />

            <NumberInput
              label="Size (grid cells)"
              size="xs"
              value={(selectedElement as TokenElement).width}
              onChange={(val) =>
                handleUpdate({
                  width: Number(val) || 1,
                  height: Number(val) || 1,
                })
              }
              min={1}
              max={10}
              step={1}
            />

            {/* HP Section */}
            <Divider label="Hit Points" labelPosition="center" />
            <Group grow>
              <NumberInput
                label="Current HP"
                size="xs"
                value={(selectedElement as TokenElement).hp?.current ?? 10}
                onChange={(val) => handleHPChange('current', val)}
                min={0}
              />
              <NumberInput
                label="Max HP"
                size="xs"
                value={(selectedElement as TokenElement).hp?.max ?? 10}
                onChange={(val) => handleHPChange('max', val)}
                min={1}
              />
            </Group>
            <Group gap="xs" grow>
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={() => handleHPAdjust(-1)}
              >
                -1 HP
              </Button>
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={() => handleHPAdjust(-5)}
              >
                -5 HP
              </Button>
              <Button
                size="xs"
                color="green"
                variant="light"
                onClick={() => handleHPAdjust(5)}
              >
                +5 HP
              </Button>
              <Button
                size="xs"
                color="green"
                variant="light"
                onClick={() => handleHPAdjust(1)}
              >
                +1 HP
              </Button>
            </Group>

            {/* AC */}
            <NumberInput
              label="Armor Class (AC)"
              size="xs"
              value={(selectedElement as TokenElement).ac ?? 10}
              onChange={(val) => handleUpdate({ ac: Number(val) || 10 })}
              min={1}
              max={30}
            />

            {/* Conditions */}
            <Divider label="Conditions" labelPosition="center" />
            <Group gap="xs">
              <TextInput
                placeholder="Add condition"
                size="xs"
                value={newCondition}
                onChange={(e) => setNewCondition(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCondition();
                }}
                style={{ flex: 1 }}
              />
              <Button size="xs" onClick={handleAddCondition}>
                Add
              </Button>
            </Group>
            <Group gap={4}>
              {((selectedElement as TokenElement).conditions || []).map((condition, index) => (
                <Badge
                  key={index}
                  size="sm"
                  color="orange"
                  rightSection={
                    <ActionIcon
                      size="xs"
                      color="orange"
                      variant="transparent"
                      onClick={() => handleRemoveCondition(index)}
                    >
                      ×
                    </ActionIcon>
                  }
                >
                  {condition}
                </Badge>
              ))}
            </Group>

            {/* Notes Section */}
            <Divider label="Notes" labelPosition="center" />
            <Button
              size="xs"
              variant="subtle"
              onClick={toggleNotes}
              fullWidth
            >
              {notesOpened ? '▼ Hide Notes' : '▶ Show Notes'}
              {(selectedElement as TokenElement).notes && ' 📝'}
            </Button>
            <Collapse in={notesOpened}>
              <MarkdownEditor
                value={(selectedElement as TokenElement).notes || ''}
                onChange={(val) => handleUpdate({ notes: val })}
                placeholder="Character backstory, abilities, DM notes..."
                minRows={3}
                maxRows={8}
              />
            </Collapse>
          </Stack>
        </Paper>
      )}

      {/* Shape-Specific Properties */}
      {selectedElement.type === 'shape' && (
        <Paper p="sm" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={700} c="violet">
              Shape Properties
            </Text>

            <Text size="xs" c="dimmed">
              Type: {(selectedElement as ShapeElement).shapeType}
            </Text>

            <ColorInput
              label="Stroke Color"
              size="xs"
              value={(selectedElement as ShapeElement).style.strokeColor || '#ffffff'}
              onChange={(val) => handleShapeStyleUpdate({ strokeColor: val })}
            />

            <ColorInput
              label="Fill Color"
              size="xs"
              value={(selectedElement as ShapeElement).style.fillColor || 'transparent'}
              onChange={(val) => handleShapeStyleUpdate({ fillColor: val })}
            />

            <NumberInput
              label="Stroke Width"
              size="xs"
              value={(selectedElement as ShapeElement).style.lineWidth || 2}
              onChange={(val) => handleShapeStyleUpdate({ lineWidth: Number(val) || 2 })}
              min={1}
              max={20}
            />

            {/* Rectangle-specific */}
            {(selectedElement as ShapeElement).shapeType === 'rectangle' && (
              <>
                <NumberInput
                  label="Width"
                  size="xs"
                  value={(selectedElement as ShapeElement).width || 100}
                  onChange={(val) => handleUpdate({ width: Number(val) || 100 })}
                  min={1}
                />
                <NumberInput
                  label="Height"
                  size="xs"
                  value={(selectedElement as ShapeElement).height || 100}
                  onChange={(val) => handleUpdate({ height: Number(val) || 100 })}
                  min={1}
                />
              </>
            )}

            {/* Circle-specific */}
            {(selectedElement as ShapeElement).shapeType === 'circle' && (
              <NumberInput
                label="Radius"
                size="xs"
                value={((selectedElement as ShapeElement).width || 100) / 2}
                onChange={(val) => {
                  const diameter = (Number(val) || 50) * 2;
                  handleUpdate({ width: diameter, height: diameter });
                }}
                min={1}
              />
            )}
          </Stack>
        </Paper>
      )}

      {/* Text-Specific Properties */}
      {selectedElement.type === 'text' && (
        <Paper p="sm" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={700} c="violet">
              Text Properties
            </Text>

            <Textarea
              label="Content"
              size="xs"
              value={(selectedElement as TextElement).content}
              onChange={(e) => handleUpdate({ content: e.currentTarget.value })}
              minRows={2}
            />

            <NumberInput
              label="Text Box Width"
              size="xs"
              value={(selectedElement as TextElement).width || 200}
              onChange={(val) => handleUpdate({ width: Number(val) || 200 })}
              min={50}
              max={1000}
              step={10}
            />

            <Divider label="Font" labelPosition="center" />

            <Select
              label="Font Family"
              size="xs"
              value={(selectedElement as TextElement).style.fontFamily || 'sans-serif'}
              onChange={(val) => handleTextStyleUpdate({ fontFamily: val || 'sans-serif' })}
              data={[
                { value: 'sans-serif', label: 'Sans-serif' },
                { value: 'serif', label: 'Serif' },
                { value: 'monospace', label: 'Monospace' },
                { value: 'cursive', label: 'Cursive' },
                { value: 'fantasy', label: 'Fantasy' },
              ]}
            />

            <NumberInput
              label="Font Size"
              size="xs"
              value={(selectedElement as TextElement).style.fontSize || 16}
              onChange={(val) => handleTextStyleUpdate({ fontSize: Number(val) || 16 })}
              min={8}
              max={72}
            />

            <ColorInput
              label="Text Color"
              size="xs"
              value={(selectedElement as TextElement).style.strokeColor || '#ffffff'}
              onChange={(val) => handleTextStyleUpdate({ strokeColor: val })}
            />

            <Select
              label="Font Weight"
              size="xs"
              value={(selectedElement as TextElement).style.fontWeight || 'normal'}
              onChange={(val) => handleTextStyleUpdate({ fontWeight: val as 'normal' | 'bold' })}
              data={[
                { value: 'normal', label: 'Normal' },
                { value: 'bold', label: 'Bold' },
              ]}
            />

            <Select
              label="Font Style"
              size="xs"
              value={(selectedElement as TextElement).style.fontStyle || 'normal'}
              onChange={(val) => handleTextStyleUpdate({ fontStyle: val as 'normal' | 'italic' })}
              data={[
                { value: 'normal', label: 'Normal' },
                { value: 'italic', label: 'Italic' },
              ]}
            />

            <Select
              label="Text Alignment"
              size="xs"
              value={(selectedElement as TextElement).style.textAlign || 'left'}
              onChange={(val) => handleTextStyleUpdate({ textAlign: val as 'left' | 'center' | 'right' })}
              data={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />

            <Divider label="Background" labelPosition="center" />

            <Checkbox
              label="Show Background"
              size="xs"
              checked={(selectedElement as TextElement).style.backgroundEnabled ?? true}
              onChange={(e) => handleTextStyleUpdate({ backgroundEnabled: e.currentTarget.checked })}
            />

            {((selectedElement as TextElement).style.backgroundEnabled ?? true) && (
              <>
                <ColorInput
                  label="Background Color"
                  size="xs"
                  value={(selectedElement as TextElement).style.backgroundColor || 'rgba(0, 0, 0, 0.7)'}
                  onChange={(val) => handleTextStyleUpdate({ backgroundColor: val })}
                />

                <NumberInput
                  label="Background Opacity"
                  size="xs"
                  value={(selectedElement as TextElement).style.backgroundOpacity ?? 0.7}
                  onChange={(val) => handleTextStyleUpdate({ backgroundOpacity: Number(val) ?? 0.7 })}
                  min={0}
                  max={1}
                  step={0.1}
                  decimalScale={1}
                />
              </>
            )}
          </Stack>
        </Paper>
      )}

      {/* Image-Specific Properties */}
      {selectedElement.type === 'image' && (
        <Paper p="sm" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={700} c="violet">
              Image Properties
            </Text>

            <TextInput
              label="Name"
              size="xs"
              value={(selectedElement as ImageElement).name || ''}
              onChange={(e) => handleUpdate({ name: e.currentTarget.value })}
              placeholder="Map name..."
            />

            <TextInput
              label="Image URL"
              size="xs"
              value={(selectedElement as ImageElement).imageUrl}
              onChange={(e) => handleUpdate({ imageUrl: e.currentTarget.value })}
            />

            <Group grow>
              <NumberInput
                label="Width"
                size="xs"
                value={(selectedElement as ImageElement).width}
                onChange={(val) => handleUpdate({ width: Number(val) || 100 })}
                min={1}
              />
              <NumberInput
                label="Height"
                size="xs"
                value={(selectedElement as ImageElement).height}
                onChange={(val) => handleUpdate({ height: Number(val) || 100 })}
                min={1}
              />
            </Group>

            {/* Notes Section */}
            <Divider label="Notes" labelPosition="center" />
            <Button
              size="xs"
              variant="subtle"
              onClick={toggleNotes}
              fullWidth
            >
              {notesOpened ? '▼ Hide Notes' : '▶ Show Notes'}
              {(selectedElement as ImageElement).notes && ' 📝'}
            </Button>
            <Collapse in={notesOpened}>
              <MarkdownEditor
                value={(selectedElement as ImageElement).notes || ''}
                onChange={(val) => handleUpdate({ notes: val })}
                placeholder="Map description, room details, DM notes..."
                minRows={3}
                maxRows={8}
              />
            </Collapse>
          </Stack>
        </Paper>
      )}

      {/* Delete Button */}
      <Paper p="sm" withBorder>
        <Button fullWidth size="sm" color="red" variant="light" onClick={handleDelete}>
          Delete Element
        </Button>
      </Paper>
    </Stack>
  );
}
