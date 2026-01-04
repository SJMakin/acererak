import { useEffect, useRef, useCallback, useState } from 'react';
import { joinRoom, type Room } from 'trystero/torrent';
import { notifications } from '@mantine/notifications';
import { useGameStore } from '../stores/gameStore';
import type {
  GameState,
  CanvasElement,
  Player,
  Point,
  P2PMessage,
  CombatTracker,
  DiceRoll,
} from '../types';

const APP_ID = 'acererak-vtt-v1';

interface RoomState {
  roomId: string | null;
  peers: string[];
  isHost: boolean;
}

type ActionSender<T> = (data: T, targetPeers?: string[]) => void;
type ActionReceiver<T> = (callback: (data: T, peerId: string) => void) => void;

export function useRoom() {
  const roomRef = useRef<Room | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: null,
    peers: [],
    isHost: false,
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
    isDM,
    addDiceRoll,
  } = useGameStore();
  
  const { revealFog, hideFog, toggleFog } = useGameStore((state) => ({
    revealFog: state.revealFog,
    hideFog: state.hideFog,
    toggleFog: state.toggleFog,
  }));

  // Create a new room (as DM/host)
  const createRoom = useCallback((roomId: string) => {
    if (roomRef.current) {
      roomRef.current.leave();
    }

    const room = joinRoom({ appId: APP_ID }, roomId);
    roomRef.current = room;

    setRoomState({
      roomId,
      peers: [],
      isHost: true,
    });

    setupRoomHandlers(room, true);
    setConnected(true, myPeerId || undefined);

    return roomId;
  }, [myPeerId, setConnected]);

  // Join an existing room (as player)
  const joinExistingRoom = useCallback((roomId: string, playerName: string, playerColor: string) => {
    if (roomRef.current) {
      roomRef.current.leave();
    }

    const room = joinRoom({ appId: APP_ID }, roomId);
    roomRef.current = room;

    setRoomState({
      roomId,
      peers: [],
      isHost: false,
    });

    setupRoomHandlers(room, false);

    // Wait for connection then send join message
    room.onPeerJoin((peerId) => {
      console.log('Connected to peer:', peerId);
      
      // Request sync from host
      if (actionsRef.current.sendRequestSync) {
        actionsRef.current.sendRequestSync(null);
      }

      // Announce ourselves
      if (actionsRef.current.sendPlayerJoin && myPeerId) {
        actionsRef.current.sendPlayerJoin({
          id: myPeerId,
          name: playerName,
          color: playerColor,
          isDM: false,
          controlledTokens: [],
        });
      }
    });

    setConnected(true, myPeerId || undefined);
  }, [myPeerId, setConnected]);

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
    room.onPeerJoin((peerId) => {
      console.log('Peer joined:', peerId);
      setRoomState((prev) => ({
        ...prev,
        peers: [...prev.peers, peerId],
      }));

      // If we're host, send current game state to new peer
      if (isHost && game) {
        sendSync(game, [peerId]);
      }
    });

    room.onPeerLeave((peerId) => {
      console.log('Peer left:', peerId);
      setRoomState((prev) => ({
        ...prev,
        peers: prev.peers.filter((p) => p !== peerId),
      }));
      removePlayer(peerId);
    });

    // Handle incoming data
    onSync((gameState, peerId) => {
      console.log('Received sync from:', peerId);
      loadGame(gameState);
    });

    onElementUpdate((element, _peerId) => {
      // Check if element exists
      const existing = game?.elements.find((e) => e.id === element.id);
      if (existing) {
        updateElement(element.id, element);
      } else {
        addElement(element);
      }
    });

    onElementDelete((elementId, _peerId) => {
      deleteElement(elementId);
    });

    onCursor((position, peerId) => {
      updatePlayer(peerId, { cursor: position });
    });

    onPing((data, peerId) => {
      // Handle ping visualization (emit event or update store)
      console.log('Ping from', peerId, 'at', data.position);
      // TODO: Add visual ping to canvas
    });

    onPlayerJoin((player, _peerId) => {
      addPlayer(player);
      notifications.show({
        title: 'Player Joined',
        message: `${player.name} has joined the game`,
        color: 'green',
        autoClose: 4000,
      });
    });

    onPlayerLeave((playerId, _peerId) => {
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

    onRequestSync((_data, peerId) => {
      // Send current state to requesting peer
      if (isHost && game) {
        sendSync(game, [peerId]);
      }
    });

    onFogUpdate((fogOfWar, _peerId) => {
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

    onDiceRoll((diceRoll, _peerId) => {
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
  }, [game, loadGame, addElement, updateElement, deleteElement, addPlayer, removePlayer, updatePlayer, toggleFog, addDiceRoll]);

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
