import { expect, test } from '@playwright/test';

test('archive rows expose real post and topic routes', async ({ page }) => {
  await page.goto('/posts/');
  const row = page.locator('.post-row').first();
  await expect(page.getByRole('heading', { level: 1, name: '전체 학습 노트' })).toBeVisible();
  await expect(row.getByRole('link', { name: 'Linear Regression' })).toHaveAttribute(
    'href',
    '/posts/linear-regression/',
  );
  await expect(row.getByRole('link', { name: '#linear-regression' })).toHaveAttribute(
    'href',
    '/topics/linear-regression/',
  );
});

test('post detail has ASCII identity, metadata, prose, and pager boundaries', async ({ page }) => {
  await page.goto('/posts/linear-regression/');
  await expect(page.getByRole('heading', { level: 1, name: 'Linear Regression' })).toBeVisible();
  await expect(page.getByText('선형회귀를 눈으로 이해하기', { exact: true })).toBeVisible();
  await expect(page.locator('[data-ascii-id="linear-regression"]')).toHaveCount(1);
  await expect(page.locator('.visualization-slot')).toHaveCount(3);
  await expect(page.getByText('[PREVIOUS NOTE] NONE')).toBeVisible();
  await expect(page.getByText('[NEXT NOTE] NONE')).toBeVisible();
  await expect(page.getByRole('link', { name: '#linear-regression' })).toHaveAttribute(
    'href',
    '/topics/linear-regression/',
  );
});

test('all subject pages survive direct reloads', async ({ page }) => {
  for (const subject of ['statistics', 'machine-learning', 'deep-learning', 'mathematics', 'visualization']) {
    await page.goto(`/topics/${subject}/`);
    await page.reload();
    await expect(page).toHaveURL(`/topics/${subject}/`);
  }
});
