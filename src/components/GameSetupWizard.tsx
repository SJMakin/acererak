import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { SelectedTheme } from './ThemeSelector';
import GameSetupForm from './GameSetupForm';
import './GameSetupWizard.css';

const GameSetupWizard: React.FC = () => {
  const { selectSystem, completeSetup, isGeneratingCharacter } = useGame();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Handle the complete setup process
  const handleSetupComplete = async (
    system: string,
    preferences: string | undefined,
    themes: SelectedTheme[] | null
  ) => {
    setIsProcessing(true);
    
    // Generate character using the selected system
    await selectSystem(system, preferences);
    
    // Complete the setup process and start the game with themes
    completeSetup(themes);
  };

  return (
    <div className="game-setup-wizard">
      <div className="wizard-container">
        <div className="wizard-content">
          {isGeneratingCharacter || isProcessing ? (
            <div className="loading-state">
              <p>Creating your adventure...</p>
              {/* Could add a loading animation here */}
            </div>
          ) : (
            <GameSetupForm onSetupComplete={handleSetupComplete} />
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSetupWizard;