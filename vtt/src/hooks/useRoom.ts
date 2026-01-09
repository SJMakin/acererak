import { useEffect, useRef, useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { nanoid } from 'nanoid';
import { useGameStore } from '../stores/gameStore';
import type {
  GameState,
  CanvasElement,
  Player,
  Point,
  CombatTracker,
  DiceRoll,
} from '../types';

const APP_ID = 'lychgate-vtt-v1';

// ICE server configuration for WebRTC
// Includes STUN servers for NAT traversal and free TURN servers for relay fallback
const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Open Relay TURN server (free, community-provided)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// Trystero room configuration
interface RoomConfig {
  appId: string;
  rtcConfig?: RTCConfiguration;
}

// Define Room type manually to match trystero
interface Room {
  leave: () => void;
  onPeerJoin: (callback: (peerId: string) => void) => void;
  onPeerLeave: (callback: (peerId: string) => void) => void;
  makeAction: <T>(name: string) => [(data: T, targetPeers?: string[]) => void, (callback: (data: T, peerId: string) => void) => void, unknown];
}

// Cached trystero module
let trysteroModule: { joinRoom: (config: RoomConfig, roomId: string) => Room } | null = null;

// Load trystero dynamically
// Using torrent strategy with proper polyfills
async function loadTrystero(): Promise<{ joinRoom: (config: RoomConfig, roomId: string) => Room }> {
  if (!trysteroModule) {
    const mod = await import('trystero/torrent');
    trysteroModule = mod as unknown as { joinRoom: (config: RoomConfig, roomId: string) => Room };
  }
  return trysteroModule;
}

interface RoomState {
  roomId: string | null;
  peers: string[];
  isHost: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

type ActionSender<T> = (data: T, targetPeers?: string[]) => void;

export function useRoom() {
  const roomRef = useRef<Room | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: null,
    peers: [],
    isHost: false,
    connectionState: 'disconnected',
    error: null,
  });

  // Store refs for actions
  const actionsRef = useRef<{
    sendSync?: ActionSender<GameState>;
    sendElementUpdate?: ActionSender<CanvasElement>;
    sendElementDelete?: ActionSender<string>;
    sendCursor?: ActionSender<Point>;
    sendPing?: ActionSender<{ position: Point; color: string }>;
    sendPlayerJoin?: ActionSender<Player>;
    sendPlayerLeave?: ActionSender<string>;
    sendRequestSync?: ActionSender<null>;
    sendFogUpdate?: ActionSender<{ enabled: boolean; revealed: Point[][] }>;
    sendCombatUpdate?: ActionSender<CombatTracker>;
    sendDiceRoll?: ActionSender<DiceRoll>;
  }>({});

  const {
    game,
    loadGame,
    addElement,
    updateElement,
    deleteElement,
    addPlayer,
    removePlayer,
    updatePlayer,
    setConnected,
    myPeerId,
    addDiceRoll,
  } = useGameStore();
  
  const { toggleFog } = useGameStore((state) => ({
    toggleFog: state.toggleFog,
  }));

  // Create a new room (as DM/host)
  const createRoom = useCallback((roomId: string): string => {
    setRoomState(prev => ({
      ...prev,
      roomId,
      isHost: true,
      connectionState: 'connecting',
      error: null,
    }));

    // Start async loading
    (async () => {
      try {
        if (roomRef.current) {
          roomRef.current.leave();
        }

        const trystero = await loadTrystero();
        const room = trystero.joinRoom({ appId: APP_ID, rtcConfig }, roomId);
        roomRef.current = room;

        setupRoomHandlers(room, true);

        setRoomState(prev => ({
          ...prev,
          connectionState: 'connected',
        }));

        setConnected(true, myPeerId || undefined);
      } catch (error) {
        console.error('Failed to create room:', error);
        setRoomState(prev => ({
          ...prev,
          connectionState: 'error',
          error: error instanceof Error ? error.message : 'Failed to create room',
        }));
      }
    })();

    return roomId;
  }, [myPeerId, setConnected]);

  // Join an existing room (as player)
  const joinExistingRoom = useCallback((roomId: string, playerName: string, playerColor: string): void => {
    // Generate a unique peer ID for this player
    const newPeerId = nanoid();

    setRoomState(prev => ({
      ...prev,
      roomId,
      isHost: false,
      connectionState: 'connecting',
      error: null,
    }));

    // Start async loading
    (async () => {
      try {
        if (roomRef.current) {
          roomRef.current.leave();
        }

        const trystero = await loadTrystero();
        const room = trystero.joinRoom({ appId: APP_ID, rtcConfig }, roomId);
        roomRef.current = room;

        setupRoomHandlers(room, false);

        // Wait for connection then send join message
        room.onPeerJoin((peerId: string) => {
          console.log('Connected to peer:', peerId);

          setRoomState(prev => ({
            ...prev,
            connectionState: 'connected',
          }));

          // Request sync from host
          if (actionsRef.current.sendRequestSync) {
            actionsRef.current.sendRequestSync(null);
          }

          // Announce ourselves with the generated peer ID
          if (actionsRef.current.sendPlayerJoin) {
            console.log('Sending player join:', playerName);
            actionsRef.current.sendPlayerJoin({
              id: newPeerId,
              name: playerName,
              color: playerColor,
              isDM: false,
              controlledTokens: [],
            });
          }
        });

        setConnected(true, newPeerId);
      } catch (error) {
        console.error('Failed to join room:', error);
        setRoomState(prev => ({
          ...prev,
          connectionState: 'error',
          error: error instanceof Error ? error.message : 'Failed to join room',
        }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setConnected]);

  // Setup room event handlers
  const setupRoomHandlers = useCallback((room: Room, isHost: boolean) => {
    // Define actions (names must be <=12 bytes for Trystero)
    // Using `any` to bypass Trystero's DataPayload constraint
    const [sendSync, onSync] = room.makeAction<any>('sync');
    const [sendElementUpdate, onElementUpdate] = room.makeAction<any>('elUpdate');
    const [sendElementDelete, onElementDelete] = room.makeAction<any>('elDelete');
    const [sendCursor, onCursor] = room.makeAction<any>('cursor');
    const [sendPing, onPing] = room.makeAction<any>('ping');
    const [sendPlayerJoin, onPlayerJoin] = room.makeAction<any>('plyJoin');
    const [sendPlayerLeave, onPlayerLeave] = room.makeAction<any>('plyLeave');
    const [sendRequestSync, onRequestSync] = room.makeAction<any>('reqSync');
    const [sendFogUpdate, onFogUpdate] = room.makeAction<any>('fogUpdate');
    const [sendDiceRoll, onDiceRoll] = room.makeAction<any>('diceRoll');

    // Store senders
    actionsRef.current = {
      sendSync,
      sendElementUpdate,
      sendElementDelete,
      sendCursor,
      sendPing,
      sendPlayerJoin,
      sendPlayerLeave,
      sendRequestSync,
      sendFogUpdate,
      sendDiceRoll,
    };

    // Handle peer events
    room.onPeerJoin((peerId: string) => {
      console.log('Peer joined:', peerId);
      setRoomState((prev) => ({
        ...prev,
        peers: [...prev.peers, peerId],
      }));

      // If we're host, send current game state to new peer
      // Use getState() to get current game, not the closure-captured value
      const currentGame = useGameStore.getState().game;
      if (isHost && currentGame) {
        console.log('Sending game sync to new peer:', peerId);
        sendSync(currentGame, [peerId]);
      }
    });

    room.onPeerLeave((peerId: string) => {
      console.log('Peer left:', peerId);
      setRoomState((prev) => ({
        ...prev,
        peers: prev.peers.filter((p) => p !== peerId),
      }));
      removePlayer(peerId);
    });

    // Handle incoming data
    onSync((gameState: GameState, peerId: string) => {
      console.log('Received sync from:', peerId, 'Game:', gameState?.name);
      loadGame(gameState);
      console.log('Game loaded, should now show canvas');
    });

    onElementUpdate((element: CanvasElement, _peerId: string) => {
      // Check if element exists - use getState() to get current game
      const currentGame = useGameStore.getState().game;
      const existing = currentGame?.elements.find((e) => e.id === element.id);
      if (existing) {
        updateElement(element.id, element);
      } else {
        addElement(element);
      }
    });

    onElementDelete((elementId: string, _peerId: string) => {
      deleteElement(elementId);
    });

    onCursor((position: Point, peerId: string) => {
      updatePlayer(peerId, { cursor: position });
    });

    onPing((data: { position: Point; color: string }, peerId: string) => {
      // Handle ping visualization (emit event or update store)
      console.log('Ping from', peerId, 'at', data.position);
      // TODO: Add visual ping to canvas
    });

    onPlayerJoin((player: Player, _peerId: string) => {
      addPlayer(player);
      notifications.show({
        title: 'Player Joined',
        message: `${player.name} has joined the game`,
        color: 'green',
        autoClose: 4000,
      });
    });

    onPlayerLeave((playerId: string, _peerId: string) => {
      // Get player name before removing
      const player = useGameStore.getState().game?.players[playerId];
      const playerName = player?.name || 'Unknown player';
      removePlayer(playerId);
      notifications.show({
        title: 'Player Left',
        message: `${playerName} has left the game`,
        color: 'orange',
        autoClose: 4000,
      });
    });

    onRequestSync((_data: null, peerId: string) => {
      // Send current state to requesting peer
      // Use getState() to get current game, not the closure-captured value
      const currentGame = useGameStore.getState().game;
      if (isHost && currentGame) {
        console.log('Sending game sync on request to peer:', peerId);
        sendSync(currentGame, [peerId]);
      }
    });

    onFogUpdate((fogOfWar: { enabled?: boolean; revealed?: Point[][] }, _peerId: string) => {
      console.log('Received fog update');
      // Update fog of war state
      if (fogOfWar.enabled !== undefined) {
        toggleFog(fogOfWar.enabled);
      }
      // Update revealed areas by replacing them entirely
      const currentGame = useGameStore.getState().game;
      if (currentGame) {
        useGameStore.setState({
          game: {
            ...currentGame,
            fogOfWar: {
              enabled: fogOfWar.enabled ?? currentGame.fogOfWar.enabled,
              revealed: fogOfWar.revealed ?? currentGame.fogOfWar.revealed,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      }
    });

    onDiceRoll((diceRoll: DiceRoll, _peerId: string) => {
      console.log('Received dice roll from peer:', diceRoll);
      addDiceRoll(diceRoll);
      // Show notification
      notifications.show({
        title: 'Dice Roll',
        message: `${diceRoll.playerName} rolled ${diceRoll.formula}: ${diceRoll.result}`,
        color: 'violet',
        autoClose: 4000,
      });
    });
  }, [loadGame, addElement, updateElement, deleteElement, addPlayer, removePlayer, updatePlayer, toggleFog, addDiceRoll]);

  // Broadcast element updates
  const broadcastElementUpdate = useCallback((element: CanvasElement) => {
    if (actionsRef.current.sendElementUpdate) {
      actionsRef.current.sendElementUpdate(element);
    }
  }, []);

  const broadcastElementDelete = useCallback((elementId: string) => {
    if (actionsRef.current.sendElementDelete) {
      actionsRef.current.sendElementDelete(elementId);
    }
  }, []);

  const broadcastCursor = useCallback((position: Point) => {
    if (actionsRef.current.sendCursor) {
      actionsRef.current.sendCursor(position);
    }
  }, []);

  const broadcastPing = useCallback((position: Point, color: string) => {
    if (actionsRef.current.sendPing) {
      actionsRef.current.sendPing({ position, color });
    }
  }, []);

  const broadcastSync = useCallback(() => {
    if (actionsRef.current.sendSync && game) {
      actionsRef.current.sendSync(game);
    }
  }, [game]);

  const broadcastFogUpdate = useCallback((fogOfWar: { enabled: boolean; revealed: Point[][] }) => {
    if (actionsRef.current.sendFogUpdate) {
      actionsRef.current.sendFogUpdate(fogOfWar);
    }
  }, []);

  const broadcastDiceRoll = useCallback((roll: DiceRoll) => {
    if (actionsRef.current.sendDiceRoll) {
      actionsRef.current.sendDiceRoll(roll);
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      if (actionsRef.current.sendPlayerLeave && myPeerId) {
        actionsRef.current.sendPlayerLeave(myPeerId);
      }
      roomRef.current.leave();
      roomRef.current = null;
    }
    setRoomState({
      roomId: null,
      peers: [],
      isHost: false,
      connectionState: 'disconnected',
      error: null,
    });
    setConnected(false);
  }, [myPeerId, setConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
  }, []);

  return {
    ...roomState,
    createRoom,
    joinRoom: joinExistingRoom,
    leaveRoom,
    broadcastElementUpdate,
    broadcastElementDelete,
    broadcastCursor,
    broadcastPing,
    broadcastSync,
    broadcastFogUpdate,
    broadcastDiceRoll,
  };
}
