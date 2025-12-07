/**
 * GameListPanel - Shows current game info and Save/Load file options
 *
 * Games are kept in memory only and saved/loaded from JSON files.
 * No localStorage for game data - removes 5MB limit.
 */

import React from 'react';

import type { SavedGame } from '../../types';

import './GameListPanel.css';

interface GameListPanelProps {
  currentGame: SavedGame | null;
  hasUnsavedChanges: boolean;
  messageCount: number;
  sessionCost: number;
  onNewGame: () => void;
  onStartOver: () => void;
  onExportGame: () => void;
  onImportGame: () => void;
}

const GameListPanel: React.FC<GameListPanelProps> = ({
  currentGame,
  hasUnsavedChanges,
  messageCount,
  sessionCost,
  onNewGame,
  onStartOver,
  onExportGame,
  onImportGame,
}) => {
  const formatCost = (cost: number): string => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="game-list-panel">
      {/* File Operations */}
      <div className="game-list-section">
        <h3 className="game-list-section-title">Game File</h3>
        <div className="game-list-actions">
          <button
            className="game-list-action primary"
            onClick={onImportGame}
            title="Load a saved game from a .json file"
          >
            📂 Load Game
          </button>
          <button
            className="game-list-action"
            onClick={onExportGame}
            disabled={!currentGame}
            title={currentGame ? "Save current game to a .json file" : "No game to save"}
          >
            💾 Save Game
            {hasUnsavedChanges && currentGame && <span className="unsaved-indicator">*</span>}
          </button>
        </div>
      </div>

      {/* Current Game Info */}
      {currentGame ? (
        <div className="game-list-section">
          <h3 className="game-list-section-title">Current Adventure</h3>
          <div className="current-game-card">
            <div className="current-game-name">{currentGame.name}</div>
            <div className="current-game-meta">
              <span>{messageCount} messages</span>
              <span className="game-item-separator">•</span>
              <span>{formatCost((currentGame.totalCost || 0) + sessionCost)}</span>
            </div>
            <div className="current-game-meta">
              <span>Started: {formatDate(currentGame.createdAt)}</span>
            </div>
            {hasUnsavedChanges && (
              <div className="unsaved-warning">
                ⚠️ Unsaved changes
              </div>
            )}
          </div>
          <div className="game-list-actions">
            <button className="game-list-action" onClick={onStartOver}>
              ↩ Start Over
            </button>
          </div>
        </div>
      ) : (
        <div className="game-list-section">
          <h3 className="game-list-section-title">No Active Game</h3>
          <div className="game-list-empty">
            Start a new adventure or load a saved game.
          </div>
        </div>
      )}

      {/* New Game */}
      <div className="game-list-section">
        <h3 className="game-list-section-title">New Adventure</h3>
        <div className="game-list-actions">
          <button className="game-list-action primary" onClick={onNewGame}>
            + New Adventure
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameListPanel;