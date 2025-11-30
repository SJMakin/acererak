import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StoryProvider, useStory } from './StoryContext';
import { DiceProvider, useDice } from './DiceContext';
import { CharacterProvider, useCharacter } from './CharacterContext';
import { NPCProvider, useNPCs } from './NPCContext';
import { RulesProvider, useRules } from './RulesContext';
import { SelectedTheme } from '../types';

export type GameMode = 'setup' | 'system-select' | 'story';

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
          <NPCProvider>
            <RulesProvider>
              <StoryProvider>
                <GameCoordinator>{children}</GameCoordinator>
              </StoryProvider>
            </RulesProvider>
          </NPCProvider>
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
      // We'll start with system selection instead of immediately starting the game
    }
  }, []);

  return <>{children}</>;
};

export const useGame = () => {
  const { gameMode, setGameMode } = React.useContext(GameModeContext);
  const story = useStory();
  const dice = useDice();
  const character = useCharacter();
  const npc = useNPCs();
  const rules = useRules();

  // Log when character sheet changes in useGame
  useEffect(() => {
    console.log('GameContext detected character sheet change');
  }, [character.characterSheet]);

  const chooseOption = async (choiceNodeId: string) => {
    const choice = story.graphData.nodes.find(
      (node: any) => node.id === choiceNodeId
    );
    if (!choice || choice.type !== 'choice') return;

    // Only proceed with the story choice
    return story.chooseOption(choiceNodeId, character.characterSheet);
  };

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

  // Function to complete the setup process and start the game
  const completeSetup = useCallback(
    (themes: SelectedTheme[] | null, characterSheet?: string) => {
      // Use the provided character sheet or fall back to the context state
      const finalCharacterSheet = characterSheet || character.characterSheet;

      // Select themes for the story, passing the character sheet
      story.selectThemes(themes, finalCharacterSheet);

      // Move to story mode to start the game
      setGameMode('story');
    },
    [character.characterSheet, setGameMode, story]
  );

  return {
    // Game state
    gameMode,
    setGameMode,

    // Setup and system selection
    selectSystem,
    completeSetup,
    isGeneratingCharacter: character.isGenerating,

    // Story state and functions
    graphData: story.graphData,
    currentStoryNode: story.currentStoryNode,
    isLoading: story.isLoading || character.isGenerating,
    error: story.error,
    selectThemes: story.selectThemes,
    loadStoryNode: story.loadStoryNode,
    chooseOption,
    resetError: story.resetError,
    restartGame: () => {
      // Reset character first, get the empty state, then restart story
      // This avoids the race condition where characterSheet is read before reset
      character.resetCharacter();
      setGameMode('setup'); // Go back to setup wizard
      return story.restartGame(''); // Pass empty string since character is reset
    },

    // Character state and functions
    characterSheet: character.characterSheet,
    updateCharacterSheet: character.updateCharacterSheet,

    // Dice state and functions
    currentRollResult: dice.currentRollResult,
    showDiceAnimation: dice.showDiceAnimation,
    performDiceRoll: dice.performDiceRoll,

    // NPC state and functions
    npcs: npc.npcs,
    addNPC: npc.addNPC,
    updateNPC: npc.updateNPC,
    deleteNPC: npc.deleteNPC,
    getNPCsForStoryContext: npc.getNPCsForStoryContext,

    // Rules state and functions
    rules: rules.rules,
    addRule: rules.addRule,
    updateRule: rules.updateRule,
    deleteRule: rules.deleteRule,
    toggleRule: rules.toggleRule,
    getEnabledRulesForStoryContext: rules.getEnabledRulesForStoryContext,
  };
};
