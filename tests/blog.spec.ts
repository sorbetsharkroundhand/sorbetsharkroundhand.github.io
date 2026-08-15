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

test('post interior exposes every learning section as real fragment navigation', async ({ page }) => {
  await page.goto('/posts/linear-regression/');

  const index = page.getByRole('navigation', { name: '이 글의 목차' });
  const links = index.getByRole('link');
  await expect(links).toHaveCount(7);
  expect(await links.allTextContents()).toEqual([
    '01데이터에서 직선 찾기',
    '02선형 모델',
    '03직접 움직여보기',
    '04Residual Visualization',
    '05Mean Squared Error',
    '06Find Best Fit',
    '07정리',
  ]);
  await expect(index.getByRole('link', { name: /Residual Visualization/ })).toHaveAttribute(
    'href',
    '#residual-visualization',
  );

  await index.getByRole('link', { name: /Residual Visualization/ }).click();
  await expect(page).toHaveURL(/#residual-visualization$/);
  await expect(page.locator('#residual-visualization')).toBeVisible();
});

for (const width of [390, 768, 1440]) {
  test(`post reading shell remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/posts/linear-regression/');

    await expect(page.locator('.article-reading-shell')).toBeVisible();
    await expect(page.locator('.post-index__number')).toHaveCount(7);
    const sizes = await page.evaluate(() => [window.innerWidth, document.documentElement.scrollWidth]);
    expect(sizes[1]).toBe(sizes[0]);
  });
}

test('all subject pages survive direct reloads', async ({ page }) => {
  for (const subject of ['statistics', 'machine-learning', 'deep-learning', 'mathematics', 'visualization']) {
    await page.goto(`/topics/${subject}/`);
    await page.reload();
    await expect(page).toHaveURL(`/topics/${subject}/`);
  }
});
