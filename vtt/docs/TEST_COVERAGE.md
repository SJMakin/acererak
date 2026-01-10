# VTT E2E Test Coverage

This document describes the comprehensive end-to-end test coverage for the Lychgate VTT application using Playwright.

## Test Files

### 1. Game Creation Tests (`tests/e2e/game-creation.spec.ts`)

**Purpose:** Verify the game creation flow and lobby functionality.

**Test Coverage:**
- ✅ Display lobby on initial load
- ✅ Create a new game as GM
- ✅ Validate required fields (game name, GM name)
- ✅ Show recent games tab
- ✅ Populate join form from URL parameter
- ✅ Validate join game form
- ✅ Allow color selection for players
- ✅ Load game canvas after creation
- ✅ Show GM controls in toolbar

**Happy Path:**
1. User opens the VTT
2. Clicks "Create Game" tab
3. Enters game name and GM name
4. Clicks "Create Game" button
5. Sees QR code and room ID
6. Clicks "Start Game"
7. Canvas loads with toolbar and controls

### 2. Canvas Interactions Tests (`tests/e2e/canvas-interactions.spec.ts`)

**Purpose:** Test basic canvas interaction features.

**Test Coverage:**
- ✅ Display canvas with grid
- ✅ Pan canvas using pan tool
- ✅ Zoom in and out with zoom controls
- ✅ Zoom using mouse wheel
- ✅ Reset zoom to 100%
- ✅ Toggle sidebar visibility
- ✅ Switch between tools
- ✅ Open settings modal
- ✅ Show connection status
- ✅ Display game name in toolbar
- ✅ Handle keyboard shortcuts (Ctrl+Z, Ctrl+Y, tool shortcuts)
- ✅ Show undo/redo buttons
- ✅ Toggle grid visibility in settings

**Happy Path:**
1. Game canvas loads
2. Grid is visible
3. User can pan with pan tool or Space key
4. User can zoom with mouse wheel or zoom buttons
5. Undo/redo buttons are accessible
6. Sidebar can be toggled

### 3. Token Management Tests (`tests/e2e/token-management.spec.ts`)

**Purpose:** Verify token creation, editing, and manipulation.

**Test Coverage:**
- ✅ Add token via sidebar form
- ✅ Add token via token tool (click-to-place)
- ✅ Select token by clicking
- ✅ Display token in sidebar list
- ✅ Delete token from sidebar
- ✅ Show empty state when no tokens
- ✅ Show token properties when selected
- ✅ Edit token properties via Property Inspector
- ✅ Update token HP
- ✅ Display token visibility options for GM
- ✅ Lock/unlock token
- ✅ Move token by dragging on canvas
- ✅ Snap to grid when snap is enabled

**Happy Path:**
1. User adds token via sidebar (name, optional image URL, size)
2. Token appears in sidebar list
3. Token appears on canvas at default position
4. User can click token to select it
5. User can drag token to new position
6. User can edit properties in Property Inspector
7. User can delete token

### 4. Drawing Tools Tests (`tests/e2e/drawing-tools.spec.ts`)

**Purpose:** Test all drawing tools and shape creation.

**Test Coverage:**

**Drawing Tools:**
- ✅ Activate and use freehand draw tool
- ✅ Activate and use line tool
- ✅ Activate and use rectangle tool
- ✅ Activate and use circle tool
- ✅ Activate and use ellipse tool
- ✅ Activate and use arrow tool
- ✅ Activate and use polygon tool (multi-point)

**Drawing Style Controls:**
- ✅ Show drawing controls when tool is active
- ✅ Change stroke color
- ✅ Change fill color
- ✅ Toggle fill on/off
- ✅ Change stroke width

**Text Tool:**
- ✅ Activate text tool
- ✅ Create text box on canvas
- ✅ Edit existing text on double-click

**Shape Manipulation:**
- ✅ Select drawn shape
- ✅ Move selected shape
- ✅ Delete selected shape with Delete key

**Happy Path:**
1. User selects a drawing tool (e.g., rectangle)
2. Drawing controls appear (color pickers, stroke width)
3. User customizes colors and stroke
4. User draws shape on canvas by click-drag
5. Shape appears on canvas
6. User can select and move shape
7. User can delete shape with Delete key

### 5. Combat Tracker Tests (`tests/e2e/combat-tracker.spec.ts`)

**Purpose:** Verify combat tracking functionality.

**Test Coverage:**

**Combat Management:**
- ✅ Show combat tracker in sidebar
- ✅ Show no combat active initially
- ✅ Start combat as GM
- ✅ Add combatant to combat
- ✅ Show initiative order
- ✅ Advance turn with Next button
- ✅ Go back with Previous button
- ✅ Show current turn indicator
- ✅ Remove combatant from combat
- ✅ End combat

