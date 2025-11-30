import React from 'react';
import './SystemSelector.css';

export interface SystemSelectorProps {
  selectedPredefined: string | null;
  customSystem: string;
  onSelectPredefined: (system: string) => void;
  onCustomSystemChange: (system: string) => void;
  predefinedSystems: string[];
}

const SystemSelector: React.FC<SystemSelectorProps> = ({
  selectedPredefined,
  customSystem,
  onSelectPredefined,
  onCustomSystemChange,
  predefinedSystems,
}) => {
  return (
    <div className="system-selector">
      <h3>Choose Your RPG System</h3>

      <div className="predefined-systems">
        <div className="system-buttons">
          {predefinedSystems.map(system => (
            <button
              key={system}
              type="button"
              className={`system-button ${selectedPredefined === system ? 'selected' : ''}`}
              onClick={() => onSelectPredefined(system)}
            >
              {system}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-system">
        <input
          type="text"
          value={customSystem}
          onChange={e => onCustomSystemChange(e.target.value)}
          placeholder="Or enter any RPG system..."
        />
      </div>
    </div>
  );
};

export default SystemSelector;
