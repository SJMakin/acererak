import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Entity, CombatAction } from '../types';
import { getEntityName, getEntityActions } from '../services/combatSystem';
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
    narrativeDescription,
    processingRound,
    pendingUpdates,
    applyUpdate,
    skipUpdate,
  } = useGame();
  
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | null>(null);
  const [turnMessage, setTurnMessage] = useState<string>('');
  const [showNarrative, setShowNarrative] = useState<boolean>(false);
  
  // Function to handle enemy AI turns
  const handleEnemyTurn = () => {
    if (!currentCombatEntity || currentCombatEntity.type === 'player') return;
    
    // Find player as target
    const playerTarget = combatState?.participants.find(p => p.type === 'player');
    if (!playerTarget) return;
    
    // Get enemy actions
    const enemyActions = getEntityActions(currentCombatEntity);
    
    // Choose an action - if none available, use default attack
    let chosenAction: {name: string, details: string, type: CombatAction['type']} = { 
      name: 'attack', 
      details: 'Basic attack', 
      type: 'attack' 
    };
    
    if (enemyActions.length > 0) {
      // Simple AI: randomly choose an action
      chosenAction = enemyActions[Math.floor(Math.random() * enemyActions.length)];
    }
    
    const enemyName = getEntityName(currentCombatEntity);
    const playerName = getEntityName(playerTarget);
    
    // Execute enemy action against player
    executeAction({
      actor: currentCombatEntity,
      type: chosenAction.type,
      target: playerTarget,
      description: `${enemyName} uses ${chosenAction.name} on ${playerName}`,
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
      const entityName = getEntityName(currentCombatEntity);
      setTurnMessage(`${entityName}'s turn...`);
      
      // Simulate enemy AI turn after a short delay
      const timer = setTimeout(() => {
        if (currentCombatEntity.type !== 'player') {
          handleEnemyTurn();
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [currentCombatEntity, isCombatActive, executeAction, nextTurn]);
  
  // Effect to show narrative when it changes
  useEffect(() => {
    if (narrativeDescription && narrativeDescription.length > 0) {
      setShowNarrative(true);
    }
  }, [narrativeDescription]);
  
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
    // Use the helper function from combatSystem.ts
    return getEntityActions(entity);
  };

  const handleAction = async (action: {name: string, type: CombatAction['type']}, target: Entity) => {
    try {
      const actorName = getEntityName(currentCombatEntity!);
      const targetName = getEntityName(target);
      
      await executeAction({
        actor: currentCombatEntity!,
        type: action.type,
        target,
        description: `${actorName} uses ${action.name} on ${targetName}`,
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
              {entity.type === 'player' ? 'You' : getEntityName(entity)}
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
            {action.description} for {action.roll.total} damage
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
          {availableActions.length > 0 ? (
            availableActions.map(action => (
              <div key={action.name} className="action-group">
                <h4>{action.name}</h4>
                <p className="action-details">{action.details}</p>
                <div className="target-buttons">
                  {targets.map(target => (
                    <button
                      key={target.id}
                      onClick={() => handleAction(action, target)}
                      className="target-button"
                    >
                      Target {getEntityName(target)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="action-group">
              <h4>Basic Attack</h4>
              <div className="target-buttons">
                {targets.map(target => (
                  <button
                    key={target.id}
                    onClick={() => handleAction({ name: 'Basic Attack', type: 'attack' }, target)}
                    className="target-button"
                  >
                    Target {getEntityName(target)}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          const entityName = getEntityName(entity);
          
          return (
            <div 
              key={entity.id} 
              className={`entity-status ${isCurrentTurn ? 'current-turn' : ''} ${entity.type === 'player' ? 'player' : 'enemy'}`}
            >
              <div className="entity-name">
                {entity.type === 'player' ? 'You' : entityName}
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

  // Render narrative description
  const renderNarrative = () => {
    if (!narrativeDescription || !showNarrative) return null;
    
    return (
      <div className="narrative-panel">
        <h3>Combat Narrative</h3>
        <div className="narrative-content">
          {narrativeDescription.split('\n').map((paragraph: string, index: number) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <button 
          className="narrative-close-button"
          onClick={() => setShowNarrative(false)}
        >
          Continue
        </button>
      </div>
    );
  };

  // Render pending updates
  const renderPendingUpdates = () => {
    if (pendingUpdates.length === 0 || showNarrative) return null;
    
    // Group updates by entity
    const updatesByEntity: Record<string, Array<{
      entityId: string;
      oldText: string;
      newText: string;
      description: string;
      index: number;
    }>> = {};
    
    pendingUpdates.forEach((update: {
      entityId: string;
      oldText: string;
      newText: string;
      description: string;
    }, index: number) => {
      if (!updatesByEntity[update.entityId]) {
        updatesByEntity[update.entityId] = [];
      }
      updatesByEntity[update.entityId].push({
        ...update,
        index
      });
    });
    
    return (
      <div className="pending-updates-panel">
        <h3>Pending Updates</h3>
        {Object.entries(updatesByEntity).map(([entityId, updates]) => {
          const entity = combatState.participants.find(p => p.id === entityId);
          if (!entity) return null;
          
          const entityName = getEntityName(entity);
          
          return (
            <div key={entityId} className="entity-updates">
              <h4>{entityName}</h4>
              {updates.map((update: {
                entityId: string;
                oldText: string;
                newText: string;
                description: string;
                index: number;
              }, i: number) => (
                <div key={i} className="update-item">
                  <div className="update-description">{update.description}</div>
                  <div className="update-diff">
                    <div className="update-old">{update.oldText}</div>
                    <div className="update-arrow">→</div>
                    <div className="update-new">{update.newText}</div>
                  </div>
                  <div className="update-actions">
                    <button 
                      className="apply-update-button"
                      onClick={() => applyUpdate(entityId, i)}
                    >
                      Apply
                    </button>
                    <button 
                      className="skip-update-button"
                      onClick={() => skipUpdate(entityId, i)}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

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

  // Render loading indicator during round processing
  const renderProcessingIndicator = () => {
    if (!processingRound) return null;
    
    return (
      <div className="processing-overlay">
        <div className="processing-content">
          <div className="processing-spinner"></div>
          <div className="processing-text">Processing combat round...</div>
        </div>
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
          {renderNarrative()}
          {renderPendingUpdates()}
          {renderProcessingIndicator()}
        </>
      )}
    </div>
  );
};
