import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';

import Layout from './components/Layout';
import {
  GameProvider,
  ModelProvider,
  ApiKeyProvider,
  TTSProvider,
} from './contexts';
import { system } from './theme';

const App: React.FC = () => {
  return (
    <ChakraProvider value={system}>
      <ApiKeyProvider>
        <ModelProvider>
          <TTSProvider>
            <GameProvider>
              <Layout />
            </GameProvider>
          </TTSProvider>
        </ModelProvider>
      </ApiKeyProvider>
    </ChakraProvider>
  );
};

export default App;
