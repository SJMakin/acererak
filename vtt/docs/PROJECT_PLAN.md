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
- [x] Real-time state sync (elements, fog, combat, dice)
- [x] Player cursors and ping visualization
- [x] Join/leave notifications
- [x] Connection state handling (connecting/connected/error)
- [x] Basic connection status display (badge + player count)

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

## Phase 3: P2P Reliability & State Sync (CURRENT PRIORITY)

**Context:** Code review revealed critical gaps in P2P state synchronization. The network is mesh (all peers connected), but state logic is hub-and-spoke (DM authority). This creates edge cases where state can diverge.

**Design Decisions:**
- DM remains the authority - no CRDTs needed
- Game should pause/warn if DM disconnects (not crash)
- FOW is DM-only (no conflict resolution needed)
- Simple versioning with DM override for conflicts

### Priority 1: Enhanced Connection Status
**Problem:** Basic status exists but lacks detail. No syncing/error states, no DM identification.

- [ ] Enhance status indicator (Connected / Syncing / Disconnected / Error)
- [ ] Show "last synced" timestamp
- [ ] Identify DM peer visually
- [ ] Show warning banner if DM disconnects

### Priority 2: DM Disconnect Handling
**Problem:** If DM closes browser, players are orphaned with no warning.

- [ ] Track DM peer ID in game state
- [ ] Detect DM disconnect via `onPeerLeave`
- [ ] Show modal: "DM disconnected. Game paused."
- [ ] Disable editing tools when DM gone (or warn on each action)
- [ ] Option to export current state locally as backup

### Priority 3: Element Versioning
**Problem:** Simultaneous edits cause last-write-wins race conditions.

- [ ] Add `version: number` field to CanvasElement
- [ ] Increment version on each update
- [ ] On receive: apply if `incoming.version > local.version` OR sender is DM
- [ ] DM updates always win (DM authority)

### Priority 4: Enforce DM-Only Actions
**Problem:** FOW and other DM actions not enforced - any peer can broadcast them.

- [ ] Add `isHost` check before processing FOW updates
- [ ] Log/warn if non-DM tries restricted action

### Priority 5: Grid Settings Broadcast
**Problem:** DM changes grid, players see old grid.

- [ ] Add `gridUpdate` action to P2P layer
- [ ] Broadcast grid settings when DM changes them
- [ ] Players apply received grid settings

### Priority 6: Chat System
**Problem:** No way for players to communicate in-game.

- [ ] Add chat panel in sidebar (new tab)
- [ ] Simple text messages with player name/color
- [ ] P2P broadcast via new `sendChat` action
- [ ] Messages stored in game state
- [ ] Optional: Whisper to DM only (visibility flag)

### Priority 7: Player State Persistence (Optional)
**Problem:** Players lose all data on disconnect/refresh.

- [ ] Allow players to cache game snapshot to IndexedDB
- [ ] On rejoin, preload cached state then request sync
- [ ] Show "last synced at..." in lobby for cached games

### Known Issues (Lower Priority)
- [ ] Undo/redo is local-only (not synced to peers)
- [ ] No cursor throttling (broadcasts every mouse move)
- [ ] No retry logic for failed broadcasts
- [ ] Dice history not persisted (lost on refresh)
- [ ] Full element objects broadcast on every move (no delta optimization)
- [ ] Import/export doesn't immediately update peers

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
| v1.6.0 | P2P Reliability | *(Next)* Connection status, DM disconnect, chat |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
