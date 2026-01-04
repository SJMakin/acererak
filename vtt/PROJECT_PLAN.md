# Acererak VTT - Project Plan & Status

## 🎉 MVP Complete!

The core VTT is fully functional with all essential features implemented. This document now tracks polish, optimization, and future enhancements.

## 🏗️ Architecture Principles

This is a **decentralized P2P VTT** - design decisions must respect:

1. **No server** - All data flows peer-to-peer via WebRTC
2. **DM authority** - DM's browser is source of truth
3. **URL-based assets** - Images via external URLs (no file hosting)
4. **Client-side storage** - IndexedDB for persistence, JSON for export
5. **Minimal dependencies** - Keep bundle small for fast P2P sync

## ✅ Completed Features

### Core Infrastructure
- [x] Vite + React + TypeScript project setup
- [x] Zustand state management
- [x] Mantine UI component library
- [x] Konva.js canvas rendering (4 optimized layers)

### P2P Networking (untested)
- [x] Trystero integration (BitTorrent strategy)
- [x] WebRTC peer connections
- [x] Room creation/joining via ID or QR code (need to do QR UI)
- [x] Real-time state sync (elements, fog, combat, dice)
- [x] Player cursors and ping visualization
- [x] Join/leave notifications

### Canvas & Tools
- [x] Grid rendering (configurable size, color, snap)
- [x] Pan & zoom controls
- [x] Drawing tools: freehand, line, rectangle, circle, ellipse, polygon, arrow
- [x] Token placement with configuration modal
- [x] Text labels with styling
- [x] Measure tool (distance in grid units)
- [x] Ping tool (animated visual indicator)
- [x] Fog of War (reveal/hide tools)

### Token System
- [x] Drag-to-move with grid snapping
- [x] Properties: name, HP, AC, conditions, size
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
- [x] Token properties (name, HP, AC, size, conditions)
- [x] Shape properties (stroke color, fill color, stroke width)
- [x] Text properties (font, size, color, alignment, background)

### Persistence
- [x] Auto-save to IndexedDB
- [x] Recent games list in lobby
- [x] Export game as JSON
- [x] Import game from JSON

### UI/UX
- [x] Toolbar with professional icons (Tabler)
- [x] Drawing style controls (stroke/fill color, width)
- [x] Undo/redo functionality
- [x] Copy/paste elements
- [x] Keyboard shortcuts
- [x] Settings modal (grid, tokens, preferences)
- [x] Preview as player mode (DM)

## 🚀 Phase 2: Asset Management & Persistence

### Priority 1: Token & Map Library

**Problem:** No way to reuse tokens/maps across sessions.

**Solution:** File-based library system stored in IndexedDB with JSON export/import.

**Data Model:**
```typescript
interface LibraryItem {
  id: string;
  type: 'token' | 'map' | 'scene';
  name: string;
  description?: string;  // Markdown-enabled
  notes?: string;        // Markdown WYSIWYG content
  data: TokenElement | ImageElement | SceneExport;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Library {
  tokens: LibraryItem[];
  maps: LibraryItem[];
  scenes: LibraryItem[];
}
```

**Tasks:**
- [ ] Create `libraryStore.ts` for library state management
- [ ] Add IndexedDB table for library items
- [ ] Library panel in sidebar (new tab)
- [ ] Add to library from canvas (right-click or button)
- [ ] Drag from library to canvas
- [ ] Token templates with pre-configured stats

### Priority 2: Markdown Notes System

**Problem:** No way to store character backstory, DM notes, session summaries.

**Solution:** Rich markdown notes on any element, plus standalone notes.

**Features:**
- [ ] Notes field on tokens (markdown with preview)
- [ ] Notes field on maps/scenes
- [ ] Standalone notes panel (campaign journal)
- [ ] Simple WYSIWYG markdown editor component
- [ ] Collapsible notes display in property inspector

**Implementation:**
```typescript
// Add to TokenElement, ImageElement, etc:
notes?: string;  // Markdown content

// Standalone notes for campaign journal
interface CampaignNote {
  id: string;
  title: string;
  content: string;  // Markdown
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Priority 3: Enhanced Export/Import Dialog

**Problem:** Current export dumps everything, import replaces everything.

**Solution:** Selective export/import with tree-based UI.

**Export Dialog:**
```
📁 Export Selection
├── ☑️ Game Settings
│   ├── ☑️ Grid configuration
│   └── ☑️ Fog of War state
├── ☑️ Elements (15 total)
│   ├── ☑️ Tokens (8)
│   │   ├── ☑️ Goblin Scout
│   │   ├── ☑️ Orc Warrior
│   │   └── ...
│   ├── ☑️ Drawings (5)
│   └── ☑️ Text Labels (2)
├── ☑️ Library Items
│   ├── ☑️ Token Templates (12)
│   └── ☑️ Saved Maps (3)
└── ☑️ Campaign Notes (4)

[Export Selected] [Select All] [Select None]
```

**Import Dialog:**
```
📁 Import from file.vtt.json
├── ☐ Merge with existing (vs Replace)
├── Preview tree (same as export)
└── Conflict resolution options

[Import Selected] [Cancel]
```

**Tasks:**
- [ ] Create `ExportImportModal.tsx` component
- [ ] Tree view component for selection
- [ ] Selective JSON serialization
- [ ] Merge vs replace logic
- [ ] Conflict detection and resolution UI
- [ ] File format versioning

### Priority 4: Layer Controls (Data exists, needs UI)

The store already has `layerVisibility` state - just needs UI:

**Tasks:**
- [ ] Add layer visibility panel to sidebar
- [ ] Checkboxes for each layer type
- [ ] Wire to existing store actions
- [ ] Update GameCanvas to respect visibility flags

### Priority 5: Selection Improvements

- [ ] Marquee/box selection (drag to select multiple)
- [ ] Shift+click to add to selection
- [ ] Move multiple selected elements together
- [ ] Delete multiple selected elements

## 📋 Phase 3: Canvas & Tools Enhancements

### Grid Enhancements

- [ ] Hex grid option (rendering already uses Konva)
- [ ] Gridless mode
- [ ] Grid opacity slider
- [ ] Custom grid colors in toolbar

### Area Effect Templates

Visual-only templates for spell effects (no server needed):

- [ ] Circle template (radius)
- [ ] Cone template (angle + length)
- [ ] Line template (width + length)
- [ ] Rectangle template (width + height)
- [ ] Template placement tool
- [ ] Configurable colors/opacity

### Enhanced Measurement

- [ ] Waypoint measurement (click multiple points)
- [ ] Show path distance as you measure
- [ ] Optional: difficulty terrain modifier

## 📋 Phase 3: Quality of Life

### Canvas Improvements
- [ ] Minimap in corner
- [ ] Fit-to-content button
- [ ] Center on selected element
- [ ] Alignment guides when moving elements

### Token Enhancements
- [ ] Token rotation control
- [ ] Aura/radius indicator option
- [ ] Status effect icons (expanded set)
- [ ] Token presets (save/load configurations)

### Combat Tracker
- [ ] Drag to reorder initiative
- [ ] Roll initiative button (auto-roll d20)
- [ ] Timer per turn (optional)
- [ ] Delay/ready actions

### Dice Roller
- [ ] Save favorite formulas
- [ ] Roll macros (save full roll sequences)
- [ ] Secret rolls (DM only, sent to DM)
- [ ] Target number highlighting

## 🔗 Phase 4: Acererak Integration (ON HOLD PENDING DISCUSSION WITH USER)

Connect with the parent story generator app:

- [ ] Import generated scene as VTT background (via URL)
- [ ] Share character data between apps
- [ ] Deploy as integrated module
- [ ] Unified visual theme

## 🎯 Technical Improvements

### Performance
- [ ] Virtual rendering for large element counts
- [ ] Debounce P2P updates during rapid changes
- [ ] Image caching optimization
- [ ] Profile memory usage with many tokens

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

### Documentation
- [ ] User guide
- [ ] Keyboard shortcuts reference
- [ ] API documentation for integrations

## 🚫 Out of Scope (Architecture Constraints)

These features don't fit the decentralized design:

- ❌ **File upload hosting** - No server to store uploaded files (use external URLs)
- ❌ **User accounts** - No backend for authentication
- ❌ **Real-time cross-device sync** - Sessions are per-device (use export/import to share)
- ❌ **Audio file hosting** - No server for audio files (external URLs possible)
- ❌ **Server-side automation** - All logic runs client-side
- ❌ **Cloud backup** - No central storage (local IndexedDB + file exports)

## 📊 Success Metrics

- **Concurrent players**: 6-8 per session
- **P2P latency**: <100ms
- **Load time**: <3s
- **Bundle size**: <1MB
- **Browser support**: Chrome, Firefox, Safari, Edge

## 📝 Version History

### v1.0.0 (Current)
- Complete MVP with all core features
- P2P networking stable
- IndexedDB persistence
- Combat tracker and dice roller
- Full drawing toolkit

### v1.1.0 (Next - Asset Management)
- Token & Map Library
- Markdown notes system
- Enhanced export/import dialog
- Layer visibility UI

### v1.2.0 (Planned)
- Selection improvements
- Grid variants (hex, gridless)
- Area effect templates

### v1.3.0 (Planned)
- Enhanced measurement
- Mobile optimization
- Performance improvements

### v2.0.0 (Future)
- Acererak integration
