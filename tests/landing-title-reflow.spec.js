// @ts-check
/**
 * The title of the FAQ section of the home (`#faq-title`) at 400 % text and 320 px (WCAG 1.4.10 Reflow:
 * no loss of content). The titles of the four levels sit in a `container: inside` and step down one size when
 * their column is narrow (`@container inside (max-inline-size: 16em)`); a title outside any such container
 * misses the step and can be wider than the column (found in the Safari review of 2026-10-24, where /ar/ was 4 px
 * wider than the window, on the title of a section that has since gone). Nothing of the FAQ's title leaves its section.
 * Runs in `chromium` (the section is plain markup with or without JavaScript).
 */
import { test, expect } from '@playwright/test';

for (const route of ['/', '/es/', '/ar/']) {
  test(`400 % text at 320 px: the title of the FAQ section fits its column (${route})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });

    const { title, column } = await page.evaluate(() => {
      const heading = /** @type {HTMLElement} */ (document.querySelector('section#faq #faq-title'));
      const section = /** @type {HTMLElement} */ (document.querySelector('section#faq'));
      return { title: heading.getBoundingClientRect().width, column: section.clientWidth };
    });

    expect(title, `title ${Math.round(title)} px in a column of ${column} px`).toBeLessThanOrEqual(column + 0.5);
  });
}
