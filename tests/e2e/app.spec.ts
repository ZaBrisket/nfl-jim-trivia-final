import { test, expect } from '@playwright/test';

test('loads homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Endless Mode')).toBeVisible();
});
