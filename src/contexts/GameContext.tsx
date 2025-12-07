import React, { useEffect, useRef, useState, useCallback } from 'react';

import type { SelectedTheme, ImageSettings, DisplaySettings } from '../types';

import { CharacterProvider, useCharacter } from './CharacterContext';
import { ChatProvider, useChat } from './ChatContext';
import { DiceProvider, useDice } from './DiceContext';
import { RulesProvider, useRules } from './RulesContext';
import {
  getImageSettings,
  setImageSettings as saveImageSettings,
  getDisplaySettings,
  setDisplaySettings as saveDisplaySettings,
} from '../services/gameStorageService';

export type GameMode = 'setup' | 'story';

// Create a context for the game mode
const GameModeContext = React.createContext<{
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
}>({
  gameMode: 'setup',
  setGameMode: () => {},
});

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [gameMode, setGameMode] = useState<GameMode>('setup');

  return (
    <GameModeContext.Provider value={{ gameMode, setGameMode }}>
      <CharacterProvider>
        <DiceProvider>
          <RulesProvider>
            <ChatProvider>
              <GameCoordinator>{children}</GameCoordinator>
            </ChatProvider>
          </RulesProvider>
        </DiceProvider>
      </CharacterProvider>
    </GameModeContext.Provider>
  );
};

const GameCoordinator: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      // Setup wizard will guide the user through system selection and character creation
    }
  }, []);

  return <>{children}</>;
};

export const useGame = () => {
  const { gameMode, setGameMode } = React.useContext(GameModeContext);
  const chat = useChat();
  const dice = useDice();
  const character = useCharacter();
  const rules = useRules();

  // Settings state (loaded from storage)
  const [imageSettings, setImageSettingsState] = useState<ImageSettings>(getImageSettings);
  const [displaySettings, setDisplaySettingsState] = useState<DisplaySettings>(getDisplaySettings);

  const setImageSettings = useCallback((settings: ImageSettings) => {
    saveImageSettings(settings);
    setImageSettingsState(settings);
  }, []);

  const setDisplaySettings = useCallback((settings: DisplaySettings) => {
    saveDisplaySettings(settings);
    setDisplaySettingsState(settings);
  }, []);

  // Log when character sheet changes in useGame
  useEffect(() => {
    console.log('GameContext detected character sheet change');
  }, [character.characterSheet]);

  // Function to handle system selection in the setup wizard
  const selectSystem = async (
    system: string,
    preferences?: string
  ): Promise<string | undefined> => {
    try {
      // Generate character using AI and get the character sheet
      const generatedCharacterSheet = await character.generateCharacter({
        system,
        preferences,
      });

      // In the new flow, we stay in setup mode until the entire setup is complete
      // The UI will show the next step (theme selection) within the wizard
      return generatedCharacterSheet;
    } catch (error) {
      console.error('Error selecting system:', error);
      return undefined;
    }
  };

  // Function to set character sheet directly (for previewed characters)
  const setCharacterSheet = useCallback((sheet: string) => {
    character.setCharacterSheet(sheet);
  }, [character]);

  // Function to complete the setup process and start the game
  const completeSetup = useCallback(
    async (themes: SelectedTheme[] | null, characterSheet?: string, previewedStoryPlan?: string) => {
      // Use the provided character sheet or fall back to the context state
      const finalCharacterSheet = characterSheet || character.characterSheet;

      // Start a new game with the chat context, passing previewed story plan if available
      await chat.newGame(finalCharacterSheet, themes || [], previewedStoryPlan);

      // Move to story mode to start the game
      setGameMode('story');
    },
    [character.characterSheet, setGameMode, chat]
  );

  return {
    // Game state
    gameMode,
    setGameMode,

    // Setup and system selection
    selectSystem,
    completeSetup,
    isGeneratingCharacter: character.isGenerating,

    // Chat state and functions
    messages: chat.messages,
    currentGame: chat.currentGame,
    hasUnsavedChanges: chat.hasUnsavedChanges,
    isLoading: chat.isGenerating || character.isGenerating,
    streamingMessageId: chat.streamingMessageId,
    sessionCost: chat.sessionCost,
    sessionTokens: chat.sessionTokens,
    sessionCalls: chat.sessionCalls,
    imageSettings,
    displaySettings,
    selectChoice: chat.selectChoice,
    newGame: chat.newGame,
    branchFromMessage: chat.branchFromMessage,
    setImageSettings,
    setDisplaySettings,
    exportGame: chat.exportGame,
    importGame: chat.importGame,
    restartGame: () => {
      // Reset character first, then restart chat
      character.resetCharacter();
      setGameMode('setup'); // Go back to setup wizard
      chat.restartGame();
    },

    // Character state and functions
    characterSheet: character.characterSheet,
    setCharacterSheet,
    updateCharacterSheet: character.updateCharacterSheet,

    // Dice state and functions
    currentRollResult: dice.currentRollResult,
    showDiceAnimation: dice.showDiceAnimation,
    performDiceRoll: dice.performDiceRoll,

    // Rules state and functions
    rules: rules.rules,
    addRule: rules.addRule,
    updateRule: rules.updateRule,
    deleteRule: rules.deleteRule,
    toggleRule: rules.toggleRule,
    getEnabledRulesForStoryContext: rules.getEnabledRulesForStoryContext,
  };
};
