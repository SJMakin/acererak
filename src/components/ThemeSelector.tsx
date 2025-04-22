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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleFreeTextSubmit = () => {
    if (!freeTextThemes.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
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

  const handleRandomThemes = () => {
    console.log('Submitting random themes');
    setIsSubmitting(true);
    onThemesSelected(null); // null indicates to use random themes
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
        <>
          <h2>Choose Your Adventure Themes</h2>
          
          <div className="free-text-input">
            <p>Enter up to 3 themes for your adventure (separated by commas):</p>
            <textarea
              value={freeTextThemes}
              onChange={(e) => setFreeTextThemes(e.target.value)}
              placeholder="e.g., ancient ruins, revenge, dragon"
              rows={3}
              disabled={isSubmitting}
            />
            <p className="hint">These themes will shape your adventure's story and encounters.</p>
            
            <button
              className="start-button"
              onClick={handleFreeTextSubmit}
              disabled={!freeTextThemes.trim() || isSubmitting}
            >
              Begin Adventure
            </button>
          </div>
          
          <div className="random-option">
            <p>Or let fate decide your destiny:</p>
            <button
              className="random-button"
              onClick={handleRandomThemes}
              disabled={isSubmitting}
            >
              Use Random Themes
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;
