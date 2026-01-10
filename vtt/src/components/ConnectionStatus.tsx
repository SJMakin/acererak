import { Badge, Group, Text, Tooltip, ActionIcon, Loader } from '@mantine/core';
import { IconRefresh, IconCrown, IconUsers, IconAlertTriangle } from '@tabler/icons-react';
import { useGameStore } from '../stores/gameStore';

interface ConnectionStatusProps {
  roomId: string | null;
  peers: string[];
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  lastSyncedAt: number | null;
  gmDisconnected: boolean;
  isHost: boolean;
  isDesynced?: boolean;
  onRequestSync?: () => void;
}

function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return 'Over an hour ago';
}

export default function ConnectionStatus({
  roomId,
  peers,
  connectionState,
  lastSyncedAt,
  gmDisconnected,
  isHost,
  isDesynced,
  onRequestSync,
}: ConnectionStatusProps) {
  const { isGM } = useGameStore();

  if (!roomId) return null;

  const statusConfig = {
    disconnected: { color: 'gray', label: 'Disconnected' },
    connecting: { color: 'yellow', label: 'Connecting...' },
    connected: { color: 'green', label: 'Connected' },
    syncing: { color: 'blue', label: 'Syncing...' },
    error: { color: 'red', label: 'Error' },
  };

  const config = statusConfig[connectionState];
  const playerCount = peers.length + 1;

  return (
    <Group gap="xs">
      {/* Connection state badge */}
      <Tooltip
        label={
          <div>
            <Text size="xs">Status: {config.label}</Text>
            {lastSyncedAt && (
              <Text size="xs" c="dimmed">Last synced: {formatLastSynced(lastSyncedAt)}</Text>
            )}
          </div>
        }
        position="bottom"
      >
        <Badge
          color={gmDisconnected ? 'red' : config.color}
          variant={gmDisconnected ? 'filled' : 'light'}
          leftSection={
            connectionState === 'syncing' || connectionState === 'connecting' ? (
              <Loader size={10} color="white" />
            ) : null
          }
        >
          {gmDisconnected ? 'GM Disconnected' : config.label}
        </Badge>
      </Tooltip>

      {/* GM indicator */}
      {isGM && (
        <Tooltip label="You are the GM" position="bottom">
          <Badge color="violet" variant="light" leftSection={<IconCrown size={12} />}>
            GM
          </Badge>
        </Tooltip>
      )}

      {/* Player count */}
      <Tooltip label={`${playerCount} player${playerCount !== 1 ? 's' : ''} in session`} position="bottom">
        <Group gap={4}>
          <IconUsers size={14} />
          <Text size="sm" c="dimmed">{playerCount}</Text>
        </Group>
      </Tooltip>

      {/* Desync warning */}
      {isDesynced && !isHost && (
        <Tooltip label="Your game state may be out of sync. Click to resync." position="bottom">
          <Badge
            color="orange"
            variant="filled"
            leftSection={<IconAlertTriangle size={12} />}
            style={{ cursor: 'pointer' }}
            onClick={onRequestSync}
          >
            Out of Sync
          </Badge>
        </Tooltip>
      )}

      {/* Resync button for non-GM players */}
      {!isHost && onRequestSync && connectionState === 'connected' && !isDesynced && (
        <Tooltip label="Request full sync from GM" position="bottom">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={onRequestSync}
          >
            <IconRefresh size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
