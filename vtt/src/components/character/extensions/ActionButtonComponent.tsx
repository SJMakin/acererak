import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { executeDiceRoll, resolveVariables } from '../../../services/diceParser';
import { useGameStore } from '../../../stores/gameStore';
import type { ChatMessage } from '../../../types';
import { useShadowState } from './ShadowStateContext';
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
  // Callback for broadcasting rolls to P2P
  onBroadcastRoll?: (message: ChatMessage) => void;
}

export function ActionButtonComponent({
  node,
  updateAttributes,
  onBroadcastRoll,
}: ActionButtonComponentProps) {
  const { shadowState, onUpdateStat } = useShadowState();
  const { label, action, cost } = node.attrs;
  const [isRolling, setIsRolling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editAction, setEditAction] = useState(action);
  const [editCost, setEditCost] = useState(cost || '');

  const { game, myPeerId, addChatMessage } = useGameStore();
  const myPlayer = myPeerId && game?.players[myPeerId];

  // Sync edit fields when attrs change externally
  useEffect(() => {
    setEditLabel(label);
    setEditAction(action);
    setEditCost(cost || '');
  }, [label, action, cost]);

  const handleClick = useCallback(async () => {
    if (isRolling || isEditing || !myPlayer || !myPeerId) return;

    setIsRolling(true);

    try {
      // Resolve variables in the action formula
      const resolvedFormula = resolveVariables(action, shadowState?.stats || {});

      // Execute the dice roll
      const rollResult = executeDiceRoll(resolvedFormula);

      // Create a roll-type chat message
      const rollMessage: ChatMessage = {
        id: `${myPeerId}:${nanoid(10)}`,
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
  }, [action, cost, shadowState, isRolling, isEditing, myPlayer, myPeerId, addChatMessage, onBroadcastRoll, onUpdateStat]);

  const handleEdit = useCallback(() => {
    if (!isEditing) {
      setEditLabel(label);
      setEditAction(action);
      setEditCost(cost || '');
      setIsEditing(true);
    }
  }, [isEditing, label, action, cost]);

  const handleSave = useCallback(() => {
    updateAttributes({
      label: editLabel,
      action: editAction,
      cost: editCost || undefined,
    });
    setIsEditing(false);
  }, [editLabel, editAction, editCost, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditLabel(label);
    setEditAction(action);
    setEditCost(cost || '');
    setIsEditing(false);
  }, [label, action, cost]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (isEditing) {
    return (
      <NodeViewWrapper className="action-button action-button--editing">
        <span className="action-button__bracket">[</span>
        <input
          type="text"
          className="action-button__input"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Label"
          autoFocus
        />
        <span className="action-button__separator">](</span>
        <input
          type="text"
          className="action-button__input"
          value={editAction}
          onChange={(e) => setEditAction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="action: dice formula"
        />
        <span className="action-button__separator">; cost: </span>
        <input
          type="text"
          className="action-button__input action-button__input--small"
          value={editCost}
          onChange={(e) => setEditCost(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stat (optional)"
        />
        <span className="action-button__bracket">)</span>
        <button type="button" className="action-button__save-btn" onClick={handleSave}>
          ✓
        </button>
        <button type="button" className="action-button__cancel-btn" onClick={handleCancel}>
          ✕
        </button>
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
      <button
        type="button"
        className="action-button__edit-trigger"
        onClick={handleEdit}
        title="Edit action"
      />
    </NodeViewWrapper>
  );
}
