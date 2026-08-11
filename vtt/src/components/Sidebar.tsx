import { useState } from 'react';
import {
  Stack,
  Tabs,
  Paper,
  Text,
  Group,
  ActionIcon,
  ScrollArea,
  Badge,
  Divider,
  Checkbox,
  Switch,
  Select,
  Button,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useSheetStore } from '../stores/sheetStore';
import type { TokenElement, CanvasElement, Visibility, ChatMessage, Point } from '../types';
import DiceRoller from './DiceRoller';
import PropertyInspector from './PropertyInspector';
import LibraryPanel from './LibraryPanel';
import NotesPanel from './NotesPanel';
import ChatPanel from './ChatPanel';
import CombatTracker from './CombatTracker';

interface SidebarProps {
  room: {
    broadcastElementUpdate: (element: CanvasElement) => void;
    broadcastElementDelete: (elementId: string) => void;
    broadcastSync: () => void;
    broadcastCombat?: () => void;
    broadcastDiceRoll?: (message: ChatMessage) => void;
    broadcastChat?: (message: ChatMessage) => void;
    broadcastFogUpdate?: (fogOfWar: { enabled: boolean; revealed: Point[][] }) => void;
  };
}

export default function Sidebar({ room }: SidebarProps) {
  const {
    game,
    selectedElementId,
    isGM,
    updateElement,
    deleteElement,
    selectElement,
    layerVisibility,
    previewAsPlayer,
    toggleLayerVisibility,
    setPreviewAsPlayer,
  } = useGameStore();

  const { getSheetById, openSheet } = useSheetStore();

  const [activeTab, setActiveTab] = useState<string | null>('tokens');

  // Get active scene
  const activeScene = game?.scenes.find(s => s.id === game.activeSceneId) || game?.scenes[0];

  // Get selected element
  const selectedElement = activeScene?.elements.find(e => e.id === selectedElementId);

  const handleDeleteElement = (elementId: string) => {
    deleteElement(elementId);
    room.broadcastElementDelete(elementId);
    if (selectedElementId === elementId) {
      selectElement(null);
    }
  };

  const handleUpdateVisibility = (elementId: string, visibility: Visibility) => {
    updateElement(elementId, { visibleTo: visibility });
    const freshScene = useGameStore.getState().game?.scenes.find(
      s => s.id === useGameStore.getState().game?.activeSceneId
    );
    const freshElement = freshScene?.elements.find(e => e.id === elementId);
    if (freshElement) {
      room.broadcastElementUpdate(freshElement);
    }
  };

  // Get tokens and other elements
  const tokens = activeScene?.elements.filter(e => e.type === 'token') || [];
  const players = game ? Object.values(game.players) : [];

  const handleDiceRoll = (message: ChatMessage) => {
    if (room.broadcastDiceRoll) {
      room.broadcastDiceRoll(message);
    }
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
          <Tabs.Tab value="combat">Combat</Tabs.Tab>
          {selectedElement && isGM && <Tabs.Tab value="properties">Properties</Tabs.Tab>}
          {isGM && <Tabs.Tab value="gm">GM Tools</Tabs.Tab>}
        </Tabs.List>

        <ScrollArea h="calc(100vh - 180px)" mt="md">
          <Tabs.Panel value="tokens">
            <Stack>
              <Divider label="Tokens on Map" labelPosition="center" />

              {/* Token list */}
              {tokens.map((token) => {
                const t = token as TokenElement;
                const sheet = t.sheetId ? getSheetById(t.sheetId) : undefined;
                const hp = sheet
                  ? { current: sheet.shadowState[sheet.projections.bar || 'HP'], max: sheet.shadowState[sheet.projections.barMax || 'MaxHP'] }
                  : t.hp;
                const ac = sheet
                  ? sheet.shadowState[sheet.projections.badge || 'AC']
                  : t.ac;

                return (
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
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs">
                          <Text size="sm" fw={500} truncate>
                            {t.name || 'Unnamed'}
                          </Text>
                          {token.visibleTo === 'gm' && (
                            <Badge size="xs" color="violet">GM</Badge>
                          )}
                          {sheet && (
                            <Badge size="xs" variant="light" color="violet">linked</Badge>
                          )}
                        </Group>
                        {hp && (
                          <Text size="xs" c="dimmed">
                            HP: {hp.current}/{hp.max}
                            {ac !== undefined ? ` · AC: ${ac}` : ''}
                          </Text>
                        )}
                      </Stack>
                      <Group gap={4}>
                        {sheet && (
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="violet"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSheet(sheet.id);
                            }}
                            title="Open sheet"
                          >
                            📋
                          </ActionIcon>
                        )}
                        {isGM && (
                          <ActionIcon
                            size="xs"
                            color="red"
                            variant="subtle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(token.id);
                            }}
                            title="Delete"
                          >
                            ×
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                  </Paper>
                );
              })}

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
            <NotesPanel onNotesChange={room.broadcastSync} />
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

          <Tabs.Panel value="combat">
            <CombatTracker onBroadcastCombat={room.broadcastCombat ?? room.broadcastSync} />
          </Tabs.Panel>

          {isGM && (
            <Tabs.Panel value="properties">
              <PropertyInspector room={room}/>
            </Tabs.Panel>
          )}

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
                          const freshScene = useGameStore.getState().game?.scenes.find(
                            s => s.id === useGameStore.getState().game?.activeSceneId
                          );
                          const freshEl = freshScene?.elements.find(el => el.id === selectedElement.id);
                          if (freshEl) {
                            room.broadcastElementUpdate(freshEl);
                          }
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
                      checked={activeScene?.fogOfWar.enabled}
                      onChange={(e) => {
                        useGameStore.getState().toggleFog(e.currentTarget.checked);
                        const freshScene = useGameStore.getState().game?.scenes.find(
                          s => s.id === useGameStore.getState().game?.activeSceneId
                        );
                        if (freshScene?.fogOfWar && room.broadcastFogUpdate) {
                          room.broadcastFogUpdate(freshScene.fogOfWar);
                        }
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
