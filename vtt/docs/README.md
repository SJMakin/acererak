# Lychgate VTT - Decentralized Virtual Tabletop

A peer-to-peer virtual tabletop for TTRPGs built with React, Konva.js, and Trystero. **No server needed** - all game data flows directly between players via WebRTC.

## 🎯 Project Vision

Create a fully client-side, decentralized VTT where:
- The DM's browser is the source of truth
- Game state syncs in real-time via P2P connections
- No backend stores or routes any game data
- Players can join via QR codes or room IDs
- Everything works offline once peers are connected

This is intended to eventually integrate with the main Acererak app (the choose-your-own-adventure story generator in the parent directory) but is being developed as a standalone module first. Note: While the parent project retains the "Acererak" name, the VTT has been rebranded to "Lychgate" to avoid trademark concerns.

## 🏗️ Architecture

### P2P Networking Stack

```
┌─────────────────────────────────────────────┐
│           DM's Browser (Authority)          │
│  ┌─────────────┐         ┌───────────────┐  │
│  │ Game State  │◄────────┤ Trystero Room │  │
│  │ (IndexedDB) │         │  (BitTorrent) │  │
│  └─────────────┘         └───────┬───────┘  │
└────────────────────────────────────┼─────────┘
                                    │ WebRTC
                ┌───────────────────┼────────────────────┐
                │                   │                    │
┌───────────────┴────────┐  ┌───────┴──────────┐  ┌─────┴──────────┐
│   Player 1 Browser     │  │  Player 2 Browser│  │  Player 3...   │
│  ┌─────────────┐      │  │  ┌─────────────┐ │  │                │
│  │ Game State  │      │  │  │ Game State  │ │  │                │
│  │  (cached)   │      │  │  │  (cached)   │ │  │                │
│  └─────────────┘      │  │  └─────────────┘ │  │                │
└────────────────────────┘  └──────────────────┘  └────────────────┘
```

**Key Technical Decisions:**
- **Trystero** with BitTorrent strategy for signaling (no dedicated server)
- **WebRTC data channels** for P2P game state sync
- **Zustand** for client-side state management
- **Konva.js/react-konva** for canvas rendering
- **IndexedDB** via Dexie for local persistence
- **Mantine UI** for components

### Data Flow

1. DM creates game → generates unique room ID → creates Trystero room
2. Players scan QR or enter room ID → join Trystero room
3. Peers exchange SDP/ICE via BitTorrent DHT
4. WebRTC data channels established
5. DM broadcasts game state → peers receive and sync
6. All changes broadcast via P2P (no centralized state)

### Action Name Constraints

Trystero has a **12-byte limit** on action names. We use shortened names:
- `sync` - Full game state sync
- `elUpdate` - Element update (not `element-update`)
- `elDelete` - Element delete
- `plyJoin` - Player join (not `player-join`)
- `plyLeave` - Player leave
- `reqSync` - Request sync
- `cursor` - Cursor position
- `ping` - Ping location

## 📁 Project Structure

