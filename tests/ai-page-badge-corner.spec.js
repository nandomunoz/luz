// @ts-check
/**
 * The badge of a card of /ai/ (what a command does to your files, what an agent does) sits in the top right corner of the
 * card (owner, 2026-11-26), as a small rectangle fitted to its text: 12 px text, a background that lets the card show
 * through, no border, and never over the card's title. At the start corner in a right-to-left page. With and without
 * JavaScript, at 320 px, and axe finds nothing in light and dark.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

for (const route of ROUTES) {
  const rtl = route.startsWith('/ar/');
  for (const width of [1280, 320]) {
    test(`${route} at ${width} px: every badge is a borderless translucent rectangle of 12 px text in the corner of its card, clear of the title`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const found = await page.evaluate(() =>
        [...document.querySelectorAll('#a-commands article, #a-agents article')].map((card) => {
          const badge = /** @type {HTMLElement | null} */ (card.querySelector('.landing-ai__badge'));
          if (!badge) return { missing: card.querySelector('.landing-card__title')?.textContent };
          const cs = getComputedStyle(badge);
          const c = card.getBoundingClientRect();
          const b = badge.getBoundingClientRect();
          const t = /** @type {HTMLElement} */ (card.querySelector('.landing-card__title')).getBoundingClientRect();
          const alpha = /rgba?\(([^)]*)\)|color\(([^)]*)\)/.exec(cs.backgroundColor);
          return {
            title: card.querySelector('.landing-card__title')?.textContent,
            top: b.top - c.top,
            end: { right: c.right - b.right, left: b.left - c.left },
            inside: b.left >= c.left - 0.5 && b.right <= c.right + 0.5,
            border: cs.borderTopWidth + cs.borderRightWidth + cs.borderBottomWidth + cs.borderLeftWidth,
            font: parseFloat(cs.fontSize),
            radius: parseFloat(cs.borderTopLeftRadius),
            bg: cs.backgroundColor,
            translucent: !!alpha && /\/\s*0?\.\d+|,\s*0?\.\d+\s*\)/.test(cs.backgroundColor),
            overlapsTitle: !(b.bottom <= t.top || b.top >= t.bottom || b.right <= t.left || b.left >= t.right),
            position: cs.position,
          };
        }),
      );
      expect(found.length).toBeGreaterThanOrEqual(13);
      for (const f of found) {
        expect(f.missing, `a card has no badge: ${f.missing}`).toBeUndefined();
        expect(f.position, f.title).toBe('absolute');
        expect(f.top, `${f.title}: near the top edge`).toBeLessThanOrEqual(24);
        expect(f.inside, `${f.title}: inside the card`).toBe(true);
        const gap = rtl ? f.end.left : f.end.right;
        expect(gap, `${f.title}: at the ${rtl ? 'left' : 'right'} corner`).toBeLessThanOrEqual(24);
        expect(f.border, `${f.title}: no border`).toBe('0px0px0px0px');
        expect(f.font, `${f.title}: 12 px text`).toBeLessThanOrEqual(12.01);
        expect(f.font, `${f.title}: 12 px text, not smaller`).toBeGreaterThanOrEqual(11.99);
        expect(f.radius, `${f.title}: a rectangle with a soft corner, not a pill`).toBeLessThanOrEqual(8);
        expect(f.translucent, `${f.title}: a background with opacity (${f.bg})`).toBe(true);
        expect(f.overlapsTitle, `${f.title}: clear of the title`).toBe(false);
      }
    });
  }

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the cards with their badges (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).include('#a-commands').include('#a-agents').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
