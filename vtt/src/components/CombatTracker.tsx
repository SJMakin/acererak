import { useState, useMemo } from 'react';
import {
  Stack,
  Paper,
  Text,
  Group,
  Button,
  NumberInput,
  ActionIcon,
  Badge,
  Divider,
  Select,
  TextInput,
  ScrollArea,
} from '@mantine/core';
import { useGameStore } from '../stores/gameStore';
import { useCharacterStore } from '../stores/characterStore';
import type { TokenElement, Combatant } from '../types';

interface CombatTrackerProps {
  onBroadcastCombat: () => void;
}

export default function CombatTracker({ onBroadcastCombat }: CombatTrackerProps) {
  const {
    game,
    isGM,
    startCombat,
    endCombat,
    addCombatant,
    removeCombatant,
    updateCombatant,
    nextTurn,
    previousTurn,
  } = useGameStore();

  const { updateCharacterStat, getCharacterById } = useCharacterStore();

  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [initiative, setInitiative] = useState<number | string>(10);
  const [dexterity, setDexterity] = useState<number | string>('');
  const [newCondition, setNewCondition] = useState('');

  const combat = game?.combat;
  const activeScene = game?.scenes.find((s) => s.id === game?.activeSceneId);
  const tokens = activeScene?.elements.filter((e) => e.type === 'token') as TokenElement[] || [];
  
  // Filter tokens not already in combat
  const availableTokens = tokens.filter(
    (t) => !combat?.combatants.some((c) => c.id === t.id)
  );

  // Helper function to get HP from character or token
  const getHpFromToken = (token: TokenElement): { current: number; max: number } => {
    if (token.characterId) {
      const character = getCharacterById(token.characterId);
      if (character && character.shadowState && character.projections) {
        const barKey = character.projections.bar || 'HP';
        const barMaxKey = character.projections.barMax || 'MaxHP';
        const hp = character.shadowState[barKey];
        const maxHp = character.shadowState[barMaxKey];
        
        if (hp !== undefined && maxHp !== undefined) {
          return {
            current: typeof hp === 'number' ? hp : parseInt(String(hp)) || 0,
            max: typeof maxHp === 'number' ? maxHp : parseInt(String(maxHp)) || 1
          };
        }
      }
    }
    return token.hp || { current: 10, max: 10 };
  };

  // Helper function to get display name from character or token
  const getDisplayName = (token: TokenElement): string => {
    if (token.characterId) {
      const character = getCharacterById(token.characterId);
      if (character) return character.name;
    }
    return token.name;
  };

  const handleStartCombat = () => {
    startCombat();
    onBroadcastCombat();
  };

  const handleEndCombat = () => {
    endCombat();
    onBroadcastCombat();
  };

  const handleAddCombatant = () => {
    if (!selectedTokenId || initiative === '') return;
    
    const init = typeof initiative === 'string' ? parseInt(initiative) : initiative;
    const dex = dexterity === '' ? undefined : (typeof dexterity === 'string' ? parseInt(dexterity) : dexterity);
    
    addCombatant(selectedTokenId, init, dex);
    onBroadcastCombat();
    
    // Reset form
    setSelectedTokenId('');
    setInitiative(10);
    setDexterity('');
  };

  const handleRemoveCombatant = (id: string) => {
    removeCombatant(id);
    onBroadcastCombat();
  };

  const handleNextTurn = () => {
    nextTurn();
    onBroadcastCombat();
  };

  const handlePreviousTurn = () => {
    previousTurn();
    onBroadcastCombat();
  };

  const handleUpdateHP = (id: string, current: number) => {
    const combatant = combat?.combatants.find((c) => c.id === id);
    if (!combatant) return;

    // Find the token to check for character link
    const token = tokens.find((t) => t.id === id);
    const newHp = { ...combatant.hp, current: Math.max(0, Math.min(current, combatant.hp.max)) };
    
    // Update combatant
    updateCombatant(id, { hp: newHp });
    
    // If token is linked to a character, sync HP to character
    if (token?.characterId) {
      const character = getCharacterById(token.characterId);
      if (character?.projections?.bar) {
        updateCharacterStat(token.characterId, character.projections.bar, newHp.current);
      }
      if (character?.projections?.barMax && newHp.max !== combatant.hp.max) {
        updateCharacterStat(token.characterId, character.projections.barMax, newHp.max);
      }
    }
    
    onBroadcastCombat();
  };

  const handleAddCondition = (id: string) => {
    if (!newCondition.trim()) return;
    
    const combatant = combat?.combatants.find((c) => c.id === id);
    if (!combatant) return;
    
    updateCombatant(id, {
      conditions: [...combatant.conditions, newCondition.trim()],
    });
    onBroadcastCombat();
    setNewCondition('');
  };

  const handleRemoveCondition = (id: string, condition: string) => {
    const combatant = combat?.combatants.find((c) => c.id === id);
    if (!combatant) return;
    
    updateCombatant(id, {
      conditions: combatant.conditions.filter((c) => c !== condition),
    });
    onBroadcastCombat();
  };

  // Get combatant data with character-aware HP
  const getCombatantData = (combatant: Combatant): { hp: { current: number; max: number }; name: string } => {
    const token = tokens.find((t) => t.id === combatant.id);
    if (token) {
      return {
        hp: getHpFromToken(token),
        name: getDisplayName(token),
      };
    }
    return { hp: combatant.hp, name: combatant.name };
  };

  if (!combat) {
    return (
      <Stack p="md">
        <Text size="sm" c="dimmed" ta="center">
          No combat active
        </Text>
        {isGM && (
          <Button onClick={handleStartCombat} variant="light">
            Start Combat
          </Button>
        )}
      </Stack>
    );
  }

  if (!combat.active) {
    return (
      <Stack p="md">
        <Text size="sm" c="dimmed" ta="center">
          Combat has ended
        </Text>
        {isGM && (
          <Button onClick={handleStartCombat} variant="light">
            Start New Combat
          </Button>
        )}
      </Stack>
    );
  }

  const currentCombatant = getCombatantData(combat.combatants[combat.currentTurn]);

  return (
    <Stack h="100%">
      {/* Combat Header */}
      <Paper p="sm" withBorder>
        <Group justify="space-between" mb="xs">
          <Text size="lg" fw={700}>Round {combat.round}</Text>
          {isGM && (
            <Button size="xs" color="red" variant="light" onClick={handleEndCombat}>
              End Combat
            </Button>
          )}
        </Group>
        
        {currentCombatant && (
          <Paper p="xs" withBorder style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
            <Text size="sm" fw={600}>
              Current Turn: {currentCombatant.name}
            </Text>
          </Paper>
        )}

        {isGM && combat.combatants.length > 0 && (
          <Group mt="sm" gap="xs">
            <Button size="xs" onClick={handlePreviousTurn} variant="light">
              ← Previous
            </Button>
            <Button size="xs" onClick={handleNextTurn} variant="light">
              Next →
            </Button>
          </Group>
        )}
      </Paper>

      {/* Add Combatant (GM only) */}
      {isGM && (
        <Paper p="sm" withBorder>
          <Text size="sm" fw={500} mb="xs">Add Combatant</Text>
          <Stack gap="xs">
            <Select
              placeholder="Select token"
              value={selectedTokenId}
              onChange={(val) => setSelectedTokenId(val || '')}
              data={availableTokens.map((t) => ({ 
                value: t.id, 
                label: t.characterId ? `${getDisplayName(t)} (${t.name})` : t.name 
              }))}
              size="xs"
            />
            <Group gap="xs">
              <NumberInput
                placeholder="Initiative"
                value={initiative}
                onChange={setInitiative}
                min={1}
                max={30}
                size="xs"
                style={{ flex: 1 }}
              />
              <NumberInput
                placeholder="Dex (optional)"
                value={dexterity}
                onChange={setDexterity}
                min={-5}
                max={10}
                size="xs"
                style={{ flex: 1 }}
              />
            </Group>
            <Button size="xs" onClick={handleAddCombatant} disabled={!selectedTokenId || initiative === ''}>
              Add to Combat
            </Button>
          </Stack>
        </Paper>
      )}

      <Divider label="Initiative Order" labelPosition="center" />

      {/* Combatants List */}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="xs">
          {combat.combatants.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center">
              No combatants yet
            </Text>
          ) : (
            combat.combatants.map((combatant, index) => {
              const isCurrentTurn = index === combat.currentTurn;
              const combatantData = getCombatantData(combatant);
              
              return (
                <Paper
                  key={combatant.id}
                  p="sm"
                  withBorder
                  style={{
                    borderColor: isCurrentTurn ? '#7c3aed' : undefined,
                    backgroundColor: isCurrentTurn ? 'rgba(124, 58, 237, 0.05)' : undefined,
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Badge size="sm" color="violet">{combatant.initiative}</Badge>
                      <Text size="sm" fw={600}>
                        {combatantData.name}
                      </Text>
                      {isCurrentTurn && (
                        <Badge size="xs" color="violet">Active</Badge>
                      )}
                      {/* Character indicator */}
                      {tokens.find(t => t.id === combatant.id)?.characterId && (
                        <Badge size="xs" color="blue">Linked</Badge>
                      )}
                    </Group>
                    {isGM && (
                      <ActionIcon
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveCombatant(combatant.id)}
                      >
                        🗑️
                      </ActionIcon>
                    )}
                  </Group>

                  {/* HP Bar */}
                  <Group gap="xs" mb="xs">
                    <Text size="xs" c="dimmed" style={{ minWidth: 50 }}>
                      HP: {combatantData.hp.current}/{combatantData.hp.max}
                    </Text>
                    {isGM && (
                      <Group gap={4} style={{ flex: 1 }}>
                        <ActionIcon
                          size="xs"
                          variant="light"
                          onClick={() => handleUpdateHP(combatant.id, combatantData.hp.current - 1)}
                        >
                          -
                        </ActionIcon>
                        <ActionIcon
                          size="xs"
                          variant="light"
                          onClick={() => handleUpdateHP(combatant.id, combatantData.hp.current + 1)}
                        >
                          +
                        </ActionIcon>
                      </Group>
                    )}
                  </Group>
                  
                  {/* HP Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      backgroundColor: '#1f2937',
                      borderRadius: 3,
                      overflow: 'hidden',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: `${(combatantData.hp.current / combatantData.hp.max) * 100}%`,
                        height: '100%',
                        backgroundColor:
                          combatantData.hp.current > combatantData.hp.max * 0.5
                            ? '#22c55e'
                            : combatantData.hp.current > combatantData.hp.max * 0.25
                            ? '#f59e0b'
                            : '#ef4444',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Conditions */}
                  {combatant.conditions.length > 0 && (
                    <Group gap={4} mb="xs">
                      {combatant.conditions.map((condition) => (
                        <Badge
                          key={condition}
                          size="xs"
                          color="orange"
                          rightSection={
                            isGM ? (
                              <ActionIcon
                                size="xs"
                                variant="transparent"
                                onClick={() => handleRemoveCondition(combatant.id, condition)}
                              >
                                ×
                              </ActionIcon>
                            ) : undefined
                          }
                        >
                          {condition}
                        </Badge>
                      ))}
                    </Group>
                  )}

                  {/* Add Condition (GM only) */}
                  {isGM && (
                    <Group gap={4}>
                      <TextInput
                        placeholder="Add condition"
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.currentTarget.value)}
                        size="xs"
                        style={{ flex: 1 }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCondition(combatant.id);
                          }
                        }}
                      />
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleAddCondition(combatant.id)}
                      >
                        +
                      </ActionIcon>
                    </Group>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
