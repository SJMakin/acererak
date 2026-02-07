import { useState, useEffect } from 'react';
import { AppShell, Box, Drawer, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useGameStore } from './stores/gameStore';
import { useRoom } from './hooks/useRoom';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { db } from './db/database';
import Lobby from './components/Lobby';
import GameCanvas from './components/GameCanvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import GMDisconnectModal from './components/GMDisconnectModal';

function App() {
  const { game, performUndo, performRedo, selectElement, selectedElementId, selectedTool } = useGameStore();
  const room = useRoom();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const isDrawingTool = selectedTool?.startsWith('draw-') ?? false;
  const headerHeight = isMobile ? (isDrawingTool ? 140 : 96) : 50;

  useEffect(() => {
    if (!isMobile && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile, mobileSidebarOpen]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: () => {
      performUndo();
      room.broadcastSync();
    },
    onRedo: () => {
      performRedo();
      room.broadcastSync();
    },
    onDelete: () => {
      // Broadcast deletion to other players
      if (selectedElementId) {
        room.broadcastElementDelete(selectedElementId);
      }
    },
    onSave: () => {
      // Save notification could be added here
      console.log('Game saved!');
    },
    onEscape: () => {
      selectElement(null);
    },
  });

  // Initialize database on mount
  useEffect(() => {
    // Dexie auto-initializes, but we can verify connection
    db.open().catch((err) => {
      console.error('Failed to open database:', err);
    });
  }, []);

  // Periodically broadcast state hash for desync detection (GM only)
  useEffect(() => {
    if (!room.isHost || room.peers.length === 0) return;

    // Broadcast hash every 10 seconds when connected to peers
    const interval = setInterval(() => {
      room.broadcastStateHash();
    }, 10000);

    // Also broadcast immediately when peers change
    room.broadcastStateHash();

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specific room properties are tracked; adding room object would cause infinite re-renders
  }, [room.isHost, room.peers.length, room.broadcastStateHash]);

  // Show lobby if no game is loaded
  if (!game) {
    return <Lobby room={room} />;
  }

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen((open) => !open);
    } else {
      setSidebarOpen((open) => !open);
    }
  };

  return (
    <AppShell
      header={{ height: headerHeight }}
      aside={
        isMobile
          ? undefined
          : {
              width: sidebarOpen ? 300 : 0,
              breakpoint: 'sm',
              collapsed: { mobile: !sidebarOpen, desktop: !sidebarOpen },
            }
      }
      padding={0}
    >
      <AppShell.Header>
        <Toolbar 
          sidebarOpen={isMobile ? mobileSidebarOpen : sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          room={room}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ width: '100%', height: `calc(100vh - ${headerHeight}px)` }}>
          <GameCanvas room={room} />
        </Box>
      </AppShell.Main>

      {!isMobile && (
        <AppShell.Aside p="md">
          <Sidebar room={room} />
        </AppShell.Aside>
      )}

      {isMobile && (
        <Drawer
          opened={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          position="right"
          size={300}
          padding="md"
          title="Sidebar"
        >
          <Sidebar room={room} />
        </Drawer>
      )}

      {/* GM Disconnect Modal - only show for non-GM players */}
      <GMDisconnectModal
        opened={room.gmDisconnected && !room.isHost}
        onLeaveGame={room.leaveRoom}
      />
    </AppShell>
  );
}

export default App;
