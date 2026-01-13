# Lychgate VTT - Project Plan & Status

## Overview

A **decentralized P2P Virtual Tabletop** - the VTT they can't turn off.

**Architecture Principles:**
1. **No server** - All data flows peer-to-peer via WebRTC
2. **GM authority** - GM's browser is source of truth (no CRDTs needed)
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

### P2P Networking (Phase 3 & 3.5 Complete)
- [x] Trystero integration (Torrent strategy with Node.js polyfills)
- [x] WebRTC peer connections with STUN/TURN servers
- [x] Room creation/joining via ID or QR code
- [x] Real-time state sync (elements, fog, combat, dice, chat)
- [x] Player cursors with throttling (10Hz max, 5px min delta)
- [x] Client-side cursor interpolation for smooth movement
- [x] Ping visualization with animated pulse effect
- [x] Ping P2P broadcast and synchronization
- [x] Join/leave notifications
- [x] Enhanced connection state indicator (connected/syncing/disconnected/error)
- [x] GM disconnect detection with warning modal (`GMDisconnectModal` component)
- [x] Desync detection via djb2 state hash comparison
- [x] "Request Full Sync" recovery for desynced players
- [x] Element versioning (`version` field) for conflict resolution
- [x] GM-only action enforcement (FOW updates, grid settings)
- [x] Grid settings P2P broadcast (`gridUpd` action)
- [x] In-game chat system (`ChatPanel` component)
- [x] Whisper messages (GM-only visibility flag)
- [x] Undo/redo state synchronization
- [x] Copy/cut/paste operations broadcast

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
- [x] GM-only visibility option
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
- [x] Visibility toggle (all/GM only)
- [x] Lock toggle
- [x] Token properties (name, HP, AC, size, conditions, notes)
- [x] Shape properties (stroke color, fill color, stroke width)
- [x] Text properties (font, size, color, alignment, background)

### Scene Management
- [x] Multi-scene architecture (scenes array, activeSceneId)
- [x] Scene picker UI with dropdown in toolbar
- [x] Scene creation/editing modal with grid settings per scene
- [x] Scene duplication and management
- [x] Background image as scene property (not canvas element)
- [x] Per-scene grid settings, elements, and fog of war
- [x] Global combat tracker and chat across scenes

### Persistence & Data Management
- [x] Auto-save to IndexedDB (GM only)
- [x] Recent games list in lobby
- [x] Export/Import with selective categories (v3 format with multi-scene support)
- [x] Merge vs replace import modes
- [x] Scene import and export for sharing maps
- [x] Token Library with IndexedDB storage (simplified from multi-type library)
- [x] 8 default token templates (Goblin, Orc, Skeleton, etc.)
- [x] Markdown notes on tokens, images, and standalone campaign journal

### UI/UX
- [x] Toolbar with professional icons (Tabler)
- [x] Drawing style controls (stroke/fill color, width)
- [x] Image placement tool for overlays and handouts
- [x] Undo/redo functionality
- [x] Copy/paste elements
- [x] Keyboard shortcuts
- [x] Settings modal (tokens, preferences)
- [x] Preview as player mode (GM)
- [x] Layer visibility controls (toggle grid, map, tokens, drawings, text, fog)
- [x] Marquee/box selection (multi-select)
- [x] Shift+click to add to selection
- [x] Batch move/delete for multiple elements
- [x] Game menu with Share Game option (Room ID, QR code, join link)
- [x] Dice rolls integrated into chat timeline

---

## Phase 3: Mobile Support & UX Polish

**Status:** In Progress

**Priority:** Medium

### 3.10 Mobile Support

- [ ] Ensure create/join game forms fit on mobile screen
- [x] Touch gesture optimization (pinch zoom, two-finger pan)
- [ ] Mobile-friendly toolbar layout
- [ ] Responsive sidebar
- [x] Touch-friendly element selection

**Complexity:** Medium (responsive design, touch events)

---

### 3.11 Reactive Character Sheet System

A system-agnostic character sheet system using TipTap WYSIWYG editor with reactive data binding between documents, shadow state, and map tokens.

**Status:** Ready for Implementation

**Complexity:** High (4-6 weeks across 5 phases)

---

#### 3.11.1 System Overview

**Core Concept:** Characters are stored as rich-text documents with embedded reactive elements. A "shadow state" JSON object syncs bidirectionally with the document, enabling fast lookups and token integration.

**Key Syntax:**

