import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    document.addEventListener(
      'focusin',
      (event) => {
        const target = event.target;
        if (target instanceof Element && target.matches('.skip-link')) {
          const box = target.getBoundingClientRect();
          (
            window as typeof window & {
              __skipLinkFocusBox?: { height: number; y: number };
            }
          ).__skipLinkFocusBox = { height: box.height, y: box.y };
        }
      },
      true,
    );
  });
  await page.goto('/');
});

test('presents the interactive notebook and a real first-note link', async ({ page }) => {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Things I learned, visualized.' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      '공식과 코드를 읽는 데서 멈추지 않고, 직접 움직이며 이해한 것들을 기록합니다.',
    ),
  ).toBeVisible();

  const primaryNavigation = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(primaryNavigation.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
    'href',
    '/',
  );
  await expect(primaryNavigation.getByRole('link', { name: 'Posts', exact: true })).toHaveAttribute(
    'href',
    '/posts/',
  );

  const firstNoteLink = page.getByRole('link', { name: '첫 번째 노트 읽기' });
  await expect(firstNoteLink).toBeVisible();
  await expect(firstNoteLink).toHaveAttribute('href', '/posts/linear-regression/');
});

test('emits the default social image as an absolute URL', async ({ page }) => {
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://sorbetsharkroundhand.github.io/og-default.svg',
  );
});

test('keeps mobile header targets touch-sized without overflow', async ({ page }) => {
  const primaryNavigation = page.getByRole('navigation', { name: '주요 메뉴' });
  const headerTargets = [
    page.getByRole('link', { name: 'Interactive Notes 홈' }),
    primaryNavigation.getByRole('link', { name: 'Home', exact: true }),
    primaryNavigation.getByRole('link', { name: 'Posts', exact: true }),
  ];

  for (const target of headerTargets) {
    const box = await target.boundingBox();
    expect(box, 'header target should have a measurable box').not.toBeNull();
    expect(box!.height, 'header target should be at least 44px tall').toBeGreaterThanOrEqual(44);
  }

  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBe(widths.viewport);
  expect(widths.body).toBe(widths.viewport);
});

test('visibly compresses the recent post link while pressed', async ({ page }) => {
  const recentPostLink = page.getByRole('link', {
    name: 'Linear Regression — 선형회귀를 눈으로 이해하기',
  });
  await recentPostLink.scrollIntoViewIfNeeded();
  const recentPostBox = await recentPostLink.boundingBox();
  expect(recentPostBox).not.toBeNull();

  await page.mouse.move(
    recentPostBox!.x + recentPostBox!.width / 2,
    recentPostBox!.y + recentPostBox!.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(150);
  const pressedRecentPostBox = await recentPostLink.boundingBox();
  await page.mouse.up();

  expect(pressedRecentPostBox).not.toBeNull();
  expect(pressedRecentPostBox!.width).toBeLessThan(recentPostBox!.width);
});

test('reveals the skip link inside the viewport on the first keyboard frame', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: '본문으로 건너뛰기' });
  const skipLinkBox = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __skipLinkFocusBox?: { height: number; y: number };
        }
      ).__skipLinkFocusBox,
  );
  const viewport = page.viewportSize();

  expect(skipLinkBox, 'focus event should record the skip link box').toBeDefined();
  expect(skipLinkBox!.height, 'focused skip link should have a measurable box').toBeGreaterThan(0);
  expect(viewport).not.toBeNull();
  expect(
    skipLinkBox!.y + skipLinkBox!.height,
    'focused skip link should immediately intersect the viewport',
  ).toBeGreaterThan(0);
  expect(skipLinkBox!.y).toBeLessThan(viewport!.height);
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveCSS('outline-style', 'solid');
});
