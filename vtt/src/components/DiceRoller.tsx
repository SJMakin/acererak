import { useState, useRef } from 'react';
import {
  Stack,
  TextInput,
  Button,
  Paper,
  Text,
  Group,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { nanoid } from 'nanoid';
import { executeDiceRoll } from '../services/diceParser';
import { useGameStore } from '../stores/gameStore';
import type { ChatMessage } from '../types';

interface DiceRollerProps {
  onRoll: (message: ChatMessage) => void;
}

export default function DiceRoller({ onRoll }: DiceRollerProps) {
  const [customFormula, setCustomFormula] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const diceContainerRef = useRef<HTMLDivElement>(null);

  const { game, myPeerId, addChatMessage } = useGameStore();
  const myPlayer = myPeerId && game?.players[myPeerId];
  // Get roll messages from chat
  const rollMessages = game?.chatMessages?.filter(msg => msg.type === 'roll') || [];

  // Quick roll buttons config
  const quickRolls = [
    { label: 'd4', formula: '1d4' },
    { label: 'd6', formula: '1d6' },
    { label: 'd8', formula: '1d8' },
    { label: 'd10', formula: '1d10' },
    { label: 'd12', formula: '1d12' },
    { label: 'd20', formula: '1d20' },
    { label: 'd100', formula: '1d100' },
  ];

  const modifierButtons = [
    { label: 'Advantage', formula: '1d20 advantage' },
    { label: 'Disadvantage', formula: '1d20 disadvantage' },
  ];

  const performRoll = (formula: string) => {
    if (!myPlayer || !game) return;
    
    setIsRolling(true);

    try {
      const rollResult = executeDiceRoll(formula);
      
      // Create a roll-type chat message
      const rollMessage: ChatMessage = {
        id: `${myPeerId}:${nanoid(10)}`,
        playerId: myPeerId!,
        playerName: myPlayer.name,
        playerColor: myPlayer.color,
        timestamp: Date.now(),
        type: 'roll',
        content: '',
        isGMOnly: false,
        formula: rollResult.formula,
        result: rollResult.result,
        breakdown: rollResult.breakdown,
      };

      // Add to local store
      addChatMessage(rollMessage);
      
      // Broadcast to other players
      onRoll(rollMessage);

      // Clear custom formula if it was used
      if (formula === customFormula) {
        setCustomFormula('');
      }
    } catch (error) {
      console.error('Failed to roll dice:', error);
    } finally {
      setTimeout(() => setIsRolling(false), 500);
    }
  };

  const handleQuickRoll = (formula: string) => {
    performRoll(formula);
  };

  const handleCustomRoll = () => {
    if (!customFormula.trim()) return;
    performRoll(customFormula.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomRoll();
    }
  };

  return (
    <Stack h="100%">
      {/* Dice container for 3D animation */}
      <div
        ref={diceContainerRef}
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: '#1a1b1e',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #373A40',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#909296',
          }}
        >
          <Text size="sm">3D Dice Animation Area</Text>
          <Text size="xs" c="dimmed">
            (Animation will appear here)
          </Text>
        </div>
      </div>

      {/* Quick roll buttons */}
      <Paper p="sm" withBorder>
        <Text size="sm" fw={500} mb="xs">Quick Rolls</Text>
        <SimpleGrid cols={4} spacing="xs">
          {quickRolls.map((roll) => (
            <Button
              key={roll.label}
              size="xs"
              variant="light"
              onClick={() => handleQuickRoll(roll.formula)}
              disabled={isRolling}
            >
              {roll.label}
            </Button>
          ))}
        </SimpleGrid>
      </Paper>

      {/* Advantage/Disadvantage */}
      <Paper p="sm" withBorder>
        <Text size="sm" fw={500} mb="xs">Modifiers</Text>
        <Group gap="xs">
          {modifierButtons.map((btn) => (
            <Button
              key={btn.label}
              size="xs"
              variant="light"
              color="violet"
              onClick={() => handleQuickRoll(btn.formula)}
              disabled={isRolling}
              style={{ flex: 1 }}
            >
              {btn.label}
            </Button>
          ))}
        </Group>
      </Paper>

      {/* Custom formula */}
      <Paper p="sm" withBorder>
        <Text size="sm" fw={500} mb="xs">Custom Roll</Text>
        <Group gap="xs">
          <TextInput
            placeholder="e.g., 2d6+3, 4d6 drop lowest"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.currentTarget.value)}
            onKeyPress={handleKeyPress}
            disabled={isRolling}
            size="xs"
            style={{ flex: 1 }}
          />
          <Button
            size="xs"
            onClick={handleCustomRoll}
            disabled={isRolling || !customFormula.trim()}
          >
            Roll
          </Button>
        </Group>
        <Text size="xs" c="dimmed" mt="xs">
          Examples: 2d6+3, 1d20+5, 4d6 drop lowest, 1d20 advantage
        </Text>
      </Paper>

      {/* Roll history - now shows recent rolls from chat */}
      <Paper p="sm" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Recent Rolls</Text>
        </Group>
        
        <Stack gap="xs" style={{ flex: 1, overflowY: 'auto' }}>
          {rollMessages.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" mt="md">
              No rolls yet
            </Text>
          )}
          {[...rollMessages].reverse().slice(0, 10).map((msg) => (
            <Paper
              key={msg.id}
              p="xs"
              withBorder
              style={{
                borderLeft: msg.playerId === myPeerId ? '3px solid #7c3aed' : '3px solid #373A40',
              }}
            >
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <Text size="xs" fw={500} style={{ color: msg.playerColor }}>
                    {msg.playerName}
                  </Text>
                  <Badge size="xs" variant="light">
                    {msg.formula}
                  </Badge>
                </Group>
              </Group>
              <Group justify="space-between" align="flex-start">
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                  {msg.breakdown}
                </Text>
                <Text
                  size="lg"
                  fw={700}
                  c="violet"
                  style={{ minWidth: '40px', textAlign: 'right' }}
                >
                  {msg.result}
                </Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
