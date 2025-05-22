import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import GameGraph from './GameGraph';
import { CombatDisplay } from './CombatDisplay';
import SystemSelector from './SystemSelector';
import GameTabs from './GameTabs';
import ModelSelector from './ModelSelector';
import GameSetupWizard from './GameSetupWizard';
import ApiKeySettings from './ApiKeySettings';
import { useGame } from '../contexts/GameContext';
import { useApiKey } from '../contexts/ApiKeyContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { gameMode, selectSystem } = useGame();
  const { hasKey } = useApiKey();
  const [sizes, setSizes] = useState([60, 40]);
  const [isMounted, setIsMounted] = useState(false);

  // Make sure the component is mounted before rendering Split
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Log game mode changes for debugging
  useEffect(() => {
    console.log('Layout: Game mode changed to', gameMode);
  }, [gameMode]);

  if (!isMounted) {
    return (
      <div className="game-layout">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // If in setup mode, show the setup wizard
  if (gameMode === 'setup') {
    console.log('Layout: Rendering GameSetupWizard');
    return (
      <div className="game-layout">
        <div className="game-header">
          <ModelSelector />
          {!hasKey && <ApiKeySettings />}
        </div>
        <GameSetupWizard />
      </div>
    );
  }

  // Otherwise show the regular split layout
  console.log('Layout: Rendering game content for mode:', gameMode);
  return (
    <div className="game-layout">
      <div className="game-header">
        <ModelSelector />
        {!hasKey && <ApiKeySettings />}
      </div>
      <Split
        sizes={sizes}
        minSize={300}
        gutterSize={10}
        className="split-layout"
        onDragEnd={setSizes}
        direction="horizontal"
      >
        <div className="main-content">
          <GameTabs />
        </div>
        <div className="graph-panel">
          {gameMode === 'system-select' ? (
            <SystemSelector onSystemSelected={selectSystem} />
          ) : gameMode === 'combat' ? (
            <CombatDisplay />
          ) : (
            <GameGraph />
          )}
        </div>
      </Split>
    </div>
  );
};

export default Layout;
