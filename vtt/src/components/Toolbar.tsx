import { useState } from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Menu,
  Text,
  Divider,
  Badge,
  ColorInput,
  NumberInput,
  Switch,
  Popover,
  Stack,
  Box,
} from '@mantine/core';
import {
  IconPointer,
  IconHandGrab,
  IconUserCircle,
  IconPencil,
  IconLineDashed,
  IconSquare,
  IconCircle,
  IconPolygon,
  IconArrowUp,
  IconTypography,
  IconRuler,
  IconMapPin,
  IconEye,
  IconEyeOff,
  IconChevronDown,
} from '@tabler/icons-react';
import { useGameStore } from '../stores/gameStore';
import { useHistoryStore } from '../stores/historyStore';
import type { ToolType } from '../types';
import SettingsModal from './SettingsModal';
import ExportImportModal from './ExportImportModal';

interface ToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  room: {
    roomId: string | null;
    peers: string[];
    leaveRoom: () => void;
  };
}

// Basic tools always visible
const basicTools: { id: ToolType; icon: React.ComponentType<any>; label: string; shortcut?: string }[] = [
  { id: 'select', icon: IconPointer, label: 'Select', shortcut: 'S' },
  { id: 'pan', icon: IconHandGrab, label: 'Pan', shortcut: 'Space' },
  { id: 'token', icon: IconUserCircle, label: 'Place Token', shortcut: 'N' },
];

// Drawing tools in dropdown
const drawingTools: { id: ToolType; icon: React.ComponentType<any>; label: string; shortcut?: string }[] = [
  { id: 'draw-freehand', icon: IconPencil, label: 'Freehand Draw', shortcut: 'D' },
  { id: 'draw-line', icon: IconLineDashed, label: 'Draw Line', shortcut: 'L' },
  { id: 'draw-rectangle', icon: IconSquare, label: 'Draw Rectangle', shortcut: 'R' },
  { id: 'draw-circle', icon: IconCircle, label: 'Draw Circle', shortcut: 'C' },
  { id: 'draw-ellipse', icon: IconCircle, label: 'Draw Ellipse', shortcut: 'E' },
  { id: 'draw-polygon', icon: IconPolygon, label: 'Draw Polygon', shortcut: 'G' },
  { id: 'draw-arrow', icon: IconArrowUp, label: 'Draw Arrow', shortcut: 'A' },
];

// Utility tools
const utilityTools: { id: ToolType; icon: React.ComponentType<any>; label: string; shortcut?: string }[] = [
  { id: 'text', icon: IconTypography, label: 'Add Text', shortcut: 'T' },
  { id: 'measure', icon: IconRuler, label: 'Measure Distance', shortcut: 'M' },
  { id: 'ping', icon: IconMapPin, label: 'Ping Location', shortcut: 'P' },
];

const dmTools: { id: ToolType; icon: React.ComponentType<any>; label: string }[] = [
  { id: 'fog-reveal', icon: IconEye, label: 'Reveal Fog' },
  { id: 'fog-hide', icon: IconEyeOff, label: 'Hide Area' },
];

