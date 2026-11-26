// @ts-check
/**
 * Below the hero, the page of the skill (/ai/, /es/ai/, /ar/ai/) has one goal per section (owner, 2026-11-26, the third pass:
 * .claude/plans/ai-page-v3.md): install it (three choices, everything recommended), use it (the chat, three tabs by what you
 * want to do), the agents and the small skills (what each does and how to ask for it; installing it is a closed details),
 * and what you decide.
 *
 *   - Install shows three choices side by side on a wide screen, the recommended one first, each with its command;
 *   - Use is core tabs: with JavaScript one panel shows and the keyboard moves between them; without it the three stack;
 *   - each card of an agent or a skill shows the sentence to ask for it, and its install line only once the details opens;
 *   - no table is left, nothing leaves the viewport sideways at 320 px and at 400 % text, and axe finds nothing.
 *
 * The sources are tests/landing-ai-page.test.js.
 * Run with: pnpm exec playwright test tests/ai-page-goals.spec.js --project=chromium --project=chromium-nojs
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];
const SECTIONS = '#a-assistants, #a-install, #a-use, #a-agents, #a-skills, #a-decide';

for (const route of ROUTES) {
  test(`${route}: install is three choices, the recommended one first, each with its command`, async ({ page }) => {
    await page.goto(route);
    const options = page.locator('#a-install article.landing-ai-option');
    await expect(options).toHaveCount(3);
    await expect(options.first()).toHaveClass(/landing-ai-option--recommended/);
    for (const option of await options.all()) {
      await expect(option.locator('h3')).toBeVisible();
      await expect(option.locator('pre code').first()).toBeVisible();
    }
  });

  test(`${route}: at 1280 px the three choices sit on one row, the same width, and the cards of agents and skills on three or more`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    for (const [selector, least] of [['#a-install article.landing-ai-option', 3], ['#a-agents article', 3], ['#a-skills article', 3]]) {
      const row = await page.locator(selector).evaluateAll((all) => {
        const boxes = all.map((el) => el.getBoundingClientRect());
        return boxes.filter((b) => Math.abs(b.top - boxes[0].top) < 2).map((b) => b.width);
      });
      expect(row.length, selector).toBeGreaterThanOrEqual(least);
      for (const w of row) expect(Math.abs(w - row[0]), selector).toBeLessThan(2);
    }
  });

  test(`${route}: the cards of agents and skills show how to ask for each, and the install line only in its open details`, async ({ page }) => {
    await page.goto(route);
    for (const [id, count] of [['a-agents', 5], ['a-skills', 6]]) {
      const cards = page.locator(`#${id} article.landing-ai__card`);
      await expect(cards, id).toHaveCount(count);
      for (const card of await cards.all()) {
        await expect(card.locator('svg.landing-ai__icon')).toBeVisible();
        await expect(card.locator('.landing-card__title')).toBeVisible();
        await expect(card.locator('.landing-ai__label + .landing-ai__ask code')).toBeVisible();
        const install = card.locator('details.landing-ai__install');
        await expect(install.locator('.landing-ai__ask code')).toBeHidden();
      }
    }
    const first = page.locator('#a-agents details.landing-ai__install').first();
    await first.locator('summary').click();
    await expect(first.locator('.landing-ai__ask code')).toBeVisible();
    await expect(page.locator('#a-decide li')).toHaveCount(5);
    await expect(page.locator('main table')).toHaveCount(0);
  });

  test(`${route}: use it is three tabs; without JavaScript the three panels stack, each under its heading`, async ({ page }, info) => {
    await page.goto(route);
    const panes = page.locator('#a-use .landing-ai-use__pane');
    await expect(panes).toHaveCount(3);
    if (info.project.name.endsWith('nojs')) {
      for (const pane of await panes.all()) {
        await expect(pane.locator('h3')).toBeVisible();
        await expect(pane.locator('li.landing-ai-cmd').first()).toBeVisible();
      }
      return;
    }
    const tabs = page.locator('#a-use .luz-tab');
    await expect(tabs).toHaveCount(3);
    await expect(panes.nth(0)).toBeVisible();
    await expect(panes.nth(1)).toBeHidden();
    await tabs.nth(1).click();
    await expect(panes.nth(1)).toBeVisible();
    await expect(panes.nth(0)).toBeHidden();
    await tabs.nth(1).focus();
    await page.keyboard.press(route === '/ar/ai/' ? 'ArrowLeft' : 'ArrowRight');
    await expect(panes.nth(2)).toBeVisible();
  });

  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} the sections do not leave the viewport sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
      const outside = await page.locator(SECTIONS).locator('h2, h3, p, li, article, code, pre, summary').evaluateAll((all) =>
        all
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > window.innerWidth + 0.5 || box.left < -0.5))
          .map(({ el, box }) => `${el.localName}.${el.className} spans ${Math.round(box.left)}-${Math.round(box.right)}`),
      );
      expect(outside, outside.join(' | ')).toEqual([]);
    });
  }

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the sections (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      let axe = new AxeBuilder({ page });
      for (const id of SECTIONS.split(', ')) axe = axe.include(id);
      const results = await axe.analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
