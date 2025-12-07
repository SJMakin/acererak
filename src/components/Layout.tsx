import React, { useState, useCallback } from 'react';

import { useGame } from '../contexts/GameContext';

import ChatView from './chat/ChatView';
import SetupModal from './SetupModal';
import type { SelectedTheme } from '../types';
import './Layout.css';

const Layout: React.FC = () => {
  const {
    setGameMode,
    selectSystem,
    completeSetup,
    isGeneratingCharacter,
    setCharacterSheet
  } = useGame();
  
  // Don't show modal automatically - let user click "New Adventure" or load a game first
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNewGame = useCallback(() => {
    setShowSetupModal(true);
  }, []);

  const handleSetupComplete = useCallback(async (
    system: string,
    preferences: string | undefined,
    themes: SelectedTheme[] | null,
    previewedCharacterSheet?: string,
    previewedStoryPlan?: string
  ) => {
    setIsProcessing(true);

    try {
      let characterSheet = previewedCharacterSheet;

      // Only generate character if not already previewed
      if (!characterSheet) {
        characterSheet = await selectSystem(system, preferences);

        if (!characterSheet) {
          throw new Error(
            'Failed to generate character. Please check your API key and try again.'
          );
        }
      } else {
        // Set the previewed character sheet in context
        setCharacterSheet(characterSheet);
      }

      // Complete the setup process and start the game with themes
      await completeSetup(themes, characterSheet, previewedStoryPlan);
      
      // Close modal and switch to story mode
      setShowSetupModal(false);
      setGameMode('story');
      setIsProcessing(false);
    } catch (err) {
      console.error('Failed to complete setup:', err);
      setIsProcessing(false);
      // Keep modal open to show error in modal
      throw err;
    }
  }, [selectSystem, completeSetup, setCharacterSheet, setGameMode]);

  const handleCloseSetup = useCallback(() => {
    // Always allow closing - user can access empty state with load/save options
    setShowSetupModal(false);
  }, []);

  return (
    <div className="game-layout">
      <div className="main-content-full">
        <ChatView onNewGame={handleNewGame} />
      </div>
      
      {/* Setup modal overlay */}
      {showSetupModal && (
        <div className="setup-modal-overlay">
          <SetupModal
            onSetupComplete={handleSetupComplete}
            onClose={handleCloseSetup}
            isProcessing={isProcessing || isGeneratingCharacter}
          />
        </div>
      )}
    </div>
  );
};

export default Layout;
