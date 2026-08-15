import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1440]) {
  test(`home is a responsive ASCII notebook at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: '배운 것을 움직이며 이해합니다.' })).toBeVisible();
    await expect(page.locator('[data-ascii-id="site-hero"]')).toHaveCount(1);
    await expect(page.locator('.post-row')).toHaveCount(1);
    await expect(page.getByText('[READ NOTE ->]')).toBeVisible();
    expect(await page.locator('.post-row').count()).toBeLessThanOrEqual(4);
    await expect(page.locator('canvas')).toHaveCount(0);

    const sizes = await page.evaluate(() => [window.innerWidth, document.documentElement.scrollWidth]);
    expect(sizes[1]).toBe(sizes[0]);
  });
}

test('keeps navigation, topic links, and keyboard focus as real independent actions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: 'Archive' }))
    .toHaveAttribute('href', '/posts/');
  await expect(page.getByRole('navigation', { name: '주제별 탐색' }).getByRole('link', { name: 'Statistics' }))
    .toHaveAttribute('href', '/topics/statistics/');

  const topic = page.locator('.post-row__topics a').first();
  await topic.focus();
  await expect(topic).toBeFocused();
  await expect(topic).toHaveCSS('outline-style', 'solid');
});

test('emits the default social image as an absolute URL', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sorbetsharkroundhand.github.io/og-default.svg',
  );
});
