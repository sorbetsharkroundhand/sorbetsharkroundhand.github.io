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
const homeSubjects = [
  { label: 'Statistics', path: '/topics/statistics/' },
  { label: 'Machine Learning', path: '/topics/machine-learning/' },
  { label: 'Deep Learning', path: '/topics/deep-learning/' },
  { label: 'Mathematics', path: '/topics/mathematics/' },
  { label: 'Visualization', path: '/topics/visualization/' },
];

test('serves the Linear Regression lesson after navigation and a direct reload', async ({ page }) => {
  await page.goto('/');
  await Promise.all([
    page.waitForURL(postPath),
    page
      .getByRole('link', { name: 'Linear Regression — 선형회귀를 눈으로 이해하기' })
      .click(),
  ]);

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

  await expect(page.locator('.katex-display')).toHaveCount(3);
  await expect(page.locator('.katex-display').first()).toHaveCSS('overflow-x', 'auto');
  await expect(
    page.locator('.article-prose code').filter({ hasText: 'residual' }).first(),
  ).toBeVisible();
  await expect(page.locator('.article-prose pre code')).toContainText('residuals.reduce');

  await expect(page.locator('strong').filter({ hasText: '직선을 읽는 법을 연습하기 위해 만든 교육용 데이터' }))
    .toHaveCount(1);
  const proseText = await page
    .locator('.article-prose :is(p, li, h2, h3)')
    .allTextContents();
  expect(proseText.every((text) => !text.includes('**'))).toBe(true);

  const callout = page.locator('[aria-labelledby="linear-regression-figure-title"]');
  await expect(callout).toHaveCount(1);
  await expect(callout.locator('#linear-regression-figure-title')).toHaveText(
    '직선과 오차를 직접 조절해 볼 자리',
  );
});

test('keeps all five Home subjects as static, reload-safe topic routes', async ({ page }) => {
  await page.goto('/');
  const topicNavigation = page.getByRole('navigation', { name: '주제별 탐색' });

  for (const subject of homeSubjects) {
    await expect(topicNavigation.getByRole('link', { name: subject.label, exact: true })).toHaveAttribute(
      'href',
      subject.path,
    );
  }

  for (const subject of homeSubjects) {
    await page.goto(subject.path);
    await page.reload();
    await expect(page).toHaveURL(subject.path);
    await expect(page.getByRole('heading', { level: 1, name: subject.label })).toBeVisible();
  }
});
