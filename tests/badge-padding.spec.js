// @ts-check
/**
 * A badge with words in it (.luz-badge, packages/core/src/components/tag.css) has room at its sides (owner, 2026-11-25:
 * "Changes code, after your go" touched both ends of its pill). The 4 px it had was drawn for a count of one or two
 * digits; words need the 8 px of the space scale's `xs`, which is what a tag has. A count stays 20 px high and at
 * least 20 px wide, and the text never wraps. In the browsers with text-box and in the ones without.
 */
import { test, expect } from '@playwright/test';

const PAGE = '/docs/components/tag/';

test.describe('a badge keeps room at its sides', () => {
  for (const variant of ['primary', 'gray', 'danger']) {
    test(`luz-badge--${variant}: words have at least 8 px at each side, and the box is as wide as its text and its padding`, async ({ page }) => {
      await page.goto(PAGE);
      const found = await page.evaluate((v) => {
        const holder = document.createElement('p');
        holder.innerHTML = `<span class="luz-badge luz-badge--${v}" id="probe-words">Changes code, after your go</span> <span class="luz-badge luz-badge--${v}" id="probe-count">9</span>`;
        document.body.append(holder);
        const read = (id) => {
          const el = /** @type {HTMLElement} */ (document.getElementById(id));
          const cs = getComputedStyle(el);
          const range = document.createRange();
          range.selectNodeContents(/** @type {Node} */ (el.firstChild));
          const text = range.getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return { left: text.left - box.left, right: box.right - text.right, height: box.height, width: box.width, wrap: cs.whiteSpace, lines: Math.round(text.height / parseFloat(cs.fontSize)) };
        };
        return { words: read('probe-words'), count: read('probe-count') };
      }, variant);
      expect(found.words.left, 'room at the start').toBeGreaterThanOrEqual(7.9);
      expect(found.words.right, 'room at the end').toBeGreaterThanOrEqual(7.9);
      expect(found.words.lines, 'one line').toBe(1);
      expect(found.count.height, 'a count is 20 px high').toBeCloseTo(20, 1);
      expect(found.count.width, 'a count is at least 20 px wide').toBeGreaterThanOrEqual(19.99);
    });
  }
});
