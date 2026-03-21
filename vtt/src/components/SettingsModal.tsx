import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Stack,
  NumberInput,
  ColorInput,
  Switch,
  Button,
  Group,
  Text,
  Divider,
  Select,
  PasswordInput,
  Badge,
  Loader,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useAIStore } from '../stores/aiStore';
import type { Settings, GridType, GridSettings, AIModelInfo, AICapabilities } from '../types';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
  onBroadcastGridSettings?: (settings: Partial<GridSettings>) => void;
  onBroadcastAICapabilities?: (capabilities: AICapabilities) => void;
}

export default function SettingsModal({ opened, onClose, onBroadcastGridSettings, onBroadcastAICapabilities }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings, game, updateGridSettings, myPeerId } = useGameStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  // AI store
  const {
    apiKey,
    isConnected: aiConnected,
    isLoadingModels,
    models,
    textModel,
    imageModel,
    setApiKey,
    clearApiKey,
    setTextModel,
    setImageModel,
  } = useAIStore();

  // Local API key input (only committed on save)
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  // Determine if current user is GM
  const isGM = game?.gmPeerId === myPeerId;

  // Get active scene
  const activeScene = game?.scenes.find((s) => s.id === game?.activeSceneId);

  // Sync local settings with store when modal opens
  useEffect(() => {
    if (opened) {
      setLocalSettings(settings);
      setLocalApiKey(apiKey);
    }
  }, [opened, settings, apiKey]);

  // Broadcast AI capabilities when they change
  const broadcastCaps = useCallback(() => {
    if (onBroadcastAICapabilities) {
      const caps = useAIStore.getState().getCapabilities();
      onBroadcastAICapabilities(caps);
    }
  }, [onBroadcastAICapabilities]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings);
  };

  const updateLocal = (updates: Partial<Settings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
  };

  // AI handlers
  const handleSaveApiKey = async () => {
    await setApiKey(localApiKey);
    broadcastCaps();
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setLocalApiKey('');
    broadcastCaps();
  };

  const handleTextModelChange = (modelId: string | null) => {
    if (!modelId) {
      setTextModel(null);
    } else {
      const model = models.find(m => m.id === modelId) || null;
      setTextModel(model);
    }
    broadcastCaps();
  };

  const handleImageModelChange = (modelId: string | null) => {
    if (!modelId) {
      setImageModel(null);
    } else {
      const model = models.find(m => m.id === modelId) || null;
      setImageModel(model);
    }
    broadcastCaps();
  };

  // Build model select data
  const textModels = models.filter(m => m.modelType === 'text');
  const imageModels = models.filter(m => m.modelType === 'image');

  const makeModelOptions = (modelList: AIModelInfo[]) => {
    // Group by provider
    const grouped = new Map<string, AIModelInfo[]>();
    for (const m of modelList) {
      const list = grouped.get(m.provider) || [];
      list.push(m);
      grouped.set(m.provider, list);
    }

    const options: { group: string; items: { value: string; label: string }[] }[] = [];
    for (const [provider, providerModels] of grouped) {
      options.push({
        group: provider,
        items: providerModels.map(m => ({
          value: m.id,
          label: `${m.name}${m.isFree ? ' [free]' : ''}`,
        })),
      });
    }
    return options;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Game Settings"
      size="lg"
    >
      <Tabs defaultValue="grid">
        <Tabs.List>
          <Tabs.Tab value="grid">Grid</Tabs.Tab>
          <Tabs.Tab value="tokens">Token Defaults</Tabs.Tab>
          <Tabs.Tab value="ui">UI Preferences</Tabs.Tab>
          {isGM && <Tabs.Tab value="ai">AI</Tabs.Tab>}
        </Tabs.List>

        {/* Grid Settings Tab */}
        <Tabs.Panel value="grid" pt="md">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Configure the game grid and canvas appearance
            </Text>

            <Group grow>
              <NumberInput
                label="Grid Width (cells)"
                description="Number of cells horizontally"
                value={localSettings.gridSize.width}
                onChange={(val) =>
                  updateLocal({
                    gridSize: {
                      ...localSettings.gridSize,
                      width: Number(val) || 20,
                    },
                  })
                }
                min={10}
                max={100}
                required
              />
              <NumberInput
                label="Grid Height (cells)"
                description="Number of cells vertically"
                value={localSettings.gridSize.height}
                onChange={(val) =>
                  updateLocal({
                    gridSize: {
                      ...localSettings.gridSize,
                      height: Number(val) || 20,
                    },
                  })
                }
                min={10}
                max={100}
                required
              />
            </Group>

            <NumberInput
              label="Cell Size (pixels)"
              description="Size of each grid cell - affects zoom level"
              value={localSettings.cellSize}
              onChange={(val) => updateLocal({ cellSize: Number(val) || 50 })}
              min={20}
              max={100}
              step={5}
              required
            />

            <ColorInput
              label="Grid Color"
              description="Color of the grid lines"
              value={localSettings.gridColor}
              onChange={(val) => updateLocal({ gridColor: val })}
              format="rgba"
            />

            <ColorInput
              label="Background Color"
              description="Canvas background color"
              value={localSettings.backgroundColor}
              onChange={(val) => updateLocal({ backgroundColor: val })}
              format="hex"
            />

            <Divider label="Current Game Grid Type" />

            {activeScene ? (
              <Select
                label="Grid Type"
                description="Choose the grid style for this game"
                value={activeScene.gridSettings.gridType || 'square'}
                onChange={(val) => {
                  if (val) {
                    const update = { gridType: val as GridType };
                    updateGridSettings(update);
                    // Broadcast to peers if connected
                    onBroadcastGridSettings?.(update);
                  }
                }}
                data={[
                  { value: 'square', label: '⏹️ Square Grid' },
                  { value: 'hex', label: '⬡ Hex Grid' },
                  { value: 'none', label: '🚫 No Grid (Gridless)' },
                ]}
              />
            ) : (
              <Text size="sm" c="dimmed">
                Grid type can be changed when a game is loaded
              </Text>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Token Defaults Tab */}
        <Tabs.Panel value="tokens" pt="md">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Set default values for newly created tokens
            </Text>

            <NumberInput
              label="Default Token Size"
              description="Size in grid cells (1-10)"
              value={localSettings.defaultTokenSize}
              onChange={(val) =>
                updateLocal({ defaultTokenSize: Number(val) || 1 })
              }
              min={1}
              max={10}
              required
            />

            <Divider label="Default HP Values" />

            <Group grow>
              <NumberInput
                label="Current HP"
                value={localSettings.defaultHP.current}
                onChange={(val) =>
                  updateLocal({
                    defaultHP: {
                      ...localSettings.defaultHP,
                      current: Number(val) || 10,
                    },
                  })
                }
                min={1}
                required
              />
              <NumberInput
                label="Max HP"
                value={localSettings.defaultHP.max}
                onChange={(val) =>
                  updateLocal({
                    defaultHP: {
                      ...localSettings.defaultHP,
                      max: Number(val) || 10,
                    },
                  })
                }
                min={1}
                required
              />
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* UI Preferences Tab */}
        <Tabs.Panel value="ui" pt="md">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Customize the user interface and behavior
            </Text>

            <Switch
              label="Auto-save"
              description="Automatically save game changes"
              checked={localSettings.autoSave}
              onChange={(e) =>
                updateLocal({ autoSave: e.currentTarget.checked })
              }
            />

            <Switch
              label="Show Player Cursors"
              description="Display other players' cursor positions"
              checked={localSettings.showPlayerCursors}
              onChange={(e) =>
                updateLocal({ showPlayerCursors: e.currentTarget.checked })
              }
            />

            <Switch
              label="Show Grid by Default"
              description="Display the grid when loading a game"
              checked={localSettings.showGridByDefault}
              onChange={(e) =>
                updateLocal({ showGridByDefault: e.currentTarget.checked })
              }
            />

            <Switch
              label="Snap to Grid by Default"
              description="Enable snap-to-grid for new games"
              checked={localSettings.snapToGridByDefault}
              onChange={(e) =>
                updateLocal({ snapToGridByDefault: e.currentTarget.checked })
              }
            />

            <Switch
              label="Show Token Metadata"
              description="Display HP bars, AC, and conditions on tokens"
              checked={localSettings.showTokenMetadata}
              onChange={(e) =>
                updateLocal({ showTokenMetadata: e.currentTarget.checked })
              }
            />
          </Stack>
        </Tabs.Panel>

        {/* AI Settings Tab (GM only) */}
        {isGM && (
          <Tabs.Panel value="ai" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Configure AI integration via OpenRouter. Your API key stays local and is never shared with players.
              </Text>

              {/* API Key */}
              <Group align="end">
                <PasswordInput
                  label="OpenRouter API Key"
                  description="Get your key at openrouter.ai/keys"
                  placeholder="sk-or-..."
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleSaveApiKey} disabled={!localApiKey || localApiKey === apiKey}>
                  Save Key
                </Button>
                {apiKey && (
                  <Button variant="subtle" color="red" onClick={handleClearApiKey}>
                    Clear
                  </Button>
                )}
              </Group>

              {/* Connection Status */}
              <Group>
                <Text size="sm" fw={500}>Status:</Text>
                {isLoadingModels ? (
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="sm" c="dimmed">Loading models...</Text>
                  </Group>
                ) : aiConnected ? (
                  <Badge color="green" variant="light">
                    Connected ({models.length} models)
                  </Badge>
                ) : apiKey ? (
                  <Badge color="red" variant="light">
                    Invalid key
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light">
                    No key set
                  </Badge>
                )}
              </Group>

              {aiConnected && (
                <>
                  <Divider label="Model Selection" />

                  {/* Text Model */}
                  <Select
                    label="Text Model"
                    description="Used for NPC dialogue, descriptions, encounter generation"
                    placeholder="Select a text model"
                    searchable
                    clearable
                    value={textModel?.id || null}
                    onChange={handleTextModelChange}
                    data={makeModelOptions(textModels)}
                    nothingFoundMessage="No models found"
                  />

                  {/* Image Model */}
                  <Select
                    label="Image Model"
                    description="Used for generating NPC portraits, maps, scene art"
                    placeholder="Select an image model"
                    searchable
                    clearable
                    value={imageModel?.id || null}
                    onChange={handleImageModelChange}
                    data={makeModelOptions(imageModels)}
                    nothingFoundMessage="No image models found"
                  />

                  {/* Selected models summary */}
                  <Divider label="Active Configuration" />
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="sm" fw={500}>Text:</Text>
                      <Text size="sm" c="dimmed">{textModel?.name || 'None selected'}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>Image:</Text>
                      <Text size="sm" c="dimmed">{imageModel?.name || 'None selected'}</Text>
                    </Group>
                  </Stack>
                </>
              )}
            </Stack>
          </Tabs.Panel>
        )}
      </Tabs>

      {/* Action Buttons */}
      <Group justify="space-between" mt="xl">
        <Button variant="subtle" color="red" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Group>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </Group>
      </Group>
    </Modal>
  );
}
