/**
 * DiceCard - Displays dice roll results
 */

import React from 'react';

import type { DiceMessage } from '../../../types';

import './cards.css';

interface DiceCardProps {
  message: DiceMessage;
}

const DiceCard: React.FC<DiceCardProps> = ({ message }) => {
  const { rolls, animationComplete, description } = message;

  return (
    <div className="chat-card dice-card">
      <div className="chat-card-header">
        <div className="chat-card-title">
          <span className="chat-card-title-icon">🎲</span>
          <span>Dice Roll</span>
        </div>
      </div>

      {description && <div className="dice-description">{description}</div>}

      {!animationComplete && (
        <div className="dice-animation-container">
          <div className="image-loading">
            <div className="loading-spinner" />
            <span style={{ marginLeft: '8px' }}>Rolling...</span>
          </div>
        </div>
      )}

      {animationComplete && rolls.length > 0 && (
        <div className="dice-results">
          {rolls.map((roll, index) => (
            <div
              key={index}
              className={`dice-result ${roll.success !== undefined ? (roll.success ? 'success' : 'failure') : ''}`}
            >
              <span className="dice-result-text">
                {roll.formatted}
              </span>
              {roll.success !== undefined && (
                <span className="dice-result-icon">
                  {roll.success ? '✓' : '✗'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiceCard;