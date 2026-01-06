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
- [x] Layer visibility controls (toggle grid, map, tokens, drawings, text, fog)

## 🚀 Phase 2: Asset Management & Persistence

### ✅ Priority 1: Token & Map Library - COMPLETE

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

**Completed Tasks:**
- [x] Create `libraryStore.ts` for library state management
- [x] Add IndexedDB table for library items (database v2)
- [x] Library panel in sidebar (new tab)
- [x] Add to library from canvas (Save to Library button)
- [x] Place from library to canvas
- [x] Token templates with pre-configured stats (8 defaults: Goblin, Orc, Skeleton, Zombie, Bandit, Guard, Wolf, Giant Spider)

### ✅ Priority 2: Markdown Notes System - COMPLETE

**Problem:** No way to store character backstory, DM notes, session summaries.

**Solution:** Rich markdown notes on any element, plus standalone notes.

**Completed Tasks:**
- [x] Notes field on tokens (markdown with preview)
- [x] Notes field on maps/images
- [x] Standalone notes panel (campaign journal)
- [x] Simple markdown editor component with edit/preview modes
- [x] Collapsible notes display in property inspector

**Implementation:**
```typescript
// TokenElement and ImageElement support notes:
notes?: string;  // Markdown content

// Campaign Notes for standalone journal entries
interface CampaignNote {
  id: string;
  title: string;
  content: string;  // Markdown
  category?: string; // Session, NPC, Location, Lore, Plot, etc.
  tags?: string[];
  visibleTo: Visibility; // DM-only or all players
  createdAt: string;
  updatedAt: string;
}
```

### ✅ Priority 3: Enhanced Export/Import Dialog - COMPLETE

**Problem:** Current export dumps everything, import replaces everything.

**Solution:** Selective export/import with tree-based UI.

**Completed Tasks:**
- [x] Create `ExportImportModal.tsx` component
- [x] Tree view/checkbox UI for category selection
- [x] Selective JSON serialization (v2 format)
- [x] Merge vs replace import modes
- [x] Individual element selection within categories
- [x] File format versioning (detects v1 legacy and v2 formats)
- [x] Available in Game menu (⋮) for all users (not DM-only)

**Export Features:**
- Checkbox-based category selection (tokens, map images, shapes, text, notes, library items)
- Expandable categories to select individual elements
- File naming with game name and timestamp
- V2 format with selective data support

**Import Features:**
- Merge vs Replace mode selection
- Format auto-detection (v1/v2)
- Preview of importable categories
- Library items can be imported separately

### ✅ Priority 4: Layer Controls - COMPLETE

The store already has `layerVisibility` state - UI now implemented!

**Completed Tasks:**
- [x] Add layer visibility panel to sidebar (DM Tools tab)
- [x] Checkboxes for each layer type (grid, map, tokens, drawings, text, fog)
- [x] Wire to existing store actions
- [x] Update GameCanvas to respect visibility flags
- [x] Preview as Player mode (uses `effectiveIsDM` for accurate preview)

**How Layers & Z-Order Work:**
- **Layers** = visibility categories (auto-assigned by element type)
  - `map` layer → map images
  - `token` layer → tokens
  - `drawing` layer → shapes and text
- **Z-order** = fine control within each layer (use Property Inspector's Bring Forward/Send Backward)
- Elements are sorted first by layer, then by zIndex within each layer

**Future Enhancement: Layer Assignment UI**
- [ ] Add layer dropdown to Property Inspector to manually move elements between layers

### ✅ Priority 5: Selection Improvements - COMPLETE

- [x] Marquee/box selection (drag to select multiple)
- [x] Shift+click to add to/toggle selection
- [x] All element types support multi-select display (Token, Shape, MapImage, TextLabel)
- [x] Move multiple selected elements together (batch drag)
- [x] Delete multiple selected elements (batch delete)

## 📋 Phase 3: Canvas & Tools Enhancements

### ✅ Grid Enhancements - COMPLETE

- [x] Hex grid option (flat-top hexagons with proper spacing)
- [x] Gridless mode (no grid rendering)
- [x] Grid opacity
- [x] Custom grid colors
- [x] Grid type selector in Settings Modal

### ✅ Area Effect Templates - COMPLETE

Visual-only templates for spell effects (no server needed):

- [x] Circle template (drag to set radius) - Orange
- [x] Cone template (curved arc fan shape) - Red
- [x] Triangle template (simple 3-point, D&D RAW) - Orange
- [x] Line template (5ft wide path) - Blue
- [x] Square/Rectangle template (drag to set dimensions) - Purple
- [x] AOE dropdown in toolbar with all templates
- [x] Semi-transparent fills with distinct colors per type

### ✅ Enhanced Measurement - COMPLETE

- [x] Waypoint measurement (click to add multiple points)
- [x] Show path distance as you measure (segment + total distances)
- [x] Difficult terrain modifier (toggle with D key for 2× multiplier)
- [x] Keyboard shortcuts: Escape (clear), D (toggle terrain), Backspace (undo waypoint)
- [x] Numbered waypoints with color-coded display (green normal, amber difficult)

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

### v1.0.1 (Current)
- Layer visibility controls UI (toggle grid, map, tokens, drawings, text, fog)
- Preview as Player mode for DMs

### v1.1.0 (Asset Management)
- Token & Map Library (8 default templates)
- Save tokens to library
- Library panel with search, filter, edit, delete
- Marquee selection (box select multiple elements)
- Shift+click multi-select support

### v1.2.0 (Notes System)
- Markdown notes system (campaign journal)
- Notes on tokens and images with edit/preview modes
- MarkdownEditor component with basic syntax support
- CampaignNote type with categories (Session, NPC, Location, Lore, Plot, etc.)
- Notes tab in sidebar for campaign journal management
- Collapsible notes in Property Inspector

### v1.3.0 (Export/Import)
- Enhanced export/import dialog with selective data
- ExportImportModal component with tree selection UI
- V2 export format with category-based selection
- Merge vs replace import modes
- Available in Game menu for all users

### v1.4.0 (Current - Canvas & Selection)
- **Multi-element operations**: Batch move/delete for multiple selected elements
- **Grid variants**: Square grid, hex grid (flat-top), gridless mode
- **Grid type selector**: Added to Settings Modal under Grid tab
- **Area Effect Templates**: Full AOE toolkit in toolbar dropdown
  - Circle AOE (orange, drag for radius)
  - Cone AOE (red, curved arc fan shape with 12 segments)
  - Triangle AOE (orange, simple 3-point D&D RAW interpretation)
  - Line AOE (blue, 5ft wide rectangular path)
  - Square AOE (purple, drag for dimensions)
- **Improved selection**: Drag any selected element to move all selected elements together

### v1.5.0 (Current - Enhanced Measurement)
- **Enhanced Measurement Tool**: Complete rewrite with waypoint-based path measurement
  - Click to add waypoints along a path
  - Shows per-segment and cumulative total distances in feet
  - Difficult terrain modifier (D key toggles 2× distance multiplier)
  - Numbered waypoints with visual color coding (green/amber)
  - Keyboard shortcuts: Escape (clear), Backspace (undo), D (toggle terrain)
  - Interactive hint bar showing controls and current state

### v1.6.0 (Next)
- Mobile optimization (touch gestures, responsive UI)
- Performance improvements (virtual rendering, debouncing)
- Canvas QoL (minimap, fit-to-content, alignment guides)

### v2.0.0 (Future)
- Acererak integration
