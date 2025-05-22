import React, { useState, useEffect, useRef } from 'react';
import { SelectedTheme } from './ThemeSelector';
import './GameSetupForm.css';
import { generateAICharacterSheet } from '../services/aiCharacterGenerator';
import { generateStoryPlan } from '../services/openRouterService';
import { useModel } from '../contexts/ModelContext';
import ReactMarkdown from 'react-markdown';

interface GameSetupFormProps {
  onSetupComplete: (system: string, preferences: string | undefined, themes: SelectedTheme[] | null) => void;
}

interface PreviewState {
  character: {
    content: string;
    isLoading: boolean;
    error: string | null;
  };
  storyPlan: {
    content: string;
    isLoading: boolean;
    error: string | null;
  };
}

const GameSetupForm: React.FC<GameSetupFormProps> = ({ onSetupComplete }) => {
  // System selection states
  const [customSystem, setCustomSystem] = useState<string>('');
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null);
  const [characterPreferences, setCharacterPreferences] = useState<string>('');
  
  // Theme selection states
  const [freeTextThemes, setFreeTextThemes] = useState<string>('');
  const [useRandomThemes, setUseRandomThemes] = useState<boolean>(false);
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Preview state
  const [showPreview, setShowPreview] = useState<boolean>(window.innerWidth > 768);
  const [previewState, setPreviewState] = useState<PreviewState>({
    character: {
      content: '',
      isLoading: false,
      error: null
    },
    storyPlan: {
      content: '',
      isLoading: false,
      error: null
    }
  });
  
  // Preview generation debounce timer
  const [previewTimer, setPreviewTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Get the selected model
  const { selectedModel } = useModel();

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

  // Generate previews when form values change
  useEffect(() => {
    // Clear any existing timer
    if (previewTimer) {
      clearTimeout(previewTimer);
    }
    
    // Set a new timer to generate previews after user stops typing
    const timer = setTimeout(() => {
      generatePreviews();
    }, 1000); // 1 second debounce
    
    setPreviewTimer(timer);
    
    // Cleanup function
    return () => {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSystem, selectedPredefined, characterPreferences, freeTextThemes, useRandomThemes, selectedModel]);
  
  // Generate character and story previews
  const generatePreviews = async () => {
    const system = selectedPredefined || customSystem;
    
    // Only generate previews if we have enough information
    if (!system.trim()) {
      return;
    }
    
    // Generate character preview
    generateCharacterPreview(system, characterPreferences);
    
    // Generate story plan preview
    generateStoryPlanPreview();
  };
  
  // Generate character preview
  const generateCharacterPreview = async (system: string, preferences: string) => {
    try {
      // Set loading state
      setPreviewState(prev => ({
        ...prev,
        character: {
          ...prev.character,
          isLoading: true,
          error: null
        }
      }));
      
      // Generate character preview
      const characterSheet = await generateAICharacterSheet({
        system,
        preferences: preferences.trim() || undefined
      });
      
      // Update preview state
      setPreviewState(prev => ({
        ...prev,
        character: {
          content: characterSheet,
          isLoading: false,
          error: null
        }
      }));
    } catch (error) {
      console.error('Failed to generate character preview:', error);
      setPreviewState(prev => ({
        ...prev,
        character: {
          ...prev.character,
          isLoading: false,
          error: 'Failed to generate character preview'
        }
      }));
    }
  };
  
  // Generate story plan preview
  const generateStoryPlanPreview = async () => {
    try {
      // Only generate story plan if we have themes
      if (useRandomThemes || freeTextThemes.trim()) {
        // Set loading state
        setPreviewState(prev => ({
          ...prev,
          storyPlan: {
            ...prev.storyPlan,
            isLoading: true,
            error: null
          }
        }));
        
        // Process themes
        let selectedThemes: SelectedTheme[] | null = null;
        
        if (!useRandomThemes && freeTextThemes.trim()) {
          const themes = freeTextThemes
            .split(',')
            .map(theme => theme.trim())
            .filter(theme => theme.length > 0)
            .slice(0, 3); // Limit to 3 themes
          
          selectedThemes = themes.map(theme => ({
            category: 'Custom',
            theme
          }));
        }
        
        // Generate story plan
        const storyPlan = await generateStoryPlan(selectedModel, selectedThemes);
        
        // Update preview state
        setPreviewState(prev => ({
          ...prev,
          storyPlan: {
            content: storyPlan,
            isLoading: false,
            error: null
          }
        }));
      }
    } catch (error) {
      console.error('Failed to generate story plan preview:', error);
      setPreviewState(prev => ({
        ...prev,
        storyPlan: {
          ...prev.storyPlan,
          isLoading: false,
          error: 'Failed to generate story plan preview'
        }
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Determine selected system
    const system = selectedPredefined || customSystem;
    if (!system.trim()) {
      // Use random system if none selected
      const randomSystem = predefinedSystems[Math.floor(Math.random() * predefinedSystems.length)];
      processThemesAndComplete(randomSystem, characterPreferences);
      return;
    }
    
    processThemesAndComplete(system, characterPreferences);
  };
  
  const processThemesAndComplete = (system: string, preferences: string) => {
    // Process themes
    if (useRandomThemes || !freeTextThemes.trim()) {
      // Use random themes
      onSetupComplete(system, preferences.trim() || undefined, null);
      return;
    }
    
    // Process custom themes
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
    
    onSetupComplete(system, preferences.trim() || undefined, selectedThemes);
  };

  const handleSystemSelect = (system: string) => {
    setSelectedPredefined(system);
    setCustomSystem('');
  };
  
  // Regenerate specific preview
  const regeneratePreview = (type: 'character' | 'storyPlan') => {
    if (type === 'character') {
      const system = selectedPredefined || customSystem;
      if (system.trim()) {
        generateCharacterPreview(system, characterPreferences);
      }
    } else {
      generateStoryPlanPreview();
    }
  };

  if (isSubmitting) {
    return (
      <div className="game-setup-form">
        <div className="loading-state">
          <h2>Creating Your Adventure</h2>
          <p>Generating your character and world...</p>
          {/* You could add a loading spinner or animation here */}
        </div>
      </div>
    );
  }

  return (
    <div className="game-setup-form">
      <h2>Create Your Adventure</h2>
      
      <div className="form-preview-container">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="compact-form">
            <div className="setup-section system-section">
              <h3>Choose Your RPG System</h3>
              
              <div className="predefined-systems">
                <div className="system-buttons">
                  {predefinedSystems.map(system => (
                    <button
                      key={system}
                      type="button"
                      className={`system-button ${selectedPredefined === system ? 'selected' : ''}`}
                      onClick={() => handleSystemSelect(system)}
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
                  onChange={(e) => {
                    setCustomSystem(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedPredefined(null);
                    }
                  }}
                  placeholder="Or enter any RPG system..."
                />
              </div>
            </div>
            
            <div className="setup-section character-section">
              <h3>Character Preferences (Optional)</h3>
              <textarea
                value={characterPreferences}
                onChange={(e) => setCharacterPreferences(e.target.value)}
                placeholder="e.g., Elf wizard who specializes in fire magic, or leave blank for a random character"
                rows={3}
              />
              <p className="hint">You can specify race, class, background, or any other details you want.</p>
            </div>
            
            <div className="setup-section theme-section">
              <h3>Adventure Themes</h3>
              
              <div className="theme-options">
                <div className="option">
                  <input
                    type="radio"
                    id="custom-themes"
                    name="theme-type"
                    checked={!useRandomThemes}
                    onChange={() => setUseRandomThemes(false)}
                  />
                  <label htmlFor="custom-themes">Enter custom themes:</label>
                  
                  <textarea
                    value={freeTextThemes}
                    onChange={(e) => setFreeTextThemes(e.target.value)}
                    placeholder="e.g., ancient ruins, revenge, dragon (separated by commas, up to 3)"
                    rows={2}
                    disabled={useRandomThemes}
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
                  />
                  <label htmlFor="random-themes">Let fate decide your adventure themes</label>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="start-button"
            >
              Begin Adventure
            </button>
          </form>
        </div>
        
        <div className="preview-container">
          <div className="preview-header">
            <h3>Preview</h3>
            <button
              type="button"
              className="toggle-preview-button"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          
          {showPreview && (
            <div className="preview-content">
              <div className="preview-section">
                <div className="preview-section-header">
                  <h4>Character Preview</h4>
                  <button
                    type="button"
                    className="regenerate-button"
                    onClick={() => regeneratePreview('character')}
                    disabled={previewState.character.isLoading}
                  >
                    {previewState.character.isLoading ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
                
                <div className="preview-section-content">
                  {previewState.character.isLoading ? (
                    <div className="preview-loading">Generating character preview...</div>
                  ) : previewState.character.error ? (
                    <div className="preview-error">{previewState.character.error}</div>
                  ) : previewState.character.content ? (
                    <div className="markdown-preview">
                      <ReactMarkdown components={{
                        // Make headings more compact
                        h1: ({node, ...props}) => <h1 style={{margin: '0.4em 0'}} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{margin: '0.3em 0'}} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{margin: '0.2em 0'}} {...props} />,
                        p: ({node, ...props}) => <p style={{margin: '0.2em 0'}} {...props} />
                      }}>
                        {previewState.character.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="preview-empty">
                      <p>Select a system and enter character preferences to see a preview.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="preview-section">
                <div className="preview-section-header">
                  <h4>Story Plan Preview</h4>
                  <button
                    type="button"
                    className="regenerate-button"
                    onClick={() => regeneratePreview('storyPlan')}
                    disabled={previewState.storyPlan.isLoading}
                  >
                    {previewState.storyPlan.isLoading ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
                
                <div className="preview-section-content">
                  {previewState.storyPlan.isLoading ? (
                    <div className="preview-loading">Generating story plan preview...</div>
                  ) : previewState.storyPlan.error ? (
                    <div className="preview-error">{previewState.storyPlan.error}</div>
                  ) : previewState.storyPlan.content ? (
                    <div className="markdown-preview">
                      <ReactMarkdown components={{
                        // Make headings more compact
                        h1: ({node, ...props}) => <h1 style={{margin: '0.4em 0'}} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{margin: '0.3em 0'}} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{margin: '0.2em 0'}} {...props} />,
                        p: ({node, ...props}) => <p style={{margin: '0.2em 0'}} {...props} />
                      }}>
                        {previewState.storyPlan.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="preview-empty">
                      <p>Enter themes to see a story plan preview.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSetupForm;