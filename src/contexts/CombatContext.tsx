import React, { createContext, useContext, useState, useCallback } from 'react';
import { CombatSystem } from '../services/combatSystem';
import { Entity, CombatState, CombatAction } from '../types';
import { generateEnemyGroup } from '../services/entityGenerator';
import { generateCharacterUpdates } from '../services/characterUpdateService';
import { useCharacter } from './CharacterContext';

interface CombatContextState {
  isActive: boolean;
  combatState?: CombatState;
  currentEntity?: Entity;
  combatLog: CombatAction[];
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
}

const CombatContext = createContext<CombatContextValue | undefined>(undefined);

export const CombatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<CombatContextState>({
    isActive: false,
    combatLog: [],
  });

  const { characterSheet, updateCharacterSheet } = useCharacter();
  const [combatSystem, setCombatSystem] = useState<CombatSystem | null>(null);

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
        setState({
          isActive: true,
          combatState: system.getCombatState(),
          currentEntity: system.getCurrentTurn().entity,
          combatLog: [],
        });
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
        const completedAction = await combatSystem.executeAction(action);

        // Update combat log
        setState(prev => ({
          ...prev,
          combatLog: [...prev.combatLog, completedAction],
        }));

        // Generate and apply character updates based on the action
        const updates = await generateCharacterUpdates(
          action.target,
          [`Received ${completedAction.roll.total} damage from ${action.actor.id}'s ${action.type}`],
          'In combat'
        );

        if (action.target.type === 'player') {
          updateCharacterSheet(updates);
        } else {
          // Update enemy/NPC sheet
          const updatedTarget = updates.reduce((entity, update) => ({
            ...entity,
            sheet: entity.sheet.replace(update.oldText, update.newText),
          }), action.target);

          // Update the combat system's state with the modified entity
          const currentState = combatSystem.getCombatState();
          const updatedParticipants = currentState.participants.map(p =>
            p.id === updatedTarget.id ? updatedTarget : p
          );

          setState(prev => ({
            ...prev,
            combatState: {
              ...currentState,
              participants: updatedParticipants,
            },
          }));
        }

        // Check if combat should end
        if (combatSystem.checkCombatEnd()) {
          setState(prev => ({
            ...prev,
            isActive: false,
          }));
        }
      } catch (error) {
        console.error('Failed to execute combat action:', error);
        throw error;
      }
    },
    [combatSystem, state.isActive, updateCharacterSheet]
  );

  const nextTurn = useCallback(() => {
    if (!combatSystem || !state.isActive) {
      throw new Error('No active combat');
    }

    combatSystem.nextTurn();
    const { entity } = combatSystem.getCurrentTurn();

    setState(prev => ({
      ...prev,
      currentEntity: entity,
      combatState: combatSystem.getCombatState(),
    }));
  }, [combatSystem, state.isActive]);

  const endCombat = useCallback(() => {
    if (combatSystem) {
      combatSystem.endCombat();
      setState({
        isActive: false,
        combatLog: [],
      });
      setCombatSystem(null);
    }
  }, [combatSystem]);

  const value = {
    ...state,
    initiateCombat,
    executeAction,
    endCombat,
    nextTurn,
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
