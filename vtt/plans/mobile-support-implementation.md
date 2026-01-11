# Mobile Support Implementation Plan (Phase 3.9)

## 1. Overview
This plan outlines the steps to make Lychgate VTT fully functional on mobile devices. The goal is to support touch gestures (pinch-zoom, pan) and provide a responsive layout that works on smaller screens.

## 2. Technical Architecture

### 2.1 Gesture Handling
We will use **`@use-gesture/react`** to handle complex touch interactions. This library provides robust hooks for drag, pinch, and scroll events, which are difficult to implement correctly from scratch.

*   **Pinch:** Mapped to `zoomViewport`.
*   **Two-finger Drag:** Mapped to `panViewport`.
*   **One-finger Drag:** Mapped to tool actions (draw, move token, etc.).

### 2.2 Responsive Layout
*   **Viewport:** Update `index.html` to prevent default browser zooming (`user-scalable=no`).
*   **Toolbar:**
    *   Desktop: Horizontal top bar (current).
    *   Mobile: Compact top bar with essential tools + Bottom bar or Drawer for secondary tools.
    *   Use Mantine's `MediaQuery` or `useMediaQuery` hook to switch layouts.
*   **Sidebar:**
    *   Desktop: Fixed right sidebar (current).
    *   Mobile: Collapsible Drawer (modal) that slides in from the right.

### 2.3 Component Adaptations
*   **Touch Targets:** Increase button sizes to min 44px for touch.
*   **Modals:** Ensure all modals (Token Config, Settings, etc.) fit within mobile screen width (100% width on mobile).

## 3. Implementation Steps

### Step 1: Dependencies & Configuration
1.  Install `@use-gesture/react`.
2.  Update `vtt/index.html` viewport meta tag.

### Step 2: GameCanvas Gesture Integration
1.  Modify `vtt/src/components/GameCanvas.tsx`:
    *   Import `useGesture` from `@use-gesture/react`.
    *   Replace/Augment existing `onTouch` handlers with `useGesture` hooks.
    *   Implement logic to distinguish between "Canvas Navigation" (2 fingers) and "Tool Interaction" (1 finger).
    *   **Logic:**
        *   If `touches === 2`: Pan/Zoom.
        *   If `touches === 1`: Pass through to Konva for drawing/selecting.

### Step 3: Responsive Toolbar
1.  Modify `vtt/src/components/Toolbar.tsx`:
    *   Use `useMediaQuery('(max-width: 768px)')` to detect mobile.
    *   **Mobile Layout:**
        *   Top Bar: Menu (Hamburger), Scene Name, Undo/Redo.
        *   Bottom Bar (New): Primary Tools (Select, Pan, Draw, Token).
        *   Overflow Menu: Less common tools.
    *   Increase icon sizes and padding for touch.

### Step 4: Responsive Sidebar
1.  Modify `vtt/src/App.tsx` (or wherever `Sidebar` is rendered):
    *   On mobile, render `Sidebar` inside a Mantine `Drawer` component.
    *   Add a state `mobileSidebarOpen`.
    *   Connect Toolbar "Menu" button to toggle `mobileSidebarOpen`.

### Step 5: Mobile-Specific Component Tweaks
1.  **Dice Roller:** Ensure buttons are large enough.
2.  **Chat:** Maximize height on mobile, maybe overlay on top of canvas when active.
3.  **Modals:** Update `TokenConfigModal`, `ImageModal`, etc., to use `size="100%"` or `fullScreen` on mobile.

## 4. File Changes

### `vtt/package.json`
*   Add `@use-gesture/react`.

### `vtt/index.html`
*   Update `<meta name="viewport">`.

### `vtt/src/components/GameCanvas.tsx`
*   Add `useGesture` hook.
*   Refactor event handling logic.

### `vtt/src/components/Toolbar.tsx`
*   Add responsive logic.
*   Restructure for mobile view.

### `vtt/src/App.tsx` (or `vtt/src/main.tsx` / Layout wrapper)
*   Implement Mobile Drawer for Sidebar.

### `vtt/src/components/Sidebar.tsx`
*   Ensure content is scrollable and fits in Drawer.

## 5. Priority Order
1.  **Core Touch:** Install lib, fix viewport, implement Canvas gestures (Zoom/Pan). *Critical for usability.*
2.  **Layout Structure:** Sidebar Drawer & Responsive Toolbar. *Critical for screen real estate.*
3.  **UI Refinement:** Touch targets, Modal sizing, Chat improvements. *Polish.*
