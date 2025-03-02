import React, { useEffect, useRef, useState } from 'react';
import { StoryProvider, useStory } from './StoryContext';
import { DiceProvider, useDice } from './DiceContext';
import { CharacterProvider, useCharacter } from './CharacterContext';
import { CombatProvider, useCombat } from './CombatContext';
import { NPCProvider, useNPCs } from './NPCContext';
import { RulesProvider, useRules } from './RulesContext';

export type GameMode = 'system-select' | 'story' | 'combat';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
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
  );
};

const GameCoordinator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { restartGame } = useStory();
  const { characterSheet, isGenerating } = useCharacter();
  const { isActive: isCombatActive } = useCombat();
  const [gameMode, setGameMode] = useState<GameMode>('system-select'); // Start with system selection
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      // We'll start with system selection instead of immediately starting the game
    }
  }, []);

  // Update game mode based on combat state
  useEffect(() => {
    if (gameMode !== 'system-select') {
      setGameMode(isCombatActive ? 'combat' : 'story');
    }
  }, [isCombatActive, gameMode]);

  return <>{children}</>;
};

export const useGame = () => {
  const story = useStory();
  const dice = useDice();
  const character = useCharacter();
  const combat = useCombat();
  const npc = useNPCs();
  const rules = useRules();
  const [gameMode, setGameMode] = useState<GameMode>('system-select');

  useEffect(() => {
    // If we're not in system selection mode, update based on combat state
    if (gameMode !== 'system-select') {
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

  // Function to handle system selection
  const selectSystem = async (system: string, preferences?: string) => {
    try {
      // Generate character using AI
      await character.generateCharacter({ system, preferences });
      
      // Move to story mode (which will show theme selection first)
      setGameMode('story');
    } catch (error) {
      console.error('Error selecting system:', error);
    }
  };

  return {
    // Game state
    gameMode,
    setGameMode,
    
    // System selection
    selectSystem,
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
      setGameMode('system-select'); // Go back to system selection
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
