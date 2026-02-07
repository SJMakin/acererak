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

### P2P Networking (v1.6.0 / v1.7.0)
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

### Reactive Character Sheet System (v1.9.0)
- [x] TipTap WYSIWYG editor with rich text editing in modal
- [x] `Key:: Value` stat declarations with editable pills and autocomplete
- [x] Shadow state JSON auto-parsed from document (bidirectional sync)
- [x] Projection tags: `#bar` (HP bar on token), `#badge` (AC badge on token)
- [x] `{{ expression }}` computed fields via expr-eval (reactive to stat changes)
- [x] `[Label](action: dice)` action buttons with dice rolling and P2P broadcast
- [x] `[Label](action: dice; cost: Var)` actions with resource cost deduction
- [x] `[bar: HP/MaxHP]` progress bar widget (color-coded, click to adjust)
- [x] `[dots: N/Max]` dot tracker widget (click to fill/unfill)
- [x] `![[Name]]` transclusion — embeds snippets inline (read-only)
- [x] Token integration — tokens with `characterId` read HP/AC from character shadow state
- [x] Bidirectional token↔character sync (damage click updates character, sheet edit updates token)
- [x] Combat tracker reads HP from linked characters
- [x] Character library panel with CRUD, templates (D&D 5e, OSR, Blank), import/export, duplicate
- [x] Snippet library (spells, abilities, rules) with IndexedDB persistence and P2P sync
- [x] P2P broadcast for character updates (`character-update`, `character-delete` messages)
- [x] Keyboard shortcuts in editor (`/` slash commands, `[[` transclusion, `{{` expressions)
- [x] Token migration service (old tokens with notes → character conversion)
- [x] 5 default snippets (Fireball, Cure Wounds, Sneak Attack, Second Wind, Opportunity Attack)

### 3.10 Mobile Support (partial)
- [x] Touch gesture optimization (pinch zoom, two-finger pan)
- [x] Touch-friendly element selection

### 3.11 Cleanup / Deprecation (partial)
- [x] `PropertyInspector.tsx` — "Edit Character Sheet" button, linked character stats, character selector, unlink option
- [x] `Token.tsx` — Reads HP/AC from `character.shadowState` via projections
- [x] `CombatTracker.tsx` — `getHpFromToken()` using characterId/shadowState, syncs HP changes back
- [x] `libraryStore.ts` — N/A (handled by separate `characterStore.ts`)

### 3.12 ESLint Setup
- [x] ESLint 8.57 config (`.eslintrc.cjs`) — 0 errors, 0 warnings, `--max-warnings 0`
- [x] 79 original issues resolved (40 `no-explicit-any`, 13 `no-unused-vars`, 5 `no-case-declarations`, 3 `no-useless-escape`, 1 `no-var-requires`, 15 `react-hooks/exhaustive-deps`, 2 `react-refresh/only-export-components`)

### 3.13 Arrow Key Token Movement
- [x] Arrow keys move selected element(s) by 1 grid cell (or 10px when grid snap off)
- [x] Shift+arrow moves by 1px (fine positioning)
- [x] Respects locked elements (skips them)
- [x] Works with multi-select via `updateElements` batch action
- [x] Broadcasts movement to P2P peers
- [x] Integrates with undo/redo history (position move tracking)
- [x] Skips when focus is in input/textarea/contenteditable

---

## State Sync Audit & Hardening Roadmap

*Added 2026-02-06 — from code review of `useRoom.ts`, `gameStore.ts`, `characterStore.ts`, `shadowStateService.ts`*

### Known Issues / Concerns

#### 🔴 P1 — Delivery Reliability
WebRTC data channels default to unreliable (UDP-like). If a delta message (`elUpdate`, `fogUpdate`, etc.) is dropped, peers silently diverge. The desync hash catches this *eventually*, but there's a window of undetected inconsistency.

**Action:** Verify Trystero's data channel configuration. Enforce `ordered: true` + reliable delivery for all state-mutating channels. Cursor/ping channels can remain unreliable (cosmetic, high frequency).

#### 🔴 P1 — Desync Hash is Position-Blind
[`hashGameState()`](../src/hooks/useRoom.ts) hashes element IDs and counts but **not** element positions, properties, or versions. Two peers can have the same tokens at different positions and produce identical hashes. Positional desyncs (the most common failure from dropped deltas) go undetected.

**Action:** Include element version numbers (or a sorted hash of `id:version` pairs) in the state hash. This makes the hash sensitive to any element mutation, not just additions/deletions.

#### 🟡 P2 — Full-State Sync Payload Size
`broadcastSync()` serializes the **entire `GameState`** as JSON. With multiple scenes, large fog polygon arrays, and 100 chat messages, this can exceed WebRTC data channel message size limits (~256KB on some browsers). Trystero may chunk, but behavior under large payloads is untested.

**Action:** Profile typical game state sizes. Consider: (a) per-scene sync, (b) stripping chat history from sync payloads, (c) chunked transfer with acknowledgment.

