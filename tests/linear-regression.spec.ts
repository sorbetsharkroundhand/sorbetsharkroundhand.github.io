import { expect, test, type Page } from '@playwright/test';

const postPath = '/posts/linear-regression/';

async function openHydratedFigure(page: Page) {
  await page.goto(postPath);

  await page.evaluate(() => {
    document.querySelector('.wide-figure')?.scrollIntoView({ block: 'center' });
  });
  const figure = page.locator('.linear-regression-demo');

  const slope = page.getByTestId('slope-slider');
  await expect(slope).toBeVisible({ timeout: 15_000 });
  await expect(figure.locator('canvas')).toHaveCount(1, { timeout: 15_000 });
  await expect(slope).toBeEnabled({ timeout: 15_000 });

  return {
    figure,
    slope,
    intercept: page.getByTestId('intercept-slider'),
    slopeValue: figure.locator('output[for="slope-slider"]'),
    interceptValue: figure.locator('output[for="intercept-slider"]'),
    mse: page.getByTestId('mse-value'),
    quality: page.getByTestId('fit-quality'),
    bestFit: page.getByTestId('best-fit-button'),
    reset: page.getByTestId('reset-button'),
    status: page.getByTestId('figure-status'),
  };
}

test('keeps React values, MSE, and one Manim canvas synchronized', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const controls = await openHydratedFigure(page);

  await expect(controls.slopeValue).toHaveText('3.50');
  await expect(controls.interceptValue).toHaveText('52.00');
  await expect(controls.mse).toHaveText('20.000');
  await expect(controls.quality).toHaveText('탐색 중');
  await expect(controls.slope).toHaveAttribute('min', '2');
  await expect(controls.slope).toHaveAttribute('max', '8');
  await expect(controls.slope).toHaveAttribute('step', '0.05');
  await expect(controls.intercept).toHaveAttribute('min', '35');
  await expect(controls.intercept).toHaveAttribute('max', '60');
  await expect(controls.intercept).toHaveAttribute('step', '0.25');

  const resetBox = await controls.reset.boundingBox();
  expect(resetBox).not.toBeNull();
  await page.mouse.move(
    resetBox!.x + resetBox!.width / 2,
    resetBox!.y + resetBox!.height / 2,
  );
  await page.mouse.down();
  await expect
    .poll(() => controls.reset.evaluate((button) => getComputedStyle(button).transform))
    .toContain('0.97');
  await page.mouse.up();
  await page.keyboard.press('Tab');
  await controls.reset.focus();
  await expect(controls.reset).toHaveCSS('outline-style', 'solid');
  await expect(controls.reset).toHaveCSS('transform', 'none');

  await controls.slope.fill('6');
  await expect(controls.slopeValue).toHaveText('6.00');
  await expect(controls.interceptValue).toHaveText('52.00');
  await expect(controls.mse).toHaveText('86.875');

  await controls.intercept.fill('44');

  await expect(controls.interceptValue).toHaveText('44.00');
  await expect(controls.mse).toHaveText('4.875');
  await expect(controls.quality).toHaveText('가까워짐');
  await expect(controls.figure.locator('canvas')).toHaveCount(1);

  await controls.bestFit.click();
  await expect(controls.slope).toBeDisabled();
  await expect(controls.intercept).toBeDisabled();
  await expect(controls.bestFit).toBeDisabled();
  await expect(controls.reset).toBeDisabled();

  await expect(controls.slopeValue).toHaveText('5.20', { timeout: 3_000 });
  await expect(controls.interceptValue).toHaveText('46.46');
  await expect(controls.mse).toHaveText('0.269');
  await expect(controls.quality).toHaveText('최적 적합');
  await expect(controls.status).toContainText('최적 직선에 도착했습니다');
  await expect(controls.slope).toBeEnabled();
  await expect(controls.figure.locator('canvas')).toHaveCount(1);

  await controls.reset.click();
  await expect(controls.slopeValue).toHaveText('3.50');
  await expect(controls.interceptValue).toHaveText('52.00');
  await expect(controls.mse).toHaveText('20.000');

  await controls.bestFit.click();
  await expect(controls.slopeValue).toHaveText('5.20', { timeout: 3_000 });
  await controls.reset.click();
  await controls.slope.fill('4.25');
  await expect(controls.slopeValue).toHaveText('4.25');
  await expect(controls.figure.locator('canvas')).toHaveCount(1);
});

test('finishes Best Fit immediately when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const controls = await openHydratedFigure(page);

  await controls.bestFit.click();

  await expect(controls.slopeValue).toHaveText('5.20', { timeout: 500 });
  await expect(controls.interceptValue).toHaveText('46.46');
  await expect(controls.mse).toHaveText('0.269');
  await expect(controls.status).toContainText('최적 직선에 도착했습니다');
  await expect(controls.bestFit).toBeEnabled();
  await expect(controls.figure.locator('canvas')).toHaveCount(1);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`keeps the complete instrument usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const controls = await openHydratedFigure(page);

    const dimensions = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.body).toBe(dimensions.viewport);
    expect(dimensions.document).toBe(dimensions.viewport);

    const canvasBox = await controls.figure.locator('canvas').boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(280);
    expect(canvasBox!.height).toBeGreaterThan(170);

    await expect(controls.figure.getByText('thick sloped line = model')).toBeVisible();
    await expect(controls.figure.getByText('thin vertical line = residual')).toBeVisible();

    const firstParagraphBox = await page.locator('.article-prose > p').first().boundingBox();
    expect(firstParagraphBox).not.toBeNull();
    expect(firstParagraphBox!.x).toBeGreaterThanOrEqual(16);
    expect(
      viewport.width - firstParagraphBox!.x - firstParagraphBox!.width,
    ).toBeGreaterThanOrEqual(16);

    if (viewport.width === 1440) {
      const figureBox = await controls.figure.boundingBox();
      expect(figureBox).not.toBeNull();
      expect(figureBox!.width).toBeGreaterThanOrEqual(1100);
      expect(figureBox!.width).toBeLessThanOrEqual(1120);
    }

    await controls.slope.focus();
    await expect(controls.slope).toHaveCSS('outline-style', 'solid');
    await expect(controls.slopeValue).toBeVisible();
    await expect(controls.interceptValue).toBeVisible();
    await expect(controls.bestFit).toBeVisible();
    await expect(controls.reset).toBeVisible();

    for (const control of [
      controls.slope,
      controls.intercept,
      controls.bestFit,
      controls.reset,
    ]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await controls.slope.focus();
    await page.keyboard.press('Tab');
    await expect(controls.intercept).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(controls.bestFit).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(controls.reset).toBeFocused();
  });
}
