# Lychgate VTT - Project Plan & Status

## Overview

A **decentralized P2P Virtual Tabletop** - the VTT they can't turn off.

**Architecture Principles:**
1. **No server** - All data flows peer-to-peer via WebRTC
2. **DM authority** - DM's browser is source of truth (no CRDTs needed)
3. **URL-based assets** - Images via external URLs (no file hosting)
4. **Client-side storage** - IndexedDB for persistence, JSON for export
5. **Minimal dependencies** - Keep bundle small for fast P2P sync

---

## Completed Features

### Core Infrastructure
- [x] Vite + React + TypeScript project setup
- [x] Zustand state management
- [x] Mantine UI component library
- [x] Konva.js canvas rendering (4 optimized layers)

### P2P Networking
- [x] Trystero integration (Torrent strategy with Node.js polyfills)
- [x] WebRTC peer connections with STUN/TURN servers
- [x] Room creation/joining via ID or QR code
- [x] Real-time state sync (elements, fog, combat, dice, chat)
- [x] Player cursors and ping visualization
- [x] Join/leave notifications
- [x] Enhanced connection state (connected/syncing/disconnected/error)
- [x] DM disconnect detection with warning modal
- [x] Desync detection via state hash comparison
- [x] Element versioning for conflict resolution
- [x] DM-only action enforcement (FOW, grid settings)
- [x] Grid settings broadcast
- [x] In-game chat with whisper (DM-only) support

### Canvas & Tools
- [x] Grid rendering (square, hex, gridless with configurable size/color/opacity)
- [x] Pan & zoom controls
- [x] Drawing tools: freehand, line, rectangle, circle, ellipse, polygon, arrow
- [x] Token placement with configuration modal
- [x] Text labels with styling
- [x] Measure tool with waypoints and difficult terrain modifier
- [x] Ping tool (animated visual indicator)
- [x] Fog of War (reveal/hide tools)
- [x] Area Effect Templates: circle, cone, triangle, line, square (color-coded)

### Token System
- [x] Drag-to-move with grid snapping
- [x] Properties: name, HP, AC, conditions, size, notes
- [x] HP bar visualization
- [x] AC badge display
- [x] Condition badges
- [x] DM-only visibility option
- [x] Current turn indicator (combat)

### Combat Tracker
- [x] Initiative tracking and sorting
- [x] Round counter
- [x] Turn advancement (next/previous)
- [x] HP sync with tokens
- [x] Add/remove combatants
- [x] P2P sync

### Dice Roller
- [x] Formula parser (e.g., `2d6+3`, `1d20+5`)
- [x] Quick roll buttons (d4-d100)
- [x] Advantage/disadvantage
- [x] Roll history
- [x] P2P broadcast

### Property Inspector
- [x] Position editing (X, Y)
- [x] Z-index controls (bring forward/send backward)
- [x] Visibility toggle (all/DM only)
- [x] Lock toggle
- [x] Token properties (name, HP, AC, size, conditions, notes)
- [x] Shape properties (stroke color, fill color, stroke width)
- [x] Text properties (font, size, color, alignment, background)

### Persistence & Data Management
- [x] Auto-save to IndexedDB (DM only)
- [x] Recent games list in lobby
- [x] Export/Import with selective categories (v2 format)
- [x] Merge vs replace import modes
- [x] Token & Map Library with IndexedDB storage
- [x] 8 default token templates (Goblin, Orc, Skeleton, etc.)
- [x] Markdown notes on tokens, images, and standalone campaign journal

### UI/UX
- [x] Toolbar with professional icons (Tabler)
- [x] Drawing style controls (stroke/fill color, width)
- [x] Undo/redo functionality
- [x] Copy/paste elements
- [x] Keyboard shortcuts
- [x] Settings modal (grid, tokens, preferences)
- [x] Preview as player mode (DM)
- [x] Layer visibility controls (toggle grid, map, tokens, drawings, text, fog)
- [x] Marquee/box selection (multi-select)
- [x] Shift+click to add to selection
- [x] Batch move/delete for multiple elements

---

## Phase 3: P2P Reliability & State Sync (COMPLETED)

**Context:** Code review revealed critical gaps in P2P state synchronization. The network is mesh (all peers connected), but state logic is hub-and-spoke (DM authority). This creates edge cases where state can diverge.

**Design Decisions:**
- DM remains the authority - no CRDTs needed
- Game should pause/warn if DM disconnects (not crash)
- FOW is DM-only (no conflict resolution needed)
- Simple versioning with DM override for conflicts

### Priority 1: Enhanced Connection Status ✅
- [x] Enhanced status indicator (Connected / Syncing / Disconnected / Error)
- [x] Show "last synced" timestamp in RoomState
- [x] Track DM peer ID visually
- [x] Warning banner when DM disconnects

### Priority 2: DM Disconnect Handling ✅
- [x] Track DM peer ID in game state (`dmPeerId`)
- [x] Detect DM disconnect via `onPeerLeave`
- [x] Show notification: "DM has left the game. The session is paused."
- [x] `dmDisconnected` flag in RoomState for UI warnings