```
vtt/
├── src/
│   ├── components/
│   │   ├── Lobby.tsx              # Create/join game UI with QR codes
│   │   ├── GameCanvas.tsx         # Main Konva canvas (grid, tokens, drawing)
│   │   ├── Toolbar.tsx            # Tool selection bar (all drawing/interaction tools)
│   │   ├── Sidebar.tsx            # Token list, player list, DM tools
│   │   ├── TokenConfigModal.tsx   # Token placement configuration UI
│   │   ├── CombatTracker.tsx      # Initiative and turn tracking
│   │   ├── DiceRoller.tsx         # Dice rolling interface
│   │   ├── MarkdownEditor.tsx     # Edit/preview markdown content
│   │   ├── NotesPanel.tsx         # Campaign journal tab
│   │   ├── PropertyInspector.tsx  # Element properties editor
│   │   ├── LibraryPanel.tsx       # Token/map library management
│   │   ├── App.tsx                # Main app shell
│   │   └── ...
│   ├── hooks/
│   │   └── useRoom.ts             # Trystero P2P room management hook
│   ├── stores/
│   │   └── gameStore.ts           # Zustand game state store
│   ├── db/
│   │   └── database.ts            # IndexedDB schema and queries
│   ├── services/
│   │   └── diceParser.ts          # Dice notation parser
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── main.tsx                   # App entry point
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

## 🎨 Core Features Implemented

### ✅ Lobby & Connection
- Create game as DM
- Generate QR code for room ID
- Join game as player (via QR or manual ID)
- Real-time connection status

### ✅ Canvas System
- 30x30 grid (configurable size)
- Pan & zoom controls
- Grid toggle and snap-to-grid
- Viewport transformation (offset + scale)

### ✅ Drawing Tools
- **Freehand Draw** (✏️) - ✅ Fully working
- **Line Tool** (📏) - ✅ Fully working
- **Rectangle Tool** (⬜) - ✅ Fully working
- **Circle Tool** (⭕) - ✅ Fully working
- Live preview while drawing
- Saves to game state on mouse up
- All shapes support stroke color and width

### ✅ Token System
- Add tokens via sidebar or canvas click
- **TokenConfigModal** (🎭) - ✅ Click-to-place token tool with full configuration
- Drag to move (with snap-to-grid)
- Token properties: name, HP, AC, image URL, size
- HP bar visualization
- DM-only visibility option
- Custom emoji/text display

### ✅ Fog of War
- **Fog of War System** (🌫️) - ✅ Fully working
- Reveal Tool - Click and drag to reveal areas
- Hide Tool - Click and drag to hide areas
- Polygon-based reveal/hide logic
- Real-time sync across all players
- Toggle fog visibility (DM can see through)

### ✅ Interaction Tools
- **Ping Tool** (📍) - ✅ Fully working with animated visual indicators
- **Text Tool** (📝) - ✅ Click to place text labels
- **Measure Tool** (📏) - ✅ Shows distance in grid cells
- Cursor position sync
- Real-time collaboration indicators

### ✅ Combat Tracker
- **Combat Tracker** (⚔️) - ✅ Fully working
- Initiative tracking and ordering
- Add combatants with initiative rolls
- HP tracking integrated with tokens
- Turn advancement
- Remove combatants
- Sidebar integration

### ✅ Dice Roller
- **Dice Roller** (🎲) - ✅ Fully working
- Standard notation parser (e.g., `2d6+3`, `1d20`)
- Modifier support
- Visual roll results with individual die faces
- Roll history
- Sidebar integration

### ✅ DM Controls
- Mark elements as DM-only or visible to all
- Lock/unlock elements
- Delete elements
- Fog of War reveal/hide tools
- Layer management

### ✅ Data Persistence
- **IndexedDB Integration** (💾) - ✅ Fully working
- Auto-save game state locally
- Load games from local storage
- Export game as `.vtt.json` file
- Import game from file
- Full game state serialization

### ✅ Campaign Notes
- **Notes System** (📝) - ✅ Fully working
- Markdown notes on tokens (with edit/preview mode)
- Markdown notes on map images
- Campaign Journal for standalone notes
- Note categories (Session, NPC, Location, Lore, Plot, etc.)
- DM-only or public visibility
- Search and filter notes
- Simple markdown editor with syntax hints

### ✅ P2P Sync
- Broadcast element updates
- Broadcast element deletions
- Broadcast cursor positions
- Broadcast fog of war changes
- Broadcast ping locations
- Player join/leave notifications
- Full state sync on connection

## 🔧 Technical Implementation Details

### Game State Structure

```typescript
interface GameState {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gridSettings: GridSettings;
  elements: CanvasElement[];  // All tokens, shapes, images, text
  fogOfWar: { enabled: boolean; revealed: Point[][] };
  players: Record<string, Player>;
  dmPeerId?: string;
}
```

### Element Types

All canvas objects inherit from `BaseElement`:
- **TokenElement**: Characters/monsters with HP, AC, conditions
- **ImageElement**: Map backgrounds, handouts
- **ShapeElement**: Lines, rectangles, circles, freehand drawings
- **TextElement**: Labels and notes

Each has:
- Position (x, y)
- Layer (`map`, `gm`, `token`, `drawing`)
- Visibility (`all`, `dm`, or specific peer IDs)
- Z-index for layering
- Locked state

### Drawing Implementation

All drawing tools follow a consistent pattern:
1. `onMouseDown`: Start drawing, record initial point
2. `onMouseMove`: Update preview while drawing
3. `onMouseUp`: Save shape to game state, broadcast to peers

Points are transformed to account for viewport offset and scale:
```typescript
const x = (pos.x - viewportOffset.x) / viewportScale;
const y = (pos.y - viewportOffset.y) / viewportScale;
```

Each tool creates specific shape types:
- **Freehand**: Array of points for curved lines
- **Line**: Start and end points
- **Rectangle**: Start point + width/height
- **Circle**: Center point + radius

Live preview shown via a separate Konva Layer with the current drawing state.

### Fog of War System

Fog of War uses polygon-based reveal/hide:
- **Reveal Tool**: Creates polygon areas to reveal (brush-like)
- **Hide Tool**: Creates polygon areas to hide again
- Stored as array of polygon points in game state
- Players see black overlay except in revealed areas
- DM can toggle fog visibility to see full map

### Combat Tracker

Initiative-based combat system:
- Add combatants with name and initiative value
- Automatically sorts by initiative (descending)
- Track HP linked to token elements
- Advance turn to next combatant
- Remove defeated/fled combatants

### Dice Roller

Standard RPG dice notation parser:
- Supports `XdY` format (e.g., `2d6`, `1d20`)
- Supports modifiers (e.g., `1d20+5`, `3d6-2`)
- Shows individual die results
- Maintains roll history
- Validates input and handles errors

### IndexedDB Persistence

Uses Dexie.js for structured storage:
- Auto-save on game state changes (debounced)
- Store multiple games locally
- Full game state serialization
- Import/export as JSON files
- Survives browser refresh and closure

```typescript
// Database schema
db.games.add({
  id: gameId,
  name: gameName,
  state: gameState,
  lastModified: Date.now()
});
```

### Layer Optimization

Canvas layers consolidated to 4 (optimized from 6):
- **Background Layer**: Grid and background color
- **Map Layer**: Map images and DM-only elements
- **Drawing Layer**: All shapes, tokens, text combined
- **UI Layer**: Current drawing preview, fog of war overlay

### Known Issues & Future Improvements

1. ✅ ~~**Drawing Tools**: Only freehand works currently~~ - **FIXED**
   - All drawing tools (line, rectangle, circle) now fully implemented

2. ✅ ~~**Token Tool**: Not implemented~~ - **FIXED**
   - TokenConfigModal now allows click-to-place with full configuration

3. ✅ ~~**Text Tool**: Not implemented~~ - **FIXED**
   - Text tool now working with click-to-place

4. ✅ ~~**Measure Tool**: Not implemented~~ - **FIXED**
   - Measure tool shows distance in grid cells

5. ✅ ~~**Fog of War**: Toggle exists but no reveal/hide tools~~ - **FIXED**
   - Reveal and hide tools fully implemented

6. ✅ ~~**Ping Tool**: Broadcasts but no visual indicator~~ - **FIXED**
   - Animated pulse effect now displays

7. ✅ ~~**Layer Performance**: Canvas had 6 layers~~ - **OPTIMIZED**
   - Reduced to 4 layers for better performance

8. **Pan Tool**: Drag works but may conflict with element dragging
   - Consider hold-space-bar mode or improve gesture detection

9. **Mobile Support**: Touch events need optimization
   - Pan/zoom gestures could be improved
   - Toolbar may need mobile-friendly layout

10. **Image Upload**: Image elements exist but no UI for uploading
    - Need file picker or drag-and-drop for map images
    - Consider image hosting integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd vtt
npm install
```

