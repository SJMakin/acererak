import { useState, type ComponentType } from 'react';
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
  Modal,
  Button,
  TextInput,
  useMantineTheme,
  ActionIcon as MantineActionIcon,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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
  IconPhoto,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconTarget,
  IconCone,
  IconLine,
  IconTriangle,
  IconMap,
  IconPlus,
  IconSettings,
  IconCopy,
  IconTrash,
  IconEdit,
  IconShare,
  IconDatabase,
  IconMenu2,
  IconDots,
  IconPalette,
  IconRefresh,
} from '@tabler/icons-react';
import { useGameStore } from '../stores/gameStore';
import { useHistoryStore } from '../stores/historyStore';
import { useAIStore } from '../stores/aiStore';
import type { ToolType, Scene } from '../types';
import SettingsModal from './SettingsModal';
import ExportImportModal from './ExportImportModal';
import SceneModal from './SceneModal';
import ShareGameModal from './ShareGameModal';
import ConnectionStatus from './ConnectionStatus';

interface ToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  room: {
    roomId: string | null;
    peers: string[];
    isHost: boolean;
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
    lastSyncedAt: number | null;
    gmDisconnected: boolean;
    isDesynced: boolean;
    leaveRoom: () => void;
    requestFullSync: () => void;
    broadcastSync: () => void;
    broadcastGridSettings: (settings: Partial<import('../types').GridSettings>) => void;
    broadcastSceneSwitch: (sceneId: string) => void;
    broadcastSceneUpdate: (scene: Scene) => void;
    broadcastAICapabilities: (capabilities: import('../types').AICapabilities) => void;
  };
}

// Icon component type used across tool definitions
type IconComponent = ComponentType<{ size?: number | string }>;

// Basic tools always visible
const basicTools: { id: ToolType; icon: IconComponent; label: string; shortcut?: string }[] = [
  { id: 'select', icon: IconPointer, label: 'Select', shortcut: 'S' },
  { id: 'pan', icon: IconHandGrab, label: 'Pan', shortcut: 'Space' },
  { id: 'token', icon: IconUserCircle, label: 'Place Token', shortcut: 'N' },
];

// Drawing tools in dropdown
const drawingTools: { id: ToolType; icon: IconComponent; label: string; shortcut?: string }[] = [
  { id: 'draw-freehand', icon: IconPencil, label: 'Freehand Draw', shortcut: 'D' },
  { id: 'draw-line', icon: IconLineDashed, label: 'Draw Line', shortcut: 'L' },
  { id: 'draw-rectangle', icon: IconSquare, label: 'Draw Rectangle', shortcut: 'R' },
  { id: 'draw-circle', icon: IconCircle, label: 'Draw Circle', shortcut: 'C' },
  { id: 'draw-ellipse', icon: IconCircle, label: 'Draw Ellipse', shortcut: 'E' },
  { id: 'draw-polygon', icon: IconPolygon, label: 'Draw Polygon', shortcut: 'G' },
  { id: 'draw-arrow', icon: IconArrowUp, label: 'Draw Arrow', shortcut: 'A' },
];

// Utility tools
const utilityTools: { id: ToolType; icon: IconComponent; label: string; shortcut?: string }[] = [
  { id: 'text', icon: IconTypography, label: 'Add Text', shortcut: 'T' },
  { id: 'image', icon: IconPhoto, label: 'Place Image', shortcut: 'I' },
  { id: 'measure', icon: IconRuler, label: 'Measure Distance', shortcut: 'M' },
  { id: 'ping', icon: IconMapPin, label: 'Ping Location', shortcut: 'P' },
];

const dmTools: { id: ToolType; icon: IconComponent; label: string }[] = [
  { id: 'fog-reveal', icon: IconEye, label: 'Reveal Fog' },
  { id: 'fog-hide', icon: IconEyeOff, label: 'Hide Area' },
];

