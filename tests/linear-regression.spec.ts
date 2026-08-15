import { expect, test, type Page } from '@playwright/test';

const postPath = '/posts/linear-regression/';
type SceneId = 'model' | 'residuals' | 'best-fit';

async function activateScene(page: Page, sceneId: SceneId, navigate = false) {
  if (navigate) await page.goto(postPath);
  const slot = page.locator(`[data-visualization-id="linear-regression:${sceneId}"]`);
  await slot.scrollIntoViewIfNeeded();

  const figure = slot.locator('.linear-regression-demo');
  await expect(figure).toHaveAttribute('data-focus', sceneId, { timeout: 15_000 });
  await expect(figure.locator('canvas')).toHaveCount(1, { timeout: 15_000 });

  const slope = figure.getByTestId(`${sceneId}-slope-slider`);
  const intercept = figure.getByTestId(`${sceneId}-intercept-slider`);
  await expect(slope).toBeEnabled({ timeout: 15_000 });

  return {
    slot,
    figure,
    slope,
    intercept,
    slopeValue: figure.locator(`output[for="${sceneId}-slope-slider"]`),
    interceptValue: figure.locator(`output[for="${sceneId}-intercept-slider"]`),
    mse: figure.getByTestId('mse-value'),
    status: figure.getByTestId('figure-status'),
  };
}

test('lazily mounts three focused scenes and keeps each canvas synchronized', async ({ page }) => {
  await page.goto(postPath);

  const bestFitSlot = page.locator('[data-visualization-id="linear-regression:best-fit"]');
  await expect(bestFitSlot.locator('canvas')).toHaveCount(0);

  const model = await activateScene(page, 'model');
  await expect(model.figure).toHaveCSS('--scene-accent', '#23d5e8');
  await model.slope.fill('6');
  await expect(model.slopeValue).toHaveText('6.00');
  await expect(model.mse).toHaveText('86.875');
  await expect(model.figure.getByTestId('best-fit-button')).toHaveCount(0);
  await expect(model.figure.locator('canvas')).toHaveCount(1);

  const residuals = await activateScene(page, 'residuals');
  await expect(residuals.figure).toHaveCSS('--scene-accent', '#ff665f');
  await residuals.slope.fill('6');
  await residuals.intercept.fill('44');
  await expect(residuals.mse).toHaveText('4.875');
  await expect(residuals.figure.getByTestId('best-fit-button')).toHaveCount(0);
  await expect(residuals.figure.locator('canvas')).toHaveCount(1);

  const bestFit = await activateScene(page, 'best-fit');
  await expect(bestFit.figure).toHaveCSS('--scene-accent', '#f2c94c');
  await expect(bestFit.figure.getByTestId('best-fit-button')).toBeVisible();
  await expect(bestFit.figure.locator('canvas')).toHaveCount(1);
});

test('finishes the best-fit scene immediately with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(postPath);
  const controls = await activateScene(page, 'best-fit');
  const bestFit = controls.figure.getByTestId('best-fit-button');

  await bestFit.click();

  await expect(controls.status).toContainText('최적 직선에 도착했습니다', { timeout: 500 });
  await expect(controls.slopeValue).toHaveText('5.20');
  await expect(controls.interceptValue).toHaveText('46.46');
  await expect(controls.mse).toHaveText('0.269');
  await expect(bestFit).toBeEnabled();
  await expect(controls.figure.locator('canvas')).toHaveCount(1);
});

test('keeps one canvas after reload and browser history restoration', async ({ page }) => {
  await page.goto(postPath);
  let controls = await activateScene(page, 'model');
  await expect(controls.figure.locator('canvas')).toHaveCount(1);

  await page.reload();
  controls = await activateScene(page, 'model');
  await expect(controls.figure.locator('canvas')).toHaveCount(1);

  await page.goto('/');
  await page.goBack();
  controls = await activateScene(page, 'model');
  await expect(controls.figure.locator('canvas')).toHaveCount(1);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`keeps every focused scene usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(postPath);
    const controls = await activateScene(page, 'best-fit');

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

    for (const control of [
      controls.slope,
      controls.intercept,
      controls.figure.getByTestId('best-fit-button'),
      controls.figure.getByTestId('reset-button'),
    ]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await controls.slope.focus();
    await expect(controls.slope).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Tab');
    await expect(controls.intercept).toBeFocused();
  });
}
