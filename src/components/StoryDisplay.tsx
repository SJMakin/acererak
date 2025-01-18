import React from 'react';
import { useGame } from '../contexts/GameContext';
import { isStoryNode, isChoiceNode } from '../types';

const StoryDisplay: React.FC = () => {
  const { currentStoryNode, graphData, isLoading, error, chooseOption, resetError, restartGame } = useGame();

  if (isLoading) {
    return (
      <div className="story-display" style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <p>Loading your adventure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="story-display" style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button
          onClick={resetError}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#4a5568',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Dismiss Error
        </button>
        <button
          onClick={restartGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4a5568',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Restart Game
        </button>
      </div>
    );
  }

  if (!currentStoryNode || !isStoryNode(currentStoryNode)) {
    return (
      <div className="story-display" style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <button
          onClick={restartGame}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4a5568',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Start New Adventure
        </button>
      </div>
    );
  }
  return (
    <div className="story-display" style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <div className="story-content" style={{
        marginBottom: '20px',
        fontSize: '1.1em',
        lineHeight: '1.6',
      }}>
        {currentStoryNode.content}
      </div>
      
      <div className="story-choices" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {graphData.nodes
          .filter(node => 
            isChoiceNode(node) && 
            currentStoryNode && 
            graphData.edges.some(edge => 
              edge.source === currentStoryNode.id && 
              edge.target === node.id
            )
          )
          .map((choice) => (
          <button
            key={choice.id}
            onClick={() => chooseOption(choice.id)}
            style={{
              padding: '10px 20px',
              fontSize: '1em',
              cursor: 'pointer',
              backgroundColor: '#4a5568',
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
            backgroundColor: '#4a5568',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

export default StoryDisplay;