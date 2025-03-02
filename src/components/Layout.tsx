import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import GameGraph from './GameGraph';
import { CombatDisplay } from './CombatDisplay';
import SystemSelector from './SystemSelector';
import GameTabs from './GameTabs';
import { useGame } from '../contexts/GameContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { gameMode, selectSystem } = useGame();
  const [sizes, setSizes] = useState([60, 40]);
  const [isMounted, setIsMounted] = useState(false);

  // Make sure the component is mounted before rendering Split
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="game-layout">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="game-layout">
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
