import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a game and navigate to the game canvas. */
async function createAndStartGame(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: /Create Game/i }).click();
  await page.getByLabel(/Game Name/i).fill('Sheet Test');
  await page.getByPlaceholder('Game Master').fill('GM');
  await page.getByRole('button', { name: /Create Game/i }).click();
  await expect(page.getByText(/Game Created!/i)).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /Start Game/i }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 });
}

/** Open Library tab, click "+ New Sheet", fill in name, select Blank template, create, wait for sheet modal. */
async function openNewSheetModal(page: Page, name?: string) {
  await page.getByRole('tab', { name: /Library/i }).click();
  await page.getByRole('button', { name: /New Sheet/i }).click();
  // New sheet creation modal appears
  const createModal = page.locator('.mantine-Modal-content').last();
  await expect(createModal.getByLabel('Name')).toBeVisible({ timeout: 5000 });
  await createModal.getByLabel('Name').fill(name || 'Test Sheet');
  // Select Blank template so the editor starts empty
  await createModal.getByLabel('Template').click();
  await page.getByRole('option', { name: 'Blank' }).click();
  await createModal.getByRole('button', { name: /Create$/i }).click();
  // Sheet editor modal opens automatically after creation
  await expect(page.getByPlaceholder('Untitled Sheet')).toBeVisible({ timeout: 5000 });
}

/** Shorthand: the TipTap editor element inside the character sheet modal. */
function editor(page: Page) {
  return page.locator('.tiptap');
}

/**
 * Type a stat declaration and press Enter to trigger conversion.
 * e.g. typeStat(page, 'HP:: 45 #bar') types it and presses Enter.
 */
async function typeStat(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 20 });
  await page.keyboard.press('Enter');
}

/** Save the sheet currently open in the modal. */
async function saveSheet(page: Page) {
  // Small delay to let debounced onChange flush content to parent
  await page.waitForTimeout(400);
  const saveBtn = page.locator('.sheet-modal__footer').getByRole('button', { name: /Create Sheet|Save Changes/i });
  await saveBtn.click();
  await expect(page.getByPlaceholder('Untitled Sheet')).not.toBeVisible({ timeout: 5000 });
}

/** Scroll to find a sheet in the library and click it to open. */
async function editSheetFromLibrary(page: Page, name: string) {
  const scrollArea = page.locator('[class*="mantine-ScrollArea"]').last();
  await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
  // Click the sheet row to open it
  const sheetCard = page.locator('[class*="mantine-Paper"]', { hasText: name });
  await sheetCard.click();
  await expect(page.getByPlaceholder('Untitled Sheet')).toBeVisible({ timeout: 5000 });
}

/** Copy all editor content, paste into title input, return as plain text. */
async function getEditorTextViaCopy(page: Page): Promise<string> {
  await editor(page).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+c');
  const titleInput = page.getByPlaceholder('Untitled Sheet');
  await titleInput.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+v');
  const text = await titleInput.inputValue();
  // Restore the title
  await page.keyboard.press('Control+z');
  return text;
}

/** Insert a widget via the / command palette.
 *  Ensures the editor is focused and the cursor is in a text position before
 *  pressing '/'. Retries once if the palette doesn't appear (race between
 *  cursor settlement and keydown handler).
 */
async function insertViaCommandPalette(page: Page, commandLabel: string) {
  // Ensure cursor is not mid-word so '/' triggers the palette
  await editor(page).press('End');
  await page.keyboard.type(' ');
  const palette = page.locator('.command-palette');

  // First attempt
  await page.keyboard.press('/');
  try {
    await expect(palette).toBeVisible({ timeout: 1500 });
  } catch {
    // Retry: the '/' may have been typed as text — delete it and try again
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
    await page.keyboard.press('/');
    await expect(palette).toBeVisible({ timeout: 2000 });
  }

  // Use keyboard to filter and select — avoids viewport/z-index click issues
  const searchInput = palette.locator('.command-palette__header input');
  await searchInput.fill(commandLabel);
  await expect(palette.locator('.command-palette__item').first()).toBeVisible({ timeout: 2000 });
  await searchInput.press('Enter');
  await expect(palette).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Character Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await createAndStartGame(page);
  });

  test('build a full character sheet by typing DSL syntax', async ({ page }) => {
    // This test builds a realistic character sheet using typed DSL syntax,
    // verifying each widget type renders correctly and content persists.

    await openNewSheetModal(page, 'Thorin Ironfist');

    const ed = editor(page);
    await ed.click();

    // -- Heading --
    // Type a heading (## triggers H2 in TipTap markdown shortcuts)
    await page.keyboard.type('# Thorin Ironfist');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Level 5 Dwarf Fighter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // -- Stat declarations: type and press Enter to convert --
    await typeStat(page, 'HP:: 45 #bar');
    await expect(ed.locator('.stat-declaration').first()).toBeVisible({ timeout: 3000 });

    await typeStat(page, 'MaxHP:: 45');
    await expect(ed.locator('.stat-declaration')).toHaveCount(2, { timeout: 3000 });

    await typeStat(page, 'AC:: 18 #badge');
    await expect(ed.locator('.stat-declaration')).toHaveCount(3, { timeout: 3000 });

    // Stats are one-per-line (Enter-triggered), so we do them individually
    await typeStat(page, 'STR:: 16');
    await expect(ed.locator('.stat-declaration')).toHaveCount(4, { timeout: 3000 });

    await typeStat(page, 'DEX:: 12');
    await expect(ed.locator('.stat-declaration')).toHaveCount(5, { timeout: 3000 });

    await typeStat(page, 'CON:: 14');
    await typeStat(page, 'INT:: 8');
    await typeStat(page, 'WIS:: 10');
    await typeStat(page, 'CHA:: 10');
    await expect(ed.locator('.stat-declaration')).toHaveCount(9, { timeout: 3000 });
    await page.keyboard.press('Enter');

    // -- Bar widget via typed syntax (triggers on closing ]) --
    await page.keyboard.type('[bar: HP/MaxHP]', { delay: 20 });
    await expect(ed.locator('.bar-widget').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Enter');

    // -- Dots widget --
    await page.keyboard.type('[dots: 3/5]', { delay: 20 });
    await expect(ed.locator('.dots-widget').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Enter');

    // -- Action button --
    await page.keyboard.type('[Greataxe](action: 1d12 + STR)', { delay: 20 });
    await expect(ed.locator('.action-button').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Enter');

    // -- Expression (triggers on closing }}) --
    await page.keyboard.type('Modifier: ', { delay: 20 });
    await page.keyboard.type('{{ STR + 2 }}', { delay: 20 });
    await page.keyboard.press('Enter');

    // Verify all widget types rendered
    await expect(ed.locator('.stat-declaration')).toHaveCount(9);
    await expect(ed.locator('.bar-widget')).toHaveCount(1);
    await expect(ed.locator('.dots-widget')).toHaveCount(1);
    await expect(ed.locator('.action-button')).toHaveCount(1);

    // Also verify some text content survived around the widgets
    await expect(ed).toContainText('Thorin Ironfist');
    await expect(ed).toContainText('Level 5 Dwarf Fighter');
    await expect(ed).toContainText('Modifier:');

    // -- Expression should show computed result (STR=16, so 16+2=18) --
    const expression = ed.locator('.expression');
    await expect(expression).toHaveCount(1);
    await expect(expression).toContainText('18', { timeout: 3000 });
    // Should NOT show '?' or 'Error'
    await expect(expression).not.toContainText('?');
    await expect(expression).not.toContainText('Error');

    // -- Save and verify it appears in library --
    await saveSheet(page);

    const scrollArea = page.locator('[class*="mantine-ScrollArea"]').last();
    await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
    await expect(page.getByText('Thorin Ironfist')).toBeVisible({ timeout: 5000 });
  });

  test('build a character using command palette and verify save/load round-trip', async ({ page }) => {
    // Creates a character purely via the / command palette, saves it,
    // reopens it, and verifies all widgets survived the round-trip.

    await openNewSheetModal(page, 'Elara the Mage');

    const ed = editor(page);
    await ed.click();

    // Type a heading
    await page.keyboard.type('# Elara the Mage');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Insert HP stat via command palette
    await insertViaCommandPalette(page, 'HP Stat');
    await expect(ed.locator('.stat-declaration').first()).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Enter');

    // Insert AC stat
    await insertViaCommandPalette(page, 'AC Stat');
    await expect(ed.locator('.stat-declaration')).toHaveCount(2, { timeout: 2000 });
    await page.keyboard.press('Enter');

    // Insert bar widget
    await insertViaCommandPalette(page, 'HP Bar');
    await expect(ed.locator('.bar-widget').first()).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Enter');

    // Insert dots tracker
    await insertViaCommandPalette(page, 'Dot Tracker');
    await expect(ed.locator('.dots-widget').first()).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Enter');

    // Insert attack action
    await insertViaCommandPalette(page, 'Attack Roll');
    await expect(ed.locator('.action-button').first()).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Enter');

    // Insert expression
    await insertViaCommandPalette(page, 'Expression');
    await page.keyboard.press('Enter');

    // Add some plain text after — click editor first to ensure focus is settled
    await ed.click();
    await page.keyboard.type('Notes: Elara carries a staff of power.');

    // Save
    await saveSheet(page);

    // -- Reopen and verify everything survived --
    await editSheetFromLibrary(page, 'Elara the Mage');

    await expect(page.getByPlaceholder('Untitled Sheet')).toHaveValue('Elara the Mage');
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();

    // All widgets should still be rendered
    await expect(ed.locator('.stat-declaration')).toHaveCount(2, { timeout: 5000 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1);
    await expect(ed.locator('.dots-widget')).toHaveCount(1);
    await expect(ed.locator('.action-button')).toHaveCount(1);

    // Text content should be there
    await expect(ed).toContainText('Elara the Mage');
    await expect(ed).toContainText('Notes: Elara carries a staff of power.');
  });

  test('copy/paste preserves DSL syntax for all widget types', async ({ page }) => {
    // Insert one of each widget, copy, paste into plain text input,
    // verify the DSL source syntax comes through (not rendered DOM text).

    await openNewSheetModal(page);
    const ed = editor(page);
    await ed.click();

    // Build a line with mixed content
    await page.keyboard.type('Stats: ');
    await insertViaCommandPalette(page, 'HP Stat');
    await expect(ed.locator('.stat-declaration').first()).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Enter');
    await insertViaCommandPalette(page, 'HP Bar');
    await expect(ed.locator('.bar-widget').first()).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Enter');
    await insertViaCommandPalette(page, 'Attack Roll');
    await expect(ed.locator('.action-button').first()).toBeVisible({ timeout: 2000 });


    // Copy and check plain text
    const text = await getEditorTextViaCopy(page);

    // Stat declaration should be DSL, not "[HP: 10 ▾]"
    expect(text).toContain('HP::');
    expect(text).toContain('10');
    // Bar widget
    expect(text).toContain('[bar:');
    // Action button
    expect(text).toContain('[Attack]');
    expect(text).toContain('action:');
  });

  test('inline widgets on same line: bar + dots + action side by side', async ({ page }) => {
    // Tests the real UX: multiple widgets left-to-right on the same line,
    // with text labels between them — the dense stat-block layout.

    await openNewSheetModal(page, 'Inline Test');

    const ed = editor(page);
    await ed.click();

    // Declare stats first (each on own line, Enter-triggered)
    await typeStat(page, 'HP:: 20 #bar');
    await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await typeStat(page, 'MaxHP:: 20');
    await expect(ed.locator('.stat-declaration')).toHaveCount(2, { timeout: 3000 });
    await typeStat(page, 'AC:: 16 #badge');
    await expect(ed.locator('.stat-declaration')).toHaveCount(3, { timeout: 3000 });

    // -- Inline stat declarations: multiple stats on one line --
    await typeStat(page, 'STR:: 16 DEX:: 14 CON:: 12');
    await expect(ed.locator('.stat-declaration')).toHaveCount(6, { timeout: 3000 });

    // Now build a dense single line: bar + text + dots + text + action
    await page.keyboard.type('[bar: HP/MaxHP]', { delay: 20 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.type(' | ', { delay: 20 });
    await page.keyboard.type('[dots: 3/5]', { delay: 20 });
    await expect(ed.locator('.dots-widget')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.type(' | ', { delay: 20 });
    await page.keyboard.type('[Strike](action: 1d8 + AC)', { delay: 20 });
    await expect(ed.locator('.action-button')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.press('Enter');

    // Second dense line: two bars side by side
    await page.keyboard.type('Health: [bar: HP/MaxHP] Mana: [bar: 10/20]', { delay: 20 });
    await expect(ed.locator('.bar-widget')).toHaveCount(3, { timeout: 3000 });
    await page.keyboard.press('Enter');

    // Third dense line: dots + action + text continuing after
    await page.keyboard.type('Slots: [dots: 1/3] [Fireball](action: 8d6) remaining', { delay: 20 });
    await expect(ed.locator('.dots-widget')).toHaveCount(2, { timeout: 3000 });
    await expect(ed.locator('.action-button')).toHaveCount(2, { timeout: 3000 });

    // Verify text between widgets survived
    await expect(ed).toContainText('|');
    await expect(ed).toContainText('Health:');
    await expect(ed).toContainText('Mana:');
    await expect(ed).toContainText('Slots:');
    await expect(ed).toContainText('remaining');

    // -- Bar widget interaction: click to show controls, click - to decrement --
    const firstBar = ed.locator('.bar-widget').first();
    await firstBar.locator('.bar-widget__container').click();
    await expect(firstBar.locator('.bar-widget__controls')).toBeVisible({ timeout: 2000 });
    // Click the minus button to decrement HP
    await firstBar.locator('.bar-widget__button--minus').click();
    // HP stat should now be 19 (was 20)
    const hpStat = ed.locator('.stat-declaration', { hasText: 'HP' }).first();
    await expect(hpStat).toContainText('19', { timeout: 3000 });

    // -- Dots widget: click edit trigger to edit max value --
    const firstDots = ed.locator('.dots-widget').first();
    // Hover to reveal edit trigger, then click it
    await firstDots.locator('.dots-widget__container').hover();
    await firstDots.locator('.dots-widget__edit-trigger').click();
    // When editing, inputs should appear
    const dotsEditMax = firstDots.locator('.dots-widget__edit-input').last();
    await expect(dotsEditMax).toBeVisible({ timeout: 2000 });
    // Change max from 5 to 8
    await dotsEditMax.fill('8');
    // Save with Enter
    await page.keyboard.press('Enter');
    // Verify 8 dots render
    await expect(firstDots.locator('.dots-widget__dot')).toHaveCount(8, { timeout: 3000 });

    // Save and reopen — all inline widgets must survive round-trip
    await saveSheet(page);
    await editSheetFromLibrary(page, 'Inline Test');

    await expect(ed.locator('.stat-declaration')).toHaveCount(6, { timeout: 5000 });
    await expect(ed.locator('.bar-widget')).toHaveCount(3);
    await expect(ed.locator('.dots-widget')).toHaveCount(2);
    await expect(ed.locator('.action-button')).toHaveCount(2);
    await expect(ed).toContainText('Health:');
    await expect(ed).toContainText('remaining');
    // Verify bar decrement persisted (HP should still be 19)
    await expect(ed.locator('.stat-declaration', { hasText: 'HP' }).first()).toContainText('19');
  });

  test('power user: dense formatted sheet with bold, italic, headings, and every widget type', async ({ page }) => {
    // A power user builds a dense, styled character sheet mixing markdown
    // formatting (bold, italic, headings) with inline widgets on the same
    // lines. Tests that formatting shortcuts don't break widget rendering
    // and vice versa, and everything survives save/load.

    await openNewSheetModal(page, 'Vex the Warlock');

    const ed = editor(page);
    await ed.click();

    // -- Heading with TipTap markdown shortcut --
    await page.keyboard.type('# Vex the Warlock');
    await page.keyboard.press('Enter');

    // Subheading
    await page.keyboard.type('## Ability Scores');
    await page.keyboard.press('Enter');

    // Rapid-fire stats — 6 ability scores in a row
    await typeStat(page, 'STR:: 8');
    await typeStat(page, 'DEX:: 14');
    await typeStat(page, 'CON:: 12');
    await typeStat(page, 'INT:: 10');
    await typeStat(page, 'WIS:: 13');
    await typeStat(page, 'CHA:: 20');
    await expect(ed.locator('.stat-declaration')).toHaveCount(6, { timeout: 3000 });

    // -- Another section with combat stats --
    await page.keyboard.type('## Combat');
    await page.keyboard.press('Enter');

    await typeStat(page, 'HP:: 45 #bar');
    await typeStat(page, 'MaxHP:: 45');
    await typeStat(page, 'TempHP:: 0');
    await typeStat(page, 'AC:: 15 #badge');
    await typeStat(page, 'PROF:: 3');
    await expect(ed.locator('.stat-declaration')).toHaveCount(11, { timeout: 3000 });

    // Dense combat line: bar + expression + action all inline
    await page.keyboard.type('[bar: HP/MaxHP] ', { delay: 20 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.type('{{ CHA + PROF }}', { delay: 20 });
    await page.keyboard.type(' [Eldritch Blast](action: 1d10 + CHA)', { delay: 20 });
    await expect(ed.locator('.action-button')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.press('Enter');

    // Bold label with dots: use Ctrl+B toggle
    await page.keyboard.press('Control+b');
    await page.keyboard.type('Spell Slots:', { delay: 20 });
    await page.keyboard.press('Control+b');
    await page.keyboard.type(' [dots: 2/4] ', { delay: 20 });
    await expect(ed.locator('.dots-widget')).toHaveCount(1, { timeout: 3000 });

    // Italic label with another dots tracker on the same line
    await page.keyboard.press('Control+i');
    await page.keyboard.type('Pact Slots:', { delay: 20 });
    await page.keyboard.press('Control+i');
    await page.keyboard.type(' [dots: 1/2]', { delay: 20 });
    await expect(ed.locator('.dots-widget')).toHaveCount(2, { timeout: 3000 });
    await page.keyboard.press('Enter');

    // -- Section with mixed formatting and actions --
    await page.keyboard.type('## Actions');
    await page.keyboard.press('Enter');

    // Bold+italic label then action button
    await page.keyboard.press('Control+b');
    await page.keyboard.press('Control+i');
    await page.keyboard.type('Melee:', { delay: 20 });
    await page.keyboard.press('Control+i');
    await page.keyboard.press('Control+b');
    await page.keyboard.type(' [Dagger](action: 1d4 + DEX) ', { delay: 20 });
    await expect(ed.locator('.action-button')).toHaveCount(2, { timeout: 3000 });

    // Two actions on the same line
    await page.keyboard.type('[Hex](action: 1d6) [Hellish Rebuke](action: 2d10)', { delay: 20 });
    await expect(ed.locator('.action-button')).toHaveCount(4, { timeout: 3000 });
    await page.keyboard.press('Enter');

    // -- Notes section with italic flavor text --
    await page.keyboard.type('## Notes');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+i');
    await page.keyboard.type('Patron: The Archfey. Pact of the Chain.');
    await page.keyboard.press('Control+i');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Equipment: Arcane focus, leather armor, component pouch');

    // -- Verify the full sheet --
    await expect(ed.locator('.stat-declaration')).toHaveCount(11);
    await expect(ed.locator('.bar-widget')).toHaveCount(1);
    await expect(ed.locator('.dots-widget')).toHaveCount(2);
    await expect(ed.locator('.action-button')).toHaveCount(4);

    // -- Expression should compute CHA(20) + PROF(3) = 23 --
    const powerExpr = ed.locator('.expression');
    await expect(powerExpr).toHaveCount(1);
    await expect(powerExpr).toContainText('23', { timeout: 3000 });

    // Check headings rendered
    await expect(ed.locator('h1')).toHaveCount(1);
    await expect(ed.locator('h2')).toHaveCount(4);

    // Check formatted text
    await expect(ed.locator('strong')).not.toHaveCount(0);
    await expect(ed.locator('em')).not.toHaveCount(0);

    // Check text content
    await expect(ed).toContainText('Vex the Warlock');
    await expect(ed).toContainText('Ability Scores');
    await expect(ed).toContainText('Combat');
    await expect(ed).toContainText('Actions');
    await expect(ed).toContainText('Notes');
    await expect(ed).toContainText('Patron: The Archfey');
    await expect(ed).toContainText('Equipment: Arcane focus');

    // -- Save and verify full round-trip --
    await saveSheet(page);
    await editSheetFromLibrary(page, 'Vex the Warlock');

    // Everything must survive the save/load cycle
    await expect(ed.locator('.stat-declaration')).toHaveCount(11, { timeout: 5000 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1);
    await expect(ed.locator('.dots-widget')).toHaveCount(2);
    await expect(ed.locator('.action-button')).toHaveCount(4);
    await expect(ed.locator('h1')).toHaveCount(1);
    await expect(ed.locator('h2')).toHaveCount(4);
    await expect(ed.locator('strong')).not.toHaveCount(0);
    await expect(ed.locator('em')).not.toHaveCount(0);
    await expect(ed).toContainText('Patron: The Archfey');
    await expect(ed).toContainText('Equipment: Arcane focus');
  });

  test('command palette: open, filter, navigate, insert, and resume typing', async ({ page }) => {
    // Comprehensive command palette test covering the full interaction cycle.

    await openNewSheetModal(page);
    const ed = editor(page);
    await ed.click();

    // Type some text first
    await page.keyboard.type('Before palette. ');

    // Open palette
    await page.keyboard.press('/');
    await expect(page.locator('.command-palette')).toBeVisible({ timeout: 2000 });

    // Filter
    const searchInput = page.locator('.command-palette__header input');
    await searchInput.fill('HP');
    await expect(page.locator('.command-palette__label', { hasText: /HP/i }).first()).toBeVisible();

    // Clear filter and check all categories show
    await searchInput.fill('');
    await expect(page.locator('.command-palette__group-label')).not.toHaveCount(0);

    // Navigate with arrow keys and insert via Enter
    await searchInput.fill('Dot');
    await page.keyboard.press('Enter');
    await expect(page.locator('.command-palette')).not.toBeVisible();
    await expect(ed.locator('.dots-widget').first()).toBeVisible({ timeout: 2000 });

    // Resume typing after command palette
    await page.keyboard.type(' after dots');
    await expect(ed).toContainText('after dots');

    // Open palette again (need space before / so we're not mid-word)
    await page.keyboard.type(' ');
    await page.keyboard.press('/');
    await expect(page.locator('.command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette')).not.toBeVisible();

    // Typing should still work
    await page.keyboard.type(' still typing');
    await expect(ed).toContainText('still typing');
  });

  test('action button: hover to reveal edit trigger, edit label and formula', async ({ page }) => {
    await openNewSheetModal(page);
    const ed = editor(page);
    await ed.click();

    // Insert an action button
    await page.keyboard.type('[Strike](action: 1d8)', { delay: 20 });
    await expect(ed.locator('.action-button').first()).toBeVisible({ timeout: 3000 });

    // Clicking the button would normally fire a roll, but we want to edit.
    // Hover to reveal the edit trigger icon, then click it.
    const actionBtn = ed.locator('.action-button').first();
    await actionBtn.hover();
    await actionBtn.locator('.action-button__edit-trigger').click();

    // Edit form should appear with current values
    const labelInput = actionBtn.locator('.action-button__input').first();
    await expect(labelInput).toBeVisible({ timeout: 2000 });

    // Change label from "Strike" to "Slash"
    await labelInput.fill('Slash');
    // Save with Enter
    await page.keyboard.press('Enter');

    // Should show updated label on the button
    await expect(actionBtn.locator('.action-button__btn')).toContainText('Slash', { timeout: 2000 });
  });

  test('delete character with confirmation', async ({ page }) => {
    await openNewSheetModal(page, 'Doomed Hero');
    const ed = editor(page);
    await ed.click();
    await page.keyboard.type('This character will be deleted.');
    await saveSheet(page);

    // Reopen for editing
    await editSheetFromLibrary(page, 'Doomed Hero');

    // Click delete
    await page.locator('.sheet-modal__footer').getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();

    // Cancel first — character should survive
    await page.locator('.mantine-Modal-content').last().getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText(/cannot be undone/i)).not.toBeVisible();

    // Now actually delete
    await page.locator('.sheet-modal__footer').getByRole('button', { name: /Delete/i }).click();
    await page.locator('.mantine-Modal-content').last().getByRole('button', { name: /Delete/i }).click();

    await expect(page.getByPlaceholder('Untitled Sheet')).not.toBeVisible({ timeout: 3000 });
    // Character should be gone from library
    await expect(page.getByText('Doomed Hero')).not.toBeVisible({ timeout: 2000 });
  });
});

// ---------------------------------------------------------------------------
// Pop-out mode helpers
// ---------------------------------------------------------------------------

/** Click the float button to switch to floating panel mode. */
async function floatCharacterSheet(page: Page) {
  await page.locator('[aria-label="Float"]').click();
  await expect(page.locator('.floating-panel')).toBeVisible({ timeout: 3000 });
}

/** Click the pop-in button to return to modal mode. */
async function popInCharacterSheet(page: Page) {
  await page.locator('[aria-label="Pop in"]').click();
  await expect(page.locator('.mantine-Modal-content')).toBeVisible({ timeout: 3000 });
}

// ---------------------------------------------------------------------------
// Float mode tests
// ---------------------------------------------------------------------------

test.describe('Character Sheet — Float Mode', () => {
  test.beforeEach(async ({ page }) => {
    await createAndStartGame(page);
  });

  test('float and interact with editor', async ({ page }) => {
    test.slow(); // this test does several mode switches
    await openNewSheetModal(page, 'Float Test');

    // Switch to floating
    await floatCharacterSheet(page);

    // Modal overlay should be gone
    await expect(page.locator('.sheet-modal__overlay')).not.toBeVisible();

    // Floating panel should be present
    const panel = page.locator('.floating-panel');
    await expect(panel).toBeVisible();

    // Editor should work inside float
    const ed = panel.locator('.tiptap');
    await ed.click();
    await page.keyboard.type('Float content here');
    await expect(ed).toContainText('Float content here');

    // Save from float
    await page.waitForTimeout(400);
    const saveBtn = panel.locator('.sheet-modal__footer').getByRole('button', { name: /Create Sheet|Save Changes/i });
    await saveBtn.click();

    // Float should close after save
    await expect(panel).not.toBeVisible({ timeout: 3000 });

    // Character should be in library
    const scrollArea = page.locator('[class*="mantine-ScrollArea"]').last();
    await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
    await expect(page.getByText('Float Test')).toBeVisible({ timeout: 5000 });
  });

  test('float preserves content on mode switch', async ({ page }) => {
    await openNewSheetModal(page, 'Mode Switch');

    // Type content in modal
    const ed = editor(page);
    await ed.click();
    await typeStat(page, 'HP:: 30 #bar');
    await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.type('Some text here');

    // Switch to float
    await floatCharacterSheet(page);

    // Verify content persists
    const floatEd = page.locator('.floating-panel .tiptap');
    await expect(floatEd.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await expect(floatEd).toContainText('Some text here');

    // Pop back in
    await popInCharacterSheet(page);

    // Verify content still there in modal
    await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await expect(ed).toContainText('Some text here');
  });

  test('float panel is rendered with position and resize handle', async ({ page }) => {
    await openNewSheetModal(page);
    await floatCharacterSheet(page);

    const panel = page.locator('.floating-panel');

    // Panel should be positioned via transform
    const transform = await panel.evaluate((el) => el.style.transform);
    expect(transform).toContain('translate');

    // Resize handle should be present
    await expect(panel.locator('.floating-panel__resize-handle')).toBeVisible();

    // Panel should have a reasonable size
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(500);
    expect(box!.height).toBeGreaterThanOrEqual(400);
  });
});

// ---------------------------------------------------------------------------
// Window mode tests
// ---------------------------------------------------------------------------

test.describe('Character Sheet — Window Mode', () => {
  test.beforeEach(async ({ page }) => {
    await createAndStartGame(page);
  });

  test('pop out to window and interact', async ({ page }) => {
    await openNewSheetModal(page, 'Window Test');

    // Type some content first
    const ed = editor(page);
    await ed.click();
    await page.keyboard.type('Initial content');

    // Pop out to window — listen for popup before clicking
    const popupPromise = page.waitForEvent('popup', { timeout: 5000 });
    await page.locator('[aria-label="Pop out"]').click();

    let popup: Page;
    try {
      popup = await popupPromise;
    } catch {
      test.skip(true, 'window.open blocked in this environment');
      return;
    }

    await page.waitForTimeout(500);

    if (popup.isClosed()) {
      test.skip(true, 'Popup was immediately closed (blocked)');
      return;
    }

    if (popup.isClosed()) {
      test.skip(true, 'Popup was immediately closed (blocked)');
      return;
    }

    // Wait for the portal to render content into the popup
    await expect(popup.locator('#character-sheet-root')).toBeAttached({ timeout: 10000 });
    await expect(popup.locator('.tiptap')).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('.tiptap')).toContainText('Initial content');

    // Type in popup
    await popup.locator('.tiptap').click();
    await popup.keyboard.press('End');
    await popup.keyboard.type(' and more');

    // Save from popup — the click closes the popup window, which can race
    // with Playwright's click completion in Firefox. Catch the close error.
    await popup.waitForTimeout(400);
    try {
      await popup.locator('.sheet-modal__footer').getByRole('button', { name: /Create Sheet/i }).click();
    } catch {
      // Expected in Firefox — popup closes mid-click
    }

    // Character should be in library on the parent page
    const scrollArea = page.locator('[class*="mantine-ScrollArea"]').last();
    await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
    await expect(page.getByText('Window Test')).toBeVisible({ timeout: 5000 });
  });

  test('closing popup window resets to modal-ready state', async ({ page }) => {
    await openNewSheetModal(page);

    // Pop out to window
    const popupPromise = page.waitForEvent('popup', { timeout: 5000 });
    await page.locator('[aria-label="Pop out"]').click();

    let popup: Page;
    try {
      popup = await popupPromise;
    } catch {
      test.skip(true, 'window.open blocked in this environment');
      return;
    }

    await page.waitForTimeout(500);

    if (popup.isClosed()) {
      test.skip(true, 'Popup was immediately closed (blocked)');
      return;
    }

    await expect(popup.locator('#character-sheet-root')).toBeAttached({ timeout: 10000 });
    await expect(popup.locator('.tiptap')).toBeVisible({ timeout: 10000 });

    // Close the popup window
    await popup.close();

    // Wait for parent to detect close
    await page.waitForTimeout(200);

    // Opening a new character should work in modal mode
    await openNewSheetModal(page);
    await expect(page.locator('.sheet-modal')).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Cross-mode round-trip
// ---------------------------------------------------------------------------

test.describe('Character Sheet — Cross-Mode', () => {
  test.beforeEach(async ({ page }) => {
    await createAndStartGame(page);
  });

  test('mode switch round-trip preserves widgets', async ({ page }) => {
    await openNewSheetModal(page, 'Round Trip');

    // Build content in modal
    const ed = editor(page);
    await ed.click();
    await typeStat(page, 'HP:: 25 #bar');
    await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await page.keyboard.type('[bar: HP/25]', { delay: 20 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1, { timeout: 3000 });

    // Modal → Float
    await floatCharacterSheet(page);
    const floatEd = page.locator('.floating-panel .tiptap');
    await expect(floatEd.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await expect(floatEd.locator('.bar-widget')).toHaveCount(1, { timeout: 3000 });

    // Float → Modal (pop-in)
    await popInCharacterSheet(page);
    await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 3000 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1, { timeout: 3000 });

    // Save and reopen — verify persistence
    await saveSheet(page);
    await editSheetFromLibrary(page, 'Round Trip');
    await expect(ed.locator('.stat-declaration')).toHaveCount(1, { timeout: 5000 });
    await expect(ed.locator('.bar-widget')).toHaveCount(1, { timeout: 3000 });
  });
});
