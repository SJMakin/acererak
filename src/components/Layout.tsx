import React from 'react';
import GameGraph from './GameGraph';
import StoryDisplay from './StoryDisplay';
import CharacterSheet from './CharacterSheet';
import './Layout.css';
import './CharacterSheet.css';

const Layout: React.FC = () => {
  return (
    <div className="game-layout">
      <main className="game-main">
        <section className="game-graph-container">
          <GameGraph />
        </section>
        
        <section className="story-display-container">
          <StoryDisplay />
        </section>
      </main>

      <aside className="character-sheet-container">
        <CharacterSheet />
      </aside>
    </div>
  );
};

export default Layout;