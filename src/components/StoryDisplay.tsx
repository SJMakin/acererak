import React, { useState } from 'react';

import { useGame } from '../contexts/GameContext';
import { useTTS } from '../contexts/TTSContext';
import { isStoryNode, isChoiceNode } from '../types';

import './StoryDisplay.css';

const StoryDisplay: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const {
    currentStoryNode,
    graphData,
    isLoading,
    error,
    chooseOption,
    resetError,
    restartGame,
  } = useGame();

  if (isLoading) {
    return (
      <div className="story-display story-display--centered">
        <p>Loading your adventure...</p>
      </div>
    );
  }

  if (error) {
    const isApiKeyError =
      error.includes('API key') || error.includes('api key');

    return (
      <div className="story-display story-display--centered">
        <div className="story-error">
          <h3>Error</h3>
          <p>{error}</p>
          {isApiKeyError && (
            <p className="story-error-hint">
              💡 Make sure you've added your OpenRouter API key in the Settings
              tab before starting a new adventure.
            </p>
          )}
        </div>
        <button onClick={resetError} className="btn btn-primary btn-spacing">
          Dismiss Error
        </button>
        <button onClick={restartGame} className="btn btn-danger">
          Start New Adventure
        </button>
      </div>
    );
  }

  if (!currentStoryNode || !isStoryNode(currentStoryNode)) {
    return (
      <div className="story-display story-display--centered">
        <button onClick={restartGame} className="btn btn-primary">
          Start New Adventure
        </button>
      </div>
    );
  }

  return (
    <div className="story-display story-display--padded">
      {currentStoryNode?.rollResults &&
        currentStoryNode.rollResults.length > 0 && (
          <div className="roll-results">
            <h4>Dice Roll Results:</h4>
            <ul>
              {currentStoryNode.rollResults.map((result, index) => (
                <li key={index}>{result.formatted}</li>
              ))}
            </ul>
          </div>
        )}

      {currentStoryNode?.imageUrl && (
        <div className="story-image">
          {!imageLoaded && (
            <div className="story-image-loading">
              <div className="story-image-loading-content">
                <div className="story-image-spinner" />
                <p className="story-image-loading-text">Generating scene...</p>
              </div>
            </div>
          )}
          <img
            src={currentStoryNode.imageUrl}
            alt="Story scene"
            style={{ display: imageLoaded ? 'block' : 'none' }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.error('Failed to load story image');
              setImageLoaded(true);
            }}
          />
        </div>
      )}

      {currentStoryNode?.fillerContent && (
        <div className="filler-content">
          <div className="filler-content-label">💭 Meanwhile...</div>
          <div className="filler-content-text">
            {currentStoryNode.fillerContent}
          </div>
        </div>
      )}

      <div className="story-content">
        {currentStoryNode.content}
        {currentStoryNode.characterUpdateDescription && (
          <div className="character-updates">
            <h4>Character Updates:</h4>
            <div className="character-updates-content">
              {currentStoryNode.characterUpdateDescription}
            </div>
          </div>
        )}
      </div>

      <TTSControls storyContent={currentStoryNode.content} />

      <div className="story-choices">
        {graphData.nodes
          .filter(
            (node: any) =>
              isChoiceNode(node) &&
              currentStoryNode &&
              graphData.edges.some(
                (edge: any) =>
                  edge.source === currentStoryNode.id && edge.target === node.id
              )
          )
          .map((choice: any) => (
            <button
              key={choice.id}
              onClick={() => chooseOption(choice.id)}
              className="btn btn-primary btn-choice"
            >
              {isChoiceNode(choice) ? choice.text : 'Continue...'}
            </button>
          ))}
        <button
          onClick={restartGame}
          className="btn btn-secondary btn-full-width btn-restart"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

const TTSControls: React.FC<{ storyContent: string }> = ({ storyContent }) => {
  const {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isSupported,
    settings,
  } = useTTS();

  if (!isSupported || !settings.enabled) {
    return null;
  }

  const handleReadAloud = () => {
    if (isSpeaking && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      speak(storyContent);
    }
  };

  const isActive = isSpeaking || isPaused;

  return (
    <div className="tts-controls">
      <button
        onClick={handleReadAloud}
        className={`btn btn-small btn-tts ${isActive ? 'btn-tts--active' : ''}`}
      >
        {isSpeaking && !isPaused
          ? '⏸️ Pause'
          : isPaused
            ? '▶️ Resume'
            : '🔊 Read Aloud'}
      </button>

      {isActive && (
        <button onClick={stop} className="btn btn-small btn-danger">
          ⏹️ Stop
        </button>
      )}
    </div>
  );
};

export default StoryDisplay;
