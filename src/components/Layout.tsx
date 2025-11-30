import React, { useState, useEffect } from 'react';

import { useGame } from '../contexts/GameContext';

import GameSetupWizard from './GameSetupWizard';
import GameTabs from './GameTabs';
import './Layout.css';

const Layout: React.FC = () => {
  const { gameMode } = useGame();
  const [isMounted, setIsMounted] = useState(false);

  // Make sure the component is mounted before rendering
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
        <GameSetupWizard />
      </div>
    );
  }

  // Otherwise show the regular tabbed layout
  console.log('Layout: Rendering game content for mode:', gameMode);
  return (
    <div className="game-layout">
      <div className="main-content-full">
        <GameTabs />
      </div>
    </div>
  );
};

export default Layout;
