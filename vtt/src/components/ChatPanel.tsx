import { useState, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Paper,
  Text,
  Group,
  ActionIcon,
  ScrollArea,
  Switch,
  Badge,
} from '@mantine/core';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  onSendMessage: (message: ChatMessage) => void;
}

export default function ChatPanel({ onSendMessage }: ChatPanelProps) {
  const { game, myPeerId, isGM, addChatMessage } = useGameStore();
  const [messageText, setMessageText] = useState('');
  const [isGMOnly, setIsDMOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current player info
  const currentPlayer = game?.players[myPeerId || ''];
  const playerName = currentPlayer?.name || 'Unknown';
  const playerColor = currentPlayer?.color || '#7c3aed';

  // Get chat messages
  const chatMessages = game?.chatMessages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages.length]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !myPeerId) return;

    const message: ChatMessage = {
      id: nanoid(10),
      playerId: myPeerId,
      playerName,
      playerColor,
      timestamp: Date.now(),
      content: messageText.trim(),
      isGMOnly,
    };

    // Add to local state
    addChatMessage(message);
    // Broadcast to peers
    onSendMessage(message);

    // Reset form
    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Stack h="100%" gap="xs">
      {/* Messages area */}
      <ScrollArea h="calc(100vh - 280px)" viewportRef={scrollRef}>
        <Stack gap="xs" p="xs">
          {chatMessages.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No messages yet. Start the conversation!
            </Text>
          )}

          {chatMessages.map((msg) => (
            <Paper
              key={msg.id}
              p="xs"
              withBorder
              style={{
                borderLeftWidth: 3,
                borderLeftColor: msg.playerColor,
              }}
            >
              <Group justify="space-between" gap="xs" mb={4}>
                <Group gap="xs">
                  <Text size="xs" fw={600} style={{ color: msg.playerColor }}>
                    {msg.playerName}
                  </Text>
                  {msg.isGMOnly && (
                    <Badge size="xs" color="violet" variant="light">
                      Whisper
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {formatTime(msg.timestamp)}
                </Text>
              </Group>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {msg.content}
              </Text>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>

      {/* Message input */}
      <Paper p="xs" withBorder>
        <Stack gap="xs">
          <TextInput
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.currentTarget.value)}
            onKeyDown={handleKeyPress}
            size="sm"
            rightSection={
              <ActionIcon
                size="sm"
                color="violet"
                variant="filled"
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
              >
                ➤
              </ActionIcon>
            }
          />
          <Group justify="space-between">
            <Switch
              size="xs"
              label="Whisper to GM"
              checked={isGMOnly}
              onChange={(e) => setIsDMOnly(e.currentTarget.checked)}
              disabled={isGM} // GM doesn't need to whisper to themselves
            />
            {isGM && isGMOnly && (
              <Text size="xs" c="dimmed">
                (You are the GM)
              </Text>
            )}
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
