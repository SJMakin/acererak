import React, { useState } from 'react';
import StoryDisplay from './StoryDisplay';
import CharacterSheet from './CharacterSheet';
import NPCPanel from './NPCPanel';
import RulesPanel from './RulesPanel';
import './TabPanel.css';

interface TabPanelProps {
  className?: string;
}

const TabPanel: React.FC<TabPanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'story' | 'character' | 'npcs' | 'rules'>('story');
  
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
      </div>
      
      <div className="tab-content">
        {activeTab === 'story' && <StoryDisplay />}
        {activeTab === 'character' && <CharacterSheet />}
        {activeTab === 'npcs' && <NPCPanel />}
        {activeTab === 'rules' && <RulesPanel />}
      </div>
    </div>
  );
};

export default TabPanel;
