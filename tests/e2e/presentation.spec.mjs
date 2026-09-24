import { test, expect } from '@playwright/test';
for (const [name, width, height] of [['desktop', 1440, 1080], ['mobile', 390, 1200]]) {
  test(`${name} Chinese directory controls stay readable`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/awesome-wasm-tools-1000/');
    await expect(page.locator('.tool-card')).toHaveCount(40);
    await expect(page.locator('#clear')).toHaveCSS('white-space', 'nowrap');
    const clear = await page.locator('#clear').boundingBox();
    expect(clear.width).toBeGreaterThan(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `audit-results/catalog-${name}-final.png`, fullPage: false });
  });
}
