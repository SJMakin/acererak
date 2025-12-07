/**
 * ChatHeader - Header bar for chat view with game info and actions
 */

import React from 'react';

import './ChatHeader.css';

interface ChatHeaderProps {
  gameName?: string;
  sessionCost?: number;
  sessionCalls?: number;
  showCostTracking?: boolean;
  onMenuClick?: () => void;
  onCharacterClick?: () => void;
  onRulesClick?: () => void;
  onSettingsClick?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  gameName = 'Acererak',
  sessionCost = 0,
  sessionCalls = 0,
  showCostTracking = true,
  onMenuClick,
  onCharacterClick,
  onRulesClick,
  onSettingsClick,
}) => {
  const formatCost = (cost: number): string => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button
          className="chat-header-icon-btn menu-btn"
          onClick={onMenuClick}
          title="Games Menu"
        >
          ☰
        </button>
        <h1 className="chat-header-title">{gameName}</h1>
      </div>

      <div className="chat-header-center">
        {showCostTracking && (
          <div className="chat-header-stats">
            <span className="stat-cost">{formatCost(sessionCost)}</span>
            <span className="stat-divider">|</span>
            <span className="stat-calls">{sessionCalls} calls</span>
          </div>
        )}
      </div>

      <div className="chat-header-right">
        <button
          className="chat-header-icon-btn"
          onClick={onCharacterClick}
          title="Character Sheet"
        >
          👤
        </button>
        <button
          className="chat-header-icon-btn"
          onClick={onRulesClick}
          title="Rules"
        >
          📜
        </button>
        <button
          className="chat-header-icon-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;