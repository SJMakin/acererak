/**
 * ChatView - Main chat interface view with header and panels
 */

import React, { useState, useCallback } from 'react';

import { useChat } from '../../contexts/ChatContext';
import { getDisplaySettings } from '../../services/gameStorageService';

import CharacterSheet from '../CharacterSheet';
import RulesPanel from '../RulesPanel';
import Settings from '../Settings';

import ChatContainer from './ChatContainer';
import ChatHeader from './ChatHeader';
import GameListPanel from './GameListPanel';
import SlidePanel from './SlidePanel';

import './ChatView.css';

type PanelType = 'games' | 'character' | 'rules' | 'settings' | null;

interface ChatViewProps {
  onNewGame: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onNewGame }) => {
  const {
    currentGame,
    messages,
    sessionCost,
    sessionCalls,
    hasUnsavedChanges,
    selectChoice,
    branchFromMessage,
    restartGame,
    exportGame,
    importGame,
  } = useChat();

  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const displaySettings = getDisplaySettings();

  // Get game name from current game
  const gameName = currentGame?.name || 'Acererak';

  const handleOpenPanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleClosePanel = () => {
    setActivePanel(null);
  };

  const handleSelectChoice = useCallback(
    (messageId: string, choiceId: string) => {
      selectChoice(messageId, choiceId);
    },
    [selectChoice]
  );

  const handleBranch = useCallback(
    (messageIndex: number) => {
      branchFromMessage(messageIndex);
    },
    [branchFromMessage]
  );

  const handleStartOver = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Start over anyway?')) {
        return;
      }
    }
    restartGame();
  }, [restartGame, hasUnsavedChanges]);

  const handleExportGame = useCallback(() => {
    exportGame();
  }, [exportGame]);

  const handleImportGame = useCallback(async () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Load a different game anyway?')) {
        return;
      }
    }
    await importGame();
    setActivePanel(null);
  }, [importGame, hasUnsavedChanges]);

  const handleNewGameFromPanel = useCallback(() => {
    setActivePanel(null);
    onNewGame();
  }, [onNewGame]);

  return (
    <div className="chat-view">
      <ChatHeader
        gameName={gameName}
        sessionCost={sessionCost}
        sessionCalls={sessionCalls}
        showCostTracking={displaySettings.showCostTracking}
        onMenuClick={() => handleOpenPanel('games')}
        onCharacterClick={() => handleOpenPanel('character')}
        onRulesClick={() => handleOpenPanel('rules')}
        onSettingsClick={() => handleOpenPanel('settings')}
      />

      {messages.length > 0 ? (
        <ChatContainer
          messages={messages}
          onSelectChoice={handleSelectChoice}
          onBranch={handleBranch}
          showLlmInfo={displaySettings.showLlmCallInfo}
        />
      ) : (
        <div className="chat-empty-state">
          <div className="chat-empty-icon">🎲</div>
          <h2 className="chat-empty-title">Welcome to Acererak</h2>
          <p className="chat-empty-subtitle">
            An AI-powered solo TTRPG experience. Start a new adventure or load a saved game.
          </p>
          <div className="chat-empty-actions">
            <button className="chat-empty-button primary" onClick={onNewGame}>
              ✨ New Adventure
            </button>
            <button className="chat-empty-button" onClick={handleImportGame}>
              📂 Load Saved Game
            </button>
          </div>
        </div>
      )}

      {/* Games Panel - slides from left to match hamburger position */}
      <SlidePanel
        isOpen={activePanel === 'games'}
        onClose={handleClosePanel}
        title="Game Files"
        side="left"
      >
        <GameListPanel
          currentGame={currentGame}
          hasUnsavedChanges={hasUnsavedChanges}
          messageCount={messages.length}
          sessionCost={sessionCost}
          onNewGame={handleNewGameFromPanel}
          onStartOver={handleStartOver}
          onExportGame={handleExportGame}
          onImportGame={handleImportGame}
        />
      </SlidePanel>

      {/* Character Panel */}
      <SlidePanel
        isOpen={activePanel === 'character'}
        onClose={handleClosePanel}
        title="Character Sheet"
      >
        <CharacterSheet inPanel />
      </SlidePanel>

      {/* Rules Panel */}
      <SlidePanel
        isOpen={activePanel === 'rules'}
        onClose={handleClosePanel}
        title="Rules"
      >
        <RulesPanel />
      </SlidePanel>

      {/* Settings Panel */}
      <SlidePanel
        isOpen={activePanel === 'settings'}
        onClose={handleClosePanel}
        title="Settings"
      >
        <Settings />
      </SlidePanel>
    </div>
  );
};

export default ChatView;