#### 🟡 P2 — Character Sync Has No Conflict Resolution
Unlike canvas elements (which have version-gated conflict resolution), character updates via `charUpd` are applied unconditionally — last-write-wins with no version check. Simultaneous character sheet edits by two users will silently lose data.

**Action:** Add `version` field to Character type. Apply the same `incomingVersion >= localVersion` gating used for canvas elements.

#### 🟡 P2 — Version Counters Don't Survive Full Syncs
When `loadGame()` replaces the store wholesale, local version counters are overwritten with the GM's values. If the GM's state is behind due to a race condition, a player's local version=5 becomes the GM's version=3, and subsequent GM updates at version=4 will overwrite the player's changes.

**Action:** Document as a known limitation. Mitigate by ensuring full syncs are rare (only on join/desync recovery) and that the GM is always the most up-to-date peer.

#### 🟢 P3 — No Automatic Reconnection
If a player's WebRTC connection drops (common on mobile/WiFi), there's no automatic rejoin + resync. The player must manually refresh and rejoin. For the GM disconnecting, there's a modal but no reconnect attempt.

**Action:** Implement reconnection with exponential backoff. On reconnect, automatically request a full sync.

#### 🟢 P3 — No Image Asset Management
Images are raw external URLs with no caching, deduplication, or distribution layer. If a URL goes down mid-session, the image breaks for everyone. Large image payloads (even as URLs) in game state contribute to sync bloat.

**Action (future):** Explore IPFS or WebTorrent for decentralized image distribution. Peers could seed images they've already loaded, reducing dependency on external hosts.

---

### Hardening Tasks

- [ ] **P1:** Audit Trystero data channel reliability settings — enforce ordered+reliable for state channels
- [x] **P1:** Strengthen `hashGameState()` to include element versions/positions
- [ ] **P1:** Build E2E sync fuzz tests (random tool usage across two browser sessions, assert hash convergence)
- [x] **P2:** Add version-based conflict resolution to character updates
- [ ] **P2:** Profile game state JSON size across typical sessions; set alarms for >100KB
- [ ] **P2:** Implement chunked/incremental sync as alternative to full-state sync
- [ ] **P3:** Automatic reconnection with exponential backoff + resync
- [ ] **P3:** Strip non-essential data (chat history, old pings) from sync payloads

---

### E2E Sync Testing Strategy

The serverless architecture is actually ideal for E2E testing — no backend mocks needed. Two Playwright browser contexts can connect to the same Trystero room directly.

**Proposed approach: Sync Fuzz Test**

1. Spawn two browser contexts: GM and Player
2. GM creates a room, Player joins, verify initial sync (hash match)
3. Run N iterations of randomized actions:
   - GM: randomly add/move/delete tokens, draw shapes, toggle fog, switch scenes
   - Player: move tokens they control, roll dice, update character sheets
4. After each batch, wait for hash broadcast interval, assert `gmHash === localHash` on the player side
5. Inject artificial failures: drop connections mid-action, verify resync recovery
6. Track metrics: time-to-convergence, number of desyncs detected, number of undetected divergences

**Pre-requisites:**
- Strengthen hash function (P1 above) — current hash is too weak to detect positional drift
- Expose hash state in the DOM or via `window.__testState` for Playwright assertions
- Add a configurable hash broadcast interval (currently implicit — needs explicit timer)

---

## Competitive Gap Analysis: Lychgate vs Roll20

*What it would take to go from hobby VTT to a legitimate Roll20 alternative.*

### What Lychgate Already Does Better
- **Zero infrastructure** — No server costs, no account system, no vendor lock-in
- **Instant setup** — Share a link, start playing in seconds
- **Privacy** — All data stays on player machines, no telemetry
- **Character sheet engine** — The reactive `Key:: Value` / `{{ expression }}` / `![[transclusion]]` system is genuinely more powerful and flexible than Roll20's sheet system
- **Open, extensible architecture** — Not trapped in a legacy Flash-era codebase

### Critical Gaps to Close

#### 1. Asset Management (HIGH — blocks mainstream adoption)
Roll20's drag-and-drop image library, marketplace, and integrated Compendium are its killer features for casual GMs. Lychgate currently requires pasting external URLs.

**Roadmap items:**
- [ ] Drag-and-drop image upload to local IndexedDB with data URL conversion
- [ ] P2P image distribution (WebTorrent/IPFS) so images are shared without a server
- [ ] Asset library with categories, tags, search
- [ ] Marketplace / community asset packs (could be static JSON manifests hosted on GitHub)
- [ ] Map builder or integration with dungeon generator tools

#### 2. Audio/Music Integration (MEDIUM)
Roll20 has a jukebox. Tabletop games use ambient music extensively.

**Roadmap items:**
- [ ] External audio URL playback (Spotify/YouTube embed or direct MP3 URL)
- [ ] GM-controlled play/pause/volume broadcast to all players
- [ ] Ambient sound library with presets

