import React from 'react';

import Layout from './components/Layout';
import {
  GameProvider,
  ModelProvider,
  ApiKeyProvider,
  TTSProvider,
} from './contexts';

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
