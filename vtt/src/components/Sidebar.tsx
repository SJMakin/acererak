import { useState } from 'react';
import {
  Stack,
  Tabs,
  TextInput,
  Button,
  Paper,
  Text,
  Group,
  ActionIcon,
  ScrollArea,
  Badge,
  NumberInput,
  Select,
  Divider,
  Checkbox,
  Switch,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { TokenElement, CanvasElement, Visibility, DiceRoll, ChatMessage } from '../types';
import DiceRoller from './DiceRoller';
import PropertyInspector from './PropertyInspector';
import LibraryPanel from './LibraryPanel';
import NotesPanel from './NotesPanel';
import ChatPanel from './ChatPanel';

interface SidebarProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
    broadcastElementDelete: (elementId: string) => void;
    broadcastSync: () => void;
    broadcastCombat?: () => void;
    broadcastDiceRoll?: (roll: DiceRoll) => void;
    broadcastChat?: (message: ChatMessage) => void;
  };
}

export default function Sidebar({ room }: SidebarProps) {
  const {
    game,
    selectedElementId,
    isGM,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    layerVisibility,
    previewAsPlayer,
    toggleLayerVisibility,
    setPreviewAsPlayer,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<string | null>('tokens');
  
  // Token creation form
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenUrl, setNewTokenUrl] = useState('');
  const [newTokenSize, setNewTokenSize] = useState(1);

  // Get selected element
  const selectedElement = game?.elements.find(e => e.id === selectedElementId);

  const handleAddToken = () => {
    if (!newTokenName.trim()) return;

    const token: Omit<TokenElement, 'id'> = {
      type: 'token',
      layer: 'token',
      name: newTokenName,
      imageUrl: newTokenUrl || '',
      x: 100,
      y: 100,
      width: newTokenSize,
      height: newTokenSize,
      visibleTo: 'all',
      locked: false,
      zIndex: game?.elements.length || 0,
    };

    const id = addElement(token);
    const fullToken = { ...token, id } as TokenElement;
    room.broadcastElementUpdate(fullToken);

    // Reset form
    setNewTokenName('');
    setNewTokenUrl('');
    setNewTokenSize(1);
  };

  const handleDeleteElement = (elementId: string) => {
    deleteElement(elementId);
    room.broadcastElementDelete(elementId);
    if (selectedElementId === elementId) {
      selectElement(null);
    }
  };

  const handleUpdateVisibility = (elementId: string, visibility: Visibility) => {
    const element = game?.elements.find(e => e.id === elementId);
    if (!element) return;
    
    updateElement(elementId, { visibleTo: visibility });
    room.broadcastElementUpdate({ ...element, visibleTo: visibility });
  };

  // Get tokens and other elements
  const tokens = game?.elements.filter(e => e.type === 'token') || [];
  const players = game ? Object.values(game.players) : [];

  const handleDiceRoll = (roll: DiceRoll) => {
    if (room.broadcastDiceRoll) {
      room.broadcastDiceRoll(roll);
    }
  };

  const { addTokenToLibrary } = useLibraryStore();

  const handleAddToLibrary = async (token: TokenElement) => {
    await addTokenToLibrary(token, undefined, undefined, []);
  };

  return (
    <Stack h="100%">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="tokens">Tokens</Tabs.Tab>
          <Tabs.Tab value="library">Library</Tabs.Tab>
          <Tabs.Tab value="notes">Notes</Tabs.Tab>
          <Tabs.Tab value="chat">Chat</Tabs.Tab>
          <Tabs.Tab value="players">Players</Tabs.Tab>
          <Tabs.Tab value="dice">Dice</Tabs.Tab>
          {selectedElement && <Tabs.Tab value="properties">Properties</Tabs.Tab>}
          {isGM && <Tabs.Tab value="gm">GM Tools</Tabs.Tab>}
        </Tabs.List>

        <ScrollArea h="calc(100vh - 180px)" mt="md">
          <Tabs.Panel value="tokens">
            <Stack>
              {/* Add token form */}
              <Paper p="sm" withBorder>
                <Text size="sm" fw={500} mb="xs">Add Token</Text>
                <Stack gap="xs">
                  <TextInput
                    placeholder="Token name"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.currentTarget.value)}
                    size="xs"
                  />
                  <TextInput
                    placeholder="Image URL (optional)"
                    value={newTokenUrl}
                    onChange={(e) => setNewTokenUrl(e.currentTarget.value)}
                    size="xs"
                  />
                  <Group gap="xs">
                    <NumberInput
                      placeholder="Size"
                      value={newTokenSize}
                      onChange={(val) => setNewTokenSize(Number(val) || 1)}
                      min={1}
                      max={10}
                      size="xs"
                      style={{ flex: 1 }}
                    />
                    <Button size="xs" onClick={handleAddToken}>
                      Add
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              <Divider label="Tokens on Map" labelPosition="center" />

              {/* Token list */}
              {tokens.map((token) => (
                <Paper 
                  key={token.id} 
                  p="xs" 
                  withBorder
                  style={{ 
                    borderColor: selectedElementId === token.id ? '#7c3aed' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => selectElement(token.id)}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {(token as TokenElement).name || 'Unnamed'}
                      </Text>
                      {token.visibleTo === 'gm' && (
                        <Badge size="xs" color="violet">GM Only</Badge>
                      )}
                    </Group>
                    <Group gap={4}>
                      <ActionIcon
                        size="xs"
                        color="blue"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToLibrary(token as TokenElement);
                        }}
                        title="Save to Library"
                      >
                        📚
                      </ActionIcon>
                      <ActionIcon
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteElement(token.id);
                        }}
                      >
                        🗑️
                      </ActionIcon>
                    </Group>
                  </Group>
                  {(token as TokenElement).hp && (
                    <Text size="xs" c="dimmed">
                      HP: {(token as TokenElement).hp?.current}/{(token as TokenElement).hp?.max}
                    </Text>
                  )}
                </Paper>
              ))}

              {tokens.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  No tokens on map
                </Text>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="library">
            <LibraryPanel room={room} />
          </Tabs.Panel>

          <Tabs.Panel value="notes">
            <NotesPanel />
          </Tabs.Panel>

          <Tabs.Panel value="chat">
            <ChatPanel
              onSendMessage={(message) => {
                if (room.broadcastChat) {
                  room.broadcastChat(message);
                }
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="players">
            <Stack>
              {players.map((player) => (
                <Paper key={player.id} p="sm" withBorder>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: player.color,
                        }}
                      />
                      <Text size="sm" fw={500}>{player.name}</Text>
                    </Group>
                    {player.isGM && (
                      <Badge size="xs" color="violet">GM</Badge>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="dice">
            <DiceRoller onRoll={handleDiceRoll} />
          </Tabs.Panel>

          <Tabs.Panel value="properties">
            <PropertyInspector room={room} />
          </Tabs.Panel>

          {isGM && (
            <Tabs.Panel value="gm">
              <Stack>
                {/* Selected element properties */}
                {selectedElement && (
                  <Paper p="sm" withBorder>
                    <Text size="sm" fw={500} mb="xs">Selected Element</Text>
                    <Stack gap="xs">
                      <Select
                        label="Visibility"
                        size="xs"
                        value={
                          selectedElement.visibleTo === 'all' ? 'all' : 
                          selectedElement.visibleTo === 'gm' ? 'gm' : 'specific'
                        }
                        onChange={(val) => {
                          if (val === 'all' || val === 'gm') {
                            handleUpdateVisibility(selectedElement.id, val);
                          }
                        }}
                        data={[
                          { value: 'all', label: 'Visible to All' },
                          { value: 'gm', label: 'GM Only' },
                        ]}
                      />
                      <Checkbox
                        label="Locked"
                        size="xs"
                        checked={selectedElement.locked}
                        onChange={(e) => {
                          updateElement(selectedElement.id, { locked: e.currentTarget.checked });
                          room.broadcastElementUpdate({ 
                            ...selectedElement, 
                            locked: e.currentTarget.checked 
                          });
                        }}
                      />
                      <Button 
                        size="xs" 
                        color="red" 
                        variant="light"
                        onClick={() => handleDeleteElement(selectedElement.id)}
                      >
                        Delete Element
                      </Button>
                    </Stack>
                  </Paper>
                )}

                <Divider label="Layer Visibility" labelPosition="center" />

                <Paper p="sm" withBorder>
                  <Stack gap="xs">
                    <Checkbox
                      label="🗺️ Grid"
                      size="xs"
                      checked={layerVisibility.grid}
                      onChange={() => toggleLayerVisibility('grid')}
                    />
                    <Checkbox
                      label="🖼️ Map Images"
                      size="xs"
                      checked={layerVisibility.map}
                      onChange={() => toggleLayerVisibility('map')}
                    />
                    <Checkbox
                      label="👤 Tokens"
                      size="xs"
                      checked={layerVisibility.tokens}
                      onChange={() => toggleLayerVisibility('tokens')}
                    />
                    <Checkbox
                      label="✏️ Drawings"
                      size="xs"
                      checked={layerVisibility.drawings}
                      onChange={() => toggleLayerVisibility('drawings')}
                    />
                    <Checkbox
                      label="📝 Text Labels"
                      size="xs"
                      checked={layerVisibility.text}
                      onChange={() => toggleLayerVisibility('text')}
                    />
                    <Checkbox
                      label="🌫️ Fog of War"
                      size="xs"
                      checked={layerVisibility.fog}
                      onChange={() => toggleLayerVisibility('fog')}
                    />
                    <Divider my="xs" />
                    <Switch
                      label="Preview as Player"
                      size="xs"
                      checked={previewAsPlayer}
                      onChange={(e) => setPreviewAsPlayer(e.currentTarget.checked)}
                    />
                    <Text size="xs" c="dimmed">
                      See what players see (hides GM-only elements)
                    </Text>
                  </Stack>
                </Paper>

                <Divider label="Fog of War" labelPosition="center" />

                <Paper p="sm" withBorder>
                  <Stack gap="xs">
                    <Checkbox
                      label="Enable Fog of War"
                      checked={game?.fogOfWar.enabled}
                      onChange={(e) => {
                        useGameStore.getState().toggleFog(e.currentTarget.checked);
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      Use Reveal/Hide tools to control visibility
                    </Text>
                  </Stack>
                </Paper>
              </Stack>
            </Tabs.Panel>
          )}
        </ScrollArea>
      </Tabs>
    </Stack>
  );
}
