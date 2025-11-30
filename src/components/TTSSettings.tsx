import React from 'react';
import { useTTS } from '../contexts/TTSContext';

const TTSSettings: React.FC = () => {
  const { settings, voices, updateSettings, isSupported } = useTTS();

  if (!isSupported) {
    return (
      <div style={{ padding: '15px', backgroundColor: '#252525', borderRadius: '8px' }}>
        <p style={{ color: '#ff6b6b', margin: 0 }}>
          ⚠️ Text-to-Speech is not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Enable/Disable TTS */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => updateSettings({ enabled: e.target.checked })}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '1em', color: '#e0e0e0' }}>
            Enable Text-to-Speech
          </span>
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Voice Selection */}
          <div>
            <label htmlFor="tts-voice" style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
              Voice:
            </label>
            <select
              id="tts-voice"
              value={settings.selectedVoice || ''}
              onChange={(e) => updateSettings({ selectedVoice: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#252525',
                color: '#e0e0e0',
                border: '1px solid #444',
                borderRadius: '5px',
                fontSize: '1em',
                cursor: 'pointer',
              }}
            >
              {voices.length === 0 ? (
                <option value="">Loading voices...</option>
              ) : (
                voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))
              )}
            </select>
            <p style={{ fontSize: '0.85em', color: '#9fa8da', marginTop: '5px' }}>
              {voices.length} voice{voices.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Speech Rate */}
          <div>
            <label htmlFor="tts-rate" style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
              Speed: {settings.rate.toFixed(1)}x
            </label>
            <input
              id="tts-rate"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.rate}
              onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#9fa8da', marginTop: '5px' }}>
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>

          {/* Pitch */}
          <div>
            <label htmlFor="tts-pitch" style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
              Pitch: {settings.pitch.toFixed(1)}
            </label>
            <input
              id="tts-pitch"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.pitch}
              onChange={(e) => updateSettings({ pitch: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#9fa8da', marginTop: '5px' }}>
              <span>Lower</span>
              <span>Normal</span>
              <span>Higher</span>
            </div>
          </div>

          {/* Volume */}
          <div>
            <label htmlFor="tts-volume" style={{ display: 'block', marginBottom: '8px', color: '#e0e0e0' }}>
              Volume: {Math.round(settings.volume * 100)}%
            </label>
            <input
              id="tts-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
              style={{
                width: '100%',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#9fa8da', marginTop: '5px' }}>
              <span>Quiet</span>
              <span>Loud</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TTSSettings;