| Syntax | Purpose | Example |
|--------|---------|---------|
| `Key:: Value` | Stat declaration | `Strength:: 18` |
| `{{ expression }}` | Reactive computed field | `{{ (Strength - 10) / 2 }}` |
| `[Label](action: dice)` | Action button | `[Attack](action: 1d20+5)` |
| `[Label](action: dice; cost: Var)` | Action with resource cost | `[Smite](action: 2d8; cost: Slots)` |
| `[bar: Var/Max]` | Inline bar widget | `[bar: HP/MaxHP]` |
| `[dots: N/Max]` | Dot tracker widget | `[dots: 3/5]` |
| `#bar` | Project stat to token bar | `HP:: 45 #bar` |
| `#badge` | Project stat to token badge | `AC:: 18 #badge` |
| `![[Name]]` | Transclude external content | `![[Fireball]]` |

**Data Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      Character Document                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TipTap Editor                                          │   │
│  │  - StatDeclaration nodes                                │   │
│  │  - Expression nodes                                     │   │
│  │  - ActionButton nodes                                   │   │
│  │  - Widget nodes                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Shadow State JSON                                      │   │
│  │  { Strength: 18, HP: 45, MaxHP: 52, AC: 18, ... }       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Token #bar  │ │ Token #badge│ │ Combat      │
    │ HP bar      │ │ AC display  │ │ Tracker     │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

#### 3.11.2 Technology Stack

**Required Dependencies:**

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `@tiptap/react` | ^2.x | Core React bindings | ~15kb |
| `@tiptap/starter-kit` | ^2.x | Basic editor extensions | ~30kb |
| `@tiptap/extension-mention` | ^2.x | Autocomplete foundation | ~5kb |
| `@tiptap/pm` | ^2.x | Markdown serialization | ~10kb |
| `expr-eval` | ^2.0 | Expression evaluation | ~12kb |

**Total additional bundle:** ~70kb gzipped

