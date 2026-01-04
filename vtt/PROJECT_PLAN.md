# Acererak VTT - Project Plan & Status

## 🎉 Recently Completed (2026-01-04)

### Major Features Implemented
- ✅ **Token Placement Tool** - Click-to-place tokens with [`TokenConfigModal.tsx`](vtt/src/components/TokenConfigModal.tsx)
  - Modal configuration for new tokens (name, HP, AC, image, size)
  - Click on canvas to place configured token
  - Snaps to grid when grid snapping is enabled
  - Broadcasts token placement to all peers
  
- ✅ **Layer Consolidation** - Reduced from 6 layers to 4 layers for better performance
  - BackgroundAndGrid layer (listening: false)
  - StaticElements layer (Map + locked elements)
  - InteractiveElements layer (Shapes + Tokens)
  - Overlay layer (Pings + Cursors + CurrentDrawing)
  - Eliminated Konva performance warnings
  
- ✅ **Fog of War System** - Full implementation with reveal and hide tools
  - Fog reveal tool for drawing revealed areas
  - Fog hide tool for re-covering areas
  - Semi-transparent black overlay
  - Polygon-based reveal areas with destination-out compositing
  - DM-only controls, players see revealed fog state
  
- ✅ **IndexedDB Persistence** - Complete local storage system using Dexie
  - Auto-save game state on changes
  - Recent games list in lobby (10 most recent)
  - Load saved games from lobby
  - Database schema with games table
  - Automatic timestamp tracking
  
- ✅ **Combat Tracker** - Full-featured combat management in [`CombatTracker.tsx`](vtt/src/components/CombatTracker.tsx)
  - Initiative tracking and sorting
  - Round counter
  - Current turn highlighting
  - HP tracking synced with tokens
  - Condition markers
  - Add/remove combatants
  - Start/stop combat
  - Next/previous turn navigation
  - P2P sync for all combat state
  
- ✅ **Dice Roller** - Comprehensive dice system in [`DiceRoller.tsx`](vtt/src/components/DiceRoller.tsx)
  - Formula parser for complex rolls (e.g., "2d6+3", "1d20+5")
  - Quick roll buttons (d4, d6, d8, d10, d12, d20, d100)
  - Advantage/disadvantage support
  - Roll history with results
  - P2P broadcast to all players
  - Visual breakdown of roll components
  - Implemented in [`diceParser.ts`](vtt/src/services/diceParser.ts)

## 🎯 Project Goals

Build a **fully decentralized virtual tabletop** for TTRPGs where:
1. No backend server stores or routes game data
2. Peer-to-peer connections handle all real-time sync
3. DM's browser acts as source of truth
4. Players join via QR codes (easy mobile access)
5. Minimal, practical feature set for playing D&D online
6. Client-side storage only (IndexedDB, file exports)
7. Future integration with parent Acererak story generator app

## ✅ Completed Features (MVP Phase 1)

### Core Infrastructure
- [x] Project setup (Vite + React + TypeScript)
- [x] TypeScript types for all game entities
- [x] Zustand store for game state management
- [x] Mantine UI component library integration
- [x] Development environment configured

### P2P Networking
- [x] Trystero integration (BitTorrent strategy)
- [x] `useRoom` hook for P2P room management
- [x] Room creation with unique IDs
- [x] Room joining via room ID
- [x] Peer discovery and WebRTC connection
- [x] Action name byte limit fixes (<= 12 bytes)
- [x] Game state broadcast on peer join
- [x] Element update broadcasting
- [x] Element delete broadcasting
- [x] Player join/leave notifications
- [x] Cursor position broadcasting (implemented but not visualized)

### UI/UX
- [x] Lobby screen (create/join game)
- [x] QR code generation for room sharing
- [x] QR code display in lobby
- [x] Toolbar with tool selection
- [x] Sidebar with tabs (Tokens, Players, DM Tools)
- [x] Connection status indicator
- [x] Player count display
- [x] Responsive layout (AppShell)

### Canvas & Rendering
- [x] Konva.js canvas setup
- [x] Grid rendering (configurable size, color)
- [x] Grid toggle
- [x] Snap to grid toggle
- [x] Pan (drag canvas when pan tool selected)
- [x] Zoom (mouse wheel)
- [x] Viewport offset and scale management
- [x] Multi-layer rendering (optimized to 4 layers)
- [x] Element sorting by layer and z-index

