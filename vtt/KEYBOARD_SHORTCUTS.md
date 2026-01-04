# Keyboard Shortcuts & Undo/Redo Documentation

## Overview
The VTT now supports comprehensive keyboard shortcuts and a full undo/redo system to improve workflow efficiency.

## Keyboard Shortcuts

### Tool Selection
- **S** - Select tool (👆)
- **D** - Freehand Draw tool (✏️)
- **L** - Line tool (📏)
- **R** - Rectangle tool (⬜)
- **C** - Circle tool (⭕)
- **T** - Text tool (📝)
- **M** - Measure tool (📐)
- **P** - Ping tool (📍)
- **N** - Token placement tool (🎯)

### Navigation & View
- **Space** (hold) - Temporarily activate Pan tool, releases back to previous tool when released
- **Mouse Wheel** - Zoom in/out

### Actions
- **Delete** - Remove selected element
- **Escape** - Deselect all / Cancel current action / Return to Select tool
- **Ctrl+Z** - Undo last action
- **Ctrl+Y** or **Ctrl+Shift+Z** - Redo action
- **Ctrl+S** - Save game (export to database)

### Notes
- Keyboard shortcuts are disabled when typing in input fields or textareas
- All shortcuts support both Windows (Ctrl) and Mac (Cmd) modifiers
- Tool shortcuts are single-key only (no modifiers required)

## Undo/Redo System

### Tracked Actions
The following actions are tracked in the undo/redo history:

1. **Element Added** - When tokens, shapes, text, or images are added
2. **Element Deleted** - When elements are removed
3. **Element Moved** - When elements are dragged to new positions
4. **Element Updated** - When element properties change (HP, etc.)
5. **Fog Revealed** - When fog of war areas are revealed
6. **Fog Hidden** - When fog of war areas are hidden

### Features
- **History Limit**: Maximum of 50 actions stored
- **Stack Management**: Redo stack is automatically cleared when a new action is performed
- **Visual Feedback**: Undo/Redo buttons in toolbar show enabled/disabled state
- **Smart Tracking**: Minor updates (like cursor moves) are not tracked to keep history clean

### UI Components
- **Undo Button** (↶) - Located in the toolbar, shows tooltip "Undo (Ctrl+Z)"
- **Redo Button** (↷) - Located in the toolbar, shows tooltip "Redo (Ctrl+Y)"
- Buttons are disabled when no actions are available

## Technical Implementation

### Files Created
1. **`vtt/src/stores/historyStore.ts`** - Zustand store managing undo/redo stacks
2. **`vtt/src/hooks/useKeyboardShortcuts.ts`** - Custom hook handling all keyboard events

### Files Modified
1. **`vtt/src/stores/gameStore.ts`** - Added history tracking to element operations
2. **`vtt/src/components/Toolbar.tsx`** - Added undo/redo buttons and shortcut tooltips
3. **`vtt/src/App.tsx`** - Integrated keyboard shortcuts hook

### History Action Structure
```typescript
interface HistoryAction {
  type: 'add' | 'delete' | 'update' | 'move' | 'fog-reveal' | 'fog-hide';
  timestamp: number;
  before: Partial<GameState>;  // State before action
  after: Partial<GameState>;   // State after action
  elementId?: string;           // Optional element identifier
  description: string;          // Human-readable description
}
```

### Skip History Parameter
Functions that track history accept an optional `skipHistory` parameter to prevent infinite loops during undo/redo operations:
- `addElement(element, skipHistory?)`
- `updateElement(id, updates, skipHistory?)`
- `deleteElement(id, skipHistory?)`
- `revealFog(polygon, skipHistory?)`
- `hideFog(polygon, skipHistory?)`

## Testing Checklist

### Keyboard Shortcuts
- [ ] Press S - switches to Select tool
- [ ] Press D - switches to Freehand Draw
- [ ] Press L - switches to Line tool
- [ ] Press R - switches to Rectangle tool
- [ ] Press C - switches to Circle tool
- [ ] Press T - switches to Text tool
- [ ] Press M - switches to Measure tool
- [ ] Press P - switches to Ping tool
- [ ] Press N - switches to Token placement
- [ ] Hold Space - temporarily switches to Pan, releases back to previous tool
- [ ] Select element and press Delete - element is removed
- [ ] Press Escape - deselects current element/tool

### Undo/Redo Functionality
- [ ] Add a token - click Undo - token disappears
- [ ] Undo adding token - click Redo - token reappears
- [ ] Move a token - click Undo - token returns to original position
- [ ] Delete an element - click Undo - element reappears
- [ ] Draw a shape - click Undo - shape disappears
- [ ] Reveal fog - click Undo - fog is hidden again
- [ ] Perform 5 actions then undo all 5 - verify each action reverses correctly
- [ ] Undo 3 actions, perform new action - verify redo stack clears
- [ ] Ctrl+Z works for undo
- [ ] Ctrl+Y works for redo
- [ ] Ctrl+Shift+Z works for redo
- [ ] Undo/Redo buttons disable when stack is empty

### Integration Tests
- [ ] Keyboard shortcuts work during active game
- [ ] Shortcuts don't trigger when typing in text fields
- [ ] Tooltips show correct keyboard shortcuts
- [ ] History persists across tool changes
- [ ] Maximum 50 actions maintained in history
- [ ] Ctrl+S saves game without errors

## Known Limitations
1. Combat tracker changes are not currently tracked in undo/redo
2. Viewport changes (pan/zoom) are not undoable
3. Player cursor positions are not tracked
4. Grid settings changes are not tracked

## Future Enhancements
- Add undo/redo for combat tracker
- Add undo/redo for grid settings
- Add visual notification when saving
- Add command palette showing all shortcuts
- Add customizable keyboard bindings