**Installation:**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-mention @tiptap/pm expr-eval
```

---

#### 3.11.3 What Gets Removed/Deprecated

**Files to Remove:**

- [ ] `src/components/MarkdownEditor.tsx` - Replace with TipTap CharacterSheetEditor

**Types to Deprecate (but keep for migration):**

In `src/types/index.ts`, the following `TokenElement` fields become optional/deprecated:
- `hp?: { current: number; max: number }` → Derived from shadow state
- `ac?: number` → Derived from shadow state
- `conditions?: string[]` → Derived from shadow state
- `notes?: string` → Replaced by `characterId` link

**Components to Modify:**

- [ ] `src/components/PropertyInspector.tsx` - Remove token-specific HP/AC/conditions UI, add "Edit Character Sheet" button
- [ ] `src/components/Token.tsx` - Read HP/AC from linked Character shadow state
- [ ] `src/components/CombatTracker.tsx` - Read combatant HP from Character shadow state
- [ ] `src/stores/libraryStore.ts` - Add Character library alongside token library

---

#### 3.11.4 Implementation Phases

---

##### Phase 1: Foundation - TipTap Integration

**Goal:** Basic TipTap editor working in a modal, editable rich text

**Status:** ✅ COMPLETED

**Tasks:**

- [x] Install TipTap dependencies
- [x] Create `src/components/character/CharacterSheetEditor.tsx`
  - Basic TipTap editor with StarterKit
  - Read-only toggle
  - Markdown import/export via `@tiptap/pm`
- [x] Create `src/components/character/CharacterSheetModal.tsx`
  - Modal wrapper for editor
  - Save/cancel buttons
  - Links to a Character by ID
- [x] Create `src/types/character.ts`
  ```typescript
  export interface Character {
    id: string;
    name: string;
    content: string;          // TipTap JSON document
    shadowState: Record<string, number | string>;  // Parsed stats
    projections: {            // What shows on token
      bar?: string;           // Key for HP bar (e.g., "HP")
      barMax?: string;        // Key for HP max (e.g., "MaxHP")
      badge?: string;         // Key for badge (e.g., "AC")
    };
    createdAt: string;
    updatedAt: string;
  }
  ```
- [x] Add `characters: Character[]` to `GameState` in `src/types/index.ts`
- [x] Add `characterId?: string` to `TokenElement` interface
- [x] Create `src/stores/characterStore.ts` with Zustand
  - `addCharacter(character: Character)`
  - `updateCharacter(id: string, updates: Partial<Character>)`
  - `deleteCharacter(id: string)`
  - `getCharacterById(id: string)`
- [x] Add IndexedDB persistence for characters (GM only)
- [x] Integrate "Create Character" button into LibraryPanel
- [x] Add CharacterLibraryPanel component for character management
- [x] Add P2P message types for character updates (prepared for later phases)

**Acceptance Criteria:**
- [x] Can open modal and type rich text
- [x] Content persists when modal closes and reopens
- [x] Character data saved in game state
- [x] Character store CRUD operations work correctly
- [x] Markdown import/export functional
- [x] IndexedDB persistence for GM

---

##### Phase 2: Custom Nodes - Stat Declarations

**Goal:** `Key:: Value` syntax creates editable stat pills, shadow state syncs

**Tasks:**

- [ ] Create `src/components/character/extensions/StatDeclaration.ts`
  ```typescript
  // TipTap Node extension
  // Matches pattern: "Key:: Value" or "Key:: Value #bar" or "Key:: Value #badge"
  // Renders as: [Key: Value ▾] pill (clickable to edit)
  // Parses projection tags: #bar, #badge
  ```
- [ ] Create `src/components/character/extensions/StatDeclarationComponent.tsx`
  - React component for rendering the node
  - Inline editing on click
  - Number input for numeric values
  - Projection tag display (#bar, #badge icons)
- [ ] Create `src/services/shadowStateService.ts`
  ```typescript
  // Extracts all StatDeclaration nodes from TipTap document
  // Returns: { key: value } object
  // Updates Character.shadowState on document change
  ```
- [ ] Wire shadow state updates
  - On editor change → parse stats → update shadowState
  - Debounce parsing (300ms)
- [ ] Create `src/components/character/extensions/SuggestionMenu.tsx`
  - Autocomplete when typing `::`
  - Suggests common stat names (HP, AC, STR, DEX, etc.)

**Acceptance Criteria:**
- [ ] Typing `Strength:: 18` creates a stat pill
- [ ] Clicking pill allows editing value
- [ ] Shadow state JSON updates automatically
- [ ] Autocomplete shows suggestions when typing `::`

---

##### Phase 3: Custom Nodes - Expressions and Actions

**Goal:** `{{ expression }}` shows computed values, `[Action](action: dice)` creates roll buttons

**Tasks:**

- [ ] Create `src/components/character/extensions/Expression.ts`
  ```typescript
  // TipTap Node extension
  // Matches: {{ expression }}
  // Evaluates using expr-eval with shadowState as variables
  // Renders computed result inline
  ```
- [ ] Create `src/components/character/extensions/ExpressionComponent.tsx`
  - Shows computed value
  - Tooltip shows formula on hover
  - Re-evaluates when shadowState changes
- [ ] Create `src/components/character/extensions/ActionButton.ts`
  ```typescript
  // TipTap Node extension
  // Matches: [Label](action: diceFormula) or [Label](action: diceFormula; cost: Variable)
  // Renders as clickable button
  ```
- [ ] Create `src/components/character/extensions/ActionButtonComponent.tsx`
  - Styled button with label
  - On click: parse dice formula, resolve variables from shadowState
  - Execute roll via existing dice service
  - If `cost` specified: decrement variable in shadowState
  - Broadcast roll to P2P
- [ ] Integrate with `src/services/diceParser.ts`
  - Add variable resolution: `1d20+Strength` → `1d20+18`
  - Support `{{ expression }}` in formulas

**Acceptance Criteria:**
- [ ] `{{ (Strength - 10) / 2 }}` shows `4` when Strength is 18
- [ ] Expression updates when stat changes
- [ ] `[Attack](action: 1d20+5)` renders as button
- [ ] Clicking button rolls dice and broadcasts
- [ ] `[Smite](action: 2d8; cost: Slots)` decrements Slots on use

---

##### Phase 4: Custom Nodes - Widgets

**Goal:** `[bar: HP/MaxHP]` and `[dots: 3/5]` render visual trackers

**Tasks:**

- [ ] Create `src/components/character/extensions/BarWidget.ts`
  ```typescript
  // Matches: [bar: Variable/MaxVariable]
  // Renders as horizontal progress bar
  // Clickable to adjust value
  ```
- [ ] Create `src/components/character/extensions/BarWidgetComponent.tsx`
  - Progress bar visualization
  - Click to open quick +/- buttons
  - Color changes based on percentage (green → yellow → red)
- [ ] Create `src/components/character/extensions/DotsWidget.ts`
  ```typescript
  // Matches: [dots: N/Max] or [dots: Variable/Max]
  // Renders as filled/empty dots (like WoD games)
  ```
- [ ] Create `src/components/character/extensions/DotsWidgetComponent.tsx`
  - Dot visualization (●●●○○)
  - Click dots to fill/unfill
  - Updates shadowState

**Acceptance Criteria:**
- [ ] `[bar: HP/MaxHP]` shows progress bar
- [ ] Bar reflects current HP value and updates live
- [ ] Clicking bar shows +/- controls
- [ ] `[dots: 3/5]` shows 3 filled, 2 empty dots
- [ ] Clicking changes dot count

---

##### Phase 5: Token Integration

**Goal:** Tokens with `characterId` display stats from Character; bidirectional sync

**Tasks:**

- [ ] Modify `src/components/Token.tsx`
  - If `characterId` set, read HP/AC from linked Character.shadowState
  - Use `projections.bar` / `projections.barMax` / `projections.badge` keys
  - Fall back to token's own hp/ac if no character linked
- [ ] Add "Link Character" button to token config modal
  - Dropdown of available Characters
  - Or create new Character from scratch
- [ ] Implement bidirectional sync
  - Token damage click → update Character.shadowState → update document
  - Character sheet edit → update shadowState → update token display
- [ ] Modify `src/components/CombatTracker.tsx`
  - Read HP from linked Character if available
  - HP changes in combat update Character shadowState
- [ ] Add P2P broadcast for character updates
  - New message type: `character-update`
  - Sync Character changes to all peers
- [ ] Create `src/components/character/CharacterLibraryPanel.tsx`
  - List saved Characters
  - Create / duplicate / delete
  - Import/export characters

**Acceptance Criteria:**
- [ ] Token HP bar reads from linked Character
- [ ] Changing HP in Character Sheet updates token display
- [ ] Clicking token damage updates Character shadowState
- [ ] Combat tracker uses Character HP
- [ ] Characters sync across P2P

---

##### Phase 6: Transclusion and Polish

**Goal:** `![[SpellName]]` embeds content; templates; migration

**Tasks:**

- [ ] Create `src/components/character/extensions/Transclusion.ts`
  - Matches: `![[Name]]`
  - Looks up content from a global "snippets" library
  - Renders embedded content inline (read-only)
- [ ] Create `src/stores/snippetStore.ts`
  - Store reusable text blocks (spells, abilities, rules)
  - IndexedDB persistence
- [ ] Create character templates
  - D&D 5e template with standard stats
  - OSR template (simpler)
  - Blank template
- [ ] Migration for existing tokens
  - Tokens with `notes` field → offer to convert to Character
  - Keep `hp`/`ac`/`conditions` working for unlinked tokens
- [ ] Keyboard shortcuts in editor
  - `/` for slash commands (insert stat, action, widget)
  - `[[` for transclusion autocomplete
  - `{{` for expression autocomplete

**Acceptance Criteria:**
- [ ] `![[Fireball]]` embeds spell text
- [ ] Template picker when creating new Character
- [ ] Existing games still work (backward compatible)
- [ ] Slash commands work for inserting elements

---

#### 3.11.5 File Structure

```
src/
├── components/
│   └── character/
│       ├── CharacterSheetEditor.tsx      # Main TipTap editor
│       ├── CharacterSheetModal.tsx       # Modal wrapper
│       ├── CharacterLibraryPanel.tsx     # Library UI
│       └── extensions/
│           ├── StatDeclaration.ts        # Key:: Value node
│           ├── StatDeclarationComponent.tsx
│           ├── Expression.ts             # {{ }} node
│           ├── ExpressionComponent.tsx
│           ├── ActionButton.ts           # [](action:) node
│           ├── ActionButtonComponent.tsx
│           ├── BarWidget.ts              # [bar:] node
│           ├── BarWidgetComponent.tsx
│           ├── DotsWidget.ts             # [dots:] node
│           ├── DotsWidgetComponent.tsx
│           ├── Transclusion.ts           # ![[]] node
│           ├── TransclusionComponent.tsx
│           └── SuggestionMenu.tsx        # Autocomplete UI
├── services/
│   └── shadowStateService.ts             # Parse document → JSON
├── stores/
│   ├── characterStore.ts                 # Character CRUD
│   └── snippetStore.ts                   # Transclusion content
└── types/
    └── character.ts                      # Character interfaces
```

---

#### 3.11.6 P2P Message Types

Add to `src/types/index.ts`:

```typescript
export interface CharacterUpdateMessage {
  type: 'character-update';
  character: Character;
}

export interface CharacterDeleteMessage {
  type: 'character-delete';
  characterId: string;
}
```

---

#### 3.11.7 Testing Requirements

- [ ] Unit tests for shadowStateService (parse document → JSON)
- [ ] Unit tests for expression evaluation with variables
- [ ] Unit tests for dice formula variable resolution
- [ ] E2E test: create character, add stats, link to token, verify display
- [ ] E2E test: edit character sheet, verify token updates
- [ ] E2E test: P2P sync of character changes

---

#### 3.11.8 Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| TipTap bundle size | +70kb to bundle | Lazy load editor modal |
| Expression injection | Security issue | Sandbox expr-eval, no eval() |
| Complex parsing bugs | Bad UX | Forgiving parser, clear error messages |
| Mobile keyboard issues | Poor mobile UX | Test extensively, add tap-to-edit shortcuts |
| Migration breaks old games | Data loss | Keep backward compat, offer explicit migration |

---

### 3.12 Character Library System ✅ MERGED INTO 3.11

*This feature has been merged into section 3.11 (Reactive Character Sheet System):*

- **Phase 5:** CharacterLibraryPanel, token-character linking
- **Phase 6:** Templates, transclusion snippets, import/export

See [3.11.4 Phase 5](#phase-5-token-integration) and [3.11.4 Phase 6](#phase-6-transclusion-and-polish) for implementation details.

---

### 3.13 Arrow Key Token Movement

Add keyboard controls for moving selected tokens with arrow keys.

**Requirements:**
- Arrow keys move selected token(s) by 1 grid cell
- Shift+arrow moves by 1 pixel (fine positioning)
- Respects grid snapping settings
- Works with multi-select
- Broadcasts movement to P2P
- Integrates with undo/redo history

**Files to modify:**
- `src/hooks/useCanvasKeyboardShortcuts.ts` - Add arrow key handlers
- `src/stores/gameStore.ts` - Ensure moveElement action supports keyboard input

**Status:** Ready for implementation (straightforward feature)

**Complexity:** Low (extends existing keyboard shortcut system)

---

### Future Improvements (Deferred)

**Token sidebar redesign:**
- Current sidebar token section not properly functional
- Need to improve token list UX
- Add player token ownership/assignment
- **Status:** Deferred to Phase 4+ (requires design thinking)


---

## ~~Phase 3: P2P Reliability & State Sync~~ ✅ COMPLETED (v1.6.0)

**Summary:** Implemented robust P2P state synchronization with GM authority model.

**Key Deliverables:**
- Connection state machine (connected/syncing/disconnected/error)
- GM disconnect detection with player notification
- State hash comparison for desync detection + recovery
- Element versioning for conflict resolution
- GM-only action enforcement
- Grid settings broadcast
- In-game chat with whispers

*Moved to "P2P Networking" in Completed Features.*

---

## ~~Phase 3.5: P2P Polish & Bug Fixes~~ ✅ COMPLETED (v1.7.0)

**Summary:** Fixed P2P broadcast gaps and improved cursor performance.

**Key Deliverables:**
- Undo/redo state synchronization
- Copy/cut/paste operations broadcast
- Cursor throttling (10Hz max, 5px min delta)
- Client-side cursor interpolation

*Moved to "P2P Networking" in Completed Features.*

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
- [ ] Secret rolls (GM only)
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

## Deployment

### GitHub Actions CI/CD

Automated deployment to VPS via SCP on push to main branch.

**Workflow:** `.github/workflows/deploy-vtt.yml`

**Required GitHub Secrets:**
- `VPS_HOST` - Server hostname or IP
- `VPS_USER` - SSH username
- `VPS_SSH_KEY` - Private SSH key (ed25519 or RSA)
- `VPS_PATH` - Deployment path (e.g., `/var/www/vtt`)

**Pipeline Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build production bundle (`npm run build`)
5. SCP `dist/` folder to VPS
6. Optional: Restart nginx or run post-deploy script

**Trigger:** Push to `main` branch (paths: `vtt/**`)

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
| v1.6.0 | P2P Reliability | Connection status, GM disconnect, desync detection, element versioning, chat |
| v1.7.0 | P2P Polish | Undo/redo sync, clipboard sync, cursor throttling/interpolation |
| v1.8.0 | Scene System | Multi-scene architecture, scene picker, image tool, dice/chat integration, export v3 format |
| v1.8.1 | Bug Fixes | Ping P2P visibility fix |
| v1.8.2 | Bug Fixes | Code review fixes - active scene data access, scene import logic |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