### Drawing Tools
- [x] Freehand draw tool (✏️) **WORKING**
  - [x] Mouse/touch event handlers
  - [x] Live preview while drawing
  - [x] Save to game state on mouse up
  - [x] Broadcast drawings to peers
  - [x] Viewport transformation handling
- [x] Tool selection in toolbar
- [x] Tool-specific cursor styles
- [x] Line tool **WORKING** - 2-point lines with preview
- [x] Rectangle tool **WORKING** - corner-to-corner with proper dimensions
- [x] Circle tool **WORKING** - center + radius drawing
- [x] Ping visualization **WORKING** - animated expanding circles with fade-out

### Token System
- [x] Token data model (name, HP, AC, image, size, conditions)
- [x] Token rendering (circular with image or placeholder)
- [x] Token dragging
- [x] HP bar visualization
- [x] Name label rendering
- [x] DM-only indicator badge
- [x] Add token form in sidebar
- [x] Token list in sidebar
- [x] Delete token button
- [x] Token selection highlighting
- [x] Snap to grid for token movement
- [x] Token tool for click-to-place - **✅ IMPLEMENTED** (2026-01-04)
  - [x] TokenConfigModal for token configuration
  - [x] Click-to-place on canvas
  - [x] Token placement with snap-to-grid support

### Element Management
- [x] Shape element rendering (freehand, line, rectangle, circle, polygon)
- [x] Image element rendering
- [x] Text element rendering  
- [x] Element selection
- [x] Element deletion
- [x] Element visibility controls (all/DM/specific players)
- [x] Element locking

### DM Tools
- [x] DM role detection
- [x] Visibility control dropdown
- [x] Lock element checkbox
- [x] Delete element button
- [x] Fog of war toggle
- [x] Fog reveal tool - **✅ IMPLEMENTED** (2026-01-04)
- [x] Fog hide tool - **✅ IMPLEMENTED** (2026-01-04)

### Data Persistence
- [x] Export game to JSON file
- [x] Import game from JSON file
- [x] File download functionality
- [x] File upload functionality
- [x] Auto-save to IndexedDB - **✅ IMPLEMENTED** (2026-01-04)
  - [x] Dexie database integration
  - [x] Auto-save on game state changes
  - [x] Database schema definition in [`database.ts`](vtt/src/db/database.ts)
- [x] Recent games list - **✅ IMPLEMENTED** (2026-01-04)
  - [x] Load recent games in lobby
  - [x] Display last 10 games by update time
  - [x] One-click load saved games

### Combat System
- [x] Combat tracker component - **✅ IMPLEMENTED** (2026-01-04)
- [x] Initiative tracking
- [x] Turn order management
- [x] Round counter
- [x] HP tracking synced with tokens
- [x] Condition markers
- [x] Start/stop combat controls
- [x] P2P combat state sync

### Dice System
- [x] Dice roller component - **✅ IMPLEMENTED** (2026-01-04)
- [x] Formula parser (2d6+3, etc.)
- [x] Quick roll buttons (d4-d100)
- [x] Advantage/disadvantage support
- [x] Roll history
- [x] P2P roll broadcast
- [x] Visual result breakdown

## 🚧 Known Issues & Bugs

### ~~High Priority~~ (All Fixed! 🎉)
1. ~~**Drawing tools (line, rectangle, circle) don't work properly**~~ **✅ FIXED**
   - ✅ Line tool now draws 2-point lines with preview
   - ✅ Rectangle tool draws corner-to-corner with proper dimensions
   - ✅ Circle tool draws from center with radius (fixed rendering offset)
   - ✅ Background layer set to `listening={false}` for proper click detection

2. ~~**Token tool doesn't work**~~ **✅ FIXED** (2026-01-04)
   - ✅ Token tool now opens TokenConfigModal
   - ✅ Configure token properties (name, HP, AC, image URL, size)
   - ✅ Click-to-place on canvas with grid snapping
   - ✅ Broadcasts to all peers

3. ~~**Text tool doesn't work**~~ **✅ FIXED**
   - ✅ Click-to-place text on canvas
   - ✅ Prompt for text content
   - ✅ Text element creation and broadcasting
   - ✅ Renders with customizable font size and color

