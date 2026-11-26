// @ts-check
/**
 * The badge of a card of /ai/ (what a command does to your files, what an agent does) sits right under the card's title
 * (owner, 2026-11-26, from their own mock-up; in an agent, under the technical name that follows the title), at the start of the line, as a small rectangle fitted to its text: 12 px
 * text, a background that lets the card show through, no border, in the flow of the card (not over anything). Before the
 * sentence of the card. With and without JavaScript, at 320 px, and axe finds nothing in light and dark.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

for (const route of ROUTES) {
  const rtl = route.startsWith('/ar/');
  for (const width of [1280, 320]) {
    test(`${route} at ${width} px: every badge is a borderless translucent rectangle of 12 px text under the title of its card, at the start of the line, before the sentence`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const found = await page.evaluate(() =>
        [...document.querySelectorAll('#a-agents article, #a-skills article')].map((card) => {
          const badge = /** @type {HTMLElement | null} */ (card.querySelector('.landing-ai__badge'));
          if (!badge) return { missing: card.querySelector('.landing-card__title')?.textContent };
          const cs = getComputedStyle(badge);
          const c = card.getBoundingClientRect();
          const b = badge.getBoundingClientRect();
          const t = /** @type {HTMLElement} */ (card.querySelector('.landing-card__title')).getBoundingClientRect();
          const name = card.querySelector('.landing-ai__name');
          const text = /** @type {HTMLElement} */ (card.querySelector('.landing-ai__text')).getBoundingClientRect();
          const icon = /** @type {Element} */ (card.querySelector('svg.landing-ai__icon')).getBoundingClientRect();
          const alpha = /rgba?\(([^)]*)\)|color\(([^)]*)\)/.exec(cs.backgroundColor);
          return {
            title: card.querySelector('.landing-card__title')?.textContent,
            // Under the title, or, in an agent, under its technical name, which sits right under the title
            belowTitle: b.top >= t.bottom - 0.5 && b.top - t.bottom <= (name ? 40 : 16),
            belowName: !name || (b.top >= name.getBoundingClientRect().bottom - 0.5 && b.top - name.getBoundingClientRect().bottom <= 16),
            aboveText: b.bottom <= text.top + 0.5,
            gapToNext: /** @type {Element} */ (card.querySelector('.landing-ai__text')).getBoundingClientRect().top - b.bottom,
            startGap: Math.abs(b.left - t.left),
            endGap: Math.abs(b.right - t.right),
            belowIcon: b.top >= icon.bottom,
            inside: b.left >= c.left - 0.5 && b.right <= c.right + 0.5,
            padding: `${cs.paddingTop} ${cs.paddingBottom}`,
            border: cs.borderTopWidth + cs.borderRightWidth + cs.borderBottomWidth + cs.borderLeftWidth,
            font: parseFloat(cs.fontSize),
            radius: parseFloat(cs.borderTopLeftRadius),
            bg: cs.backgroundColor,
            color: cs.color,
            translucent: !!alpha && /\/\s*0?\.\d+|,\s*0?\.\d+\s*\)/.test(cs.backgroundColor),
            position: cs.position,
          };
        }),
      );
      expect(found.length).toBeGreaterThanOrEqual(17);
      // One colour for all: the background and the text of the grey badge of "Only reads"
      expect(new Set(found.map((f) => `${f.bg} ${f.color}`)).size, 'every badge has the same background and text colour').toBe(1);
      for (const f of found) {
        expect(f.missing, `a card has no badge: ${f.missing}`).toBeUndefined();
        expect(f.position, `${f.title}: in the flow`).toBe('static');
        expect(f.belowTitle, `${f.title}: right under the title`).toBe(true);
        expect(f.belowName, `${f.title}: right under the technical name`).toBe(true);
        expect(f.belowIcon, `${f.title}: under the icon`).toBe(true);
        expect(f.aboveText, `${f.title}: before the sentence`).toBe(true);
        expect(f.gapToNext, `${f.title}: room under the badge, to set it apart from what follows`).toBeGreaterThanOrEqual(14);
        expect(f.inside, `${f.title}: inside the card`).toBe(true);
        expect(rtl ? f.endGap : f.startGap, `${f.title}: at the start of the line`).toBeLessThanOrEqual(1);
        expect(f.padding, `${f.title}: 4 px above and below the text`).toBe('4px 4px');
        expect(f.border, `${f.title}: no border`).toBe('0px0px0px0px');
        expect(f.font, `${f.title}: 12 px text`).toBeLessThanOrEqual(12.01);
        expect(f.font, `${f.title}: 12 px text, not smaller`).toBeGreaterThanOrEqual(11.99);
        expect(f.radius, `${f.title}: a rectangle with a soft corner, not a pill`).toBeLessThanOrEqual(8);
        expect(f.translucent, `${f.title}: a background with opacity (${f.bg})`).toBe(true);
      }
    });
  }

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the cards with their badges (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).include('#a-agents').include('#a-skills').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
