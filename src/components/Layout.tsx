import React, { useState } from 'react';
import GameGraph from './GameGraph';
import StoryDisplay from './StoryDisplay';
import CharacterSheet from './CharacterSheet';
import './Layout.css';
import './CharacterSheet.css';

const Layout: React.FC = () => {
  const [isCharSheetExpanded, setIsCharSheetExpanded] = useState(false);

  const toggleCharSheet = () => {
    setIsCharSheetExpanded(!isCharSheetExpanded);
  };

  return (
    <div className={`game-layout ${isCharSheetExpanded ? 'char-sheet-expanded' : ''}`}>
      <main className="game-main">
        <section className="game-graph-container">
          <GameGraph />
        </section>
        
        <section className="story-display-container">
          <StoryDisplay />
        </section>
      </main>

      <aside className="character-sheet-container">
        <button 
          className="toggle-char-sheet" 
          onClick={toggleCharSheet}
          aria-label={isCharSheetExpanded ? 'Collapse character sheet' : 'Expand character sheet'}
        >
          {isCharSheetExpanded ? '»' : '«'}
        </button>
        <CharacterSheet />
      </aside>
    </div>
  );
};

export default Layout;