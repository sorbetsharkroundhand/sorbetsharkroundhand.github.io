import { expect, test } from '@playwright/test';

test('serves the Interactive Notes home page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Interactive Notes — 구조를 찾는 학습 기록');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0a0a');
  await expect(page.getByRole('link', { name: '[ARCHIVE]' })).toHaveAttribute(
    'href',
    '/posts/',
  );
  await expect(page.locator('[data-home-scrolly]')).toHaveCount(1);
});

test('ships meaningful static visualization fallbacks before interaction loads', async ({ page }) => {
  await page.goto('/posts/linear-regression/');

  await expect(page.locator('.visualization-slot')).toHaveCount(3);
  await expect(page.locator('.visualization-slot__description')).toHaveCount(3);
  await expect(page.locator('.visualization-slot__ascii')).toHaveCount(3);
  await expect(page.locator('.visualization-slot noscript')).toHaveCount(3);
});
