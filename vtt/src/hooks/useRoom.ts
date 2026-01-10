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
  GridSettings,
  ChatMessage,
} from '../types';

const APP_ID = 'lychgate-vtt-v1';

// Simple hash function for state comparison
function hashGameState(game: GameState): string {
  // Hash important game state fields for desync detection
  const stateStr = JSON.stringify({
    elementCount: game.elements.length,
    elementIds: game.elements.map(e => e.id).sort(),
    fogEnabled: game.fogOfWar.enabled,
    fogRevealedCount: game.fogOfWar.revealed.length,
    combatRound: game.combat?.round,
    combatTurn: game.combat?.currentTurn,
  });

  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < stateStr.length; i++) {
    hash = ((hash << 5) + hash) + stateStr.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

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
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  error: string | null;
  lastSyncedAt: number | null;
  gmPeerId: string | null;
  gmDisconnected: boolean;
  localHash: string | null;
  gmHash: string | null;
  isDesynced: boolean;
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
    lastSyncedAt: null,
    gmPeerId: null,
    gmDisconnected: false,
    localHash: null,
    gmHash: null,
    isDesynced: false,
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
    sendStateHash?: ActionSender<string>;
    sendGridUpdate?: ActionSender<Partial<GridSettings>>;
    sendChat?: ActionSender<ChatMessage>;
  }>({});

  const {
    game,
    loadGame,
    addOrUpdateElement,
    deleteElement,
    addPlayer,
    removePlayer,
    updatePlayer,
    setConnected,
    myPeerId,
    addDiceRoll,
    addChatMessage,
  } = useGameStore();

  const { toggleFog, updateGridSettings } = useGameStore((state) => ({
    toggleFog: state.toggleFog,
    updateGridSettings: state.updateGridSettings,
  }));

  // Create a new room (as GM/host)
  const createRoom = useCallback((roomId: string): string => {
    setRoomState(prev => ({
      ...prev,
      roomId,
      isHost: true,
      connectionState: 'connecting',
      error: null,
      gmPeerId: myPeerId,
      gmDisconnected: false,
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
              isGM: false,
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
    const [sendStateHash, onStateHash] = room.makeAction<any>('stateHash');
    const [sendGridUpdate, onGridUpdate] = room.makeAction<any>('gridUpd');
    const [sendChat, onChat] = room.makeAction<any>('chat');

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
      sendStateHash,
      sendGridUpdate,
      sendChat,
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

      // Check if the GM disconnected
      const game = useGameStore.getState().game;
      const gmPeerId = game?.gmPeerId;
      const isGMLeaving = gmPeerId && peerId === gmPeerId;

      setRoomState((prev) => ({
        ...prev,
        peers: prev.peers.filter((p) => p !== peerId),
        gmDisconnected: isGMLeaving ? true : prev.gmDisconnected,
      }));

      if (isGMLeaving) {
        notifications.show({
          title: 'GM Disconnected',
          message: 'The GM has left the game. The session is paused.',
          color: 'red',
          autoClose: false,
        });
      }

      removePlayer(peerId);
    });

    // Handle incoming data
    onSync((gameState: GameState, peerId: string) => {
      console.log('Received sync from:', peerId, 'Game:', gameState?.name);
      loadGame(gameState);
      // Track sync time and GM peer ID
      setRoomState(prev => ({
        ...prev,
        lastSyncedAt: Date.now(),
        gmPeerId: gameState.gmPeerId || peerId,
        connectionState: 'connected',
      }));
      console.log('Game loaded, should now show canvas');
    });

    onElementUpdate((element: CanvasElement, _peerId: string) => {
      // Use addOrUpdateElement to preserve incoming IDs (fixes duplication bug)
      addOrUpdateElement(element, true); // skipHistory = true for P2P updates
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

    onFogUpdate((fogOfWar: { enabled?: boolean; revealed?: Point[][] }, peerId: string) => {
      console.log('Received fog update from:', peerId);

      // Verify the update is from the GM (host) - enforce GM-only action
      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      const gmPeerId = currentGame.gmPeerId;
      if (gmPeerId && peerId !== gmPeerId && !isHost) {
        console.warn('Ignoring fog update from non-GM peer:', peerId);
        return;
      }

      // Update fog of war state
      if (fogOfWar.enabled !== undefined) {
        toggleFog(fogOfWar.enabled);
      }
      // Update revealed areas by replacing them entirely
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

    // Handle state hash for desync detection (GM broadcasts, players compare)
    onStateHash((gmHash: string, _peerId: string) => {
      const currentGame = useGameStore.getState().game;
      if (!currentGame || isHost) return; // GM doesn't need to check against itself

      const localHash = hashGameState(currentGame);
      const isDesynced = localHash !== gmHash;

      setRoomState(prev => ({
        ...prev,
        localHash,
        gmHash,
        isDesynced,
      }));

      if (isDesynced) {
        console.warn('State desync detected! Local:', localHash, 'GM:', gmHash);
      }
    });

    // Handle grid settings update (GM only can broadcast)
    onGridUpdate((gridSettings: Partial<GridSettings>, peerId: string) => {
      console.log('Received grid update from:', peerId);

      // Verify the update is from the GM (host) - enforce GM-only action
      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      const gmPeerId = currentGame.gmPeerId;
      if (gmPeerId && peerId !== gmPeerId && !isHost) {
        console.warn('Ignoring grid update from non-GM peer:', peerId);
        return;
      }

      // Apply grid settings update
      updateGridSettings(gridSettings);
    });

    // Handle incoming chat messages
    onChat((chatMessage: ChatMessage, peerId: string) => {
      console.log('Received chat message from:', peerId);

      // Check if GM-only message should be visible
      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      // If message is GM-only, only GM should see it (or the sender)
      if (chatMessage.isGMOnly) {
        const isGM = currentGame.gmPeerId === useGameStore.getState().myPeerId;
        const isSender = chatMessage.playerId === useGameStore.getState().myPeerId;
        if (!isGM && !isSender) {
          // Non-GM players shouldn't see GM-only messages (unless they sent it)
          return;
        }
      }

      addChatMessage(chatMessage);
    });
  }, [loadGame, addOrUpdateElement, deleteElement, addPlayer, removePlayer, updatePlayer, toggleFog, addDiceRoll, updateGridSettings, addChatMessage]);

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

  // Request a full sync from the GM
  const requestFullSync = useCallback(() => {
    if (actionsRef.current.sendRequestSync) {
      setRoomState(prev => ({
        ...prev,
        connectionState: 'syncing',
        isDesynced: false,
      }));
      actionsRef.current.sendRequestSync(null);
    }
  }, []);

  // Broadcast state hash (GM only) for desync detection
  const broadcastStateHash = useCallback(() => {
    const currentGame = useGameStore.getState().game;
    if (actionsRef.current.sendStateHash && currentGame && roomState.isHost) {
      const hash = hashGameState(currentGame);
      actionsRef.current.sendStateHash(hash);
    }
  }, [roomState.isHost]);

  // Broadcast grid settings (GM only)
  const broadcastGridSettings = useCallback((gridSettings: Partial<GridSettings>) => {
    if (actionsRef.current.sendGridUpdate && roomState.isHost) {
      actionsRef.current.sendGridUpdate(gridSettings);
    }
  }, [roomState.isHost]);

  // Broadcast chat message
  const broadcastChat = useCallback((message: ChatMessage) => {
    if (actionsRef.current.sendChat) {
      actionsRef.current.sendChat(message);
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
      lastSyncedAt: null,
      gmPeerId: null,
      gmDisconnected: false,
      localHash: null,
      gmHash: null,
      isDesynced: false,
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
    requestFullSync,
    broadcastStateHash,
    broadcastGridSettings,
    broadcastChat,
  };
}
