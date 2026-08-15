import { expect, test } from '@playwright/test';

test('static 404 offers useful routes without JavaScript', async ({ page }) => {
  await page.goto('/404/');
  await expect(page.getByRole('heading', { level: 1, name: '등록되지 않은 좌표입니다.' })).toBeVisible();
  await expect(page.locator('[data-ascii-id="not-found"]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: '[RETURN HOME ->]' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: '[OPEN ARCHIVE ->]' })).toHaveAttribute('href', '/posts/');
});
