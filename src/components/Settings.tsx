import React, { useState, useEffect } from 'react';

import type { ImageSettings, DisplaySettings } from '../types';
import {
  getImageSettings,
  setImageSettings,
  getDisplaySettings,
  setDisplaySettings,
} from '../services/gameStorageService';

import ApiKeySettings from './ApiKeySettings';
import ImageModelSelector from './ImageModelSelector';
import ModelSelector from './ModelSelector';
import TTSSettings from './TTSSettings';
import './Settings.css';

const Settings: React.FC = () => {
  const [imageSettings, setLocalImageSettings] = useState<ImageSettings>(() =>
    getImageSettings()
  );
  const [displaySettings, setLocalDisplaySettings] = useState<DisplaySettings>(
    () => getDisplaySettings()
  );

  // Persist image settings changes
  useEffect(() => {
    setImageSettings(imageSettings);
  }, [imageSettings]);

  // Persist display settings changes
  useEffect(() => {
    setDisplaySettings(displaySettings);
  }, [displaySettings]);

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
        <h2>Image Generation</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Configure automatic image generation for your adventures.
        </p>
        <div className="settings-toggles">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={imageSettings.generateStoryImages}
              onChange={(e) =>
                setLocalImageSettings({
                  ...imageSettings,
                  generateStoryImages: e.target.checked,
                })
              }
            />
            <span className="toggle-label">Generate images for story scenes</span>
            <span className="toggle-description">
              Automatically create atmospheric images for each story beat
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={imageSettings.generateChoiceImages}
              onChange={(e) =>
                setLocalImageSettings({
                  ...imageSettings,
                  generateChoiceImages: e.target.checked,
                })
              }
            />
            <span className="toggle-label">Generate preview images for choices</span>
            <span className="toggle-description">
              Show thumbnail previews for each choice option (increases API costs)
            </span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Image Generation Model</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Select the AI model for generating scene images.
        </p>
        <ImageModelSelector />
      </div>

      <div className="settings-section">
        <h2>Display Settings</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Configure what information is shown during gameplay.
        </p>
        <div className="settings-toggles">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={displaySettings.showCostTracking}
              onChange={(e) =>
                setLocalDisplaySettings({
                  ...displaySettings,
                  showCostTracking: e.target.checked,
                })
              }
            />
            <span className="toggle-label">Show session cost tracking</span>
            <span className="toggle-description">
              Display running totals of API costs in the header
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={displaySettings.showLlmCallInfo}
              onChange={(e) =>
                setLocalDisplaySettings({
                  ...displaySettings,
                  showLlmCallInfo: e.target.checked,
                })
              }
            />
            <span className="toggle-label">Show LLM call info on messages</span>
            <span className="toggle-description">
              Display model, tokens, and cost details for each AI response
            </span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Text-to-Speech</h2>
        <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '10px' }}>
          Configure voice settings for reading story content aloud.
        </p>
        <TTSSettings />
      </div>
    </div>
  );
};

export default Settings;
