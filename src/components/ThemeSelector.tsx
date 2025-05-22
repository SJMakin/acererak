import React, { useState } from 'react';
import './ThemeSelector.css';

export interface SelectedTheme {
  category: string;
  theme: string;
}

interface ThemeSelectorProps {
  onThemesSelected: (themes: SelectedTheme[] | null) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onThemesSelected }) => {
  const [freeTextThemes, setFreeTextThemes] = useState<string>('');
  const [useRandomThemes, setUseRandomThemes] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (useRandomThemes || !freeTextThemes.trim()) {
      console.log('Using random themes');
      onThemesSelected(null); // null indicates to use random themes
      return;
    }
    
    // Split the input by commas and clean up each theme
    const themes = freeTextThemes
      .split(',')
      .map(theme => theme.trim())
      .filter(theme => theme.length > 0)
      .slice(0, 3); // Limit to 3 themes
    
    // Convert to SelectedTheme format
    const selectedThemes: SelectedTheme[] = themes.map(theme => ({
      category: 'Custom',
      theme
    }));
    
    console.log('Submitting custom themes:', selectedThemes);
    
    // Submit the themes
    onThemesSelected(selectedThemes);
  };

  return (
    <div className="theme-selector">
      {isSubmitting ? (
        <div className="loading-state">
          <h2>Generating Your Adventure</h2>
          <p>Creating a world based on your chosen themes...</p>
          {/* You could add a loading spinner or animation here */}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2>Choose Your Adventure Themes</h2>
          
          <div className="theme-options">
            <div className="option">
              <input
                type="radio"
                id="custom-themes"
                name="theme-type"
                checked={!useRandomThemes}
                onChange={() => setUseRandomThemes(false)}
                disabled={isSubmitting}
              />
              <label htmlFor="custom-themes">Enter custom themes:</label>
              
              <textarea
                value={freeTextThemes}
                onChange={(e) => setFreeTextThemes(e.target.value)}
                placeholder="e.g., ancient ruins, revenge, dragon (separated by commas, up to 3)"
                rows={3}
                disabled={useRandomThemes || isSubmitting}
              />
              <p className="hint">These themes will shape your adventure's story and encounters.</p>
            </div>
            
            <div className="option">
              <input
                type="radio"
                id="random-themes"
                name="theme-type"
                checked={useRandomThemes}
                onChange={() => setUseRandomThemes(true)}
                disabled={isSubmitting}
              />
              <label htmlFor="random-themes">Let fate decide your destiny</label>
            </div>
          </div>
          
          <button
            type="submit"
            className="start-button"
            disabled={isSubmitting}
          >
            Begin Adventure
          </button>
        </form>
      )}
    </div>
  );
};

export default ThemeSelector;
