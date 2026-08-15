import { expect, test } from '@playwright/test';

const story = (page: import('@playwright/test').Page) => page.locator('[data-home-scrolly]');

async function scrollStoryTo(page: import('@playwright/test').Page, progress: number) {
  await page.evaluate((targetProgress) => {
    const root = document.querySelector<HTMLElement>('[data-home-scrolly]');
    if (!root) throw new Error('home scrollytelling root is missing');
    const rootTop = root.getBoundingClientRect().top + window.scrollY;
    const scrollRange = Math.max(1, root.offsetHeight - window.innerHeight);
    window.scrollTo({ behavior: 'instant', top: rootTop + scrollRange * targetProgress });
  }, progress);
}

for (const width of [390, 768, 1440]) {
  test(`home exposes the static scrollytelling story at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: '불확실성 속에서 구조를 찾습니다.' }),
    ).toHaveCount(1);
    await expect(
      page.getByText('통계, 머신러닝, 인공지능을 움직이며 이해하고 기록합니다.'),
    ).toHaveCount(1);
    await expect(page.getByRole('link', { name: '[SKIP TO INDEX]' })).toHaveAttribute(
      'href',
      '#home-index',
    );
    await expect(page.getByRole('link', { name: '[ENTER THE ARCHIVE →]' })).toHaveAttribute(
      'href',
      '/posts/',
    );
    await expect(page.locator('[data-ascii-id="site-hero"]')).toHaveCount(0);

    const homePosts = page.locator('[data-home-post]');
    expect(await homePosts.count()).toBeGreaterThan(0);
    expect(await homePosts.count()).toBeLessThanOrEqual(3);
    await expect(homePosts.first()).toHaveAttribute('href', '/posts/linear-regression/');

    const sizes = await page.evaluate(() => [window.innerWidth, document.documentElement.scrollWidth]);
    expect(sizes[1]).toBe(sizes[0]);
  });
}

test('keeps immersive header navigation as real links', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '[INDEX]' }))
    .toHaveAttribute('href', '#home-index');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '[ARCHIVE]' }))
    .toHaveAttribute('href', '/posts/');
});

test('removes the static topology fallback after WebGL is ready', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('[data-home-visuals]')).toHaveAttribute(
    'data-topology-status',
    'ready',
  );
  await expect(page.locator('.home-scrolly__fallback')).toHaveCSS('opacity', '0');
});

test('caps the mobile WebGL backing buffer on high-density displays', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    deviceScaleFactor: 3,
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('[data-home-visuals]')).toHaveAttribute(
    'data-topology-status',
    'ready',
  );

  const backingRatio = await page.locator('[data-home-topology] canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const width = canvas.getBoundingClientRect().width;
    return canvas.width / Math.max(1, width);
  });
  expect(backingRatio).toBeGreaterThanOrEqual(1.24);
  expect(backingRatio).toBeLessThanOrEqual(1.26);

  await context.close();
});

test('scrubs every chapter forward and restores emergence in reverse', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await scrollStoryTo(page, 0.2);
  await expect(story(page)).toHaveAttribute('data-home-chapter', 'topology');

  await scrollStoryTo(page, 0.47);
  await expect(story(page)).toHaveAttribute('data-home-chapter', 'statement');
  await expect(
    page.getByRole('heading', { level: 1, name: '불확실성 속에서 구조를 찾습니다.' }),
  ).toBeVisible();
  await expect(
    page.getByText('통계, 머신러닝, 인공지능을 움직이며 이해하고 기록합니다.'),
  ).toBeVisible();

  await scrollStoryTo(page, 0.68);
  await expect(story(page)).toHaveAttribute('data-home-chapter', 'dissolution');

  await scrollStoryTo(page, 0.92);
  await expect(story(page)).toHaveAttribute('data-home-chapter', 'reconstruction');
  await expect(page.locator('[data-home-post]').first()).toBeVisible();
  await expect(page.getByRole('link', { name: '[ENTER THE ARCHIVE →]' })).toBeVisible();

  await scrollStoryTo(page, 0);
  await expect(story(page)).toHaveAttribute('data-home-chapter', 'emergence');
});

test('opens a reconstructed post as one keyboard-focusable action', async ({ page }) => {
  await page.goto('/');
  await scrollStoryTo(page, 0.92);
  await expect(story(page)).toHaveAttribute('data-home-chapter', 'reconstruction');
  const post = page.locator('[data-home-post]').first();

  await post.focus();
  await expect(post).toBeFocused();
  await expect(post).toHaveCSS('outline-style', 'solid');
  await post.press('Enter');

  await expect(page).toHaveURL(/\/posts\/linear-regression\/$/);
});

test('removes the long sticky sequence for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(story(page)).toHaveAttribute('data-motion', 'reduced');
  await expect(story(page)).not.toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('.home-scrolly__stage')).not.toHaveCSS('position', 'sticky');
  await expect(
    page.getByRole('heading', { level: 1, name: '불확실성 속에서 구조를 찾습니다.' }),
  ).toBeVisible();
  await expect(page.locator('[data-home-post]').first()).toBeVisible();
  await expect(page.getByRole('link', { name: '[ENTER THE ARCHIVE →]' })).toBeVisible();
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
});

test('keeps semantic home content when JavaScript is disabled', async ({ baseURL, browser }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: '불확실성 속에서 구조를 찾습니다.' }),
  ).toBeVisible();
  const postCount = await page.locator('[data-home-post]').count();
  expect(postCount).toBeGreaterThan(0);
  expect(postCount).toBeLessThanOrEqual(3);
  await expect(page.getByRole('link', { name: '[ENTER THE ARCHIVE →]' })).toBeVisible();

  await context.close();
});

test('falls back to static ASCII when WebGL creation fails', async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...options: unknown[]
    ) {
      if (contextId.startsWith('webgl')) return null;
      return Reflect.apply(originalGetContext, this, [contextId, ...options]);
    } as typeof originalGetContext;
  });
  await page.goto('/');

  await expect(page.locator('[data-home-visuals]')).toHaveAttribute(
    'data-topology-status',
    'error',
  );
  await expect(page.locator('.home-scrolly__fallback')).not.toHaveCSS('opacity', '0');
  await expect(page.locator('[data-home-post]').first()).toHaveAttribute(
    'href',
    '/posts/linear-regression/',
  );
});

test('does not request home visual chunks from the archive route', async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));

  await page.goto('/posts/');

  expect(
    requestedUrls.filter((url) =>
      /HomeManimScene|\/src\/scrollytelling\/home\/|gsap/i.test(url),
    ),
  ).toEqual([]);
  await expect(page.locator('[data-home-scrolly]')).toHaveCount(0);
  await expect(page.locator('[data-home-visuals]')).toHaveCount(0);
});

test('emits the default social image as an absolute URL', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sorbetsharkroundhand.github.io/og-default.svg',
  );
});
