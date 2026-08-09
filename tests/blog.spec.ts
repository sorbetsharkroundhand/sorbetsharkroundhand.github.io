import { expect, test } from '@playwright/test';

const postPath = '/posts/linear-regression/';
const sectionHeadings = [
  '데이터에서 직선 찾기',
  '선형 모델',
  '직접 움직여보기',
  'Residual Visualization',
  'Mean Squared Error',
  'Find Best Fit',
  '정리',
];

test('serves the Linear Regression lesson after navigation and a direct reload', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'Linear Regression — 선형회귀를 눈으로 이해하기' })
    .click();

  await expect(page).toHaveURL(postPath);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Linear Regression — 선형회귀를 눈으로 이해하기',
    }),
  ).toBeVisible();

  await page.goto(postPath);
  await page.reload();

  for (const heading of sectionHeadings) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }

  await expect(page.locator('.katex').first()).toBeVisible();
});
