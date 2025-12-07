/**
 * ChatContainer - Main scrollable container for chat messages
 */

import React, { useEffect, useRef } from 'react';

import type { ChatMessage } from '../../types';
import {
  isStoryMessage,
  isImageMessage,
  isDiceMessage,
  isFillerMessage,
  isSystemMessage,
} from '../../types';

import StoryCard from './cards/StoryCard';
import ImageCard from './cards/ImageCard';
import DiceCard from './cards/DiceCard';
import FillerCard from './cards/FillerCard';
import SystemCard from './cards/SystemCard';

import './ChatContainer.css';

interface ChatContainerProps {
  messages: ChatMessage[];
  onSelectChoice: (messageId: string, choiceId: string) => void;
  onBranch: (messageIndex: number) => void;
  showLlmInfo?: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSelectChoice,
  onBranch,
  showLlmInfo = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);

  // Only scroll when user selects a choice (new story being generated)
  const handleSelectChoice = (messageId: string, choiceId: string) => {
    shouldScrollRef.current = true;
    onSelectChoice(messageId, choiceId);
  };

  // Scroll to bottom only when triggered by choice selection
  useEffect(() => {
    // Only scroll for story messages that are streaming (indicating a choice was just made)
    const lastMessage = messages[messages.length - 1];
    const isNewStoryStreaming = lastMessage &&
      isStoryMessage(lastMessage) &&
      lastMessage.streaming;
    
    if (shouldScrollRef.current && bottomRef.current && isNewStoryStreaming) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  const renderMessage = (message: ChatMessage, index: number) => {
    if (isStoryMessage(message)) {
      return (
        <StoryCard
          key={message.id}
          message={message}
          onSelectChoice={(choiceId) => handleSelectChoice(message.id, choiceId)}
          onBranch={() => onBranch(index)}
          showLlmInfo={showLlmInfo}
        />
      );
    }

    if (isImageMessage(message)) {
      return <ImageCard key={message.id} message={message} />;
    }

    if (isDiceMessage(message)) {
      return <DiceCard key={message.id} message={message} />;
    }

    if (isFillerMessage(message)) {
      return <FillerCard key={message.id} message={message} />;
    }

    if (isSystemMessage(message)) {
      return <SystemCard key={message.id} message={message} />;
    }

    return null;
  };

  return (
    <div className="chat-container" ref={containerRef}>
      <div className="chat-messages">
        {messages.map((message, index) => renderMessage(message, index))}
        <div ref={bottomRef} className="chat-scroll-anchor" />
      </div>
    </div>
  );
};

export default ChatContainer;