// @ts-check
/**
 * What a card of /ai/ does (an agent reads and proposes, or changes code; a small skill writes after your go) is a small grey
 * icon beside the card's blue icon, on its row (owner, 2026-11-26: the badge goes). Its words are not lost: they are the icon's
 * title, shown on hover, and a text for screen readers inside it. No badge is left in a card. At 1280 and 320 px, with and
 * without JavaScript, and axe finds nothing in light and dark.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

for (const route of ROUTES) {
  for (const width of [1280, 320]) {
    test(`${route} at ${width} px: every card has a small grey icon on the row of its blue icon, named by its title and a hidden text, and no badge`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const found = await page.evaluate(() =>
        [...document.querySelectorAll('#a-agents article, #a-skills article')].map((card) => {
          const kind = /** @type {HTMLElement | null} */ (card.querySelector('.landing-ai__kind'));
          const title = card.querySelector('.landing-card__title')?.textContent;
          if (!kind) return { title, missing: true };
          const big = /** @type {Element} */ (card.querySelector('svg.landing-ai__icon')).getBoundingClientRect();
          const svg = /** @type {SVGElement} */ (kind.querySelector('svg'));
          const small = svg.getBoundingClientRect();
          const c = card.getBoundingClientRect();
          return {
            title,
            badges: card.querySelectorAll('.luz-badge, .landing-ai__badge').length,
            hidden: svg.getAttribute('aria-hidden'),
            label: kind.getAttribute('title') ?? '',
            sr: kind.querySelector('.u-sr-only')?.textContent ?? '',
            smaller: small.width < big.width && small.width >= 14,
            sameRow: Math.abs((small.top + small.bottom) / 2 - (big.top + big.bottom) / 2) < 4,
            inside: small.left >= c.left - 0.5 && small.right <= c.right + 0.5,
            stroke: getComputedStyle(svg).stroke,
            brand: getComputedStyle(/** @type {Element} */ (card.querySelector('svg.landing-ai__icon'))).stroke,
          };
        }),
      );
      expect(found.length).toBe(11);
      for (const f of found) {
        expect(f.missing, `${f.title}: no small icon`).toBeUndefined();
        expect(f.badges, `${f.title}: no badge left`).toBe(0);
        expect(f.hidden, `${f.title}: the svg is decoration`).toBe('true');
        expect(f.label.length, `${f.title}: a title for hover`).toBeGreaterThan(3);
        expect(f.sr, `${f.title}: the same words for a screen reader`).toBe(f.label);
        expect(f.smaller, `${f.title}: smaller than the blue icon`).toBe(true);
        expect(f.sameRow, `${f.title}: on the row of the blue icon`).toBe(true);
        expect(f.inside, `${f.title}: inside the card`).toBe(true);
        expect(f.stroke, `${f.title}: grey, not the brand's blue`).not.toBe(f.brand);
      }
      // Two kinds of agent and one of skill: the icons say which, so the agent that changes code has another one
      expect(new Set(found.map((f) => f.label)).size).toBeGreaterThanOrEqual(2);
    });
  }

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the cards with their small icons (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).include('#a-agents').include('#a-skills').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
