import { useState } from 'react';
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
import { useHistoryStore } from '../stores/historyStore';
import type { ToolType } from '../types';
import SettingsModal from './SettingsModal';

interface ToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  room: {
    roomId: string | null;
    peers: string[];
    leaveRoom: () => void;
  };
}

const tools: { id: ToolType; icon: string; label: string; shortcut?: string }[] = [
  { id: 'select', icon: '👆', label: 'Select', shortcut: 'S' },
  { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'Space' },
  { id: 'token', icon: '🎯', label: 'Place Token', shortcut: 'N' },
  { id: 'draw-freehand', icon: '✏️', label: 'Freehand Draw', shortcut: 'D' },
  { id: 'draw-line', icon: '📏', label: 'Draw Line', shortcut: 'L' },
  { id: 'draw-rectangle', icon: '⬜', label: 'Draw Rectangle', shortcut: 'R' },
  { id: 'draw-circle', icon: '⭕', label: 'Draw Circle', shortcut: 'C' },
  { id: 'text', icon: '📝', label: 'Add Text', shortcut: 'T' },
  { id: 'measure', icon: '📐', label: 'Measure Distance', shortcut: 'M' },
  { id: 'ping', icon: '📍', label: 'Ping Location', shortcut: 'P' },
];

const dmTools: { id: ToolType; icon: string; label: string }[] = [
  { id: 'fog-reveal', icon: '🔦', label: 'Reveal Fog' },
  { id: 'fog-hide', icon: '🌫️', label: 'Hide Area' },
];

export default function Toolbar({ sidebarOpen, onToggleSidebar, room }: ToolbarProps) {
  const { game, selectedTool, setTool, isDM, viewportScale, setViewport, viewportOffset, performUndo, performRedo } = useGameStore();
  const { canUndo, canRedo } = useHistoryStore();
  const [settingsOpened, setSettingsOpened] = useState(false);

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
          {tools.map((tool) => (
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
            <Menu.Item onClick={() => {}}>
              💾 Export Game (Ctrl+S)
            </Menu.Item>
            <Menu.Item onClick={() => {}}>
              📥 Import Scene
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
    </Group>
  );
}
