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
  test(`${route}: install is three choices, the recommended one in the middle, each with its command`, async ({ page }) => {
    await page.goto(route);
    const options = page.locator('#a-install article.landing-ai-option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(1)).toHaveClass(/landing-ai-option--recommended/);
    await expect(options.nth(1).locator('.landing-ai-option__flag')).toBeVisible();
    for (const option of await options.all()) {
      await expect(option.locator('h3')).toBeVisible();
      await expect(option.locator('.landing-ai__ask code').first()).toBeVisible();
    }
  });

  test(`${route}: at 1280 px the three choices are one row like a table of plans, the recommended one in the middle and taller, and no command wraps`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    const boxes = await page.locator('#a-install article.landing-ai-option').evaluateAll((all) => all.map((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; }));
    const [first, mid, last] = route === '/ar/ai/' ? [...boxes].reverse() : boxes;
    expect(first.right).toBeLessThanOrEqual(mid.left);
    expect(mid.right).toBeLessThanOrEqual(last.left);
    expect(mid.top).toBeLessThan(first.top - 4);
    expect(mid.bottom).toBeGreaterThan(first.bottom + 4);
    expect(Math.abs(first.top - last.top)).toBeLessThan(2);
    expect(Math.abs(first.bottom - last.bottom)).toBeLessThan(2);
    // A command is one line: it never breaks in the middle of a flag
    const lines = await page.locator('#a-install .landing-ai__ask code').evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))));
    expect(lines).toEqual([1, 1, 1, 1]);
    // The two groups of agents side by side: the four that read, wider, then the one that changes code
    const [reads, acts] = await page.locator('#a-agents .landing-ai-kind').evaluateAll((all) => all.map((el) => { const b = el.getBoundingClientRect(); return { top: b.top, left: b.left, right: b.right, width: b.width }; }));
    expect(Math.abs(reads.top - acts.top)).toBeLessThan(2);
    expect(reads.width).toBeGreaterThan(acts.width);
    if (route === '/ar/ai/') expect(acts.right).toBeLessThanOrEqual(reads.left);
    else expect(reads.right).toBeLessThanOrEqual(acts.left);
    for (const selector of ['#a-skills article']) {
      const row = await page.locator(selector).evaluateAll((all) => {
        const bs = all.map((el) => el.getBoundingClientRect());
        return bs.filter((b) => Math.abs(b.top - bs[0].top) < 2).map((b) => b.width);
      });
      expect(row.length, selector).toBeGreaterThanOrEqual(3);
      for (const w of row) expect(Math.abs(w - row[0]), selector).toBeLessThan(2);
    }
  });

  test(`${route}: the cards of agents and skills show how to ask for each, with no fold, and the section says once how to add one`, async ({ page }) => {
    await page.goto(route);
    for (const [id, count] of [['a-agents', 5], ['a-skills', 6]]) {
      const cards = page.locator(`#${id} article.landing-ai__card`);
      await expect(cards, id).toHaveCount(count);
      for (const card of await cards.all()) {
        await expect(card.locator('svg.landing-ai__icon')).toBeVisible();
        await expect(card.locator('.landing-card__title')).toBeVisible();
        // The title beside the icon, on its row (owner, 2026-11-26)
        const [i, t] = await Promise.all([card.locator('svg.landing-ai__icon').boundingBox(), card.locator('.landing-card__title').boundingBox()]);
        expect(i && t && t.y < i.y + i.height && t.y + t.height > i.y, 'title on the row of the icon').toBeTruthy();
        await expect(card.locator('.landing-ai__label + .landing-ai__ask code')).toBeVisible();
        await expect(card.locator('details')).toHaveCount(0);
      }
    }
    await expect(page.locator('#a-agents .landing-ai-goal__note')).toBeVisible();
    await expect(page.locator('#a-skills .landing-ai-goal__note')).toBeVisible();
    // The commands of "Use it" sit in one panel, each row with its three parts on one line at this width
    await page.setViewportSize({ width: 1280, height: 900 });
    const row = page.locator('#a-use li.landing-ai-cmd').first();
    const tops = await row.locator('> *').evaluateAll((all) => all.map((el) => { const b = el.getBoundingClientRect(); return (b.top + b.bottom) / 2; }));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(6);
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

  test(`${route}: a link of the sticky list leaves the title of its section in view, under the list`, async ({ page }, info) => {
    test.skip(info.project.name.endsWith('nojs'), 'the same with or without JavaScript');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(route);
    for (const id of ['a-install', 'a-use', 'a-agents', 'a-skills', 'a-decide']) {
      await page.locator(`.landing-ai-toc a[href="#${id}"]`).click();
      await page.waitForTimeout(400);
      const gap = await page.evaluate((id) => {
        const toc = /** @type {Element} */ (document.querySelector('.landing-ai-toc')).getBoundingClientRect();
        const title = /** @type {Element} */ (document.querySelector(`#${id} h2`)).getBoundingClientRect();
        return title.top - toc.bottom;
      }, id);
      expect(gap, id).toBeGreaterThanOrEqual(0);
    }
  });

  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} the sections do not leave the viewport sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
      // A moving marquee runs off the window by design, clipped by its box (tests/ai-page-marquee.spec.js); still, it wraps
      const outside = await page.locator(SECTIONS).locator('h2, h3, p, li, article, code, pre, summary').evaluateAll((all) =>
        all
          .filter((el) => !el.closest('[aria-hidden="true"], .u-sr-only, .landing-marquee.is-moving'))
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
