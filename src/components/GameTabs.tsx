import React, { useState } from 'react';
import StoryDisplay from './StoryDisplay';
import CharacterSheet from './CharacterSheet';
import NPCPanel from './NPCPanel';
import RulesPanel from './RulesPanel';
import Settings from './Settings';
import GameGraph from './GameGraph';
import './TabPanel.css';

interface GameTabsProps {
  className?: string;
}

const GameTabs: React.FC<GameTabsProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<
    'story' | 'character' | 'npcs' | 'rules' | 'graph' | 'settings'
  >('story');

  return (
    <div className={`tab-panel ${className}`}>
      <div className="tab-buttons">
        <button
          className={`tab-button ${activeTab === 'story' ? 'active' : ''}`}
          onClick={() => setActiveTab('story')}
          aria-label="Story tab"
        >
          Story
        </button>
        <button
          className={`tab-button ${activeTab === 'character' ? 'active' : ''}`}
          onClick={() => setActiveTab('character')}
          aria-label="Character sheet tab"
        >
          Character
        </button>
        <button
          className={`tab-button ${activeTab === 'npcs' ? 'active' : ''}`}
          onClick={() => setActiveTab('npcs')}
          aria-label="NPCs tab"
        >
          NPCs
        </button>
        <button
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
          aria-label="Custom rules tab"
        >
          Rules
        </button>
        <button
          className={`tab-button ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
          aria-label="Story graph tab"
        >
          Story Graph
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-label="Settings tab"
        >
          Settings
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'story' && <StoryDisplay />}
        {activeTab === 'character' && <CharacterSheet />}
        {activeTab === 'npcs' && <NPCPanel />}
        {activeTab === 'rules' && <RulesPanel />}
        {activeTab === 'graph' && <GameGraph />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
};

export default GameTabs;
