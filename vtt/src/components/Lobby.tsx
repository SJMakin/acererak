import { useState, useEffect } from 'react';
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
  Card,
  Badge,
} from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import { getRecentGames, deleteGame, type SavedGame } from '../db/database';

interface LobbyProps {
  room: {
    createRoom: (roomId: string) => string;
    joinRoom: (roomId: string, playerName: string, playerColor: string) => void;
    roomId: string | null;
    peers: string[];
  };
}

export default function Lobby({ room }: LobbyProps) {
  const { createGame, loadGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<string | null>('recent');
  
  // Create game form
  const [gameName, setGameName] = useState('');
  const [dmName, setDmName] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  
  // Join game form
  const [joinRoomId, setJoinRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#3b82f6');
  
  // Recent games
  const [recentGames, setRecentGames] = useState<SavedGame[]>([]);

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

  // Load recent games on mount
  useEffect(() => {
    loadRecentGames();
  }, []);

  // Check for room ID in URL on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('room');
    if (urlRoomId) {
      setJoinRoomId(urlRoomId);
      setActiveTab('join');
    }
  }, []);

  const loadRecentGames = async () => {
    const games = await getRecentGames(10);
    setRecentGames(games);
  };

  const handleLoadGame = (game: SavedGame) => {
    loadGame(game.gameState);
  };

  const handleDeleteGame = async (gameId: string) => {
    await deleteGame(gameId);
    await loadRecentGames();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
            <Tabs.Tab value="recent">Recent Games</Tabs.Tab>
            <Tabs.Tab value="create">Create Game</Tabs.Tab>
            <Tabs.Tab value="join">Join Game</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="recent">
            <Stack>
              {recentGames.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  No saved games yet. Create a new game to get started!
                </Text>
              ) : (
                recentGames.map((game) => (
                  <Card key={game.id} shadow="sm" padding="md" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text fw={500}>{game.name}</Text>
                      <Group gap="xs">
                        {game.isDM && (
                          <Badge color="violet" variant="light" size="sm">
                            DM
                          </Badge>
                        )}
                        <Badge color="gray" variant="light" size="sm">
                          {game.playerCount} {game.playerCount === 1 ? 'player' : 'players'}
                        </Badge>
                      </Group>
                    </Group>
                    
                    <Text size="sm" c="dimmed" mb="md">
                      Last played: {formatDate(game.lastUpdated)}
                    </Text>

                    <Group justify="flex-end">
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => handleDeleteGame(game.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="filled"
                        size="xs"
                        onClick={() => handleLoadGame(game)}
                      >
                        Load Game
                      </Button>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>

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
