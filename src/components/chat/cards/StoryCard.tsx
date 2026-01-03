/**
 * StoryCard - Displays story content with choices
 */

import React from 'react';

import type { StoryMessage, ChatChoice } from '../../../types';
import LlmCallBadge from '../LlmCallBadge';

import './cards.css';

interface StoryCardProps {
  message: StoryMessage;
  onSelectChoice?: (choiceId: string) => void;
  onBranch?: () => void;
  onTtsPlay?: () => void;
  showLlmInfo?: boolean;
}

const StoryCard: React.FC<StoryCardProps> = ({
  message,
  onSelectChoice,
  onBranch,
  onTtsPlay,
  showLlmInfo = true,
}) => {
  const { content, streaming, choices, llmCall, ttsEnabled } = message;

  const handleChoiceClick = (choice: ChatChoice) => {
    if (choice.disabled || !onSelectChoice) return;
    onSelectChoice(choice.id);
  };

  return (
    <div className="chat-card story-card">
      <div className="chat-card-header">
        <div className="chat-card-title">
          <span className="chat-card-title-icon">💀</span>
          <span>Story</span>
        </div>
        <div className="chat-card-header-actions">
          {showLlmInfo && llmCall && <LlmCallBadge llmCall={llmCall} />}
          {onBranch && !streaming && (
            <button className="chat-card-header-btn" onClick={onBranch} title="Branch from here">
              ↩
            </button>
          )}
        </div>
      </div>

      <div className="chat-card-content">
        {content.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {streaming && <span className="streaming-cursor" />}

      {ttsEnabled && onTtsPlay && (
        <div className="chat-card-actions">
          <button className="chat-card-action" onClick={onTtsPlay}>
            🔊 Read Aloud
          </button>
        </div>
      )}

      {choices && choices.length > 0 && !streaming && (
        <div className="choices-section">
          <div className="choices-label">What do you do?</div>
          {choices.map((choice) => (
            <button
              key={choice.id}
              className={`choice-button ${choice.selected ? 'selected' : ''}`}
              onClick={() => handleChoiceClick(choice)}
              disabled={choice.disabled}
            >
              <span className="choice-prefix">▸</span>
              {choice.text}
              {choice.requiredRolls && choice.requiredRolls.length > 0 && (
                <span className="choice-roll-info">
                  🎲 {choice.requiredRolls.map((r) => `${r.skill || 'Roll'} DC ${r.difficulty}`).join(', ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryCard;