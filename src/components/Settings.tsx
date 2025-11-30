import React from 'react';

import ApiKeySettings from './ApiKeySettings';
import ImageModelSelector from './ImageModelSelector';
import ModelSelector from './ModelSelector';
import TTSSettings from './TTSSettings';
import './Settings.css';

const Settings: React.FC = () => {
  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h2>API Configuration</h2>
        <ApiKeySettings />
      </div>

      <div className="settings-section">
        <h2>Text Generation Model</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Select the AI model for generating story content, character updates,
          and choices.
        </p>
        <ModelSelector />
      </div>

      <div className="settings-section">
        <h2>Image Generation Model</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Select the AI model for generating scene images. Images are created
          automatically for each story node.
        </p>
        <ImageModelSelector />
      </div>

      <div className="settings-section">
        <h2>Text-to-Speech</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Configure voice settings for reading story content aloud. Click the
          "Read Aloud" button in the Story tab to hear the current story
          content.
        </p>
        <TTSSettings />
      </div>
    </div>
  );
};

export default Settings;
