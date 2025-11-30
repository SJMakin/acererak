import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { useApiKey } from '../contexts/ApiKeyContext';
import { useModel } from '../contexts/ModelContext';
import { generateAICharacterSheet } from '../services/aiCharacterGenerator';
import { generateStoryPlan } from '../services/openRouterService';
import type { SelectedTheme } from '../types';

import AdventureThemes from './AdventureThemes';
import CharacterPreferences from './CharacterPreferences';
import Settings from './Settings';
import SystemSelector from './SystemSelector';
import './GameSetupTabs.css';

interface GameSetupTabsProps {
  onSetupComplete: (
    system: string,
    preferences: string | undefined,
    themes: SelectedTheme[] | null
  ) => void;
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

const GameSetupTabs: React.FC<GameSetupTabsProps> = ({ onSetupComplete }) => {
  const { hasKey } = useApiKey();

  const [activeTab, setActiveTab] = useState<
    'system' | 'character' | 'themes' | 'preview' | 'settings'
  >(hasKey ? 'system' : 'settings');

  // Preview sub-tab state
  const [activePreviewTab, setActivePreviewTab] = useState<
    'character' | 'story'
  >('character');

  const [customSystem, setCustomSystem] = useState<string>('');
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(
    null
  );
  const [characterPreferences, setCharacterPreferences] = useState<string>('');

  const [freeTextThemes, setFreeTextThemes] = useState<string>('');
  const [useRandomThemes, setUseRandomThemes] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [previewState, setPreviewState] = useState<PreviewState>({
    character: {
      content: '',
      isLoading: false,
      error: null,
    },
    storyPlan: {
      content: '',
      isLoading: false,
      error: null,
    },
  });

  const { selectedModel } = useModel();

  const predefinedSystems = [
    'D&D 5e',
    'Pathfinder 2e',
    'Call of Cthulhu',
    'Warhammer Fantasy',
    'Vampire: The Masquerade',
    'Shadowrun',
    'Star Wars RPG',
    'Cyberpunk RED',
  ];

  const handleSelectPredefinedSystem = (system: string) => {
    setSelectedPredefined(system);
    setCustomSystem('');
  };

  const handleCustomSystemChange = (system: string) => {
    setCustomSystem(system);
    if (system.trim()) {
      setSelectedPredefined(null);
    }
  };

  const generateCharacterPreview = async () => {
    const system = selectedPredefined || customSystem;
    if (!system.trim()) return;

    setPreviewState(prev => ({
      ...prev,
      character: { ...prev.character, isLoading: true, error: null },
    }));

    try {
      const characterSheet = await generateAICharacterSheet({
        system,
        preferences: characterPreferences.trim() || undefined,
      });
      setPreviewState(prev => ({
        ...prev,
        character: { content: characterSheet, isLoading: false, error: null },
      }));
    } catch (error) {
      setPreviewState(prev => ({
        ...prev,
        character: {
          ...prev.character,
          isLoading: false,
          error: 'Generation failed',
        },
      }));
    }
  };

  const generateStoryPlanPreview = async () => {
    setPreviewState(prev => ({
      ...prev,
      storyPlan: { ...prev.storyPlan, isLoading: true, error: null },
    }));

    try {
      let selectedThemes: SelectedTheme[] | null = null;

      if (!useRandomThemes && freeTextThemes.trim()) {
        const themes = freeTextThemes
          .split(',')
          .map(theme => theme.trim())
          .filter(Boolean)
          .slice(0, 3);
        selectedThemes = themes.map(theme => ({ category: 'Custom', theme }));
      }

      const storyPlan = await generateStoryPlan(selectedModel, selectedThemes);
      setPreviewState(prev => ({
        ...prev,
        storyPlan: { content: storyPlan, isLoading: false, error: null },
      }));
    } catch (error) {
      setPreviewState(prev => ({
        ...prev,
        storyPlan: {
          ...prev.storyPlan,
          isLoading: false,
          error: 'Generation failed',
        },
      }));
    }
  };

  const generateAllPreviews = async () => {
    const system = selectedPredefined || customSystem;
    if (!system.trim()) return;

    // Generate both previews in parallel
    await Promise.all([generateCharacterPreview(), generateStoryPlanPreview()]);
  };

  const isGeneratingAny =
    previewState.character.isLoading || previewState.storyPlan.isLoading;
  const hasAnyPreview =
    previewState.character.content || previewState.storyPlan.content;

  const handleSubmit = () => {
    // Validate API key before proceeding
    if (!hasKey) {
      alert(
        'Please add your OpenRouter API key in the Settings tab before starting the adventure.'
      );
      setActiveTab('settings');
      return;
    }

    setIsSubmitting(true);
    const system = selectedPredefined || customSystem || predefinedSystems[0];

    const selectedThemes =
      useRandomThemes || !freeTextThemes.trim()
        ? null
        : freeTextThemes
            .split(',')
            .map(theme => theme.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map(theme => ({ category: 'Custom', theme }));

    onSetupComplete(
      system,
      characterPreferences.trim() || undefined,
      selectedThemes
    );
  };

  const canProceed = () => selectedPredefined || customSystem.trim();

  if (isSubmitting) {
    return (
      <div className="game-setup-tabs">
        <div className="loading-state">
          <h2>Creating Adventure</h2>
          <p>Generating character and world...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-setup-tabs">
      <div className="setup-header">
        <h2>Create Your Adventure</h2>
      </div>

      <div className="tab-panel">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System
          </button>
          <button
            className={`tab-button ${activeTab === 'character' ? 'active' : ''}`}
            onClick={() => setActiveTab('character')}
          >
            Character
          </button>
          <button
            className={`tab-button ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            Themes
          </button>
          <button
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'system' && (
            <div className="setup-tab-content">
              <div className="setup-section">
                <SystemSelector
                  selectedPredefined={selectedPredefined}
                  customSystem={customSystem}
                  onSelectPredefined={handleSelectPredefinedSystem}
                  onCustomSystemChange={handleCustomSystemChange}
                  predefinedSystems={predefinedSystems}
                />

                <div className="tab-navigation">
                  <button
                    className="nav-button next"
                    onClick={() => setActiveTab('character')}
                    disabled={!canProceed()}
                  >
                    Next: Character Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'character' && (
            <div className="setup-tab-content">
              <div className="setup-section">
                <CharacterPreferences
                  characterPreferences={characterPreferences}
                  onCharacterPreferencesChange={setCharacterPreferences}
                />

                <div className="tab-navigation">
                  <button
                    className="nav-button prev"
                    onClick={() => setActiveTab('system')}
                  >
                    Back: System
                  </button>
                  <button
                    className="nav-button next"
                    onClick={() => setActiveTab('themes')}
                  >
                    Next: Themes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="setup-tab-content">
              <div className="setup-section">
                <AdventureThemes
                  freeTextThemes={freeTextThemes}
                  useRandomThemes={useRandomThemes}
                  onFreeTextThemesChange={setFreeTextThemes}
                  onUseRandomThemesChange={setUseRandomThemes}
                />

                <div className="tab-navigation">
                  <button
                    className="nav-button prev"
                    onClick={() => setActiveTab('character')}
                  >
                    Back: Character
                  </button>
                  <button
                    className="nav-button next"
                    onClick={() => setActiveTab('preview')}
                  >
                    Next: Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="setup-tab-content">
              <div className="setup-section">
                <h3>Preview Your Adventure</h3>

                <div className="preview-actions">
                  <button
                    className="preview-button"
                    onClick={generateAllPreviews}
                    disabled={isGeneratingAny || !canProceed()}
                  >
                    {isGeneratingAny
                      ? 'Generating Previews...'
                      : hasAnyPreview
                        ? 'Regenerate All Previews'
                        : 'Generate Previews'}
                  </button>
                </div>

                <div className="preview-tabs">
                  <button
                    className={`preview-tab-button ${activePreviewTab === 'character' ? 'active' : ''}`}
                    onClick={() => setActivePreviewTab('character')}
                  >
                    Character {previewState.character.content && '✓'}
                  </button>
                  <button
                    className={`preview-tab-button ${activePreviewTab === 'story' ? 'active' : ''}`}
                    onClick={() => setActivePreviewTab('story')}
                  >
                    Story Plan {previewState.storyPlan.content && '✓'}
                  </button>
                </div>

                <div className="preview-content">
                  {activePreviewTab === 'character' && (
                    <div className="preview-section">
                      <div className="preview-section-header">
                        <h4>Character Preview</h4>
                        <button
                          className="preview-regenerate-button"
                          onClick={generateCharacterPreview}
                          disabled={
                            previewState.character.isLoading || !canProceed()
                          }
                        >
                          {previewState.character.isLoading
                            ? 'Generating...'
                            : 'Regenerate'}
                        </button>
                      </div>
                      <div className="preview-section-content">
                        {previewState.character.isLoading ? (
                          <div className="preview-loading">
                            Generating character preview...
                          </div>
                        ) : previewState.character.error ? (
                          <div className="preview-error">
                            {previewState.character.error}
                          </div>
                        ) : previewState.character.content ? (
                          <div className="markdown-preview">
                            <ReactMarkdown>
                              {previewState.character.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="preview-empty">
                            <p>
                              Click "Generate Previews" to see your character.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activePreviewTab === 'story' && (
                    <div className="preview-section">
                      <div className="preview-section-header">
                        <h4>Story Plan Preview</h4>
                        <button
                          className="preview-regenerate-button"
                          onClick={generateStoryPlanPreview}
                          disabled={previewState.storyPlan.isLoading}
                        >
                          {previewState.storyPlan.isLoading
                            ? 'Generating...'
                            : 'Regenerate'}
                        </button>
                      </div>
                      <div className="preview-section-content">
                        {previewState.storyPlan.isLoading ? (
                          <div className="preview-loading">
                            Generating story plan preview...
                          </div>
                        ) : previewState.storyPlan.error ? (
                          <div className="preview-error">
                            {previewState.storyPlan.error}
                          </div>
                        ) : previewState.storyPlan.content ? (
                          <div className="markdown-preview">
                            <ReactMarkdown>
                              {previewState.storyPlan.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="preview-empty">
                            <p>
                              Click "Generate Previews" to see your adventure
                              plan.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="tab-navigation-wrapper">
                <div className="tab-navigation">
                  <button
                    className="nav-button prev"
                    onClick={() => setActiveTab('themes')}
                  >
                    Back: Themes
                  </button>
                  <button
                    className="start-button"
                    onClick={handleSubmit}
                    disabled={!canProceed()}
                    title={
                      !hasKey
                        ? 'API key required - please add in Settings tab'
                        : ''
                    }
                  >
                    Begin Adventure
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="setup-tab-content">
              <div className="setup-section">
                {!hasKey && (
                  <div
                    style={{
                      padding: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>⚠️ API Key Required</strong>
                    <p style={{ margin: '0.5rem 0 0 0' }}>
                      Please add your OpenRouter API key below to start your
                      adventure.
                    </p>
                  </div>
                )}
                <Settings />
                {!hasKey && (
                  <div className="tab-navigation" style={{ marginTop: '2rem' }}>
                    <p style={{ textAlign: 'center', color: '#999' }}>
                      After adding your API key, navigate to the System tab to
                      begin setup.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSetupTabs;
