# Layer Controls Implementation Plan

## Overview
Implement UI controls for the layer visibility system that already exists in the gameStore. This will allow DMs to toggle visibility of different layer types and preview the canvas as players see it.

## Current State

### Existing Infrastructure ✅
- **State**: [`layerVisibility`](vtt/src/stores/gameStore.ts:62) in gameStore with properties:
  - `grid: boolean`
  - `map: boolean`
  - `tokens: boolean`
  - `drawings: boolean`
  - `text: boolean`
  - `fog: boolean`
- **Actions**: 
  - [`toggleLayerVisibility(layer)`](vtt/src/stores/gameStore.ts:851)
  - [`setLayerVisibility(layer, visible)`](vtt/src/stores/gameStore.ts:860)
  - [`setPreviewAsPlayer(preview)`](vtt/src/stores/gameStore.ts:869)
- **State**: `previewAsPlayer: boolean` for GM preview mode

### Canvas Rendering Structure
[`GameCanvas.tsx`](vtt/src/components/GameCanvas.tsx:1) has 5 Konva Layers:
1. **Background + Grid** (listening: false)
2. **Static Elements** - Map images, locked shapes/text/tokens (listening: false)
3. **Fog of War** - Overlay for non-DMs (listening: false)
4. **Interactive Elements** - Unlocked shapes/text/tokens (listening: true)
5. **Overlay** - Drawing preview, pings, cursors (listening: false)

## Implementation Steps

### Step 1: Add Layer Controls UI to Sidebar

**Location**: [`Sidebar.tsx`](vtt/src/components/Sidebar.tsx:1) → GM Tools tab

**UI Design**:
```
┌─ Layer Visibility ─────────────────────┐
│ ☑ Grid                                  │
│ ☑ Map Images                            │
│ ☑ Tokens                                │
│ ☑ Drawings                              │
│ ☑ Text Labels                           │
│ ☑ Fog of War                            │
│                                         │
│ [Switch] Preview as Player              │
└─────────────────────────────────────────┘
```

**Component Structure**:
- Use Mantine `Checkbox` components with icons
- Icons: 
  - Grid: `#️⃣` or grid icon
  - Map: `🗺️`
  - Tokens: `👤`
  - Drawings: `✏️`
  - Text: `📝`
  - Fog: `🌫️`
- Use Mantine `Switch` for Preview as Player mode

### Step 2: Update GameCanvas to Respect Layer Visibility

**Filter Logic**:

1. **Grid Layer** - Line 1388-1395 in GameCanvas:
   ```typescript
   {layerVisibility.grid && gridSettings.showGrid && (
     <Grid ... />
   )}
   ```

2. **Map Images** - Line 1400-1412:
   ```typescript
   {layerVisibility.map && sortedElements
     .filter(el => el.layer === 'map' && el.type === 'image')
     ...
   }
   ```

3. **Tokens** - Lines 1440-1455 and 1523-1538:
   ```typescript
   {layerVisibility.tokens && sortedElements
     .filter(el => el.type === 'token' ...)
     ...
   }
   ```

4. **Drawings (Shapes)** - Lines 1413-1426 and 1496-1508:
   ```typescript
   {layerVisibility.drawings && sortedElements
     .filter(el => el.type === 'shape' ...)
     ...
   }
   ```

5. **Text Labels** - Lines 1427-1439 and 1509-1522:
   ```typescript
   {layerVisibility.text && sortedElements
     .filter(el => el.type === 'text' ...)
     ...
   }
   ```

6. **Fog of War** - Line 1458 (already has GM logic):
   ```typescript
   {game.fogOfWar.enabled && layerVisibility.fog && !isDM && (
     ...
   )}
   ```

### Step 3: Preview as Player Mode

**Logic**:
- When `previewAsPlayer` is true, temporarily treat GM as non-GM for visibility purposes
- Update visibility checks in Token, MapImage, Shape, and TextLabel components
- Show GM-only elements with reduced opacity or outline to indicate they're hidden to players

**Pass to Components**:
```typescript
const effectiveIsDM = isDM && !previewAsPlayer;
```

## UI/UX Considerations

1. **Layer Independence**: Each layer can be toggled independently
2. **Visual Feedback**: 
   - Checkbox state matches visibility
   - Preview mode shows visual difference (maybe add overlay message)
3. **Persistence**: Layer visibility should persist in settings/localStorage
4. **Performance**: No performance impact as we're just filtering visibility

## File Changes Required

1. **vtt/src/components/Sidebar.tsx**
   - Add layer controls section to GM Tools tab
   - Wire up toggles to gameStore actions

2. **vtt/src/components/GameCanvas.tsx**
   - Add `layerVisibility` and `previewAsPlayer` from gameStore
   - Update render conditions for each layer type
   - Add `effectiveIsDM` logic for preview mode

## Testing Checklist

- [ ] Toggle each layer on/off individually
- [ ] Verify grid toggle works
- [ ] Verify tokens hide/show correctly
- [ ] Verify drawings hide/show correctly
- [ ] Verify text labels hide/show correctly
- [ ] Verify map images hide/show correctly
- [ ] Test Preview as Player mode shows correct view
- [ ] Verify fog of war behaves correctly in preview mode
- [ ] Check that layers stay hidden after page refresh (if persisted)

## Future Enhancements (Not in Scope)

- Layer opacity sliders
- Layer locking (prevent edits)
- Quick layer presets ("Combat View", "Exploration View")
- Per-element layer assignment UI

## Estimated Complexity

**Effort**: Low (2-3 hours)
**Risk**: Very Low - State already exists, just need UI and filtering

## Dependencies

- Mantine UI components (already installed)
- Zustand store (already configured)
- No new dependencies needed
