// @ts-check
/**
 * The "Recommended" flag of an install option on the page of the skill (WCAG 1.4.10 reflow, 1.4.12 text spacing). Reviewed in WebKit
 * on 2026-11-28: in /ar/ai/ at 320 px and 400 % text the flag (absolute, shrink-to-fit) was 169 px wide and stuck out 14 px past the
 * edge of its card, while Chromium, whose Arabic font is narrower, kept it inside. A font is not something a test can rely on, so
 * this one makes the text as hard as the criteria allow: 400 % text AND the text spacing of 1.4.12 (letter 0.12em, word 0.16em, line
 * 1.5, paragraph 2em), in every language of the page. The flag must lie inside its card, and the page must not scroll sideways.
 * Pure CSS: the same with and without JavaScript.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

// The override a reader's style sheet may apply (WCAG 1.4.12), never overridden by the page
const SPACING = `* {
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
  line-height: 1.5 !important;
}
p { margin-block-end: 2em !important; }`;

for (const route of ROUTES) {
  for (const spacing of [false, true]) {
    test(`${route}: at 320 px and 400 % text${spacing ? ' with the text spacing of 1.4.12' : ''} the flag of an option stays inside its card`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, '400%');
      // Not addStyleTag: with JavaScript off its wait for the sheet's load event never ends
      if (spacing) await page.evaluate((css) => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }, SPACING);

      const flags = await page.locator('.landing-ai-option__flag').evaluateAll((all) =>
        all.map((flag) => {
          const card = /** @type {Element} */ (flag.closest('.landing-ai-option')).getBoundingClientRect();
          const box = flag.getBoundingClientRect();
          return { left: box.left - card.left, right: card.right - box.right, width: box.width, card: card.width };
        }),
      );
      expect(flags.length, 'flags on the page').toBeGreaterThan(0);
      for (const f of flags) {
        // Distances from each edge of the card: a negative one is a flag sticking out
        expect(f.left, `flag ${Math.round(f.width)} px in a card of ${Math.round(f.card)} px: past the card's left edge`).toBeGreaterThanOrEqual(-0.5);
        expect(f.right, `flag ${Math.round(f.width)} px in a card of ${Math.round(f.card)} px: past the card's right edge`).toBeGreaterThanOrEqual(-0.5);
      }

      const excess = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(excess, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    });
  }
}
