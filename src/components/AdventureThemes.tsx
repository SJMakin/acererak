/* eslint-disable no-unused-vars */
import React from 'react';
import './AdventureThemes.css';

interface AdventureThemesProps {
  freeTextThemes: string;
  useRandomThemes: boolean;
  onFreeTextThemesChange: (themes: string) => void;
  onUseRandomThemesChange: (useRandom: boolean) => void;
}

const AdventureThemes: React.FC<AdventureThemesProps> = ({
  freeTextThemes,
  useRandomThemes,
  onFreeTextThemesChange,
  onUseRandomThemesChange,
}) => {
  return (
    <div className="adventure-themes">
      <h3>Adventure Themes</h3>

      <div className="theme-options">
        <div className="option">
          <div className="radio-group">
            <input
              type="radio"
              id="custom-themes"
              name="theme-type"
              checked={!useRandomThemes}
              onChange={() => onUseRandomThemesChange(false)}
            />
            <label htmlFor="custom-themes">Enter custom themes:</label>
          </div>

          <div className="input-group">
            <textarea
              value={freeTextThemes}
              onChange={e => onFreeTextThemesChange(e.target.value)}
              placeholder="e.g., ancient ruins, revenge, dragon (separated by commas, up to 3)"
              rows={4}
              disabled={useRandomThemes}
            />
            <p className="hint">
              These themes will shape your adventure's story and encounters.
            </p>
          </div>
        </div>
        <div className="option">
          <div className="radio-group">
            <input
              type="radio"
              id="random-themes"
              name="theme-type"
              checked={useRandomThemes}
              onChange={() => onUseRandomThemesChange(true)}
            />
            <label htmlFor="random-themes">
              Let fate decide your adventure themes
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdventureThemes;
