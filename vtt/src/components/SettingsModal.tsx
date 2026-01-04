import { useState, useEffect } from 'react';
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
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import type { Settings } from '../types';

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function SettingsModal({ opened, onClose }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useGameStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  // Sync local settings with store when modal opens
  useEffect(() => {
    if (opened) {
      setLocalSettings(settings);
    }
  }, [opened, settings]);

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
