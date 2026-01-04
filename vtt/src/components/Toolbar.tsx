import {
  Group,
  ActionIcon,
  Tooltip,
  Menu,
  Text,
  Divider,
  Badge,
  Button,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import type { ToolType } from '../types';

interface ToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  room: {
    roomId: string | null;
    peers: string[];
    leaveRoom: () => void;
  };
}

const tools: { id: ToolType; icon: string; label: string }[] = [
  { id: 'select', icon: '👆', label: 'Select' },
  { id: 'pan', icon: '✋', label: 'Pan' },
  { id: 'token', icon: '🎯', label: 'Place Token' },
  { id: 'draw-freehand', icon: '✏️', label: 'Freehand Draw' },
  { id: 'draw-line', icon: '📏', label: 'Draw Line' },
  { id: 'draw-rectangle', icon: '⬜', label: 'Draw Rectangle' },
  { id: 'draw-circle', icon: '⭕', label: 'Draw Circle' },
  { id: 'text', icon: '📝', label: 'Add Text' },
  { id: 'measure', icon: '📐', label: 'Measure Distance' },
  { id: 'ping', icon: '📍', label: 'Ping Location' },
];

const dmTools: { id: ToolType; icon: string; label: string }[] = [
  { id: 'fog-reveal', icon: '🔦', label: 'Reveal Fog' },
  { id: 'fog-hide', icon: '🌫️', label: 'Hide Area' },
];

export default function Toolbar({ sidebarOpen, onToggleSidebar, room }: ToolbarProps) {
  const { game, selectedTool, setTool, isDM, viewportScale, setViewport, viewportOffset } = useGameStore();

  const handleZoom = (factor: number) => {
    const newScale = Math.min(Math.max(viewportScale * factor, 0.25), 3);
    setViewport(viewportOffset, newScale);
  };

  return (
    <Group h="100%" px="md" justify="space-between">
      {/* Left section - Game info and tools */}
      <Group gap="md">
        <Text fw={600} size="lg">
          🎲 {game?.name || 'Acererak VTT'}
        </Text>
        
        <Divider orientation="vertical" />

        {/* Tool buttons */}
        <Group gap="xs">
          {tools.map((tool) => (
            <Tooltip key={tool.id} label={tool.label} position="bottom">
              <ActionIcon
                variant={selectedTool === tool.id ? 'filled' : 'subtle'}
                color={selectedTool === tool.id ? 'violet' : 'gray'}
                size="lg"
                onClick={() => setTool(tool.id)}
              >
                {tool.icon}
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
                    {tool.icon}
                  </ActionIcon>
                </Tooltip>
              ))}
            </>
          )}
        </Group>

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

        {/* More menu */}
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" size="lg">
              ⚙️
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Grid Settings</Menu.Label>
            <Menu.Item onClick={() => {}}>
              Toggle Grid
            </Menu.Item>
            <Menu.Item onClick={() => {}}>
              Snap to Grid
            </Menu.Item>
            
            <Menu.Divider />
            
            <Menu.Label>Game</Menu.Label>
            <Menu.Item onClick={() => {}}>
              Export Game
            </Menu.Item>
            <Menu.Item onClick={() => {}}>
              Import Scene
            </Menu.Item>
            
            {room.roomId && (
              <>
                <Menu.Divider />
                <Menu.Item color="red" onClick={room.leaveRoom}>
                  Leave Game
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
    </Group>
  );
}