// Area of Effect template tools
const aoeTools: { id: ToolType; icon: IconComponent; label: string; description: string }[] = [
  { id: 'aoe-circle', icon: IconTarget, label: 'Circle AOE', description: 'Drag to set radius' },
  { id: 'aoe-cone', icon: IconCone, label: 'Cone AOE', description: 'Fan shape with curved arc' },
  { id: 'aoe-triangle', icon: IconTriangle, label: 'Triangle AOE', description: 'Simple triangle (D&D RAW)' },
  { id: 'aoe-line', icon: IconLine, label: 'Line AOE', description: 'Drag to set path' },
  { id: 'aoe-square', icon: IconSquare, label: 'Square AOE', description: 'Drag to set dimensions' },
];

export default function Toolbar({ sidebarOpen, onToggleSidebar, room }: ToolbarProps) {
  const {
    game,
    selectedTool,
    setTool,
    isGM,
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
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const { canUndo, canRedo } = useHistoryStore();
  const aiAvailable = !!useAIStore((s) => s.capabilities.imageModel);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [exportImportOpened, setExportImportOpened] = useState(false);
  const [exportImportMode, setExportImportMode] = useState<'export' | 'import'>('export');
  const [shareGameOpened, setShareGameOpened] = useState(false);
  
  // Scene Modal state
  const [sceneModalOpened, setSceneModalOpened] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | undefined>(undefined);
  const [sceneManagerOpened, setSceneManagerOpened] = useState(false);
  const [editingSceneName, setEditingSceneName] = useState('');

  const handleZoom = (factor: number) => {
    const newScale = Math.min(Math.max(viewportScale * factor, 0.25), 3);
    setViewport(viewportOffset, newScale);
  };

  // Check if current tool is a drawing tool or AOE tool
  const isDrawingTool = selectedTool.startsWith('draw-');
  const isAoeTool = selectedTool.startsWith('aoe-');
  const connectionConfig = {
    disconnected: { color: 'gray', label: 'Disconnected' },
    connecting: { color: 'yellow', label: 'Connecting...' },
    connected: { color: 'green', label: 'Connected' },
    syncing: { color: 'blue', label: 'Syncing...' },
    error: { color: 'red', label: 'Error' },
  };
  const connectionInfo = connectionConfig[room.connectionState];
  const playerCount = game ? Object.keys(game.players).length : 1;
  const isRoomConnected = room.connectionState === 'connected';

  // Handle SceneModal submission
  const handleSceneSubmit = (data: {
    name: string;
    backgroundUrl?: string;
    backgroundImageId?: string;
    gridSettings: import('../types').GridSettings;
    copyFromCurrent: boolean;
  }) => {
    if (editingScene) {
      // Update existing scene
      useGameStore.getState().updateScene(editingScene.id, {
        name: data.name,
        backgroundUrl: data.backgroundUrl,
        backgroundImageId: data.backgroundImageId,
        gridSettings: data.gridSettings,
      });
      
      // Broadcast updated scene to peers
      const updatedScene = useGameStore.getState().game?.scenes.find(s => s.id === editingScene.id);
      if (updatedScene) {
        room.broadcastSceneUpdate(updatedScene);
      }
    } else {
      // Create new scene
      const newSceneId = useGameStore.getState().createScene(
        data.name,
        data.backgroundUrl,
        data.copyFromCurrent
      );
      
      // Update grid settings and backgroundImageId if not copying from current
      if (!data.copyFromCurrent) {
        useGameStore.getState().updateScene(newSceneId, {
          gridSettings: data.gridSettings,
          backgroundImageId: data.backgroundImageId,
        });
      }
      
      // Broadcast new scene to peers
      const newScene = useGameStore.getState().game?.scenes.find(s => s.id === newSceneId);
      if (newScene) {
        room.broadcastSceneUpdate(newScene);
        room.broadcastSceneSwitch(newSceneId);
      }
    }
    
    setSceneModalOpened(false);
    setEditingScene(undefined);
  };

  // Handle scene manager actions
  const handleDeleteScene = (sceneId: string) => {
    useGameStore.getState().deleteScene(sceneId);
    room.broadcastSync();
    setSceneManagerOpened(false);
  };

  const handleRenameScene = (sceneId: string, newName: string) => {
    useGameStore.getState().updateScene(sceneId, { name: newName });
    const updatedScene = useGameStore.getState().game?.scenes.find(s => s.id === sceneId);
    if (updatedScene) {
      room.broadcastSceneUpdate(updatedScene);
    }
    setEditingSceneName('');
  };

  if (isMobile) {
    const actionSize = 'xl';
    const compactActionSize = 'lg';
    const toolIconSize = 20;
    const menuIconSize = 18;

    return (
      <Stack h="100%" px="xs" gap={4} w="100%">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Tooltip label={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'} position="bottom">
              <ActionIcon variant="subtle" size={compactActionSize} onClick={onToggleSidebar}>
                <IconMenu2 size={menuIconSize} />
              </ActionIcon>
            </Tooltip>

            <Text fw={600} size="sm" lineClamp={1} style={{ maxWidth: 160 }}>
              🎲 {game?.name || 'Lychgate VTT'}
            </Text>

            {isGM && game && (() => {
              const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
              return (
                <Menu shadow="md" width={220}>
                  <Menu.Target>
                    <Tooltip label="Switch Scene" position="bottom">
                      <Button variant="subtle" color="gray" size="compact-sm" px="xs">
                        <Group gap={6} wrap="nowrap">
                          <IconMap size={16} />
                          <Text size="xs" fw={500} lineClamp={1} style={{ maxWidth: 120 }}>
                            {activeScene?.name || 'Scene'}
                          </Text>
                          <IconChevronDown size={12} />
                        </Group>
                      </Button>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Scenes</Menu.Label>
                    {game.scenes.map((scene) => (
                      <Menu.Item
                        key={scene.id}
                        leftSection={<IconMap size={16} />}
                        onClick={() => {
                          useGameStore.getState().switchScene(scene.id);
                          room.broadcastSceneSwitch(scene.id);
                        }}
                        color={scene.id === game.activeSceneId ? 'violet' : undefined}
                        bg={scene.id === game.activeSceneId ? 'var(--mantine-color-violet-light)' : undefined}
                      >
                        <Group justify="space-between" gap="xs">
                          <Text size="sm">{scene.name}</Text>
                          {scene.id === game.activeSceneId && (
                            <Badge size="xs" variant="light" color="violet">
                              Active
                            </Badge>
                          )}
                        </Group>
                      </Menu.Item>
                    ))}

                    <Menu.Divider />

                    <Menu.Item
                      leftSection={<IconPlus size={16} />}
                      onClick={() => {
                        setEditingScene(undefined);
                        setSceneModalOpened(true);
                      }}
                    >
                      New Scene
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={() => {
                        if (activeScene) {
                          const newSceneId = useGameStore.getState().duplicateScene(activeScene.id);
                          const newScene = useGameStore.getState().game?.scenes.find(s => s.id === newSceneId);
                          if (newScene) {
                            room.broadcastSceneUpdate(newScene);
                          }
                        }
                      }}
                    >
                      Duplicate Current Scene
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      onClick={() => {
                        setEditingScene(activeScene);
                        setSceneModalOpened(true);
                      }}
                    >
                      Edit Current Scene
                    </Menu.Item>

                    <Menu.Item
                      leftSection={<IconSettings size={16} />}
                      onClick={() => {
                        setSceneManagerOpened(true);
                      }}
                    >
                      Manage Scenes
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              );
            })()}

            {isGM && previewAsPlayer && (
              <Badge
                color="violet"
                variant="filled"
                size="xs"
                style={{ cursor: 'pointer' }}
                onClick={() => setPreviewAsPlayer(false)}
              >
                👁️ Preview
              </Badge>
            )}
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Undo (Ctrl+Z)" position="bottom">
              <ActionIcon
                variant="subtle"
                size={compactActionSize}
                onClick={() => {
                  performUndo();
                  room.broadcastSync();
                }}
                disabled={!isGM || !canUndo()}
              >
                ↶
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Redo (Ctrl+Y)" position="bottom">
              <ActionIcon
                variant="subtle"
                size={compactActionSize}
                onClick={() => {
                  performRedo();
                  room.broadcastSync();
                }}
                disabled={!isGM || !canRedo()}
              >
                ↷
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Settings" position="bottom">
              <ActionIcon variant="subtle" size={compactActionSize} onClick={() => setSettingsOpened(true)}>
                ⚙️
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={240}>
              <Menu.Target>
                <ActionIcon variant="subtle" size={compactActionSize} aria-label="More options">
                  <IconDots size={menuIconSize} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                {room.roomId && (
                  <>
                    <Menu.Label>Connection</Menu.Label>
                    <Menu.Item disabled>
                      <Text size="xs" c="dimmed">Status: {connectionInfo.label}</Text>
                    </Menu.Item>
                    <Menu.Item disabled>
                      <Text size="xs" c="dimmed">{playerCount} player{playerCount !== 1 ? 's' : ''}</Text>
                    </Menu.Item>
                    {!room.isHost && isRoomConnected && (
                      <Menu.Item leftSection={<IconRefresh size={16} />} onClick={room.requestFullSync}>
                        Request Sync
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                  </>
                )}

                <Menu.Label>Game</Menu.Label>

                {room.roomId && (
                  <>
                    <Menu.Label>Share</Menu.Label>
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={() => {
                        navigator.clipboard.writeText(room.roomId!);
                      }}
                    >
                      Copy Room ID
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconShare size={16} />}
                      onClick={() => setShareGameOpened(true)}
                    >
                      Show QR Code
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCopy size={16} />}
                      onClick={() => {
                        const joinLink = `${window.location.origin}${window.location.pathname}?room=${room.roomId}`;
                        navigator.clipboard.writeText(joinLink);
                      }}
                    >
                      Copy Join Link
                    </Menu.Item>
                    <Menu.Divider />
                  </>
                )}

                <Menu.Item
                  leftSection={<IconDatabase size={16} />}
                  onClick={() => {
                    setExportImportMode('export');
                    setExportImportOpened(true);
                  }}
                >
                  Save/Load...
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={() => setSettingsOpened(true)}
                >
                  Settings...
                </Menu.Item>

                {room.roomId && (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      onClick={room.leaveRoom}
                    >
                      🚪 Leave Game
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            {basicTools.map((tool) => (
              <Tooltip
                key={tool.id}
                label={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                position="bottom"
              >
                <ActionIcon
                  variant={selectedTool === tool.id ? 'filled' : 'subtle'}
                  color={selectedTool === tool.id ? 'violet' : 'gray'}
                  size={actionSize}
                  onClick={() => setTool(tool.id)}
                >
                  <tool.icon size={toolIconSize} />
                </ActionIcon>
              </Tooltip>
            ))}

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Tooltip label="Drawing Tools" position="bottom">
                  <ActionIcon
                    variant={isDrawingTool ? 'filled' : 'subtle'}
                    color={isDrawingTool ? 'violet' : 'gray'}
                    size={actionSize}
                  >
                    <Group gap={2} wrap="nowrap">
                      {(() => {
                        const currentDrawingTool = drawingTools.find(t => t.id === selectedTool);
                        const Icon = currentDrawingTool?.icon || IconPencil;
                        return <Icon size={toolIconSize} />;
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
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Menu shadow="md" width={240}>
              <Menu.Target>
                <Tooltip label="More Tools" position="bottom">
                  <ActionIcon variant="subtle" size={actionSize}>
                    <IconPalette size={toolIconSize} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Utility Tools</Menu.Label>
                {utilityTools.map((tool) => (
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

                <Menu.Divider />

                <Menu.Label>Area Templates</Menu.Label>
                {aoeTools.map((tool) => (
                  <Menu.Item
                    key={tool.id}
                    leftSection={<tool.icon size={16} />}
                    onClick={() => setTool(tool.id)}
                    color={selectedTool === tool.id ? 'orange' : undefined}
                    bg={selectedTool === tool.id ? 'var(--mantine-color-orange-light)' : undefined}
                  >
                    <Stack gap={0}>
                      <Text size="sm">{tool.label}</Text>
                      <Text size="xs" c="dimmed">{tool.description}</Text>
                    </Stack>
                  </Menu.Item>
                ))}

                {isGM && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>GM Tools</Menu.Label>
                    {dmTools.map((tool) => (
                      <Menu.Item
                        key={tool.id}
                        leftSection={<tool.icon size={16} />}
                        onClick={() => setTool(tool.id)}
                        color={selectedTool === tool.id ? 'violet' : undefined}
                        bg={selectedTool === tool.id ? 'var(--mantine-color-violet-light)' : undefined}
                      >
                        <Text size="sm">{tool.label}</Text>
                      </Menu.Item>
                    ))}
                  </>
                )}

                <Menu.Divider />
                <Menu.Label>View</Menu.Label>
                <Menu.Item onClick={() => handleZoom(0.8)}>Zoom Out</Menu.Item>
                <Menu.Item onClick={() => handleZoom(1.25)}>Zoom In</Menu.Item>
                <Menu.Item onClick={() => setViewport({ x: 0, y: 0 }, 1)}>Reset Zoom</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {isDrawingTool && (
          <Group gap="xs" wrap="nowrap">
            <Popover position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Stroke Color" position="bottom">
                  <ActionIcon
                    variant="subtle"
                    size={compactActionSize}
                    style={{
                      backgroundColor: drawingStrokeColor,
                      border: '2px solid #fff',
                    }}
                  >
                    <Box w={18} h={18} />
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

            <Popover position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Fill Color" position="bottom">
                  <ActionIcon
                    variant="subtle"
                    size={compactActionSize}
                    style={{
                      backgroundColor: drawingFillEnabled ? drawingFillColor : 'transparent',
                      border: `2px solid ${drawingFillEnabled ? '#fff' : '#666'}`,
                      opacity: drawingFillEnabled ? 1 : 0.5,
                    }}
                  >
                    <Box w={18} h={18} />
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

            <Popover position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label={`Stroke Width: ${drawingStrokeWidth}px`} position="bottom">
                  <ActionIcon variant="subtle" size={compactActionSize}>
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
        )}
      </Stack>
    );
  }

  return (
    <Group h="100%" px="md" justify="space-between">
      {/* Left section - Game info and tools */}
      <Group gap="md">
        <Group gap="xs">
          <Text fw={600} size="lg">
            🎲 {game?.name || 'Lychgate VTT'}
          </Text>
          
          {/* Preview Mode Indicator */}
          {isGM && previewAsPlayer && (
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

        {/* Scene Picker - GM only */}
        {isGM && game && (() => {
          const activeScene = game.scenes.find(s => s.id === game.activeSceneId) || game.scenes[0];
          return (
            <Menu shadow="md" width={250}>
              <Menu.Target>
                <Tooltip label="Switch Scene" position="bottom">
                  <Button variant="subtle" color="gray" size="compact-lg" px="xs">
                    <Group gap={6}>
                      <IconMap size={18} />
                      <Text size="sm" fw={500}>{activeScene?.name || 'Scene'}</Text>
                      <IconChevronDown size={12} />
                    </Group>
                  </Button>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Scenes</Menu.Label>
                {game.scenes.map((scene) => (
                  <Menu.Item
                    key={scene.id}
                    leftSection={<IconMap size={16} />}
                    onClick={() => {
                      useGameStore.getState().switchScene(scene.id);
                      room.broadcastSceneSwitch(scene.id);
                    }}
                    color={scene.id === game.activeSceneId ? 'violet' : undefined}
                    bg={scene.id === game.activeSceneId ? 'var(--mantine-color-violet-light)' : undefined}
                  >
                    <Group justify="space-between" gap="xs">
                      <Text size="sm">{scene.name}</Text>
                      {scene.id === game.activeSceneId && (
                        <Badge size="xs" variant="light" color="violet">
                          Active
                        </Badge>
                      )}
                    </Group>
                  </Menu.Item>
                ))}

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    setEditingScene(undefined);
                    setSceneModalOpened(true);
                  }}
                >
                  New Scene
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconCopy size={16} />}
                  onClick={() => {
                    if (activeScene) {
                      const newSceneId = useGameStore.getState().duplicateScene(activeScene.id);
                      const newScene = useGameStore.getState().game?.scenes.find(s => s.id === newSceneId);
                      if (newScene) {
                        room.broadcastSceneUpdate(newScene);
                      }
                    }
                  }}
                >
                  Duplicate Current Scene
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    setEditingScene(activeScene);
                    setSceneModalOpened(true);
                  }}
                >
                  Edit Current Scene
                </Menu.Item>

                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={() => {
                    setSceneManagerOpened(true);
                  }}
                >
                  Manage Scenes
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          );
        })()}

        <Divider orientation="vertical" />

        {/* Undo/Redo buttons */}
        <Group gap="xs">
          <Tooltip label="Undo (Ctrl+Z)" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => {
                performUndo();
                room.broadcastSync();
              }}
              disabled={!isGM || !canUndo()}
            >
              ↶
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Redo (Ctrl+Y)" position="bottom">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => {
                performRedo();
                room.broadcastSync();
              }}
              disabled={!isGM || !canRedo()}
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

          {/* Area of Effect tools dropdown */}
          <Menu shadow="md" width={220}>
            <Menu.Target>
              <Tooltip label="Area of Effect Templates" position="bottom">
                <ActionIcon
                  variant={isAoeTool ? 'filled' : 'subtle'}
                  color={isAoeTool ? 'orange' : 'gray'}
                  size="lg"
                >
                  <Group gap={2}>
                    {(() => {
                      const currentAoeTool = aoeTools.find(t => t.id === selectedTool);
                      const Icon = currentAoeTool?.icon || IconTarget;
                      return <Icon size={18} />;
                    })()}
                    <IconChevronDown size={12} />
                  </Group>
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Area of Effect Templates</Menu.Label>
              {aoeTools.map((tool) => (
                <Menu.Item
                  key={tool.id}
                  leftSection={<tool.icon size={16} />}
                  onClick={() => setTool(tool.id)}
                  color={selectedTool === tool.id ? 'orange' : undefined}
                  bg={selectedTool === tool.id ? 'var(--mantine-color-orange-light)' : undefined}
                >
                  <Stack gap={0}>
                    <Text size="sm">{tool.label}</Text>
                    <Text size="xs" c="dimmed">{tool.description}</Text>
                  </Stack>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          {/* GM-only tools */}
          {isGM && (
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
        <ConnectionStatus
          roomId={room.roomId}
          peers={room.peers}
          connectionState={room.connectionState}
          lastSyncedAt={room.lastSyncedAt}
          gmDisconnected={room.gmDisconnected}
          isHost={room.isHost}
          isDesynced={room.isDesynced}
          onRequestSync={room.requestFullSync}
        />

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
            
            {/* Share Game submenu */}
            {room.roomId && (
              <Menu
                trigger="hover"
                position="right"
                openDelay={100}
                closeDelay={100}
              >
                <Menu.Target>
                  <Menu.Item leftSection={<IconShare size={16} />}>
                    Share Game
                  </Menu.Item>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={() => {
                      navigator.clipboard.writeText(room.roomId!);
                    }}
                  >
                    Copy Room ID
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconShare size={16} />}
                    onClick={() => setShareGameOpened(true)}
                  >
                    Show QR Code
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={() => {
                      const joinLink = `${window.location.origin}${window.location.pathname}?room=${room.roomId}`;
                      navigator.clipboard.writeText(joinLink);
                    }}
                  >
                    Copy Join Link
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
            
            <Menu.Item
              leftSection={<IconDatabase size={16} />}
              onClick={() => {
                setExportImportMode('export');
                setExportImportOpened(true);
              }}
            >
              Save/Load...
            </Menu.Item>
            
            <Menu.Divider />
            
            <Menu.Item
              leftSection={<IconSettings size={16} />}
              onClick={() => setSettingsOpened(true)}
            >
              Settings...
            </Menu.Item>
            
            {room.roomId && (
              <>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  onClick={room.leaveRoom}
                >
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
      <SettingsModal
        opened={settingsOpened}
        onClose={() => setSettingsOpened(false)}
        onBroadcastGridSettings={room.broadcastGridSettings}
        onBroadcastAICapabilities={room.broadcastAICapabilities}
      />
      
      {/* Export/Import Modal */}
      <ExportImportModal
        opened={exportImportOpened}
        onClose={() => setExportImportOpened(false)}
        mode={exportImportMode}
      />

      {/* Share Game Modal */}
      <ShareGameModal
        opened={shareGameOpened}
        onClose={() => setShareGameOpened(false)}
        roomId={room.roomId}
      />

      {/* Scene Modal */}
      <SceneModal
        opened={sceneModalOpened}
        onClose={() => {
          setSceneModalOpened(false);
          setEditingScene(undefined);
        }}
        onSubmit={handleSceneSubmit}
        scene={editingScene}
        defaultGridSettings={{
          cellSize: 50,
          width: 30,
          height: 30,
          showGrid: true,
          snapToGrid: true,
          gridColor: 'rgba(255, 255, 255, 0.2)',
          gridType: 'square',
        }}
        aiAvailable={aiAvailable}
      />

      {/* Scene Manager Modal */}
      <Modal
        opened={sceneManagerOpened}
        onClose={() => {
          setSceneManagerOpened(false);
          setEditingSceneName('');
        }}
        title="Manage Scenes"
        size="md"
      >
        <Stack gap="md">
          {game?.scenes.map((scene) => (
            <Group key={scene.id} justify="space-between" align="center">
              {editingSceneName === scene.id ? (
                <Group gap="xs" style={{ flex: 1 }}>
                  <TextInput
                    defaultValue={scene.name}
                    size="sm"
                    style={{ flex: 1 }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameScene(scene.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingSceneName('');
                      }
                    }}
                  />
                  <Button size="xs" onClick={() => {
                    const input = document.querySelector(`input[defaultValue="${scene.name}"]`) as HTMLInputElement;
                    if (input) handleRenameScene(scene.id, input.value);
                  }}>
                    Save
                  </Button>
                </Group>
              ) : (
                <Text size="sm" style={{ flex: 1 }}>{scene.name}</Text>
              )}
              <Group gap="xs">
                {editingSceneName !== scene.id && (
                  <>
                    <MantineActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => {
                        setEditingScene(scene);
                        setSceneModalOpened(true);
                      }}
                    >
                      <IconEdit size={16} />
                    </MantineActionIcon>
                    {game.scenes.length > 1 && (
                      <MantineActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteScene(scene.id)}
                      >
                        <IconTrash size={16} />
                      </MantineActionIcon>
                    )}
                  </>
                )}
              </Group>
            </Group>
          ))}
          <Button onClick={() => {
            setSceneManagerOpened(false);
            setEditingScene(undefined);
            setSceneModalOpened(true);
          }}>
            Create New Scene
          </Button>
        </Stack>
      </Modal>
    </Group>
  );
}
