import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Entity, CombatAction } from '../types';
import './CombatDisplay.css';

export const CombatDisplay: React.FC = () => {
  const {
    isCombatActive,
    combatState,
    currentCombatEntity,
    combatLog,
    executeAction,
    nextTurn,
    endCombat,
  } = useGame();
  
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | null>(null);
  const [turnMessage, setTurnMessage] = useState<string>('');
  
  // Function to handle enemy AI turns
  const handleEnemyTurn = () => {
    if (!currentCombatEntity || currentCombatEntity.type === 'player') return;
    
    // Find player as target
    const playerTarget = combatState?.participants.find(p => p.type === 'player');
    if (!playerTarget) return;
    
    // Execute enemy action against player
    executeAction({
      actor: currentCombatEntity,
      type: 'attack',
      target: playerTarget,
      description: `${currentCombatEntity.id} attacks ${playerTarget.id}`,
    }).then(() => {
      nextTurn();
    }).catch(error => {
      console.error('Failed to execute enemy action:', error);
    });
  };
  
  // Effect to handle turn messages and AI turns
  useEffect(() => {
    if (!isCombatActive || !currentCombatEntity) return;
    
    if (currentCombatEntity.type === 'player') {
      setTurnMessage('Your turn! Choose an action to perform.');
    } else {
      setTurnMessage(`${currentCombatEntity.id}'s turn...`);
      
      // Simulate enemy AI turn after a short delay
      const timer = setTimeout(() => {
        if (currentCombatEntity.type !== 'player') {
          handleEnemyTurn();
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [currentCombatEntity, isCombatActive, executeAction, nextTurn]);
  
  // Check for combat end conditions
  useEffect(() => {
    if (!isCombatActive || !combatState) return;
    
    // Check if all enemies are defeated
    const enemies = combatState.participants.filter(p => p.type === 'enemy');
    const allEnemiesDefeated = enemies.every(enemy => {
      const hpMatch = enemy.sheet.match(/HP: (\d+)\/(\d+)/);
      return hpMatch && parseInt(hpMatch[1]) <= 0;
    });
    
    // Check if player is defeated
    const player = combatState.participants.find(p => p.type === 'player');
    const playerHpMatch = player?.sheet.match(/HP: (\d+)\/(\d+)/);
    const playerDefeated = playerHpMatch && parseInt(playerHpMatch[1]) <= 0;
    
    if (allEnemiesDefeated) {
      setCombatResult('victory');
    } else if (playerDefeated) {
      setCombatResult('defeat');
    }
  }, [combatState, isCombatActive, combatLog]);

  if (!isCombatActive || !combatState) return null;

  const isPlayerTurn = currentCombatEntity?.type === 'player';

  const getAvailableActions = (entity: Entity) => {
    // Parse actions from entity sheet
    const actionMatches = entity.sheet.match(/## (Actions|Attacks)\n([\s\S]*?)(?=\n\n|$)/);
    if (!actionMatches) return [];

    const actionSection = actionMatches[2];
    return actionSection
      .split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => {
        const [name, ...details] = line.substring(2).split(':');
        return {
          name: name.trim(),
          details: details.join(':').trim(),
        };
      });
  };

  const handleAction = async (type: CombatAction['type'], target: Entity) => {
    try {
      await executeAction({
        actor: currentCombatEntity!,
        type,
        target,
        description: `${currentCombatEntity!.id} used ${type} on ${target.id}`,
      });
      nextTurn();
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const renderInitiativeOrder = () => (
    <div className="initiative-order">
      <h3>Initiative Order</h3>
      <div className="initiative-list">
        {combatState.initiative.map(({ entity, score }) => (
          <div
            key={entity.id}
            className={`initiative-item ${entity.id === currentCombatEntity?.id ? 'active' : ''}`}
          >
            <span className="initiative-score">{score}</span>
            <span className="initiative-name">
              {entity.type === 'player' ? 'You' : entity.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCombatLog = () => (
    <div className="combat-log">
      <h3>Combat Log</h3>
      <div className="log-entries">
        {combatLog.map((action, index) => (
          <div key={index} className="log-entry">
            {`${action.actor.id} ${action.type} ${action.target.id} for ${action.roll.total} damage`}
          </div>
        ))}
      </div>
    </div>
  );

  const renderActionButtons = () => {
    if (!isPlayerTurn) return null;

    const availableActions = getAvailableActions(currentCombatEntity!);
    const targets = combatState.participants.filter(p => p.id !== currentCombatEntity!.id);

    return (
      <div className="action-panel">
        <h3>Your Turn</h3>
        <div className="action-list">
          {availableActions.map(action => (
            <div key={action.name} className="action-group">
              <h4>{action.name}</h4>
              <div className="target-buttons">
                {targets.map(target => (
                  <button
                    key={target.id}
                    onClick={() => handleAction('attack', target)}
                    className="target-button"
                  >
                    Target {target.id}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to extract HP from entity sheet
  const getEntityHP = (entity: Entity) => {
    const hpMatch = entity.sheet.match(/HP: (\d+)\/(\d+)/);
    if (hpMatch) {
      return {
        current: parseInt(hpMatch[1]),
        max: parseInt(hpMatch[2]),
      };
    }
    return { current: 0, max: 0 };
  };

  // Render entity health bars
  const renderEntityStatus = () => (
    <div className="entity-status-container">
      <h3>Combatants</h3>
      <div className="entity-list">
        {combatState.participants.map(entity => {
          const hp = getEntityHP(entity);
          const hpPercentage = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));
          const isCurrentTurn = entity.id === currentCombatEntity?.id;
          
          return (
            <div 
              key={entity.id} 
              className={`entity-status ${isCurrentTurn ? 'current-turn' : ''} ${entity.type === 'player' ? 'player' : 'enemy'}`}
            >
              <div className="entity-name">
                {entity.type === 'player' ? 'You' : entity.id}
                {isCurrentTurn && <span className="turn-indicator">▶</span>}
              </div>
              <div className="hp-bar-container">
                <div className="hp-bar" style={{ width: `${hpPercentage}%` }}></div>
                <div className="hp-text">{hp.current} / {hp.max} HP</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render combat result when combat ends
  const renderCombatResult = () => {
    if (!combatResult) return null;
    
    return (
      <div className={`combat-result ${combatResult}`}>
        <h2>{combatResult === 'victory' ? 'Victory!' : 'Defeat!'}</h2>
        <p>
          {combatResult === 'victory' 
            ? 'You have defeated all enemies!' 
            : 'You have been defeated!'}
        </p>
        <button onClick={endCombat} className="end-combat-button">
          {combatResult === 'victory' ? 'Continue Adventure' : 'Try Again'}
        </button>
      </div>
    );
  };

  return (
    <div className="combat-display">
      <div className="combat-header">
        <h2>Combat Mode</h2>
        <button onClick={endCombat} className="end-combat-button">
          End Combat
        </button>
      </div>
      
      {combatResult ? (
        renderCombatResult()
      ) : (
        <>
          <div className="turn-message">{turnMessage}</div>
          {renderEntityStatus()}
          {renderInitiativeOrder()}
          {renderActionButtons()}
          {renderCombatLog()}
        </>
      )}
    </div>
  );
};
