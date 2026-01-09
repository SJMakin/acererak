import { Badge, Group, Text, Tooltip, ActionIcon, Loader } from '@mantine/core';
import { IconRefresh, IconCrown, IconUsers, IconAlertTriangle } from '@tabler/icons-react';
import { useGameStore } from '../stores/gameStore';

interface ConnectionStatusProps {
  roomId: string | null;
  peers: string[];
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  lastSyncedAt: number | null;
  dmDisconnected: boolean;
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
  dmDisconnected,
  isHost,
  isDesynced,
  onRequestSync,
}: ConnectionStatusProps) {
  const { isDM } = useGameStore();

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
          color={dmDisconnected ? 'red' : config.color}
          variant={dmDisconnected ? 'filled' : 'light'}
          leftSection={
            connectionState === 'syncing' || connectionState === 'connecting' ? (
              <Loader size={10} color="white" />
            ) : null
          }
        >
          {dmDisconnected ? 'DM Disconnected' : config.label}
        </Badge>
      </Tooltip>

      {/* DM indicator */}
      {isDM && (
        <Tooltip label="You are the DM" position="bottom">
          <Badge color="violet" variant="light" leftSection={<IconCrown size={12} />}>
            DM
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

      {/* Resync button for non-DM players */}
      {!isHost && onRequestSync && connectionState === 'connected' && !isDesynced && (
        <Tooltip label="Request full sync from DM" position="bottom">
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
