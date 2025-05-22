import React from 'react';
import {
  GameProvider,
  ModelProvider,
  ApiKeyProvider
} from './contexts';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <ApiKeyProvider>
      <ModelProvider>
        <GameProvider>
          <Layout />
        </GameProvider>
      </ModelProvider>
    </ApiKeyProvider>
  );
};

export default App;
