import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useTTS } from '../contexts/TTSContext';
import { isStoryNode, isChoiceNode } from '../types';

const StoryDisplay: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerStyle = {
    height: '100%',
    overflow: 'auto',
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
  };
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
      <div
        className="story-display"
        style={{
          ...containerStyle,
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <p>Loading your adventure...</p>
      </div>
    );
  }

  if (error) {
    const isApiKeyError = error.includes('API key') || error.includes('api key');
    
    return (
      <div
        className="story-display"
        style={{
          ...containerStyle,
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{
          backgroundColor: '#ff4444',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Error</h3>
          <p style={{ margin: '0 0 15px 0' }}>{error}</p>
          {isApiKeyError && (
            <p style={{ fontSize: '0.9em', opacity: 0.9, margin: '0' }}>
              💡 Make sure you've added your OpenRouter API key in the Settings tab before starting a new adventure.
            </p>
          )}
        </div>
        <button
          onClick={resetError}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Dismiss Error
        </button>
        <button
          onClick={restartGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Start New Adventure
        </button>
      </div>
    );
  }
  if (!currentStoryNode || !isStoryNode(currentStoryNode)) {
    return (
      <div
        className="story-display"
        style={{
          ...containerStyle,
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={restartGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Start New Adventure
        </button>
      </div>
    );
  }
  return (
    <div
      className="story-display"
      style={{
        ...containerStyle,
        padding: '20px',
      }}
    >
      {currentStoryNode?.rollResults &&
        currentStoryNode.rollResults.length > 0 && (
          <div
            className="roll-results"
            style={{
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: '#252525',
              border: '1px solid #333',
              borderRadius: '4px',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#9fa8da' }}>
              Dice Roll Results:
            </h4>
            <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
              {currentStoryNode.rollResults.map((result, index) => (
                <li
                  key={index}
                  style={{ marginBottom: '5px', color: '#e0e0e0' }}
                >
                  {result.formatted}
                </li>
              ))}
            </ul>
          </div>
        )}

      {currentStoryNode?.imageUrl && (
        <div
          className="story-image"
          style={{
            marginBottom: '20px',
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {!imageLoaded && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#252525',
                minHeight: '300px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #4f46e5',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px',
                  }}
                />
                <p style={{ color: '#9fa8da' }}>Generating scene...</p>
              </div>
            </div>
          )}
          <img
            src={currentStoryNode.imageUrl}
            alt="Story scene"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '500px',
              objectFit: 'cover',
              display: imageLoaded ? 'block' : 'none',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.error('Failed to load story image');
              setImageLoaded(true);
            }}
          />
        </div>
      )}

      {currentStoryNode?.fillerContent && (
        <div
          className="filler-content"
          style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#1a1a1a',
            borderLeft: '4px solid #9fa8da',
            borderRadius: '4px',
            fontStyle: 'italic',
          }}
        >
          <div style={{ fontSize: '0.9em', color: '#b0b0b0', marginBottom: '5px' }}>
            💭 Meanwhile...
          </div>
          <div style={{ color: '#d0d0d0' }}>
            {currentStoryNode.fillerContent}
          </div>
        </div>
      )}

      <div
        className="story-content"
        style={{
          marginBottom: '20px',
          fontSize: '1.1em',
          lineHeight: '1.6',
          color: '#e0e0e0',
        }}
      >
        {currentStoryNode.content}
        {currentStoryNode.characterUpdateDescription && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#252525',
              borderLeft: '4px solid #4f46e5',
              borderRadius: '4px',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#9fa8da' }}>
              Character Updates:
            </h4>
            <div style={{ whiteSpace: 'pre-line', color: '#e0e0e0' }}>
              {currentStoryNode.characterUpdateDescription}
            </div>
          </div>
        )}
      </div>

      <TTSControls storyContent={currentStoryNode.content} />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="story-choices"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
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
              style={{
                padding: '10px 20px',
                fontSize: '1em',
                cursor: 'pointer',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                transition: 'background-color 0.2s',
              }}
            >
              {isChoiceNode(choice) ? choice.text : 'Continue...'}
            </button>
          ))}
        <button
          onClick={restartGame}
          style={{
            padding: '10px 20px',
            marginTop: '20px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #444',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

const TTSControls: React.FC<{ storyContent: string }> = ({ storyContent }) => {
  const { speak, pause, resume, stop, isSpeaking, isPaused, isSupported, settings } = useTTS();

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

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        alignItems: 'center',
      }}
    >
      <button
        onClick={handleReadAloud}
        style={{
          padding: '8px 16px',
          fontSize: '0.9em',
          cursor: 'pointer',
          backgroundColor: isSpeaking || isPaused ? '#9fa8da' : '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isSpeaking || isPaused ? '#b0b8e0' : '#7c3aed';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isSpeaking || isPaused ? '#9fa8da' : '#6366f1';
        }}
      >
        {isSpeaking && !isPaused ? '⏸️ Pause' : isPaused ? '▶️ Resume' : '🔊 Read Aloud'}
      </button>

      {(isSpeaking || isPaused) && (
        <button
          onClick={stop}
          style={{
            padding: '8px 16px',
            fontSize: '0.9em',
            cursor: 'pointer',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c82333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc3545';
          }}
        >
          ⏹️ Stop
        </button>
      )}
    </div>
  );
};

export default StoryDisplay;
