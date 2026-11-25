// @ts-check
/**
 * The page of the skill, /ai/ (owner, 2026-11-25): the text was too small, and a reader with low vision or a phone would miss it.
 * No text of the page is under 14 px at the default size, and the sentences a card or a strip says (what a card does, what the
 * skill promises, what the assistants are) are 16 px, the size of a paragraph. The code of a terminal and a box is 14 px at least.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

for (const route of ROUTES) {
  test.describe(route, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test('no text of the page is under 14 px', async ({ page }) => {
      await page.goto(route);
      const small = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue;
          const el = n.parentElement;
          if (!el || el.closest('[hidden], script, style, [aria-hidden="true"] svg')) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < 13.99) out.push(`${el.localName}.${el.className}: ${px}px "${n.textContent.trim().slice(0, 30)}"`);
        }
        return [...new Set(out)];
      });
      expect(small).toEqual([]);
    });

    test('the sentences of the cards and the strips are 16 px', async ({ page }) => {
      await page.goto(route);
      for (const selector of ['.landing-ai__text', '.landing-ai-decide__list > li', '.landing-ai-works__title', '.landing-ai-works__note']) {
        const sizes = await page.locator(selector).evaluateAll((all) => all.map((el) => parseFloat(getComputedStyle(el).fontSize)));
        expect(sizes.length, selector).toBeGreaterThan(0);
        for (const px of sizes) expect(px, selector).toBeGreaterThanOrEqual(15.99);
      }
    });
  });
}
