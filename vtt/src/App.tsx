import { useState } from 'react';
import { AppShell, Box } from '@mantine/core';
import { useGameStore } from './stores/gameStore';
import { useRoom } from './hooks/useRoom';
import Lobby from './components/Lobby';
import GameCanvas from './components/GameCanvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';

function App() {
  const { game } = useGameStore();
  const room = useRoom();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Show lobby if no game is loaded
  if (!game) {
    return <Lobby room={room} />;
  }

  return (
    <AppShell
      header={{ height: 50 }}
      aside={{ 
        width: sidebarOpen ? 300 : 0, 
        breakpoint: 'sm',
        collapsed: { mobile: !sidebarOpen, desktop: !sidebarOpen }
      }}
      padding={0}
    >
      <AppShell.Header>
        <Toolbar 
          sidebarOpen={sidebarOpen} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          room={room}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ width: '100%', height: 'calc(100vh - 50px)' }}>
          <GameCanvas room={room} />
        </Box>
      </AppShell.Main>

      <AppShell.Aside p="md">
        <Sidebar room={room} />
      </AppShell.Aside>
    </AppShell>
  );
}

export default App;
