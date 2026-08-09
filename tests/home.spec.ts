import { expect, test } from '@playwright/test';

test('presents the interactive notebook and a real first-note link', async ({ page }) => {
  await page.goto('/');

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

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: '본문으로 건너뛰기' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveCSS('outline-style', 'solid');
});
