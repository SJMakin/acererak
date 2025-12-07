/**
 * LlmCallBadge - Shows LLM call cost info, expandable for details
 */

import React, { useState } from 'react';

import type { LlmCallInfo } from '../../types';

import './LlmCallBadge.css';

interface LlmCallBadgeProps {
  llmCall: LlmCallInfo;
}

const LlmCallBadge: React.FC<LlmCallBadgeProps> = ({ llmCall }) => {
  const [expanded, setExpanded] = useState(false);

  const formatCost = (cost: number): string => {
    if (cost < 0.001) return '<$0.001';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(3)}`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getModelShortName = (model: string): string => {
    const parts = model.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className={`llm-call-badge ${expanded ? 'expanded' : ''}`}>
      <button
        className="llm-badge-toggle"
        onClick={() => setExpanded(!expanded)}
        title="Click for LLM call details"
      >
        <span className="llm-badge-icon">🤖</span>
        <span className="llm-badge-cost">{formatCost(llmCall.estimatedCost)}</span>
      </button>

      {expanded && (
        <div className="llm-badge-details">
          <div className="llm-badge-row">
            <span className="llm-badge-label">Model:</span>
            <span className="llm-badge-value">{getModelShortName(llmCall.model)}</span>
          </div>
          <div className="llm-badge-row">
            <span className="llm-badge-label">Tokens:</span>
            <span className="llm-badge-value">
              {formatTokens(llmCall.promptTokens)} → {formatTokens(llmCall.completionTokens)} ({formatTokens(llmCall.totalTokens)} total)
            </span>
          </div>
          <div className="llm-badge-row">
            <span className="llm-badge-label">Cost:</span>
            <span className="llm-badge-value">~{formatCost(llmCall.estimatedCost)}</span>
          </div>
          <div className="llm-badge-row">
            <span className="llm-badge-label">Duration:</span>
            <span className="llm-badge-value">{formatDuration(llmCall.duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LlmCallBadge;