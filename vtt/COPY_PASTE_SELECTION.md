# Copy/Paste and Multi-Selection Features

## Overview
The VTT now supports advanced copy/paste functionality and improved element selection, allowing for efficient manipulation of multiple elements on the canvas.

## Features Implemented

### 1. Multi-Selection

#### Selection Methods
- **Click and Drag (Selection Box)**: With the Select tool active, click and drag on empty canvas to draw a selection rectangle. All elements inside the box will be selected.
- **Ctrl+Click**: Toggle individual elements in/out of the selection
- **Shift+Click**: Add elements to the current selection
- **Regular Click**: Select a single element (clears previous selection)

#### Visual Indicators
- **Single Selection**: Blue highlight (stroke color: #3b82f6)
- **Multi-Selection**: Green highlight with thicker stroke (stroke color: #22c55e, strokeWidth: 3)
- **Selection Box**: Blue dashed rectangle while dragging (stroke: #3b82f6, dash pattern)
- **Selection Count**: Displayed in Sidebar when multiple elements are selected

### 2. Copy/Paste Functionality

#### Keyboard Shortcuts
- **Ctrl+C**: Copy selected element(s) to clipboard
- **Ctrl+X**: Cut selected element(s) (copies and deletes from canvas)
- **Ctrl+V**: Paste copied element(s) at mouse position
- **Delete**: Delete all selected elements

#### Paste Behavior
- Elements are pasted at the current mouse position
- If mouse position is not available, elements paste at canvas center
- Pasted elements are offset slightly to avoid exact overlap
- Token names get "(Copy)" appended to distinguish them
- All element properties are preserved (colors, sizes, HP, etc.)

#### Supported Element Types
- ✅ Tokens (with HP, AC, conditions)
- ✅ Shapes (freehand, lines, rectangles, circles)
- ✅ Text elements
- ✅ Images

### 3. Bulk Operations (DM Only)

When multiple elements are selected, the DM Tools tab shows bulk action options:

#### Available Bulk Actions
- **Set Visibility**: Change visibility for all selected elements (All/DM Only)
- **Lock All**: Lock all selected elements to prevent movement
- **Unlock All**: Unlock all selected elements
- **Delete All Selected**: Remove all selected elements from canvas

### 4. Additional Features

#### Escape Key
- Press **Escape** to clear all selections and switch to Select tool

#### Element Properties
- Copied elements maintain all properties except ID (new IDs are generated)
- Z-index is updated to place pasted elements on top
- Grid snapping is respected when enabled

## Testing Guide

### Test Copy/Paste with Different Element Types

1. **Token Copy/Paste**
   - Add a token to the canvas
   - Configure HP, AC, and other properties
   - Select the token (Click)
   - Press Ctrl+C to copy
   - Move mouse to new location
   - Press Ctrl+V to paste
   - **Expected**: New token appears with "(Copy)" in name, all properties preserved

2. **Shape Copy/Paste**
   - Draw a freehand shape
   - Select it
   - Copy (Ctrl+C) and paste (Ctrl+V)
   - **Expected**: Duplicate shape appears at mouse position with slight offset

3. **Text Copy/Paste**
   - Add text to canvas
   - Select and copy
   - Paste multiple times
   - **Expected**: Multiple text copies appear with slight offsets

4. **Multiple Elements**
   - Use selection box to select 3+ elements
   - Copy all (Ctrl+C)
   - Paste (Ctrl+V)
   - **Expected**: All elements duplicated maintaining relative positions

### Test Selection Box

1. **Basic Selection Box**
   - Switch to Select tool
   - Click and drag on empty canvas
   - **Expected**: Blue dashed rectangle appears while dragging
   - Release mouse
   - **Expected**: All elements within box are selected (green highlights)

2. **Empty Selection Box**
   - Draw selection box in empty area
   - **Expected**: No elements selected, previous selection cleared

### Test Multi-Select

1. **Ctrl+Click Selection**
   - Click first element (selected)
   - Ctrl+Click second element (both selected)
   - Ctrl+Click first element again (only second selected)
   - **Expected**: Ctrl+Click toggles selection

2. **Shift+Click Selection**
   - Click first element
   - Shift+Click second element
   - Shift+Click third element
   - **Expected**: All three elements selected

3. **Mixed Selection**
   - Use selection box to select multiple
   - Ctrl+Click to remove one from selection
   - Shift+Click to add another
   - **Expected**: Selection updated correctly

### Test Bulk Operations

1. **Bulk Visibility Change**
   - Select 3+ elements
   - Open DM Tools tab
   - Set visibility to "DM Only"
   - **Expected**: All selected elements become DM-only

2. **Bulk Lock/Unlock**
   - Select multiple elements
   - Click "Lock All"
   - Try to drag elements (should be locked)
   - Click "Unlock All"
   - Drag elements (should move)
   - **Expected**: All elements locked/unlocked together

3. **Bulk Delete**
   - Select multiple elements (use selection box)
   - Click "Delete All Selected" in DM Tools
   - **Expected**: All selected elements removed

### Test Cut Functionality

1. **Cut and Paste**
   - Select element
   - Press Ctrl+X (element disappears)
   - Move mouse
   - Press Ctrl+V
   - **Expected**: Element reappears at new location

2. **Cut Multiple Elements**
   - Select 3+ elements
   - Press Ctrl+X
   - **Expected**: All elements removed from canvas
   - Press Ctrl+V
   - **Expected**: All elements pasted at mouse position

## Implementation Details

### Files Modified
- `vtt/src/stores/gameStore.ts`: Added multi-selection state and actions
- `vtt/src/hooks/useKeyboardShortcuts.ts`: Added copy/paste keyboard shortcuts
- `vtt/src/components/GameCanvas.tsx`: Added selection box and multi-select logic
- `vtt/src/components/Sidebar.tsx`: Added selection count display and bulk actions

### Files Created
- `vtt/src/hooks/useClipboard.ts`: Copy/paste logic and clipboard management

### Key Functions

#### gameStore.ts
- `selectElements(ids)`: Select multiple elements
- `toggleElementSelection(id)`: Toggle element in selection
- `addToSelection(id)`: Add element to selection
- `clearSelection()`: Clear all selections
- `addElements(elements)`: Add multiple elements at once
- `deleteElements(ids)`: Delete multiple elements

#### useClipboard.ts
- `copyElements(elementIds)`: Copy elements to clipboard
- `cutElements(elementIds)`: Cut elements to clipboard
- `pasteElements(mousePosition)`: Paste from clipboard
- `copySelected()`: Copy currently selected elements
- `cutSelected()`: Cut currently selected elements

## Known Behaviors

1. **Paste Position**: Elements paste at mouse position or canvas center
2. **Token Names**: Copied tokens get "(Copy)" appended to name
3. **Random Offset**: Slight random offset applied to avoid exact overlap
4. **Z-Index**: Pasted elements appear on top of existing elements
5. **Grid Snap**: Paste position respects grid snapping if enabled

## Troubleshooting

**Selection box not appearing:**
- Ensure Select tool is active
- Don't hold Ctrl or Shift while dragging
- Start drag on empty canvas (not on element)

**Copy/Paste not working:**
- Ensure elements are selected (check sidebar for count)
- Verify no input/textarea is focused
- Check console for errors

**Bulk actions not available:**
- Ensure you're logged in as DM
- Select 2+ elements (single element shows individual properties)
- Open DM Tools tab in sidebar
