import React from 'react';
import { GameProvider } from './contexts/GameContext';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <GameProvider>
      <Layout />
    </GameProvider>
  );
};

export default App;