import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  Tabs,
  ColorInput,
  Box,
  Code,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';

interface LobbyProps {
  room: {
    createRoom: (roomId: string) => string;
    joinRoom: (roomId: string, playerName: string, playerColor: string) => void;
    roomId: string | null;
    peers: string[];
  };
}

export default function Lobby({ room }: LobbyProps) {
  const { createGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<string | null>('create');
  
  // Create game form
  const [gameName, setGameName] = useState('');
  const [dmName, setDmName] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  
  // Join game form
  const [joinRoomId, setJoinRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#3b82f6');

  const handleCreateGame = () => {
    if (!gameName.trim() || !dmName.trim()) return;
    
    // Create local game state
    createGame(gameName, dmName);
    
    // Create P2P room
    const roomId = nanoid(8);
    room.createRoom(roomId);
    setCreatedRoomId(roomId);
  };

  const handleJoinGame = () => {
    if (!joinRoomId.trim() || !playerName.trim()) return;
    room.joinRoom(joinRoomId.trim(), playerName, playerColor);
  };

  const getShareUrl = () => {
    if (!createdRoomId) return '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${createdRoomId}`;
  };

  // Check for room ID in URL on component mount
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setJoinRoomId(urlRoomId);
      setActiveTab('join');
    }
  });

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} ta="center" mb="md">
          🎲 Acererak VTT
        </Title>
        <Text c="dimmed" ta="center" mb="xl">
          Decentralized Virtual Tabletop for TTRPG
        </Text>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow mb="lg">
            <Tabs.Tab value="create">Create Game</Tabs.Tab>
            <Tabs.Tab value="join">Join Game</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="create">
            {!createdRoomId ? (
              <Stack>
                <TextInput
                  label="Game Name"
                  placeholder="My Epic Campaign"
                  value={gameName}
                  onChange={(e) => setGameName(e.currentTarget.value)}
                  required
                />
                <TextInput
                  label="Your Name (DM)"
                  placeholder="Dungeon Master"
                  value={dmName}
                  onChange={(e) => setDmName(e.currentTarget.value)}
                  required
                />
                <Button 
                  fullWidth 
                  mt="md" 
                  onClick={handleCreateGame}
                  disabled={!gameName.trim() || !dmName.trim()}
                >
                  Create Game
                </Button>
              </Stack>
            ) : (
              <Stack align="center">
                <Text fw={500} size="lg">Game Created!</Text>
                <Text c="dimmed" size="sm">
                  Share this QR code or link with your players
                </Text>
                
                <Box 
                  p="md" 
                  bg="white" 
                  style={{ borderRadius: 8 }}
                >
                  <QRCodeSVG 
                    value={getShareUrl()} 
                    size={200}
                    level="M"
                  />
                </Box>

                <Group gap="xs" align="center">
                  <Code block style={{ flex: 1 }}>
                    {createdRoomId}
                  </Code>
                  <CopyButton value={createdRoomId}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied!' : 'Copy Room ID'}>
                        <ActionIcon 
                          color={copied ? 'teal' : 'gray'} 
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? '✓' : '📋'}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>

                <CopyButton value={getShareUrl()}>
                  {({ copied, copy }) => (
                    <Button 
                      variant="light" 
                      color={copied ? 'teal' : 'blue'}
                      onClick={copy}
                      fullWidth
                    >
                      {copied ? 'Link Copied!' : 'Copy Invite Link'}
                    </Button>
                  )}
                </CopyButton>

                <Text size="sm" c="dimmed" mt="md">
                  Waiting for players... ({room.peers.length} connected)
                </Text>

                <Button 
                  fullWidth 
                  mt="md"
                  onClick={() => {
                    // Game is already created, just close lobby
                    // The App component will show GameCanvas since game exists
                  }}
                >
                  Start Game →
                </Button>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="join">
            <Stack>
              <TextInput
                label="Room ID"
                placeholder="Enter room ID or scan QR"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Your Name"
                placeholder="Player Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.currentTarget.value)}
                required
              />
              <ColorInput
                label="Your Color"
                value={playerColor}
                onChange={setPlayerColor}
                swatches={[
                  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', 
                  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
                ]}
              />
              <Button 
                fullWidth 
                mt="md" 
                onClick={handleJoinGame}
                disabled={!joinRoomId.trim() || !playerName.trim()}
              >
                Join Game
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}
