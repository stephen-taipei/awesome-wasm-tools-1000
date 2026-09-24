import { test, expect } from '@playwright/test';
for (const [name, width, height] of [['desktop', 1440, 1080], ['mobile', 390, 1200]]) {
  test(`${name} original category-home presentation is preserved`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/awesome-wasm-tools-1000/');
    await expect(page.locator('.lang-btn').first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('a.tool-card')).toHaveCount(160);
    await expect(page.locator('.tool-card.more-indicator')).toHaveCount(8);
    await expect(page.locator('.tools-grid')).toHaveCSS('display', 'grid');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    await expect(page.locator('.category').first()).toHaveCSS('background-color', 'rgb(30, 41, 59)');
    await expect(page.locator('a.tool-card').first()).toHaveCSS('background-color', 'rgb(51, 65, 85)');
    const columns = await page.locator('.tools-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(name === 'desktop' ? 4 : 1);
    for (const button of await page.locator('.lang-btn').all()) {
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `audit-results/homepage-restored-${name}.png`, fullPage: false });
  });
}
