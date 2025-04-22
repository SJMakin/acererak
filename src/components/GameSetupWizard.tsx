import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import SystemSelector from './SystemSelector';
import ThemeSelector, { SelectedTheme } from './ThemeSelector';
import './GameSetupWizard.css';

// Define the steps in the setup wizard
enum SetupStep {
  SYSTEM_SELECTION = 0,
  CHARACTER_PREFERENCES = 1,
  THEME_SELECTION = 2,
}

const GameSetupWizard: React.FC = () => {
  const { selectSystem, completeSetup, isGeneratingCharacter, characterSheet } = useGame();
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.SYSTEM_SELECTION);
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [characterPreferences, setCharacterPreferences] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Reset processing state when character generation completes
  useEffect(() => {
    if (!isGeneratingCharacter && isProcessing && currentStep === SetupStep.SYSTEM_SELECTION) {
      setIsProcessing(false);
      // Move to theme selection once character is generated
      setCurrentStep(SetupStep.THEME_SELECTION);
    }
  }, [isGeneratingCharacter, isProcessing, currentStep]);

  // Handle system selection
  const handleSystemSelect = async (system: string, preferences?: string) => {
    setSelectedSystem(system);
    setCharacterPreferences(preferences || '');
    setIsProcessing(true);
    
    // Generate character using the selected system
    await selectSystem(system, preferences);
  };

  // Handle theme selection
  const handleThemeSelect = (themes: SelectedTheme[] | null) => {
    // Complete the setup process and start the game
    completeSetup(themes);
  };

  // Go back to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case SetupStep.SYSTEM_SELECTION:
        return (
          <div className="step-content">
            <SystemSelector onSystemSelected={handleSystemSelect} />
          </div>
        );
      
      case SetupStep.THEME_SELECTION:
        return (
          <div className="step-content">
            <ThemeSelector onThemesSelected={handleThemeSelect} />
          </div>
        );
      
      default:
        return <div>Unknown step</div>;
    }
  };

  // Get step title based on current step
  const getStepTitle = () => {
    switch (currentStep) {
      case SetupStep.SYSTEM_SELECTION:
        return 'Choose Your RPG System';
      case SetupStep.THEME_SELECTION:
        return 'Choose Your Adventure Themes';
      default:
        return 'Game Setup';
    }
  };

  return (
    <div className="game-setup-wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h2>{getStepTitle()}</h2>
          
          <div className="wizard-progress">
            <div className="progress-step">
              <div className={`step-indicator ${currentStep === SetupStep.SYSTEM_SELECTION ? 'active' : ''} ${currentStep > SetupStep.SYSTEM_SELECTION ? 'completed' : ''}`}>
                1
              </div>
              <span className={`step-label ${currentStep === SetupStep.SYSTEM_SELECTION ? 'active' : ''}`}>
                System
              </span>
            </div>
            
            <div className="progress-step">
              <div className={`step-indicator ${currentStep === SetupStep.THEME_SELECTION ? 'active' : ''} ${currentStep > SetupStep.THEME_SELECTION ? 'completed' : ''}`}>
                2
              </div>
              <span className={`step-label ${currentStep === SetupStep.THEME_SELECTION ? 'active' : ''}`}>
                Themes
              </span>
            </div>
          </div>
        </div>
        
        <div className="wizard-content">
          {isGeneratingCharacter ? (
            <div className="loading-state">
              <p>Creating your character...</p>
              {/* Could add a loading animation here */}
            </div>
          ) : (
            renderStepContent()
          )}
        </div>
        
        {currentStep !== SetupStep.SYSTEM_SELECTION && (
          <div className="wizard-footer">
            <button 
              className="back-button" 
              onClick={handleBack}
              disabled={isProcessing}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSetupWizard;