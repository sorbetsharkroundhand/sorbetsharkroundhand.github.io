import { expect, test } from '@playwright/test';

test('serves the Interactive Notes home page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Interactive Notes');
});
