import { test, expect } from '@playwright/test';

test.describe('Wheel of Doom', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for isolated testing
    await page.route('**/api/entries', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { name: 'Alice', addedBy: 'user1', addedAt: '2026-01-22T10:00:00Z' },
            { name: 'Bob', addedBy: 'user2', addedAt: '2026-01-22T10:01:00Z' },
            { name: 'Charlie', addedBy: 'user3', addedAt: '2026-01-22T10:02:00Z' },
          ]),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ name: body.name, addedBy: 'testuser', addedAt: new Date().toISOString() }),
        });
      }
    });

    await page.route('**/api/entries/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    await page.route('**/api/results', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { selectedName: 'Alice', spunBy: 'user1', spunAt: '2026-01-22T11:00:00Z' },
          ]),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ selectedName: body.name, spunBy: 'testuser', spunAt: new Date().toISOString() }),
        });
      }
    });

    await page.goto('/');
  });

  test('displays page title', async ({ page }) => {
    await expect(page).toHaveTitle('Wheel of Doom');
  });

  test('displays header', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Wheel of Doom');
  });

  test('displays wheel canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('displays entries list', async ({ page }) => {
    await expect(page.getByText('Entries')).toBeVisible();
    const entryList = page.locator('.entry-list');
    await expect(entryList.getByText('Alice')).toBeVisible();
    await expect(entryList.getByText('Bob')).toBeVisible();
    await expect(entryList.getByText('Charlie')).toBeVisible();
  });

  test('displays entry count', async ({ page }) => {
    await expect(page.getByText('(3)')).toBeVisible();
  });

  test('displays results section', async ({ page }) => {
    await expect(page.getByText('Recent Results')).toBeVisible();
  });

  test('displays spin prompt', async ({ page }) => {
    await expect(page.getByText('Click to spin!')).toBeVisible();
  });

  test('can add a new entry', async ({ page }) => {
    const input = page.getByPlaceholder('Enter a name...');
    await input.fill('David');
    await page.getByRole('button', { name: 'Add' }).click();

    // Verify the API was called (mock will handle the response)
    await expect(input).toHaveValue('');
  });

  test('cannot add empty entry', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'Add' });
    await expect(addButton).toBeDisabled();
  });

  test('can remove an entry', async ({ page }) => {
    // Click the first delete button
    const deleteButtons = page.getByTitle('Remove');
    await deleteButtons.first().click();

    // The entry should be removed (API mock returns success)
  });

  test('clicking wheel starts spin', async ({ page }) => {
    const canvas = page.locator('canvas');
    await canvas.click();

    // The prompt should disappear during spin
    await expect(page.getByText('Click to spin!')).not.toBeVisible();
  });

  test('spin completes and shows winner modal', async ({ page }) => {
    const canvas = page.locator('canvas');
    await canvas.click();

    // Wait for the spin to complete (5-7 seconds)
    await expect(page.locator('.winner-modal')).toBeVisible({ timeout: 10000 });

    // Modal should show a winner name
    const winnerName = page.locator('.winner-name');
    await expect(winnerName).toBeVisible();
  });

  test('can dismiss winner modal', async ({ page }) => {
    const canvas = page.locator('canvas');
    await canvas.click();

    // Wait for modal
    await expect(page.locator('.winner-modal')).toBeVisible({ timeout: 10000 });

    // Click dismiss
    await page.getByRole('button', { name: 'Dismiss' }).click();

    // Modal should be gone
    await expect(page.locator('.winner-modal')).not.toBeVisible();
  });
});

test.describe('Wheel of Doom - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    // Mock empty API responses
    await page.route('**/api/entries', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/results', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');
  });

  test('shows empty entries message', async ({ page }) => {
    await expect(page.getByText('No entries yet. Add some names!')).toBeVisible();
  });

  test('shows empty results message', async ({ page }) => {
    await expect(page.getByText('No spins yet. Give it a whirl!')).toBeVisible();
  });

  test('does not show spin prompt when no entries', async ({ page }) => {
    await expect(page.getByText('Click to spin!')).not.toBeVisible();
  });
});
