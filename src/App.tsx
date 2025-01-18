import React from 'react';
import { GameProvider } from './contexts/GameContext';
import GameGraph from './components/GameGraph';
import StoryDisplay from './components/StoryDisplay';

const App: React.FC = () => {
  return (
    <GameProvider>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '20px',
        gap: '20px',
      }}>
        <h1 style={{
          textAlign: 'center',
          margin: '0',
          color: '#2d3748',
        }}>
          DnD AI Adventure
        </h1>
        
        <div style={{
          display: 'flex',
          flex: 1,
          gap: '20px',
          minHeight: 0, // Important for proper flex behavior
        }}>
          <div style={{
            flex: '2',
            minWidth: 0, // Important for proper flex behavior
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <GameGraph />
          </div>
          
          <div style={{
            flex: '1',
            minWidth: '300px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'auto',
          }}>
            <StoryDisplay />
          </div>
        </div>
      </div>
    </GameProvider>
  );
};

export default App;