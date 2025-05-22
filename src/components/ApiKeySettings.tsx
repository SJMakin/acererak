import React, { useState } from 'react';
import { useApiKey } from '../contexts/ApiKeyContext';
import './ApiKeySettings.css';

const ApiKeySettings: React.FC = () => {
  const { apiKey, setApiKey, hasKey } = useApiKey();
  const [inputValue, setInputValue] = useState(apiKey);
  const [isVisible, setIsVisible] = useState(false);

  const handleSave = () => {
    setApiKey(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    setApiKey('');
  };

  return (
    <div className="api-key-settings">
      <h3>OpenRouter API Key</h3>
      {!hasKey && (
        <div className="api-key-warning">
          <p>⚠️ API key required to use AI features</p>
        </div>
      )}
      <div className="api-key-input">
        <input
          type={isVisible ? 'text' : 'password'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter your OpenRouter API key"
        />
        <button
          type="button"
          className="visibility-toggle"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? '🔒' : '👁️'}
        </button>
      </div>
      <div className="api-key-actions">
        <button onClick={handleSave} disabled={inputValue === apiKey}>
          Save
        </button>
        <button onClick={handleClear} disabled={!apiKey}>
          Clear
        </button>
      </div>
      <div className="api-key-info">
        <p>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
            Get an OpenRouter API key
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeySettings;