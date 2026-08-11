import { expect, test, type Page } from '@playwright/test';

type TestGameStore = {
  getState: () => {
    addElement: (element: Record<string, unknown>, skipHistory?: boolean) => string;
  };
  setState: (state: Record<string, unknown>) => void;
};

type TestWindow = Window & { __testGameStore: TestGameStore };

async function createGame(page: Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Create Game' }).click();
  await page.getByLabel('Game Name').fill('Combat Test');
  await page.getByLabel('Your Name (GM)').fill('GM');
  await page.getByRole('button', { name: 'Create Game' }).click();
  await expect(page.getByText('Game Created!')).toBeVisible();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Combat' }).click();
}

async function addToken(page: Page, name: string, x = 100) {
  return page.evaluate(({ tokenName, tokenX }) => {
    const store = (window as unknown as TestWindow).__testGameStore.getState();
    return store.addElement({
      type: 'token',
      layer: 'token',
      x: tokenX,
      y: 100,
      visibleTo: 'all',
      locked: false,
      zIndex: 1,
      imageUrl: '',
      width: 1,
      height: 1,
      name: tokenName,
      hp: { current: 10, max: 10 },
      ac: 12,
      conditions: [],
    }, true);
  }, { tokenName: name, tokenX: x });
}

async function startCombat(page: Page) {
  await page.getByRole('button', { name: 'Start Combat' }).click();
  await expect(page.getByText('Round 1')).toBeVisible();
}

async function addCombatant(page: Page, name: string, initiative: number) {
  await page.getByPlaceholder('Select token').click();
  await page.getByRole('option', { name }).click();
  await page.getByPlaceholder('Initiative').fill(String(initiative));
  await page.getByRole('button', { name: 'Add to Combat' }).click();
}

test.describe('Combat tracker', () => {
  test.beforeEach(async ({ page }) => createGame(page));

  test('starts safely with no combatants', async ({ page }) => {
    await expect(page.getByText('No combat active')).toBeVisible();
    await startCombat(page);
    await expect(page.getByText('No combatants yet')).toBeVisible();
    await expect(page.getByText(/Current Turn:/)).toHaveCount(0);
  });

  test('adds combatants in initiative order and advances turns', async ({ page }) => {
    await addToken(page, 'Goblin');
    await addToken(page, 'Wizard', 200);
    await startCombat(page);
    await addCombatant(page, 'Goblin', 12);
    await addCombatant(page, 'Wizard', 18);

    await expect(page.getByText('Current Turn: Wizard')).toBeVisible();
    await expect(page.getByTestId('combatant-row')).toHaveCount(2);
    await expect(page.getByTestId('combatant-name')).toHaveText(['Wizard', 'Goblin']);

    await page.getByRole('button', { name: /Next/ }).click();
    await expect(page.getByText('Current Turn: Goblin')).toBeVisible();
    await page.getByRole('button', { name: /Next/ }).click();
    await expect(page.getByText('Round 2')).toBeVisible();
    await expect(page.getByText('Current Turn: Wizard')).toBeVisible();
  });

  test('updates hit points and conditions', async ({ page }) => {
    await addToken(page, 'Fighter');
    await startCombat(page);
    await addCombatant(page, 'Fighter', 15);

    await page.getByRole('button', { name: 'Decrease Fighter hit points' }).click();
    await expect(page.getByText('HP: 9/10')).toBeVisible();

    await page.getByPlaceholder('Add condition').fill('Poisoned');
    await page.getByRole('button', { name: 'Add condition to Fighter' }).click();
    await expect(page.getByText('Poisoned')).toBeVisible();
    await page.getByRole('button', { name: 'Remove Poisoned from Fighter' }).click();
    await expect(page.getByText('Poisoned')).toHaveCount(0);
  });

  test('hides mutation controls from players', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as TestWindow).__testGameStore.setState({ isGM: false });
    });

    await expect(page.getByRole('button', { name: 'Start Combat' })).toHaveCount(0);
    await expect(page.getByText('No combat active')).toBeVisible();
  });
});