4. ~~**Measure tool doesn't work**~~ **✅ FIXED**
   - ✅ Click and drag shows temporary line
   - ✅ Displays distance in grid cells (feet)
   - ✅ Dashed green line with distance label
   - ✅ Clears on mouse up (doesn't save to game state)

5. ~~**Ping tool broadcasts but shows nothing**~~ **✅ FIXED**
   - ✅ Animated expanding circles with color coding
   - ✅ Auto-removes after 2 seconds
   - ✅ Fixed Background layer to allow ping clicks on Stage

6. ~~**Konva performance warning**~~ **✅ FIXED** (2026-01-04)
   - ✅ Reduced from 6 layers to 4 layers
   - ✅ BackgroundAndGrid (listening: false)
   - ✅ StaticElements (Map + locked elements)
   - ✅ InteractiveElements (Shapes + Tokens)
   - ✅ Overlay (Pings + Cursors + CurrentDrawing)
   - ✅ No more performance warnings

7. ~~**No cursor visualization for other players**~~ **✅ FIXED**
   - ✅ Cursor positions are broadcast
   - ✅ Rendered on canvas with player color and name
   - ✅ Shows colored cursors with player names in labeled boxes
   - ✅ Implemented in [`GameCanvas.tsx`](vtt/src/components/GameCanvas.tsx) (2026-01-04)

8. ~~**No visual feedback for players joining/leaving**~~ **✅ FIXED**
   - ✅ Events fire and show toast notifications
   - ✅ Shows "Player X joined/left" with color-coded messages
   - ✅ Uses @mantine/notifications for UI
   - ✅ Implemented in [`useRoom.ts`](vtt/src/hooks/useRoom.ts) (2026-01-04)

### Medium Priority
9. **Pan tool conflicts with element dragging**
   - Both use drag events
   - Need better UX (hold spacebar for pan?)
   - Or make pan mode lock element dragging

### Low Priority
10. **No QR scanner for mobile**
    - QR code display works
    - No built-in scanner (html5-qrcode installed but not used)
    - Players must manually type room ID

11. **No image URL validation**
    - Token/image URLs not validated
    - Broken images show as blank
    - Need error handling and placeholder

12. **Grid settings not exposed in UI**
    - Grid size, color hardcoded in defaults
    - Toggle works but can't customize
    - Need settings modal

## 📋 TODO - Next Phase

### ~~Priority 1: Fix Existing Tools~~ ✅ COMPLETED

**All drawing tools now work correctly:**
- ✅ **Line tool**: Stores start point on mouseDown, updates end point on mouseMove, saves 2-point line
- ✅ **Rectangle tool**: Calculates width/height from start to current, renders with proper dimensions
- ✅ **Circle tool**: Calculates radius from center, fixed Shape component rendering offset
- ✅ **Ping visualization**: Animated expanding circles, 2-second fade-out, working click detection

**Key implementation changes in [`GameCanvas.tsx`](vtt/src/components/GameCanvas.tsx):**
- Added `drawStartPoint` state to track drawing start position
- Shape tools only update end point during mouseMove (not append like freehand)
- Fixed Shape component circle rendering (removed `+ radius` offset at position)
- Set Background Layer to `listening={false}` for ping click detection on Stage

### ~~Priority 2: Token Placement Tool~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Implemented in TokenConfigModal.tsx and GameCanvas.tsx:
// - Token tool shows modal to configure new token
// - Set name, HP, AC, image URL, size
// - Click on canvas to place at location
// - Snaps to grid when grid snapping enabled
// - Broadcasts token to all peers via addElement action
```

### ~~Priority 3: Text & Measure Tools~~ ✅ COMPLETED

```typescript
// ✅ Text Tool - Implemented in GameCanvas.tsx:
// - Click with text tool on canvas
// - Prompt for text content (window.prompt)
// - Create TextElement with default styling (24px, white, sans-serif)
// - Broadcast to peers
// - Renders on all clients with TextLabel component

// ✅ Measure Tool - Implemented in GameCanvas.tsx (2026-01-04):
// - Mouse down records start point and sets measureStart/measureEnd state
// - Mouse move updates measureEnd point to show live preview
// - Mouse up clears measureStart/measureEnd (temporary, not saved)
// - Distance calculated as: Math.sqrt(dx² + dy²) / cellSize
// - Renders dashed green line with centered distance label
```

### ~~Priority 4: Player Cursors~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Implemented in GameCanvas.tsx:
// - Get other players with cursor positions from game.players
// - Filter out own player ID
// - Render cursor arrow with player color
// - Show name label next to cursor

const otherPlayerCursors = game?.players
  ? Object.values(game.players)
      .filter((p) => p.id !== myPeerId && !!p.cursor)
  : [];
```

### ~~Priority 5: Fog of War~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Implemented in GameCanvas.tsx:
// - Fog reveal tool draws freehand polygon areas
// - Fog hide tool re-covers areas
// - Fog rendered as semi-transparent black overlay (rgba(0,0,0,0.7))
// - Revealed areas cut out using destination-out compositing
// - Toggle in DM Tools sidebar
// - P2P sync for fog state
// - Players see revealed areas, cannot edit
```

### ~~Priority 6: IndexedDB Persistence~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Implemented in database.ts using Dexie:
class GameDatabase extends Dexie {
  games!: Table<GameState>;
  
  constructor() {
    super('AcerekVTT');
    this.version(1).stores({
      games: 'id, name, updatedAt'
    });
  }
}

// ✅ Auto-save implemented in App.tsx:
useEffect(() => {
  if (game && !isLoading) {
    db.games.put({
      ...game,
      updatedAt: Date.now()
    });
  }
}, [game]);

// ✅ Load recent games in Lobby.tsx:
const recentGames = await db.games
  .orderBy('updatedAt')
  .reverse()
  .limit(10)
  .toArray();
```

### ~~Priority 7: Combat Tracker~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Implemented in CombatTracker.tsx and gameStore.ts:
// - Add combatants from tokens
// - Initiative input for each combatant
// - Automatic sorting by initiative (descending)
// - Next/previous turn buttons
// - Round counter
// - Current turn highlighting
// - HP tracking synced with token elements
// - Condition markers
// - Start/stop combat controls
// - Remove combatants
// - P2P sync for all combat state
```

### ~~Priority 8: Dice Roller~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Implemented in DiceRoller.tsx and diceParser.ts:
// - Quick roll buttons (d4, d6, d8, d10, d12, d20, d100)
// - Custom formula input parser (e.g., "2d6+3", "1d20+5")
// - Advantage/disadvantage buttons
// - Roll history display
// - Visual breakdown of roll components
// - Broadcast rolls to all players via P2P
// - Parser supports: XdY+Z, advantage, disadvantage, modifiers
```

### Priority 9: 5etools Integration (Future)

```typescript
// Monster/spell import
async function import5etools(name: string, type: 'monster' | 'spell') {
  const response = await fetch(
    `https://5e.tools/data/${ type === 'monster' ? 'bestiary' : 'spells'}/*.json`
  );
  const data = await response.json();
  const entry = data.find(e => e.name.toLowerCase() === name.toLowerCase());
  
  if (type === 'monster') {
    return {
      type: 'token',
      name: entry.name,
      hp: { current: entry.hp.average, max: entry.hp.average },
      ac: entry.ac[0],
      imageUrl: `https://5e.tools/img/${entry.source}/${entry.name}.png`,
      notes: formatStatBlock(entry)
    };
  }
}
```

## 🎨 UI/UX Improvements Needed

### Toolbar
- [ ] Tool icons instead of emoji (more professional)
- [ ] Tooltips showing keyboard shortcuts
- [ ] Tool grouping (select/pan, draw tools, utility)
- [ ] Color picker for drawing tools
- [ ] Line width selector
- [ ] Undo/redo buttons

### Sidebar
- [ ] Collapsible sections  
- [ ] Search/filter tokens
- [ ] Bulk operations (select multiple, delete)
- [ ] Token thumbnails instead of just text
- [ ] Player avatars
- [ ] Context menu on right-click

### Canvas
- [ ] Minimap in corner
- [ ] Ruler guides when dragging
- [ ] Selection box (drag to select multiple)
- [ ] Copy/paste elements
- [ ] Keyboard shortcuts (Delete, Ctrl+C/V, etc.)
- [ ] Grid alignment indicators

### Settings Modal
- [ ] Grid size (cells)
- [ ] Cell size (pixels)
- [ ] Grid color
- [ ] Background color
- [ ] Default token size
- [ ] Auto-save interval
- [ ] Quality settings (layer limits)

## 🔄 Refactoring Opportunities

### ~~1. Layer Consolidation~~ ✅ COMPLETED (2026-01-04)

```typescript
// ✅ Consolidated from 6 layers to 4 layers in GameCanvas.tsx:
// Old structure (6 layers):
// Background, Grid, Map, Shapes, Tokens, CurrentDrawing

