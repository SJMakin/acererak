import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CombatSystem } from '../services/combatSystem';
import { Entity, CombatState, CombatAction } from '../types';
import { generateEnemyGroup } from '../services/entityGenerator';
import { generateCharacterUpdates } from '../services/characterUpdateService';
import { processCombatRound, CombatRoundResult } from '../services/combatNarrationService';
import { useCharacter } from './CharacterContext';

interface CombatContextState {
  isActive: boolean;
  combatState?: CombatState;
  currentEntity?: Entity;
  combatLog: CombatAction[];
  roundActions: CombatAction[];
  currentRound: number;
  narrativeDescription: string;
  processingRound: boolean;
  pendingUpdates: Array<{
    entityId: string;
    oldText: string;
    newText: string;
    description: string;
  }>;
}

interface CombatContextValue extends CombatContextState {
  initiateCombat: (params: {
    enemies: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    environment?: string;
    context?: string;
  }) => Promise<void>;
  executeAction: (action: Omit<CombatAction, 'roll'>) => Promise<void>;
  endCombat: () => void;
  nextTurn: () => void;
  processRound: () => Promise<void>;
  applyUpdate: (entityId: string, updateIndex: number) => void;
  skipUpdate: (entityId: string, updateIndex: number) => void;
}

const CombatContext = createContext<CombatContextValue | undefined>(undefined);

