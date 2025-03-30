import React from 'react';
import { 
  GameProvider, 
  ModelProvider
} from './contexts';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <ModelProvider>
      <GameProvider>
        <Layout />
      </GameProvider>
    </ModelProvider>
  );
};

export default App;