// ✅ New structure (4 layers):
BackgroundAndGrid (listening: false)  // Combined background + grid
StaticElements (Map + locked elements, listening: false)  
InteractiveElements (Shapes + Tokens, listening: true)
Overlay (CurrentDrawing + Pings + Cursors, listening: false)

// Performance warning eliminated
```

### 2. Extract Drawing Logic

Create separate hook:
```typescript
// hooks/useDrawing.ts
export function useDrawing(tool: ToolType, onComplete: (element) => void) {
  // Handle all drawing logic
  // Return: isDrawing, preview, handlers
}
```

### 3. Element Components

Create reusable element components:
```typescript
// components/canvas/Token.tsx (already exists)
// components/canvas/Shape.tsx (already exists)
// components/canvas/MapImage.tsx (already exists)
// components/canvas/TextLabel.tsx (already exists)

// Add:
// components/canvas/Cursor.tsx
// components/canvas/Ping.tsx
// components/canvas/FogOfWar.tsx
```

### 4. Separate Concerns  

```typescript
// GameCanvas is too large (700+ lines)
// Split into:
// - useCanvasHandlers hook (mouse events)
// - useViewport hook (pan/zoom)
// - useDrawing hook (drawing logic)
// - RenderLayers component (layer rendering)
```

## 📊 Testing Strategy

### Unit Tests (Not Started)
- [ ] gameStore actions
- [ ] useRoom hook actions
- [ ] diceParser formula parsing
- [ ] Viewport transformation math

### Integration Tests (Not Started)
- [ ] Create game → join game flow
- [ ] Draw on canvas → peers receive update
- [ ] Add token → appears on other clients
- [ ] Export/import game integrity
- [ ] Combat tracker state sync

### E2E Tests (Not Started)
- [ ] Full gameplay session
- [ ] Multi-peer connection stability
- [ ] Offline then reconnect behavior

## 🚀 Deployment Plan

### Phase 1: Local Development
- [x] Vite dev server
- [x] Hot module replacement
- [ ] Local HTTPS (for WebRTC testing on network)

### Phase 2: Static Hosting
- [ ] Build optimized bundle
- [ ] Deploy to GitHub Pages / Vercel / Netlify
- [ ] Configure for SPA routing
- [ ] Add meta tags for social sharing

### Phase 3: PWA (Future)
- [ ] Service worker for offline capability
- [ ] Web app manifest
- [ ] Install prompt
- [ ] Background sync

## 🔗 Integration with Main Acererak App

### Shared Components
- Dice roller (can be shared between apps)
- Character sheet system (future)
- Story generator scenes as VTT maps

### Data Flow
```
Story Mode (main app)
  ↓
