import { expect, test } from '@playwright/test';

test('serves the Interactive Notes home page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Interactive Notes');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#090a0a');
  await expect(page.locator('[data-ascii-id="site-hero"] .ascii-art__label')).toHaveText(
    '좌표계 위에 겹쳐진 학습 노트와 상승하는 회귀선',
  );
  await expect(page.getByRole('link', { name: 'Archive', exact: true })).toHaveAttribute('href', '/posts/');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('ships meaningful static visualization fallbacks before interaction loads', async ({ page }) => {
  await page.goto('/posts/linear-regression/');

  await expect(page.locator('.visualization-slot')).toHaveCount(3);
  await expect(page.locator('.visualization-slot__description')).toHaveCount(3);
  await expect(page.locator('.visualization-slot__ascii')).toHaveCount(3);
  await expect(page.locator('.visualization-slot noscript')).toHaveCount(3);
});
