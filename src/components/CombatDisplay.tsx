import React from 'react';
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

  return (
    <div className="combat-display">
      <div className="combat-header">
        <h2>Combat Mode</h2>
        <button onClick={endCombat} className="end-combat-button">
          End Combat
        </button>
      </div>
      {renderInitiativeOrder()}
      {renderActionButtons()}
      {renderCombatLog()}
    </div>
  );
};
