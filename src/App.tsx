import React from 'react';
import { 
  GameProvider, 
  StoryProvider, 
  CharacterProvider, 
  DiceProvider,
  NPCProvider,
  RulesProvider
} from './contexts';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <GameProvider>
      <StoryProvider>
        <CharacterProvider>
          <DiceProvider>
            <NPCProvider>
              <RulesProvider>
                <Layout />
              </RulesProvider>
            </NPCProvider>
          </DiceProvider>
        </CharacterProvider>
      </StoryProvider>
    </GameProvider>
  );
};

export default App;
