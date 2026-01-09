import { Modal, Text, Button, Stack, Group, Alert } from '@mantine/core';
import { IconAlertTriangle, IconDownload, IconDoorExit } from '@tabler/icons-react';
import { useGameStore } from '../stores/gameStore';

interface DMDisconnectModalProps {
  opened: boolean;
  onLeaveGame: () => void;
}

export default function DMDisconnectModal({ opened, onLeaveGame }: DMDisconnectModalProps) {
  const { game } = useGameStore();

  const handleExportBackup = () => {
    if (!game) return;

    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      type: 'full',
      game,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name.replace(/[^a-z0-9]/gi, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
          <Text fw={600}>DM Disconnected</Text>
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Alert color="red" variant="light">
          <Text size="sm">
            The DM has left the game. The session is paused until they reconnect.
          </Text>
        </Alert>

        <Text size="sm" c="dimmed">
          You can export a backup of the current game state or leave the game.
          If the DM reconnects, you may need to rejoin the session.
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={handleExportBackup}
          >
            Export Backup
          </Button>
          <Button
            color="red"
            leftSection={<IconDoorExit size={16} />}
            onClick={onLeaveGame}
          >
            Leave Game
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
