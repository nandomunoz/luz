// @ts-check
/**
 * The two buttons of the home's hero, in `.o-actions`, in this order of the source and of the screen: "Get started
 * with AI" (primary, `.landing-hero__ai`, to the prompts, #ai, with a robot icon that adds no name) and "Read the docs"
 * (outline, to /docs/). They are anchors: they work with no script. Since the tunnel hero (owner, 2026-11-26) there is
 * no "Get started" any more, and so no deviation of the visual order: on a phone (768 px and below) they are one
 * column of full-width buttons, the AI one on top; wider, one row, the AI one at the inline start, also in Arabic.
 *
 * Nothing is drawn over them (the tunnel behind the hero takes no pointer). No sideways scroll at 320 px, nor at
 * 400 % zoom.
 *
 * Runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { focusAndHitTest } from './helpers/obscured.js';

const CATALOG = (code) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${code}.json`, import.meta.url), 'utf-8'));
const ROUTES = [['/', 'en', 'ltr'], ['/es/', 'es', 'ltr'], ['/ar/', 'ar', 'rtl']];
const buttons = (page) => page.locator('#hero .o-actions > a.luz-btn');

test.describe('the hero buttons', () => {
  for (const [route, code] of ROUTES) {
    test(`${route}: two buttons in the source order primary (AI), outline (docs), with their names`, async ({ page }) => {
      await page.goto(route);
      const words = CATALOG(code);
      await expect(page.locator('#hero .o-actions')).toHaveCount(1);
      await expect(buttons(page)).toHaveCount(2);
      await expect(buttons(page).nth(0)).toHaveClass(/\bluz-btn--primary\b/);
      await expect(buttons(page).nth(0)).toHaveClass(/\blanding-hero__ai\b/);
      await expect(buttons(page).nth(1)).toHaveClass(/\bluz-btn--outline\b/);
      for (const index of [0, 1]) await expect(buttons(page).nth(index), `button ${index + 1} is large`).toHaveClass(/\bluz-btn--lg\b/);
      await expect(buttons(page)).toHaveText([words['hero.start-ai'], words['hero.docs']]);
    });

    test(`${route}: they go to the prompts and to the docs, and the prompts are on the page`, async ({ page }) => {
      await page.goto(route);
      await expect(buttons(page).nth(0)).toHaveAttribute('href', '#ai');
      await expect(buttons(page).nth(1)).toHaveAttribute('href', /\/docs\/$/);
      await expect(page.locator('#ai')).toHaveCount(1);
    });

    test(`${route}: the AI button has a robot icon from the page's sprite that adds no name`, async ({ page }) => {
      await page.goto(route);
      const words = CATALOG(code);
      const ai = buttons(page).nth(0);
      const svg = ai.locator('svg');
      await expect(svg).toHaveCount(1);
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      await expect(svg.locator('use')).toHaveAttribute('href', '#i13');
      await expect(page.locator('symbol#i13'), 'the symbol exists once in the page').toHaveCount(1);
      const box = await svg.boundingBox();
      expect(box?.width ?? 0, 'the icon is drawn').toBeGreaterThan(8);
      expect(box?.height ?? 0, 'the icon is drawn').toBeGreaterThan(8);
      expect((await ai.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ').trim(), 'the icon adds no text').toBe(words['hero.start-ai']);
      await expect(buttons(page).nth(1).locator('svg')).toHaveCount(0);
    });

    test(`${route}: the AI button lands on the prompts section from the keyboard, with no script`, async ({ page }) => {
      await page.goto(route);
      await buttons(page).nth(0).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#ai$/);
      await expect(page.locator('#ai')).toBeInViewport();
    });

    test(`${route}: Tab goes through the buttons in the order of the DOM, at any width`, async ({ page }) => {
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);
        await buttons(page).nth(0).focus();
        const seen = [];
        for (let step = 0; step < 2; step += 1) {
          seen.push(await page.evaluate(() => [...document.querySelectorAll('#hero .o-actions > a.luz-btn')].indexOf(/** @type {Element} */ (document.activeElement))));
          await page.keyboard.press('Tab');
        }
        expect(seen, `the focus order at ${width} px`).toEqual([0, 1]);
      }
    });
  }
});

test.describe('the hero buttons: the visual order is the order of the source', () => {
  for (const [route, , dir] of ROUTES) {
    for (const [width, height] of [[390, 844], [320, 700], [768, 1024]]) {
      test(`${route} at ${width} px: one column of full-width buttons, the AI one on top`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const rects = await buttons(page).evaluateAll((els) => els.map((el) => ({ ...el.getBoundingClientRect().toJSON(), parent: el.parentElement.getBoundingClientRect().width })));
        expect(rects[0].bottom, 'AI above the docs').toBeLessThanOrEqual(rects[1].top);
        for (const r of rects) expect(Math.abs(r.width - r.parent), 'full width').toBeLessThanOrEqual(1);
      });
    }

    for (const [width, height] of [[1280, 800], [1024, 768]]) {
      test(`${route} at ${width} px: one row, the AI button at the ${dir === 'rtl' ? 'right' : 'left'}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const rects = await buttons(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
        expect(Math.abs(rects[0].top - rects[1].top), 'one row').toBeLessThanOrEqual(1);
        if (dir === 'rtl') expect(rects[0].left).toBeGreaterThan(rects[1].right);
        else expect(rects[0].right).toBeLessThan(rects[1].left);
      });
    }
  }

  test('no button of the hero is moved by `order`', async ({ page }) => {
    for (const width of [320, 640, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      expect(await buttons(page).evaluateAll((els) => els.map((el) => getComputedStyle(el).order))).toEqual(['0', '0']);
    }
  });
});

test.describe('the hero buttons: nothing is drawn over them', () => {
  // The tunnel is drawn behind the whole hero: the buttons must still take the pointer
  for (const [route] of ROUTES) {
    for (const [width, height] of [[1280, 720], [1024, 700], [768, 900], [390, 844], [320, 568]]) {
      test(`${route} at ${width} x ${height}: each button is the element under its own centre and ends`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        for (let index = 0; index < (await buttons(page).count()); index += 1) {
          const result = await focusAndHitTest(buttons(page).nth(index));
          expect(result.focused, `button ${index + 1} takes focus`).toBe(true);
          expect(result.covered, `what is drawn over button ${index + 1}`).toEqual([]);
        }
      });
    }
  }
});

test.describe('the hero buttons: they fit', () => {
  for (const [route] of ROUTES) {
    for (const width of [320, 400]) {
      test(`${route} at ${width} px (400 % zoom of a desktop window): every button is inside the window and nothing scrolls sideways`, async ({ page }) => {
        await page.setViewportSize({ width, height: 700 });
        await page.goto(route);
        const { rects, overflow, inner } = await page.evaluate(() => ({
          rects: [...document.querySelectorAll('#hero .o-actions > a.luz-btn')].map((el) => el.getBoundingClientRect().toJSON()),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          inner: document.documentElement.clientWidth,
        }));
        expect(rects).toHaveLength(2);
        for (const r of rects) {
          expect(r.left, 'inside, on the left').toBeGreaterThanOrEqual(-0.5);
          expect(r.right, 'inside, on the right').toBeLessThanOrEqual(inner + 0.5);
        }
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }

  test('at 400 % zoom (a 1280 px window seen at 320 css px) the two buttons stack and the page does not scroll sideways', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 200 }, deviceScaleFactor: 4 });
    const page = await context.newPage();
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await expect(buttons(page).nth(1)).toBeVisible();
    await context.close();
  });
});
