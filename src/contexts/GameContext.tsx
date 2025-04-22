import React, { useEffect, useRef, useState } from 'react';
import { StoryProvider, useStory } from './StoryContext';
import { DiceProvider, useDice } from './DiceContext';
import { CharacterProvider, useCharacter } from './CharacterContext';
import { CombatProvider, useCombat } from './CombatContext';
import { NPCProvider, useNPCs } from './NPCContext';
import { RulesProvider, useRules } from './RulesContext';
import { SelectedTheme } from '../components/ThemeSelector';

export type GameMode = 'setup' | 'system-select' | 'story' | 'combat';

// Create a context for the game mode
const GameModeContext = React.createContext<{
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
}>({
  gameMode: 'setup',
  setGameMode: () => {}
});

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameMode, setGameMode] = useState<GameMode>('setup');

  return (
    <GameModeContext.Provider value={{ gameMode, setGameMode }}>
      <CharacterProvider>
        <DiceProvider>
          <CombatProvider>
            <NPCProvider>
              <RulesProvider>
                <StoryProvider>
                  <GameCoordinator>{children}</GameCoordinator>
                </StoryProvider>
              </RulesProvider>
            </NPCProvider>
          </CombatProvider>
        </DiceProvider>
      </CharacterProvider>
    </GameModeContext.Provider>
  );
};

const GameCoordinator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { restartGame } = useStory();
  const { characterSheet, isGenerating } = useCharacter();
  const { isActive: isCombatActive } = useCombat();
  const { gameMode, setGameMode } = React.useContext(GameModeContext);
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      // We'll start with system selection instead of immediately starting the game
    }
  }, []);

  // Update game mode based on combat state
  useEffect(() => {
    if (gameMode !== 'system-select' && gameMode !== 'setup') {
      setGameMode(isCombatActive ? 'combat' : 'story');
    }
  }, [isCombatActive, gameMode, setGameMode]);

  return <>{children}</>;
};

export const useGame = () => {
  const { gameMode, setGameMode } = React.useContext(GameModeContext);
  const story = useStory();
  const dice = useDice();
  const character = useCharacter();
  const combat = useCombat();
  const npc = useNPCs();
  const rules = useRules();
  
  // Log when character sheet changes in useGame
  useEffect(() => {
    console.log('GameContext detected character sheet change');
  }, [character.characterSheet]);

  useEffect(() => {
    // If we're not in setup or system selection mode, update based on combat state
    if (gameMode !== 'system-select' && gameMode !== 'setup') {
      setGameMode(combat.isActive ? 'combat' : 'story');
    }
    
    // Check if combat just ended and we need to resume the story
    if (!combat.isActive) {
      const combatResult = localStorage.getItem('combatResult');
      const pendingChoiceId = localStorage.getItem('pendingChoiceAfterCombat');
      
      if (combatResult && pendingChoiceId) {
        // Only proceed with the story if combat ended in victory
        if (combatResult === 'victory') {
          story.chooseOption(pendingChoiceId, character.characterSheet);
        }
        
        // Clear the stored values
        localStorage.removeItem('combatResult');
        localStorage.removeItem('pendingChoiceAfterCombat');
      }
    }
  }, [combat.isActive, story, character.characterSheet]);

  const chooseOption = async (choiceNodeId: string) => {
    const choice = story.graphData.nodes.find((node: any) => node.id === choiceNodeId);
    if (!choice || choice.type !== 'choice') return;

    // If this is a combat choice, initiate combat and pause story progression
    if (choice.choiceType === 'combat' && choice.combatData) {
      await combat.initiateCombat(choice.combatData);
      // Store the choice ID to resume story after combat ends
      localStorage.setItem('pendingChoiceAfterCombat', choiceNodeId);
      return; // Don't proceed with story generation during combat
    }

    // Only proceed with the story choice if not in combat
    if (!combat.isActive) {
      return story.chooseOption(choiceNodeId, character.characterSheet);
    }
  };

  // Function to handle system selection in the setup wizard
  const selectSystem = async (system: string, preferences?: string) => {
    try {
      // Generate character using AI
      await character.generateCharacter({ system, preferences });
      
      // In the new flow, we stay in setup mode until the entire setup is complete
      // The UI will show the next step (theme selection) within the wizard
    } catch (error) {
      console.error('Error selecting system:', error);
    }
  };

  // Function to complete the setup process and start the game
  const completeSetup = (themes: SelectedTheme[] | null) => {
    // Select themes for the story
    story.selectThemes(themes);
    
    // Move to story mode to start the game
    setGameMode('story');
    
    // Log the transition for debugging
    console.log('Completing setup and transitioning to story mode', themes);
  };

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
    isThemeSelectionMode: story.isThemeSelectionMode,
    selectThemes: story.selectThemes,
    loadStoryNode: story.loadStoryNode,
    chooseOption,
    resetError: story.resetError,
    restartGame: () => {
      setGameMode('setup'); // Go back to setup wizard
      character.resetCharacter();
      combat.endCombat();
      return story.restartGame(character.characterSheet);
    },

    // Character state and functions
    characterSheet: character.characterSheet,
    updateCharacterSheet: character.updateCharacterSheet,

    // Combat state and functions
    isCombatActive: combat.isActive,
    combatState: combat.combatState,
    currentCombatEntity: combat.currentEntity,
    combatLog: combat.combatLog,
    executeAction: combat.executeAction,
    nextTurn: combat.nextTurn,
    endCombat: combat.endCombat,
    narrativeDescription: combat.narrativeDescription,
    processingRound: combat.processingRound,
    pendingUpdates: combat.pendingUpdates,
    applyUpdate: combat.applyUpdate,
    skipUpdate: combat.skipUpdate,
    processRound: combat.processRound,

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
    getEnabledRulesForStoryContext: rules.getEnabledRulesForStoryContext
  };
};
