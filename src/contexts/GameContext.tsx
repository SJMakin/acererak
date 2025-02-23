import React, { useEffect, useRef, useState } from 'react';
import { StoryProvider, useStory } from './StoryContext';
import { DiceProvider, useDice } from './DiceContext';
import { CharacterProvider, useCharacter } from './CharacterContext';
import { CombatProvider, useCombat } from './CombatContext';

export type GameMode = 'story' | 'combat';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CharacterProvider>
      <DiceProvider>
        <CombatProvider>
          <StoryProvider>
            <GameCoordinator>{children}</GameCoordinator>
          </StoryProvider>
        </CombatProvider>
      </DiceProvider>
    </CharacterProvider>
  );
};

const GameCoordinator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { restartGame } = useStory();
  const { characterSheet } = useCharacter();
  const { isActive: isCombatActive } = useCombat();
  const [gameMode, setGameMode] = useState<GameMode>('story');
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      restartGame(characterSheet);
    }
  }, [restartGame, characterSheet]);

  // Update game mode based on combat state
  useEffect(() => {
    setGameMode(isCombatActive ? 'combat' : 'story');
  }, [isCombatActive]);

  return <>{children}</>;
};

export const useGame = () => {
  const story = useStory();
  const dice = useDice();
  const character = useCharacter();
  const combat = useCombat();
  const [gameMode, setGameMode] = useState<GameMode>('story');

  useEffect(() => {
    setGameMode(combat.isActive ? 'combat' : 'story');
  }, [combat.isActive]);

  const chooseOption = async (choiceNodeId: string) => {
    const choice = story.graphData.nodes.find(node => node.id === choiceNodeId);
    if (!choice || choice.type !== 'choice') return;

    // If this is a combat choice, initiate combat before proceeding
    if (choice.choiceType === 'combat' && choice.combatData) {
      await combat.initiateCombat(choice.combatData);
    }

    // Always proceed with the story choice
    return story.chooseOption(choiceNodeId, character.characterSheet);
  };

  return {
    // Game state
    gameMode,
    
    // Story state and functions
    graphData: story.graphData,
    currentStoryNode: story.currentStoryNode,
    isLoading: story.isLoading,
    error: story.error,
    loadStoryNode: story.loadStoryNode,
    chooseOption,
    resetError: story.resetError,
    restartGame: () => {
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

    // Dice state and functions
    currentRollResult: dice.currentRollResult,
    showDiceAnimation: dice.showDiceAnimation,
    performDiceRoll: dice.performDiceRoll
  };
};