### Priority 3: Desync Detection & Recovery ✅
- [x] Fixed element ID preservation bug in P2P sync (`addOrUpdateElement`)
- [x] State hash comparison using djb2 hash of game state
- [x] `isDesynced`, `localHash`, `dmHash` in RoomState
- [x] `requestFullSync()` function for players to request sync
- [x] Visual warning when state diverges from DM

### Priority 4: Element Versioning ✅
- [x] Added `version?: number` field to BaseElement
- [x] Increment version on each update
- [x] Conflict resolution: apply if `incoming.version >= local.version`
- [x] DM updates always win (DM authority)

### Priority 5: Enforce DM-Only Actions ✅
- [x] `isHost` check before processing FOW updates
- [x] `isHost` check before processing grid updates
- [x] Console warning if non-DM tries restricted action

### Priority 6: Grid Settings Broadcast ✅
- [x] Added `gridUpd` action to P2P layer (<=12 bytes for Trystero)
- [x] `broadcastGridSettings()` function for DM
- [x] Players apply received grid settings via `onGridUpdate` handler

### Priority 7: Chat System ✅
- [x] Chat tab in sidebar with ChatPanel component
- [x] Text messages with player name/color/timestamp
- [x] P2P broadcast via `sendChat` action
- [x] Messages stored in `game.chatMessages` (last 100)
- [x] Whisper to DM only (`isDMOnly` flag)

### Future Enhancements (Lower Priority)
- [ ] Player state persistence (cache game snapshot to IndexedDB)
- [ ] Undo/redo sync to peers
- [ ] Cursor throttling (broadcasts every mouse move)
- [ ] Retry logic for failed broadcasts
- [ ] Dice history persistence
- [ ] Delta optimization for element updates
- [ ] Import/export immediate peer sync

---

## Phase 4: Canvas & Tools Enhancements (ON HOLD)

*Lower priority than P2P reliability*

### Future Enhancements
- [ ] Layer dropdown in Property Inspector (manually move elements between layers)
- [ ] Token rotation control
- [ ] Aura/radius indicator option
- [ ] Status effect icons (expanded set)

---

## Phase 5: Quality of Life (ON HOLD)

### Canvas Improvements
- [ ] Minimap in corner
- [ ] Fit-to-content button
- [ ] Center on selected element
- [ ] Alignment guides when moving elements

### Combat Tracker
- [ ] Drag to reorder initiative
- [ ] Roll initiative button (auto-roll d20)
- [ ] Timer per turn (optional)
- [ ] Delay/ready actions

### Dice Roller
- [ ] Save favorite formulas
- [ ] Roll macros (save full roll sequences)
- [ ] Secret rolls (DM only)
- [ ] Target number highlighting

---

## Phase 6: Technical Improvements (ON HOLD)

### Performance
- [ ] Virtual rendering for large element counts
- [ ] Debounce P2P updates during rapid changes
- [ ] Image caching optimization

### Mobile Support
- [ ] Touch gesture optimization (pinch zoom, two-finger pan)
- [ ] Mobile-friendly toolbar layout
- [ ] Responsive sidebar
- [ ] Touch-friendly element selection

### Testing
- [ ] Unit tests for gameStore actions
- [ ] Unit tests for diceParser
- [ ] E2E tests for create/join flow
- [ ] P2P connection stability tests

---

## Phase 7: Main App Integration (ON HOLD)

- [ ] Import generated scene as VTT background (via URL)
- [ ] Share character data between apps
- [ ] Deploy as integrated module
- [ ] Unified visual theme

---

## Out of Scope (Architecture Constraints)

These features don't fit the decentralized design:

- **File upload hosting** - No server (use external URLs)
- **User accounts** - No backend for authentication
- **Real-time cross-device sync** - Sessions are per-device (use export/import)
- **Audio file hosting** - No server (external URLs possible)
- **Server-side automation** - All logic runs client-side
- **Cloud backup** - No central storage (local IndexedDB + file exports)

---

## Success Metrics

- **Concurrent players**: 6-8 per session
- **P2P latency**: <100ms
- **Load time**: <3s
- **Bundle size**: <1MB
- **Browser support**: Chrome, Firefox, Safari, Edge

---

## Version History

| Version | Focus | Key Features |
|---------|-------|--------------|
| v1.0.0 | MVP | Core VTT, P2P networking, combat tracker, dice roller |
| v1.1.0 | Asset Management | Token library, 8 default templates, marquee selection |
| v1.2.0 | Notes System | Markdown notes, campaign journal |
| v1.3.0 | Export/Import | Selective export, merge/replace modes, v2 format |
| v1.4.0 | Canvas | Hex/gridless, AOE templates, multi-select operations |
| v1.5.0 | Measurement | Waypoint paths, difficult terrain modifier |
| v1.6.0 | P2P Reliability | Connection status, DM disconnect, desync detection, element versioning, chat |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
