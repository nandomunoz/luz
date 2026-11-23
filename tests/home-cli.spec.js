// @ts-check
/**
 * The fourth level of the home, "Your whole site, from a conversation" (.claude/plans/luz-ai-skill.md, part A):
 * `#inside-4` of /, /es/ and /ar/ is a fake terminal that plays the conversation of the LUZ skill to come. What it
 * checks:
 *
 *   - without JavaScript (these tests switch it off themselves): the whole conversation shows, still, and there is
 *     no button;
 *   - with JavaScript: the first line shows, Enter on the button brings the next one, a click in the terminal does
 *     too and leaves the focus on the button, the last line turns the button into Play again, which starts over;
 *     the terminal keeps its height from the first line to the last, so the page under it never moves;
 *   - axe passes on the section, in light and dark;
 *   - reflow (WCAG 1.4.10): no horizontal overflow at 320 px, nor at 400 % text, in English and Arabic.
 *
 * The sources are tests/home-cli.test.js.
 * Run with: pnpm exec playwright test tests/home-cli.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { faded } from './helpers/settle.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const catalog = (lang) => JSON.parse(readFileSync(fromRepo(`apps/landing/i18n/${lang}.json`), 'utf-8'));

const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];

const cli = (page) => page.locator('section#inside-4 .landing-cli');
const lines = (page) => cli(page).locator('.landing-cli__line');
const shown = (page) => cli(page).locator('.landing-cli__line:visible');
const next = (page) => cli(page).locator('.landing-cli__next');

async function open(page, route) {
  await page.goto(route);
  await page.waitForLoadState('load');
}

for (const [route, lang] of ROUTES) {
  const words = catalog(lang);

  test.describe(`${route} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test('the whole conversation shows, still, and there is no button', async ({ page }) => {
      await open(page, route);
      const count = await lines(page).count();
      expect(count).toBeGreaterThanOrEqual(12);
      await expect(shown(page)).toHaveCount(count);
      await expect(next(page)).toBeHidden();
      await expect(cli(page)).toHaveAttribute('dir', 'ltr');
      await expect(cli(page)).toHaveAccessibleName(words['inside.l4.panel']);
      await expect(cli(page)).toContainText(words['inside.cli.ask']);
      await expect(cli(page)).toContainText('npx @luz-ds/ai');
    });
  });

  test.describe(`${route} with JavaScript`, () => {
    test('Enter brings one line at a time, a click in the terminal too, and the last one plays it again from the start', async ({ page }) => {
      await open(page, route);
      const count = await lines(page).count();
      await expect(shown(page)).toHaveCount(1);
      await expect(next(page)).toBeVisible();
      await expect(next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.next']}`);
      const height = await cli(page).evaluate((el) => el.getBoundingClientRect().height);

      await next(page).focus();
      await page.keyboard.press('Enter');
      await expect(shown(page)).toHaveCount(2);

      await cli(page).locator('.landing-cli__screen').click({ position: { x: 8, y: 8 } });
      await expect(shown(page)).toHaveCount(3);
      await expect(next(page)).toBeFocused();

      for (let n = 4; n <= count; n++) await page.keyboard.press('Enter');
      await expect(shown(page)).toHaveCount(count);
      await expect(next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.replay']}`);
      expect(await cli(page).evaluate((el) => el.getBoundingClientRect().height), 'the terminal keeps its height').toBeCloseTo(height, 0);

      await page.keyboard.press('Enter');
      await expect(shown(page)).toHaveCount(1);
      await expect(next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.next']}`);
    });

    test('the screen is a polite live region, so each new line is read out', async ({ page }) => {
      await open(page, route);
      await expect(cli(page).locator('.landing-cli__screen')).toHaveAttribute('aria-live', 'polite');
    });

    for (const scheme of /** @type {const} */ (['light', 'dark'])) {
      test(`axe finds nothing in the fourth level (${scheme}), with every line shown`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await open(page, route);
        const count = await lines(page).count();
        await next(page).focus();
        for (let n = 2; n <= count; n++) await page.keyboard.press('Enter');
        await faded(page);
        const results = await new AxeBuilder({ page }).include('#inside-4').analyze();
        expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
      });
    }
  });
}

/* ---- Reflow (WCAG 1.4.10) ------------------------------------------------- */

for (const [route, lang] of ROUTES.filter(([, lang]) => lang !== 'es')) {
  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} nothing of the fourth level leaves the viewport sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
      const count = await lines(page).count();
      await next(page).focus();
      for (let n = 2; n <= count; n++) await page.keyboard.press('Enter');
      await page.locator('section#inside-4').scrollIntoViewIfNeeded();
      await faded(page);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 'the page scrolls sideways').toBeLessThanOrEqual(0);
      const outside = await page.locator('section#inside-4').locator('a, button, h2, p, li, figure').evaluateAll((all) =>
        all
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > window.innerWidth + 0.5 || box.left < -0.5))
          .map(({ el, box }) => `${el.localName}.${el.className} spans ${Math.round(box.left)}-${Math.round(box.right)}`),
      );
      expect(outside, `${lang}: ${outside.join(' | ')}`).toEqual([]);
    });
  }
}
