// @ts-check
/**
 * Below the hero and the three steps, the page of the skill (/ai/, /es/ai/, /ar/ai/) is ordered by what the reader
 * wants (owner, 2026-11-25; .claude/plans/ai-page-redesign.md): the assistants' strip, four goals with cards (start a
 * site, the agents, the skills, keep it in shape) and the strip of what you decide.
 *
 *   - Each section shows its cards, each with an icon, a title and the sentence you say or the command that runs;
 *     with no JavaScript too (nothing here is a script);
 *   - no table is left on the page, and nothing leaves the viewport sideways at 320 px, at 400 % text;
 *   - axe finds nothing, in light and dark.
 *
 * The sources are tests/landing-ai-page.test.js.
 * Run with: pnpm exec playwright test tests/ai-page-goals.spec.js --project=chromium --project=chromium-nojs
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];
const GOALS = [
  ['a-commands', 8],
  ['a-agents', 5],
  ['a-skill', 4],
];

for (const route of ROUTES) {
  test(`${route}: each goal shows its cards with an icon, a title and what you say or what runs; no table is left`, async ({ page }) => {
    await page.goto(route);
    for (const [id, count] of GOALS) {
      const cards = page.locator(`#${id} article.landing-ai__card`);
      await expect(cards, id).toHaveCount(count);
      for (const card of await cards.all()) {
        await expect(card.locator('svg.landing-ai__icon')).toBeVisible();
        await expect(card.locator('.landing-card__title')).toBeVisible();
        await expect(card.locator('.landing-ai__ask code')).toBeVisible();
      }
    }
    await expect(page.locator('#a-assistants li')).toHaveCount(5);
    await expect(page.locator('#a-decide li')).toHaveCount(5);
    await expect(page.locator('main table')).toHaveCount(0);
  });

  test(`${route}: at 1280 px the three commands that write fill three columns, and the five that read sit on five`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    const widths = async (selector) => page.locator(`${selector} article`).evaluateAll((all) => {
      const grid = all[0].parentElement;
      return { cards: all.map((el) => el.getBoundingClientRect().width), grid: grid.getBoundingClientRect().width, gap: parseFloat(getComputedStyle(grid).columnGap) };
    });
    const writes = await widths('#a-commands-writes');
    const reads = await widths('#a-commands-reads');
    const oneOf = (n, w) => (w.grid - (n - 1) * w.gap) / n;
    expect(writes.cards).toHaveLength(3);
    for (const w of writes.cards) expect(Math.abs(w - oneOf(3, writes))).toBeLessThan(2);
    expect(reads.cards).toHaveLength(5);
    for (const w of reads.cards) expect(Math.abs(w - oneOf(5, reads))).toBeLessThan(2);
  });

  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} the goals do not leave the viewport sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
      // The page as a whole is tests/home-cli.spec.js' and tests/ai-page-reflow.spec.js'; here, only the goals
      const outside = await page.locator('#a-assistants, #a-commands, #a-agents, #a-skill, #a-decide').locator('h2, p, li, article, code').evaluateAll((all) =>
        all
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > window.innerWidth + 0.5 || box.left < -0.5))
          .map(({ el, box }) => `${el.localName}.${el.className} spans ${Math.round(box.left)}-${Math.round(box.right)}`),
      );
      expect(outside, outside.join(' | ')).toEqual([]);
    });
  }

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the goals (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).include('#a-assistants').include('#a-commands').include('#a-agents').include('#a-skill').include('#a-decide').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
