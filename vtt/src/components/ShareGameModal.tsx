import { Modal, Stack, Text, Group, Button, Paper, Center, CopyButton, Code } from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { IconCheck, IconCopy, IconQrcode, IconShare } from '@tabler/icons-react';
import { buildInviteLink } from '../services/inviteLink';

interface ShareGameModalProps {
  opened: boolean;
  onClose: () => void;
  roomId: string | null;
}

export default function ShareGameModal({ opened, onClose, roomId }: ShareGameModalProps) {
  if (!roomId) return null;

  const joinLink = buildInviteLink(roomId);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconShare size={20} />
          <Text fw={600}>Share Game</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="lg">
        {/* Room ID Section */}
        <Stack gap="xs">
          <Text size="sm" fw={600}>Room ID</Text>
          <Paper p="md" withBorder>
            <Group justify="space-between" align="center">
              <Code style={{ fontSize: '1.1rem', fontWeight: 600 }}>{roomId}</Code>
              <CopyButton value={roomId} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    color={copied ? 'teal' : 'violet'}
                    onClick={copy}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Paper>
          <Text size="xs" c="dimmed">
            Share this Room ID with players so they can join your game
          </Text>
        </Stack>

        {/* Join Link Section */}
        <Stack gap="xs">
          <Text size="sm" fw={600}>Join Link</Text>
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {joinLink}
              </Text>
              <CopyButton value={joinLink} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    fullWidth
                    size="sm"
                    variant="light"
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    color={copied ? 'teal' : 'violet'}
                    onClick={copy}
                  >
                    {copied ? 'Link Copied!' : 'Copy Join Link'}
                  </Button>
                )}
              </CopyButton>
            </Stack>
          </Paper>
          <Text size="xs" c="dimmed">
            Players can click this link to automatically join your game
          </Text>
        </Stack>

        {/* QR Code Section */}
        <Stack gap="xs">
          <Group gap="xs">
            <IconQrcode size={16} />
            <Text size="sm" fw={600}>QR Code</Text>
          </Group>
          <Paper p="md" withBorder>
            <Center>
              <QRCodeSVG
                value={joinLink}
                size={200}
                level="M"
                includeMargin={true}
              />
            </Center>
          </Paper>
          <Text size="xs" c="dimmed" ta="center">
            Players can scan this QR code to join your game
          </Text>
        </Stack>

        {/* Close Button */}
        <Button onClick={onClose} fullWidth>
          Done
        </Button>
      </Stack>
    </Modal>
  );
}