#### 3. Dynamic Lighting / Line of Sight (MEDIUM-HIGH)
Roll20's dynamic lighting is one of its most-used premium features.

**Roadmap items:**
- [ ] Wall/door placement tool (line segments on the map)
- [ ] Raycasting line-of-sight per token (player sees only what their token can see)
- [ ] Light source definitions on tokens (radius, color, dim/bright)
- [ ] Fog of War automatically computed from line-of-sight
- [ ] Performance: This is compute-heavy — consider Web Workers or WASM

#### 4. Persistence & Session Continuity (MEDIUM)
Games need to survive across sessions. Currently the GM's IndexedDB is the only persistence, and players lose state on page refresh.

**Roadmap items:**
- [ ] Export/import is already solid — surface it more prominently as the "save game" mechanism
- [ ] Auto-export to file on session end (download JSON to Downloads folder)
- [ ] Optional: encrypted cloud backup to user's own storage (Google Drive API, Dropbox, S3 presigned URLs)
- [ ] Player-side persistence of character data (characters survive page refresh even without GM)

#### 5. Onboarding & Documentation (MEDIUM)
Roll20 has tutorials, templates, and a large community knowledge base.

**Roadmap items:**
- [ ] In-app tutorial / guided walkthrough for first-time users
- [ ] Pre-built game templates (D&D 5e starter, Pathfinder 2e, etc.)
- [ ] Video demos and quick-start guide
- [ ] Community Discord or forum

#### 6. API / Extensibility (LOW initially, HIGH long-term)
Roll20's API (macros, scripts, mods) is what keeps power users. Lychgate's architecture is better positioned for this because the entire state is client-side JavaScript.

**Roadmap items:**
- [ ] Plugin/extension API — load user JS that can hook into game events
- [ ] Macro system for chat (e.g., `/roll 2d6+@{Strength}` referencing character stats)
- [ ] Community extension marketplace

#### 7. Polish & Edge Cases
- [ ] Undo/redo visual feedback
- [ ] Better error messages for failed connections
- [ ] Accessibility (keyboard navigation, screen reader support, high contrast mode)
- [ ] Internationalization (i18n)
- [ ] Performance benchmarks: 100+ tokens, 10+ players, large maps

---

## In Progress / TODO

### 3.10 Mobile Support (remaining)

**Status:** In Progress | **Complexity:** Medium

- [x] Ensure create/join game forms fit on mobile screen
- [ ] Mobile-friendly toolbar layout
- [ ] Responsive sidebar

---

### 3.11 Cleanup / Deprecation (remaining)

**Files to remove:**
- [ ] `src/components/MarkdownEditor.tsx` — Deferred: still used for token/image notes in NotesPanel and PropertyInspector. Not a blocker.

**Testing:**
- [ ] Unit tests for shadowStateService (parse document → JSON)
- [ ] Unit tests for expression evaluation with variables
- [ ] Unit tests for dice formula variable resolution
- [ ] E2E test: create character, add stats, link to token, verify display
- [ ] E2E test: edit character sheet, verify token updates
- [ ] E2E test: P2P sync of character changes

---

### Future Improvements (Deferred)

**Token sidebar redesign:**
- Current sidebar token section not properly functional
- Need to improve token list UX
- Add player token ownership/assignment
- **Status:** Deferred to Phase 4+ (requires design thinking)

---

## Phase 4: Canvas & Tools Enhancements (ON HOLD)

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

## Reference

### Character Sheet Syntax

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

### Character Sheet File Structure

```
src/
├── components/
│   └── character/
│       ├── CharacterSheetEditor.tsx      # Main TipTap editor
│       ├── CharacterSheetModal.tsx       # Modal wrapper
│       ├── CharacterLibraryPanel.tsx     # Library UI
│       ├── SnippetLibraryPanel.tsx       # Snippet library UI
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
│           ├── StatSuggestion.ts         # Autocomplete trigger
│           └── SuggestionMenu.tsx        # Autocomplete UI
├── services/
│   ├── shadowStateService.ts             # Parse document → JSON
│   ├── diceParser.ts                     # Dice formula + variable resolution
│   ├── characterTemplates.ts             # D&D 5e, OSR, Blank templates
│   └── tokenMigration.ts                # Old token → character migration
├── stores/
│   ├── characterStore.ts                 # Character CRUD + P2P sync
│   └── snippetStore.ts                   # Transclusion content
└── types/
    ├── character.ts                      # Character interfaces
    └── snippet.ts                        # Snippet interfaces
```

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
| v1.9.0 | Character Sheets | Reactive character sheet system with TipTap editor, stat declarations, expressions, actions, widgets, token integration, transclusion, templates, and P2P sync |
| v2.0.0 | Integration | *(Future)* Main app integration |

---

*For detailed implementation notes and session logs, see [IMPLEMENTATION_DIARY.md](./IMPLEMENTATION_DIARY.md)*
