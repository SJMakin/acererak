import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { SelectedTheme } from '../types';
import GameSetupTabs from './GameSetupTabs';
import './GameSetupWizard.css';

const GameSetupWizard: React.FC = () => {
  const { selectSystem, completeSetup, isGeneratingCharacter } = useGame();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle the complete setup process
  const handleSetupComplete = async (
    system: string,
    preferences: string | undefined,
    themes: SelectedTheme[] | null
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Generate character using the selected system and get the character sheet
      const generatedCharacterSheet = await selectSystem(system, preferences);

      if (!generatedCharacterSheet) {
        throw new Error('Failed to generate character. Please check your API key and try again.');
      }

      // Complete the setup process and start the game with themes, passing the character sheet
      completeSetup(themes, generatedCharacterSheet);
      
      // Setup completed successfully, clear processing state
      // Note: We don't set isProcessing to false here because the component will unmount
      // when gameMode changes to 'story', but if it doesn't unmount, this prevents stuck state
      setIsProcessing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete setup. Please try again.';
      console.error('Failed to complete setup:', errorMessage);
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <div className="game-setup-wizard">
      <div className="wizard-container">
        <div className="wizard-content">
          {error && (
            <div className="error-message" style={{
              padding: '1rem',
              marginBottom: '1rem',
              backgroundColor: '#ff4444',
              color: 'white',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          {isGeneratingCharacter || isProcessing ? (
            <div className="loading-state">
              <p>Creating your adventure...</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                This may take a moment...
              </p>
            </div>
          ) : (
            <GameSetupTabs onSetupComplete={handleSetupComplete} />
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSetupWizard;
