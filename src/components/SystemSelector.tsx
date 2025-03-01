import React, { useState } from 'react';
import './SystemSelector.css';

export interface SystemSelectorProps {
  onSystemSelected: (system: string, preferences?: string) => void;
}

const SystemSelector: React.FC<SystemSelectorProps> = ({ onSystemSelected }) => {
  const [customSystem, setCustomSystem] = useState<string>('');
  const [preferences, setPreferences] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null);

  // Predefined popular RPG systems
  const predefinedSystems = [
    'Dungeons & Dragons 5e',
    'Pathfinder 2e',
    'Call of Cthulhu',
    'Warhammer Fantasy',
    'Vampire: The Masquerade',
    'Shadowrun',
    'Star Wars RPG',
    'Cyberpunk RED'
  ];

  const handleCustomSubmit = () => {
    if (!customSystem.trim()) return;
    
    setIsSubmitting(true);
    onSystemSelected(customSystem, preferences.trim() || undefined);
  };

  const handlePredefinedSelect = (system: string) => {
    setSelectedPredefined(system);
    setShowPreferences(true);
  };

  const handlePredefinedSubmit = () => {
    if (!selectedPredefined) return;
    
    setIsSubmitting(true);
    onSystemSelected(selectedPredefined, preferences.trim() || undefined);
  };

  const handleRandomSystem = () => {
    setIsSubmitting(true);
    const randomSystem = predefinedSystems[Math.floor(Math.random() * predefinedSystems.length)];
    onSystemSelected(randomSystem);
  };

  if (showPreferences && selectedPredefined) {
    return (
      <div className="system-selector">
        <h2>Character Preferences</h2>
        <div className="system-info">
          <p>Selected System: <strong>{selectedPredefined}</strong></p>
        </div>
        
        <div className="preferences-input">
          <p>Enter any preferences for your character (optional):</p>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="e.g., Elf wizard who specializes in fire magic, or leave blank for a random character"
            rows={4}
            disabled={isSubmitting}
          />
          <p className="hint">You can specify race, class, background, or any other details you want.</p>
        </div>
        
        <div className="button-group">
          <button 
            className="back-button" 
            onClick={() => {
              setShowPreferences(false);
              setSelectedPredefined(null);
            }}
            disabled={isSubmitting}
          >
            Back
          </button>
          <button 
            className="start-button" 
            onClick={handlePredefinedSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Character...' : 'Create Character'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-selector">
      <h2>Choose Your RPG System</h2>
      
      <div className="system-options">
        <div className="predefined-systems">
          <h3>Popular Systems</h3>
          <div className="system-buttons">
            {predefinedSystems.map(system => (
              <button 
                key={system} 
                className={`system-button ${selectedPredefined === system ? 'selected' : ''}`}
                onClick={() => handlePredefinedSelect(system)}
                disabled={isSubmitting}
              >
                {system}
              </button>
            ))}
          </div>
        </div>
        
        <div className="custom-system">
          <h3>Custom System</h3>
          <div className="custom-input">
            <input
              type="text"
              value={customSystem}
              onChange={(e) => setCustomSystem(e.target.value)}
              placeholder="Enter any RPG system..."
              disabled={isSubmitting}
            />
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Character preferences (optional)"
              rows={3}
              disabled={isSubmitting}
            />
            <button 
              className="custom-submit" 
              onClick={handleCustomSubmit}
              disabled={!customSystem.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating Character...' : 'Create Character'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="random-option">
        <p>Or let fate decide your system:</p>
        <button 
          className="random-button" 
          onClick={handleRandomSystem}
          disabled={isSubmitting}
        >
          Random System
        </button>
      </div>
    </div>
  );
};

export default SystemSelector;
