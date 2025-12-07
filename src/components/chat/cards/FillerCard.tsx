/**
 * FillerCard - Displays atmospheric filler content
 */

import React from 'react';

import type { FillerMessage } from '../../../types';

import './cards.css';

interface FillerCardProps {
  message: FillerMessage;
}

const FillerCard: React.FC<FillerCardProps> = ({ message }) => {
  const { content, fillerType, streaming } = message;

  const getIcon = () => {
    switch (fillerType) {
      case 'thoughts':
        return '💭';
      case 'omen':
        return '🔮';
      case 'flavor':
        return '🌫️';
      default:
        return '💭';
    }
  };

  const getTitle = () => {
    switch (fillerType) {
      case 'thoughts':
        return 'Meanwhile...';
      case 'omen':
        return 'A Whisper...';
      case 'flavor':
        return 'The World...';
      default:
        return 'Meanwhile...';
    }
  };

  return (
    <div className="chat-card filler-card">
      <div className="chat-card-header">
        <div className="chat-card-title">
          <span className="chat-card-title-icon">{getIcon()}</span>
          <span>{getTitle()}</span>
        </div>
      </div>

      <div className="chat-card-content">
        {content}
        {streaming && <span className="streaming-cursor" />}
      </div>
    </div>
  );
};

export default FillerCard;