**Combatant Management:**
- ✅ Update combatant HP
- ✅ Show HP bar for combatants
- ✅ Add condition to combatant
- ✅ Remove condition from combatant
- ✅ Show initiative badges
- ✅ Allow optional dexterity tiebreaker

**Round Tracking:**
- ✅ Show round counter
- ✅ Increment round after full turn rotation
- ✅ Preserve initiative order

**Integration:**
- ✅ Highlight active combatant token on canvas
- ✅ Update token HP on canvas when changed in combat tracker
- ✅ Show conditions on token when added in combat tracker
- ✅ Only allow GM to control combat
- ✅ Complete full combat workflow

**Happy Path:**
1. GM creates tokens for combat
2. GM clicks "Start Combat"
3. GM adds combatants with initiative values
4. Combat tracker shows initiative order
5. GM clicks "Next" to advance turns
6. Current combatant is highlighted
7. GM updates HP and adds conditions
8. Changes reflect on canvas tokens
9. GM clicks "End Combat" when done

## Running Tests

### Install Dependencies
```bash
cd vtt
npm install
npx playwright install chromium
```

### Run All Tests
```bash
npm run test:e2e
```

### Run with UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Tests
```bash
npm run test:e2e:debug
```

### View Test Report
```bash
npm run test:e2e:report
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/game-creation.spec.ts
```

### Run Specific Test
```bash
npx playwright test -g "should create a new game as GM"
```

## Test Configuration

Tests are configured in [`playwright.config.ts`](./playwright.config.ts) with the following settings:

- **Timeout:** 60 seconds (increased for P2P connections)
- **Workers:** 1 (sequential execution to avoid conflicts)
- **Base URL:** http://localhost:5173
- **Browser:** Chromium (Desktop Chrome)
- **Retries:** 2 in CI, 0 locally
- **Screenshots:** On failure
- **Videos:** Retained on failure
- **Traces:** On first retry

## Test Strategy

### Approach
1. **Happy Path Focus:** Tests cover the expected user flows
2. **Resilient Selectors:** Uses semantic selectors (roles, labels) with fallbacks
3. **Timeouts:** Appropriate waits for P2P sync and animations
4. **Isolation:** Each test creates a fresh game to avoid state conflicts

### Selector Strategy
Tests use this priority for finding elements:
1. Role-based selectors (`getByRole`)
2. Label-based selectors (`getByLabel`)
3. Text-based selectors (`getByText`)
4. Attribute-based fallbacks (`aria-label`, `title`)
5. Keyboard shortcuts as alternatives

### Known Limitations
- **P2P Testing:** Tests run in single browser context; multi-player scenarios not tested
- **Canvas Verification:** Visual verification of canvas elements is limited
- **Timing Sensitivity:** Some tests may be fragile due to P2P sync delays

## Continuous Integration

To run tests in CI:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: cd vtt && npm ci
  
- name: Install Playwright browsers
  run: cd vtt && npx playwright install chromium
  
- name: Run E2E tests
  run: cd vtt && npm run test:e2e
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: vtt/playwright-report/
```

## Error Identification

Tests are designed to identify:

1. **UI Rendering Issues:** Missing buttons, forms, or UI elements
2. **Validation Errors:** Form validation not working correctly
3. **State Management Bugs:** State not updating properly
4. **P2P Sync Issues:** Elements not broadcasting/receiving correctly
5. **Navigation Problems:** Routing or page transitions failing
6. **Tool Activation:** Drawing tools or game tools not activating
7. **Canvas Interactions:** Pan, zoom, or drawing not working
8. **Combat Logic:** Initiative order, turn tracking, or HP updates failing

## Test Maintenance

### When to Update Tests
- When UI components change (selectors may need updating)
- When new features are added
- When user flows change
- When bugs are fixed (add regression tests)

### Best Practices
- Keep tests focused on user workflows, not implementation
- Use data-testid attributes for stable selectors when needed
- Document complex test scenarios
- Clean up test data after tests
- Run tests locally before committing

## Coverage Summary

**Total Test Files:** 5
**Total Test Cases:** ~100+

**Coverage by Feature:**
- Game Creation & Lobby: ✅ Comprehensive
- Canvas Interactions: ✅ Comprehensive
- Token Management: ✅ Comprehensive
- Drawing Tools: ✅ Comprehensive
- Combat Tracker: ✅ Comprehensive

**Not Covered:**
- Multi-player interactions (P2P)
- Real-time synchronization verification
- Image upload and processing
- Database persistence (IndexedDB)
- Fog of War visual verification
- Dice roller functionality
- Settings persistence across sessions

## Next Steps

1. Run initial test suite and identify failures
2. Fix any broken selectors or timing issues
3. Add visual regression tests for canvas elements
4. Implement multi-browser testing for P2P scenarios
5. Add performance benchmarks
6. Integrate tests into CI/CD pipeline
