import React from 'react';
import { GameProvider, ModelProvider, ApiKeyProvider, TTSProvider } from './contexts';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <ApiKeyProvider>
      <ModelProvider>
        <TTSProvider>
          <GameProvider>
            <Layout />
          </GameProvider>
        </TTSProvider>
      </ModelProvider>
    </ApiKeyProvider>
  );
};

export default App;