export const CombatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<CombatContextState>({
    isActive: false,
    combatLog: [],
    roundActions: [],
    currentRound: 1,
    narrativeDescription: '',
    processingRound: false,
    pendingUpdates: [],
  });

  const { characterSheet, updateCharacterSheet } = useCharacter();
  const [combatSystem, setCombatSystem] = useState<CombatSystem | null>(null);
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | null>(null);

  const initiateCombat = useCallback(
    async (params: {
      enemies: string[];
      difficulty: 'easy' | 'medium' | 'hard';
      environment?: string;
      context?: string;
    }) => {
      try {
        // Generate enemy entities
        const enemies = await generateEnemyGroup(params);

        // Create player entity from character sheet
        const player: Entity = {
          id: 'player',
          type: 'player',
          sheet: characterSheet,
        };

        // Initialize combat system with all participants
        const system = new CombatSystem([player, ...enemies]);
        await system.initiateCombat();

        setCombatSystem(system);
        setState(prev => ({
          ...prev,
          isActive: true,
          combatState: system.getCombatState(),
          currentEntity: system.getCurrentTurn().entity,
          combatLog: [],
          roundActions: [],
          currentRound: 1,
          narrativeDescription: '',
          processingRound: false,
          pendingUpdates: [],
        }));
      } catch (error) {
        console.error('Failed to initiate combat:', error);
        throw error;
      }
    },
    [characterSheet]
  );

  const executeAction = useCallback(
    async (action: Omit<CombatAction, 'roll'>) => {
      if (!combatSystem || !state.isActive) {
        throw new Error('No active combat');
      }

      try {
        // Execute the action in the combat system to get dice rolls
        const completedAction = await combatSystem.executeAction(action);

        // Add the action to the round actions instead of processing immediately
        setState(prev => ({
          ...prev,
          roundActions: [...prev.roundActions, completedAction],
          combatLog: [...prev.combatLog, completedAction],
        }));

        // We'll process all actions at the end of the round
        return;
      } catch (error) {
        console.error('Failed to execute combat action:', error);
        throw error;
      }
    },
    [combatSystem, state.isActive]
  );

  // Process all actions for the current round using AI
  const processRound = useCallback(async () => {
    if (!combatSystem || !state.isActive || state.roundActions.length === 0) {
      return;
    }

    try {
      setState(prev => ({ ...prev, processingRound: true }));

      // Get the current state of all entities
      const currentState = combatSystem.getCombatState();
      
      // Process the round with AI
      const roundResult = await processCombatRound(
        currentState.participants,
        state.roundActions,
        state.currentRound
      );

      // Update the narrative description
      setState(prev => ({
        ...prev,
        narrativeDescription: roundResult.narrative.detailedDescription,
      }));

      // Prepare entity updates for display and confirmation
      const allUpdates = roundResult.entityUpdates.flatMap(entityUpdate => 
        entityUpdate.updates.map(update => ({
          entityId: entityUpdate.entityId,
          oldText: update.oldText,
          newText: update.newText,
          description: update.description,
        }))
      );

      // Set the pending updates
      setState(prev => ({
        ...prev,
        pendingUpdates: allUpdates,
      }));

      // Check if combat should end
      if (roundResult.combatStatus.combatComplete) {
        // Set the combat result
        setCombatResult(roundResult.combatStatus.victor === 'player' ? 'victory' : 'defeat');
        
        // We'll let the user view the results before ending combat
      }

      // Prepare for the next round
      setState(prev => ({
        ...prev,
        processingRound: false,
        currentRound: prev.currentRound + 1,
        roundActions: [], // Clear round actions for the next round
      }));
    } catch (error) {
      console.error('Failed to process combat round:', error);
      setState(prev => ({ 
        ...prev, 
        processingRound: false,
        narrativeDescription: 'The battle continues with both sides exchanging blows...'
      }));
    }
  }, [combatSystem, state.isActive, state.roundActions, state.currentRound]);

  // Apply a specific update to an entity
  const applyUpdate = useCallback((entityId: string, updateIndex: number) => {
    const update = state.pendingUpdates.find((u, i) => u.entityId === entityId && i === updateIndex);
    if (!update || !combatSystem) return;

    // Find the entity to update
    const currentState = combatSystem.getCombatState();
    const entity = currentState.participants.find((p: Entity) => p.id === entityId);
    if (!entity) return;

    // Apply the update
    const updatedEntity = {
      ...entity,
      sheet: entity.sheet.replace(update.oldText, update.newText),
    };

    // Update the combat system's state
    const updatedParticipants = currentState.participants.map((p: Entity) =>
      p.id === entityId ? updatedEntity : p
    );

    // If it's the player, also update the character sheet
    if (entity.type === 'player') {
      // Type cast to match the expected interface
      updateCharacterSheet([{
        oldText: update.oldText,
        newText: update.newText,
        description: update.description,
      } as any]);
    }

    // Update the state
    setState(prev => ({
      ...prev,
      combatState: {
        ...currentState,
        participants: updatedParticipants,
      },
      pendingUpdates: prev.pendingUpdates.filter((u, i) => !(u.entityId === entityId && i === updateIndex)),
    }));
  }, [state.pendingUpdates, combatSystem, updateCharacterSheet]);

  // Skip a specific update
  const skipUpdate = useCallback((entityId: string, updateIndex: number) => {
    setState(prev => ({
      ...prev,
      pendingUpdates: prev.pendingUpdates.filter((u, i) => !(u.entityId === entityId && i === updateIndex)),
    }));
  }, []);

  const nextTurn = useCallback(() => {
    if (!combatSystem || !state.isActive) {
      throw new Error('No active combat');
    }

    // Get the current state
    const currentState = combatSystem.getCombatState();
    
    // Check if we've gone through all entities in this round
    const isLastEntityInRound = currentState.currentTurn === currentState.participants.length - 1;
    
    if (isLastEntityInRound) {
      // Process the round before moving to the next one
      processRound();
    }
    
    // Advance to the next turn
    combatSystem.nextTurn();
    const { entity } = combatSystem.getCurrentTurn();

    setState(prev => ({
      ...prev,
      currentEntity: entity,
      combatState: combatSystem.getCombatState(),
    }));
  }, [combatSystem, state.isActive, processRound]);

  const endCombat = useCallback(() => {
    if (combatSystem) {
      // Check if all enemies are defeated
      const allEnemiesDefeated = combatSystem.checkCombatEnd();
      setCombatResult(allEnemiesDefeated ? 'victory' : 'defeat');
      
      combatSystem.endCombat();
      setState(prev => ({
        ...prev,
        isActive: false,
        combatLog: [],
        roundActions: [],
        currentRound: 1,
        narrativeDescription: '',
        processingRound: false,
        pendingUpdates: [],
      }));
      setCombatSystem(null);
    }
  }, [combatSystem]);

  // When combat ends, we'll set a flag in localStorage that GameContext can check
  useEffect(() => {
    if (!state.isActive && combatResult) {
      // Store the combat result in localStorage
      localStorage.setItem('combatResult', combatResult);
      
      // Reset the combat result
      setTimeout(() => {
        setCombatResult(null);
      }, 500);
    }
  }, [state.isActive, combatResult]);

  const value = {
    ...state,
    initiateCombat,
    executeAction,
    endCombat,
    nextTurn,
    processRound,
    applyUpdate,
    skipUpdate,
  };

  return (
    <CombatContext.Provider value={value}>{children}</CombatContext.Provider>
  );
};

export const useCombat = () => {
  const context = useContext(CombatContext);
  if (context === undefined) {
    throw new Error('useCombat must be used within a CombatProvider');
  }
  return context;
};