Generate scene description + battle map
  ↓
Export as VTT-compatible JSON
  ↓
Import into VTT
  ↓
Play encounter on grid
  ↓
Story continues based on combat outcome
```

### Unified Session
- Single user account (future)
- Shared character data
- Campaign progression tracking
- Linked AI-generated content

## 📝 Documentation Needed

- [ ] API documentation for game state structure
- [ ] Contributing guide
- [ ] Architecture decision records (ADRs)
- [ ] User manual / tutorial
- [ ] Video walkthrough
- [ ] Keyboard shortcuts reference

## 🎯 Success Metrics (Future)

- Concurrent players per session (target: 6-8)
- Session stability (uptime %)
- Latency between peers (target: <100ms)
- Load time (target: <3s)
- Bundle size (target: <1MB)
- Browser compatibility (Chrome, Firefox, Safari, Edge)

## 🤝 Need Help With

**Current Status: MVP Feature Complete!** 🎉

All major planned features have been implemented successfully:

1. ~~**Start with fixing existing tools**~~ ✅ Drawing tools are fixed
2. ~~**Test drawing tools thoroughly**~~ ✅ Line, rectangle, circle, ping all working
3. ~~**Add player cursor visualization**~~ ✅ Cursors now rendered with player names
4. ~~**Add player join/leave notifications**~~ ✅ Toast notifications implemented
5. ~~**Implement token placement tool**~~ ✅ TokenConfigModal complete
6. ~~**Consolidate layers**~~ ✅ Reduced to 4 layers, no warnings
7. ~~**Fog of War**~~ ✅ Reveal and hide tools implemented
8. ~~**IndexedDB persistence**~~ ✅ Auto-save and recent games working
9. ~~**Combat Tracker**~~ ✅ Full combat management system
10. ~~**Dice Roller**~~ ✅ Formula parser and P2P sync complete

**Next Phase Recommendations:**
- Write comprehensive test coverage (unit, integration, E2E)
- Add UI/UX improvements (professional icons, tooltips, keyboard shortcuts)
- Implement 5etools integration for monster/spell import
- Add undo/redo functionality
- Mobile touch gesture optimization
- Performance profiling with many elements
- Settings modal for grid customization
- Deployment to production hosting

## 🔥 Critical Issues Found in Testing (2026-01-04)

### High Priority Fixes Needed
1. **Ping tool doesn't work over shapes**
   - Pings only work on empty canvas areas
   - Need to fix z-index or event propagation
   - Possibly related to layer listening settings

2. **Shape tool needs improvements**
   - No color picker for shapes
   - No fill vs stroke options
   - Limited shape types (need ellipse, polygon, etc.)
   - Cannot change properties after creation

3. **Text tool needs major improvements**
   - Currently just places simple text
   - Need proper text boxes with background
   - Need font selector
   - Need font size controls
   - Need text color picker
   - Cannot edit text after placement

4. **Elements not selectable/editable**
   - Shapes, lines, text cannot be selected after creation
   - Cannot move existing shapes/text
   - Cannot delete individual shapes/text
   - Need selection system for all element types

5. **No layer visibility controls**
   - All layers always visible
   - DM cannot preview what players see
   - Need layer toggle in UI (show/hide map, tokens, drawings, etc.)

6. **Token metadata not visible**
   - HP bars mentioned in settings but not displayed on canvas
   - AC not shown
   - Token properties only in sidebar list
   - Need visual metadata overlays

7. **No property inspector**
   - Cannot edit element properties after creation
   - Need property grid/panel in sidebar
   - Show properties of selected element
   - Allow editing: color, size, text, HP, etc.

8. **Professional icons needed**
   - Currently using emoji for tools
   - Need Tabler Icons integration
   - More professional appearance

## 📋 TODO - Phase 2 (Quality & Usability)

### Priority 1: Fix Ping Tool
- [ ] Fix ping click detection over shapes
- [ ] Test ping on all layer types
- [ ] Ensure pings appear above all other elements

### Priority 2: Property Inspector Panel
- [ ] Create PropertyPanel.tsx component
- [ ] Show in sidebar when element selected
- [ ] Display element type, position, size
- [ ] Editable fields for all properties
- [ ] Real-time updates and P2P sync

### Priority 3: Enhanced Shape Tool
- [ ] Add color picker to toolbar
- [ ] Add fill/stroke toggle
- [ ] Add stroke width selector
- [ ] Add more shapes (ellipse, polygon, arrow)
- [ ] Live preview with selected color

### Priority 4: Text Box System
- [ ] Replace simple text with text boxes
- [ ] Add background rectangle option
- [ ] Font family selector
- [ ] Font size selector
- [ ] Text color picker
- [ ] Text alignment options
- [ ] Edit mode (double-click to edit)

### Priority 5: Universal Element Selection
- [ ] Make all shapes selectable (not just tokens)
- [ ] Make text selectable
- [ ] Make lines selectable
- [ ] Move/drag functionality for all elements
- [ ] Delete key removes selected element
- [ ] Visual selection indicators

### Priority 6: Layer Visibility Controls
- [ ] Layer toggle checkboxes in sidebar
- [ ] Show/hide: Map, Grid, Tokens, Drawings, Fog
- [ ] DM Preview mode (see as player)
- [ ] Per-layer opacity sliders

### Priority 7: Token Visual Metadata
- [ ] HP bar display on tokens
- [ ] AC badge display
- [ ] Conditions icons
- [ ] Size visual (1x1, 2x2, etc.)
- [ ] Optional: Hover tooltip with full stats

### Priority 8: Professional Icons
- [ ] Install @tabler/icons-react
- [ ] Replace all emoji in Toolbar
- [ ] Replace emoji in sidebar tabs
- [ ] Consistent icon sizing
- [ ] Icon tooltips

## 📞 Next Steps

**Immediate focus:** Address critical usability issues found in testing
**Target:** Production-ready VTT with professional UX
**Timeline:** Complete Phase 2 improvements before deployment
