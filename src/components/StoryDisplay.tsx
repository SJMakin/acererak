import React from 'react';
import { useGame } from '../contexts/GameContext';
import { isStoryNode, isChoiceNode } from '../types';
import ThemeSelector from './ThemeSelector';

const StoryDisplay: React.FC = () => {
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
    isThemeSelectionMode,
    selectThemes,
  } = useGame();

  // Theme selection is now handled in the GameSetupWizard

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
    return (
      <div
        className="story-display"
        style={{
          ...containerStyle,
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#ff6b6b' }}>{error}</p>
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
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Restart Game
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
                <li key={index} style={{ marginBottom: '5px', color: '#e0e0e0' }}>
                  {result.formatted}
                </li>
              ))}
            </ul>
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

export default StoryDisplay;
