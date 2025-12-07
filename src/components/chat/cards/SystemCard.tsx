/**
 * SystemCard - Displays system notifications
 */

import React from 'react';

import type { SystemMessage } from '../../../types';

import './cards.css';

interface SystemCardProps {
  message: SystemMessage;
}

const SystemCard: React.FC<SystemCardProps> = ({ message }) => {
  const { message: text, variant } = message;

  const getIcon = () => {
    switch (variant) {
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✓';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'character-update':
        return '📝';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`chat-card system-card ${variant}`}>
      <div className="system-message">
        <span className="system-icon">{getIcon()}</span>
        <span className="system-text">{text}</span>
      </div>
    </div>
  );
};

export default SystemCard;