### Development

```bash
npm run dev
```

Opens on `http://localhost:5174`

### Building

```bash
npm run build
```

Outputs to `dist/`

## 🎮 Usage

### As DM:
1. Click "Create Game"
2. Enter game name and your name
3. Share the QR code or room ID with players
4. **Toolbar**: Select tools to draw shapes, place tokens, add text, measure distances, reveal fog
5. **Sidebar**:
   - Add/configure tokens with TokenConfigModal
   - Manage combat tracker (initiative, HP, turns)
   - Roll dice with standard notation
   - Toggle fog of war
   - Export/import game state
6. **Canvas**: Pan (right-click drag), zoom (scroll), ping locations, move tokens
7. **Auto-save**: Game automatically saves to IndexedDB

### As Player:
1. Click "Join Game" tab
2. Scan QR code or enter room ID
3. Enter your name and pick a color
4. Click "Join Game"
5. View shared canvas, see fog of war, participate in combat tracker
6. Limited editing based on DM permissions

## 📦 Dependencies

### Core
- `react` ^18.3.1
- `react-dom` ^18.3.1
- `typescript` ^5.5.2

### Canvas & Drawing
- `konva` ^9.3.6
- `react-konva` ^18.2.10

### P2P Networking
- `trystero` ^0.20.0

### State Management
- `zustand` ^4.5.2

### UI Components
- `@mantine/core` ^7.11.0
- `@mantine/hooks` ^7.11.0

### Utilities
- `nanoid` ^5.0.7 (unique IDs)
- `qrcode.react` ^3.1.0 (QR generation)
- `html5-qrcode` ^2.3.8 (QR scanning)

### Storage
- `dexie` ^4.0.4 (IndexedDB wrapper)
- `dexie-react-hooks` ^1.1.7 (React integration)

## 🔗 Integration with Main App

Future plans:
- Import generated story scenes as map backgrounds
- Link story choices to game state
- Share character data between story mode and VTT
- Unified session management

## 📝 License

Part of the Lychgate project.

## 🤝 Contributing

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for current status and roadmap.
