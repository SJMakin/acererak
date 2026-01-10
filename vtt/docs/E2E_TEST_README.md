# VTT E2E Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
cd vtt
npm install
```

### 2. Install Playwright Browsers
```bash
npx playwright install chromium
```

### 3. Start the Development Server
**Important:** The dev server must be running before tests execute.

```bash
npm run dev
```

Wait for the server to start. You should see:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### 4. Run Tests (in a separate terminal)
```bash
# In a new terminal window
cd vtt

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/game-creation.spec.ts

# Run with UI (interactive mode)
npm run test:e2e:ui
```

## Available Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests headlessly |
| `npm run test:e2e:ui` | Open Playwright Test UI for interactive testing |
| `npm run test:e2e:headed` | Run tests in headed mode (watch browser) |
| `npm run test:e2e:debug` | Run tests in debug mode with step-by-step execution |
| `npm run test:e2e:report` | Open the HTML test report |

## Running Specific Tests

### Run a single test file
```bash
npx playwright test tests/e2e/game-creation.spec.ts
```

### Run a specific test by name
```bash
npx playwright test --grep "should create a new game as GM"
```

### Run tests matching a pattern
```bash
npx playwright test --grep "token"
```

## Test Files

1. **game-creation.spec.ts** - Game creation and lobby functionality
2. **canvas-interactions.spec.ts** - Canvas pan, zoom, and basic interactions
3. **token-management.spec.ts** - Token creation, editing, and manipulation
4. **drawing-tools.spec.ts** - All drawing tools and shape creation
5. **combat-tracker.spec.ts** - Combat tracking and initiative management

## Troubleshooting

### Connection Refused Error
**Problem:** `Error: page.goto: net::ERR_CONNECTION_REFUSED`

**Solution:** Make sure the dev server is running on port 5173
```bash
# In one terminal
npm run dev

# Wait for "Local: http://localhost:5173/" message
# Then in another terminal
npm run test:e2e
```

### Port Already in Use
**Problem:** Dev server fails to start - port 5173 is in use

**Solution:** 
1. Find and kill the process using port 5173
2. Or change the port in `vite.config.ts`

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### Tests Timeout
**Problem:** Tests timeout waiting for elements

**Causes:**
- P2P connection delays
- Slow rendering
- Elements not appearing as expected

**Solutions:**
- Increase timeout in `playwright.config.ts`
- Check if selectors match actual UI elements
- Run tests in headed mode to see what's happening: `npm run test:e2e:headed`

### Test Failures Due to UI Changes
**Problem:** Tests fail after UI updates

**Solution:** Update test selectors to match new UI elements
- Check the test report: `npm run test:e2e:report`
- Look at screenshots and videos of failed tests
- Update selectors in test files

## Debugging Tests

### Method 1: Playwright Inspector
```bash
npm run test:e2e:debug
```

This opens the Playwright Inspector where you can:
- Step through test actions
- Inspect element selectors
- View console logs
- Pause and resume execution

### Method 2: Headed Mode
```bash
npm run test:e2e:headed
```

Runs tests with browser visible so you can watch the automation.

### Method 3: UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

Opens an interactive UI where you can:
- Run individual tests
- Watch test execution
- Time-travel through test steps
- Inspect DOM snapshots
- View network requests

### Method 4: Add Debug Statements
```typescript
test('my test', async ({ page }) => {
  await page.pause(); // Pauses execution
  console.log(await page.textContent('.my-element')); // Log content
  await page.screenshot({ path: 'debug.png' }); // Take screenshot
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: cd vtt && npm ci
      
      - name: Install Playwright browsers
        run: cd vtt && npx playwright install chromium
      
      - name: Run E2E tests
        run: cd vtt && npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: vtt/playwright-report/
```

## Best Practices

### 1. Keep Dev Server Running
- Tests run faster when server is already started
- Less startup/shutdown overhead
- Easier to debug with consistent server state

### 2. Run Tests in UI Mode During Development
```bash
npm run test:e2e:ui
```
- Provides best debugging experience
- Visual feedback on test execution
- Easy to re-run failed tests

### 3. Check Test Reports After Failures
```bash
npm run test:e2e:report
```
- Shows screenshots of failures
- Includes videos of test runs
- Displays full error traces

### 4. Use Semantic Selectors
Tests prioritize semantic selectors:
1. Role-based: `getByRole('button', { name: 'Submit' })`
2. Label-based: `getByLabel('Username')`
3. Text-based: `getByText('Welcome')`
4. Attribute-based: `getByTestId('submit-btn')` (when needed)

### 5. Handle Timing Issues
- Use built-in waiting: `expect(element).toBeVisible()`
- Add explicit waits when needed: `page.waitForTimeout(500)`
- Wait for network: `page.waitForLoadState('networkidle')`

## Test Coverage

See [TEST_COVERAGE.md](./TEST_COVERAGE.md) for detailed information about:
- What features are tested
- Test scenarios covered
- Known limitations
- Future improvements

## Performance Considerations

### Speeding Up Tests
1. **Run specific test files** instead of entire suite during development
2. **Use headed mode sparingly** - headless is faster
3. **Disable unnecessary features** like video recording for passing tests
4. **Parallelize** when stable (update workers in config)

### Current Settings
- **Workers:** 1 (sequential) - Prevents P2P conflicts
- **Retries:** 0 locally, 2 in CI
- **Timeout:** 60 seconds per test
- **Videos:** Only on failure
- **Screenshots:** Only on failure

## Known Issues

### 1. P2P Synchronization
- Tests run in single browser context
- Multi-player scenarios not fully testable
- May need manual testing for P2P features

### 2. Canvas Visual Verification
- Limited ability to verify drawn shapes visually
- Tests verify actions complete, not visual output
- Consider visual regression testing tools for comprehensive coverage

### 3. IndexedDB State
- Tests may leave data in IndexedDB
- Can cause test interference
- Clear browser storage if tests behave unexpectedly

### 4. Timing Sensitivity
- Some tests may be flaky due to P2P delays
- Increase timeouts if seeing intermittent failures
- Report consistent failures as bugs

## Getting Help

1. **Check test reports:** `npm run test:e2e:report`
2. **Run in UI mode:** `npm run test:e2e:ui`
3. **Check Playwright docs:** https://playwright.dev
4. **Review test files** for examples and patterns
5. **Update selectors** if UI has changed

## Next Steps

After running initial tests:
1. Review failures and update selectors
2. Add more test scenarios as needed
3. Integrate into CI/CD pipeline
4. Add visual regression tests
5. Implement multi-browser P2P testing
