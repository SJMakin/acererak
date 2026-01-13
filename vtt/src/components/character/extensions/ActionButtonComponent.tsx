import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import { executeDiceRoll, resolveVariables } from '../../../services/diceParser';
import { useGameStore } from '../../../stores/gameStore';
import type { ShadowState } from '../../../services/shadowStateService';
import type { ChatMessage } from '../../../types';
import './ActionButton.css';

interface ActionButtonComponentProps {
  node: {
    attrs: {
      label: string;
      action: string;
      cost?: string;
    };
  };
  updateAttributes: (attrs: { label?: string; action?: string; cost?: string }) => void;
  selected: boolean;
  extension: {
    name: string;
  };
  // Shadow state passed from the editor for variable resolution
  shadowState?: ShadowState;
  // Callback to handle stat updates (for cost deduction)
  onUpdateStat?: (key: string, newValue: string | number) => void;
  // Callback for broadcasting rolls to P2P
  onBroadcastRoll?: (message: ChatMessage) => void;
}

export function ActionButtonComponent({
  node,
  updateAttributes,
  selected,
  shadowState,
  onUpdateStat,
  onBroadcastRoll,
}: ActionButtonComponentProps) {
  const { label, action, cost } = node.attrs;
  const [isRolling, setIsRolling] = useState(false);
  
  const { game, myPeerId, addChatMessage } = useGameStore();
  const myPlayer = myPeerId && game?.players[myPeerId];

  const handleClick = useCallback(async () => {
    if (isRolling || !myPlayer || !myPeerId) return;
    
    setIsRolling(true);

    try {
      // Resolve variables in the action formula
      const resolvedFormula = resolveVariables(action, shadowState?.stats || {});
      
      // Execute the dice roll
      const rollResult = executeDiceRoll(resolvedFormula);
      
      // Create a roll-type chat message
      const rollMessage: ChatMessage = {
        id: nanoid(10),
        playerId: myPeerId,
        playerName: myPlayer.name,
        playerColor: myPlayer.color,
        timestamp: Date.now(),
        type: 'roll',
        content: '',
        isGMOnly: false,
        formula: rollResult.formula,
        result: rollResult.result,
        breakdown: rollResult.breakdown,
      };

      // Add to local store (this will show in chat)
      addChatMessage(rollMessage);
      
      // Broadcast to other players via P2P
      if (onBroadcastRoll) {
        onBroadcastRoll(rollMessage);
      }

      // Handle cost deduction if specified
      if (cost && shadowState) {
        const currentValue = shadowState.stats[cost];
        if (typeof currentValue === 'number' || typeof currentValue === 'string') {
          const numericValue = typeof currentValue === 'string' ? parseFloat(currentValue) : currentValue;
          if (!isNaN(numericValue) && numericValue > 0) {
            const newValue = Math.max(0, numericValue - 1);
            if (onUpdateStat) {
              onUpdateStat(cost, newValue);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to execute action button:', error);
    } finally {
      setTimeout(() => setIsRolling(false), 500);
    }
  }, [action, cost, shadowState, isRolling, myPlayer, myPeerId, addChatMessage, onBroadcastRoll, onUpdateStat]);

  if (selected) {
    return (
      <NodeViewWrapper className="action-button action-button--editing">
        <span className="action-button__bracket">[</span>
        <input
          type="text"
          className="action-button__input"
          value={label}
          onChange={(e) => updateAttributes({ label: e.target.value })}
          placeholder="Label"
        />
        <span className="action-button__separator">](</span>
        <input
          type="text"
          className="action-button__input"
          value={action}
          onChange={(e) => updateAttributes({ action: e.target.value })}
          placeholder="action: dice formula"
        />
        {cost && (
          <>
            <span className="action-button__separator">; cost: </span>
            <input
              type="text"
              className="action-button__input action-button__input--small"
              value={cost}
              onChange={(e) => updateAttributes({ cost: e.target.value })}
              placeholder="Stat"
            />
          </>
        )}
        <span className="action-button__bracket">)</span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="action-button">
      <button
        className={`action-button__btn ${isRolling ? 'action-button__btn--rolling' : ''}`}
        onClick={handleClick}
        disabled={isRolling}
        type="button"
      >
        {isRolling ? '🎲' : ''}
        {label}
        {cost && <span className="action-button__cost"> ({cost})</span>}
      </button>
    </NodeViewWrapper>
  );
}