export default function Toolbar({ sidebarOpen, onToggleSidebar, room }: ToolbarProps) {
  const {
    game,
    selectedTool,
    setTool,
    isDM,
    viewportScale,
    setViewport,
    viewportOffset,
    performUndo,
    performRedo,
    drawingStrokeColor,
    drawingFillColor,
    drawingFillEnabled,
    drawingStrokeWidth,
    previewAsPlayer,
    setPreviewAsPlayer,
    setDrawingStrokeColor,
    setDrawingFillColor,
    setDrawingFillEnabled,
    setDrawingStrokeWidth,
  } = useGameStore();
  const { canUndo, canRedo } = useHistoryStore();
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [exportImportOpened, setExportImportOpened] = useState(false);
  const [exportImportMode, setExportImportMode] = useState<'export' | 'import'>('export');

  const handleZoom = (factor: number) => {
    const newScale = Math.min(Math.max(viewportScale * factor, 0.25), 3);
    setViewport(viewportOffset, newScale);
  };

  // Check if current tool is a drawing tool
  const isDrawingTool = selectedTool.startsWith('draw-');

  return (
    <Group h="100%" px="md" justify="space-between">
      {/* Left section - Game info and tools */}
      <Group gap="md">
        <Group gap="xs">
          <Text fw={600} size="lg">
            🎲 {game?.name || 'Acererak VTT'}
          </Text>
          
          {/* Preview Mode Indicator */}
          {isDM && previewAsPlayer && (
            <Badge
              color="violet"
              variant="filled"
              size="lg"
              style={{ cursor: 'pointer' }}
              onClick={() => setPreviewAsPlayer(false)}
            >
              👁️ Preview Mode
            </Badge>
          )}
        </Group>
        
        <Divider orientation="vertical" />

        {/* Undo/Redo buttons */}
        <Group gap="xs">
          <Tooltip label="Undo (Ctrl+Z)" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={performUndo}
              disabled={!canUndo()}
            >
              ↶
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Redo (Ctrl+Y)" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={performRedo}
              disabled={!canRedo()}
            >
              ↷
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" />

        {/* Tool buttons */}
        <Group gap="xs">
          {/* Basic tools */}
          {basicTools.map((tool) => (
            <Tooltip
              key={tool.id}
              label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              position="bottom"
            >
              <ActionIcon
                variant={selectedTool === tool.id ? 'filled' : 'subtle'}
                color={selectedTool === tool.id ? 'violet' : 'gray'}
                size="lg"
                onClick={() => setTool(tool.id)}
              >
                <tool.icon size={18} />
              </ActionIcon>
            </Tooltip>
          ))}

          {/* Drawing tools dropdown */}
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Tooltip label="Drawing Tools" position="bottom">
                <ActionIcon
                  variant={isDrawingTool ? 'filled' : 'subtle'}
                  color={isDrawingTool ? 'violet' : 'gray'}
                  size="lg"
                >
                  <Group gap={2}>
                    {(() => {
                      const currentDrawingTool = drawingTools.find(t => t.id === selectedTool);
                      const Icon = currentDrawingTool?.icon || IconPencil;
                      return <Icon size={18} />;
                    })()}
                    <IconChevronDown size={12} />
                  </Group>
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Drawing Tools</Menu.Label>
              {drawingTools.map((tool) => (
                <Menu.Item
                  key={tool.id}
                  leftSection={<tool.icon size={16} />}
                  onClick={() => setTool(tool.id)}
                  color={selectedTool === tool.id ? 'violet' : undefined}
                  bg={selectedTool === tool.id ? 'var(--mantine-color-violet-light)' : undefined}
                >
                  <Group justify="space-between" gap="xs">
                    <Text size="sm">{tool.label}</Text>
                    {tool.shortcut && (
                      <Badge size="xs" variant="light" color="gray">
                        {tool.shortcut}
                      </Badge>
                    )}
                  </Group>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          {/* Utility tools */}
          {utilityTools.map((tool) => (
            <Tooltip
              key={tool.id}
              label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              position="bottom"
            >
              <ActionIcon
                variant={selectedTool === tool.id ? 'filled' : 'subtle'}
                color={selectedTool === tool.id ? 'violet' : 'gray'}
                size="lg"
                onClick={() => setTool(tool.id)}
              >
                <tool.icon size={18} />
              </ActionIcon>
            </Tooltip>
          ))}

          {/* DM-only tools */}
          {isDM && (
            <>
              <Divider orientation="vertical" />
              {dmTools.map((tool) => (
                <Tooltip key={tool.id} label={tool.label} position="bottom">
                  <ActionIcon
                    variant={selectedTool === tool.id ? 'filled' : 'subtle'}
                    color={selectedTool === tool.id ? 'violet' : 'gray'}
                    size="lg"
                    onClick={() => setTool(tool.id)}
                  >
                    <tool.icon size={18} />
                  </ActionIcon>
                </Tooltip>
              ))}
            </>
          )}
        </Group>

        {/* Drawing style controls - Show when drawing tool is active */}
        {isDrawingTool && (
          <>
            <Divider orientation="vertical" />
            <Group gap="xs">
              {/* Stroke color picker */}
              <Popover position="bottom" withArrow shadow="md">
                <Popover.Target>
                  <Tooltip label="Stroke Color" position="bottom">
                    <ActionIcon
                      variant="subtle"
                      size="lg"
                      style={{
                        backgroundColor: drawingStrokeColor,
                        border: '2px solid #fff',
                      }}
                    >
                      <Box w={20} h={20} />
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Text size="xs" fw={600}>Stroke Color</Text>
                    <ColorInput
                      value={drawingStrokeColor}
                      onChange={setDrawingStrokeColor}
                      format="hex"
                      swatches={['#ffffff', '#000000', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']}
                    />
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              {/* Fill color picker with toggle */}
              <Popover position="bottom" withArrow shadow="md">
                <Popover.Target>
                  <Tooltip label="Fill Color" position="bottom">
                    <ActionIcon
                      variant="subtle"
                      size="lg"
                      style={{
                        backgroundColor: drawingFillEnabled ? drawingFillColor : 'transparent',
                        border: `2px solid ${drawingFillEnabled ? '#fff' : '#666'}`,
                        opacity: drawingFillEnabled ? 1 : 0.5,
                      }}
                    >
                      <Box w={20} h={20} />
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="xs" fw={600}>Fill Color</Text>
                      <Switch
                        size="xs"
                        checked={drawingFillEnabled}
                        onChange={(e) => setDrawingFillEnabled(e.currentTarget.checked)}
                        label="Fill"
                      />
                    </Group>
                    <ColorInput
                      value={drawingFillColor}
                      onChange={setDrawingFillColor}
                      format="hex"
                      disabled={!drawingFillEnabled}
                      swatches={['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']}
                    />
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              {/* Stroke width selector */}
              <Popover position="bottom" withArrow shadow="md">
                <Popover.Target>
                  <Tooltip label={`Stroke Width: ${drawingStrokeWidth}px`} position="bottom">
                    <ActionIcon variant="subtle" size="lg">
                      <Text size="sm" fw={600}>{drawingStrokeWidth}</Text>
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Text size="xs" fw={600}>Stroke Width</Text>
                    <NumberInput
                      value={drawingStrokeWidth}
                      onChange={(val) => setDrawingStrokeWidth(Number(val) || 3)}
                      min={1}
                      max={10}
                      step={1}
                      w={100}
                    />
                    {/* Quick width presets */}
                    <Group gap={4}>
                      {[1, 2, 3, 5, 8, 10].map((width) => (
                        <ActionIcon
                          key={width}
                          size="sm"
                          variant={drawingStrokeWidth === width ? 'filled' : 'subtle'}
                          onClick={() => setDrawingStrokeWidth(width)}
                        >
                          {width}
                        </ActionIcon>
                      ))}
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </Group>
          </>
        )}

        <Divider orientation="vertical" />

        {/* Zoom controls */}
        <Group gap="xs">
          <Tooltip label="Zoom Out" position="bottom">
            <ActionIcon variant="subtle" onClick={() => handleZoom(0.8)}>
              ➖
            </ActionIcon>
          </Tooltip>
          <Text size="sm" c="dimmed" w={50} ta="center">
            {Math.round(viewportScale * 100)}%
          </Text>
          <Tooltip label="Zoom In" position="bottom">
            <ActionIcon variant="subtle" onClick={() => handleZoom(1.25)}>
              ➕
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset Zoom" position="bottom">
            <ActionIcon variant="subtle" onClick={() => setViewport({ x: 0, y: 0 }, 1)}>
              🔄
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Right section - Connection info and settings */}
      <Group gap="md">
        {/* Connection status */}
        {room.roomId && (
          <Group gap="xs">
            <Badge color="green" variant="light">
              Connected
            </Badge>
            <Text size="sm" c="dimmed">
              {room.peers.length + 1} players
            </Text>
          </Group>
        )}

        {/* Settings button */}
        <Tooltip label="Settings" position="bottom">
          <ActionIcon variant="subtle" size="lg" onClick={() => setSettingsOpened(true)}>
            ⚙️
          </ActionIcon>
        </Tooltip>

        {/* More menu */}
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" size="lg">
              ⋮
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Game</Menu.Label>
            <Menu.Item onClick={() => {
              setExportImportMode('export');
              setExportImportOpened(true);
            }}>
              💾 Export Game...
            </Menu.Item>
            <Menu.Item onClick={() => {
              setExportImportMode('import');
              setExportImportOpened(true);
            }}>
              📥 Import...
            </Menu.Item>
            
            {room.roomId && (
              <>
                <Menu.Divider />
                <Menu.Item color="red" onClick={room.leaveRoom}>
                  🚪 Leave Game
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>

        {/* Toggle sidebar */}
        <Tooltip label={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'} position="bottom">
          <ActionIcon variant="subtle" size="lg" onClick={onToggleSidebar}>
            {sidebarOpen ? '◀️' : '▶️'}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Settings Modal */}
      <SettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
      
      {/* Export/Import Modal */}
      <ExportImportModal
        opened={exportImportOpened}
        onClose={() => setExportImportOpened(false)}
        mode={exportImportMode}
      />
    </Group>
  );
}
