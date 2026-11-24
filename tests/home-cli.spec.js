// @ts-check
/**
 * The fourth level of the home, "Your whole site, from a conversation" (.claude/plans/luz-ai-skill.md, part A, and
 * the owner on 2026-11-24): `#ai` of /, /es/ and /ar/ is the terminal of the luz-start skill, an emulation of a real
 * session in which the visitor answers. What it checks:
 *
 *   - without JavaScript (these tests switch it off themselves): the session of the default answers shows, still,
 *     with no button and no question's buttons;
 *   - with JavaScript: the first line shows, Enter on the button brings the next one, a click in the terminal does
 *     too and leaves the focus on the button; a question shows its buttons in the place of Enter, the first focused,
 *     and the answer picks the lines that follow (a blog in Astro, the speed agent too); the last line turns the
 *     button into Play again, which starts over with the default answers; the terminal keeps its height, so the page
 *     under it never moves;
 *   - axe passes on the section, in light and dark, with the whole session played;
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

const cli = (page) => page.locator('section#ai .landing-cli');
const shown = (page) => cli(page).locator('.landing-cli__screen > :not([hidden])');
const next = (page) => cli(page).locator('.landing-cli__next');
const asking = (page) => cli(page).locator('.landing-cli__choices:not([hidden])');

async function open(page, route) {
  await page.goto(route);
  await page.waitForLoadState('load');
}

/**
 * Plays the session to its end: Enter while a line comes, and at each question the answer of `pick` ({ kind, stack,
 * agent: [names to toggle] }) or the default (the pressed button, or Continue).
 */
async function playThrough(page, pick = {}) {
  for (let guard = 0; guard < 200; guard++) {
    if (await asking(page).count()) {
      const ask = asking(page);
      const name = await ask.getAttribute('data-ask');
      if (name === 'agent') {
        for (const value of pick.agent ?? []) await ask.locator(`[data-value="${value}"]`).click();
        await ask.locator('[data-done]').click();
      } else if (pick[name]) await ask.locator(`[data-value="${pick[name]}"]`).click();
      else await ask.locator('[aria-pressed="true"]').click();
      continue;
    }
    if ((await next(page).getAttribute('class'))?.includes('landing-cli__next') && (await cli(page).locator('[data-cli-replay]').isVisible())) return;
    await next(page).click();
  }
  throw new Error('the session never ended');
}

for (const [route, lang] of ROUTES) {
  const words = catalog(lang);

  test.describe(`${route} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test('the session of the default answers shows, still, with no button and no question to answer', async ({ page }) => {
      await open(page, route);
      expect(await shown(page).count()).toBeGreaterThanOrEqual(25);
      await expect(next(page)).toBeHidden();
      await expect(cli(page).locator('.landing-cli__choices:visible')).toHaveCount(0);
      await expect(cli(page)).toHaveAttribute('dir', 'ltr');
      await expect(cli(page)).toHaveAccessibleName(words['inside.l4.panel']);
      await expect(cli(page)).toContainText(words['inside.cli.ask']);
      await expect(cli(page)).toContainText('npx @luz-ds/ai init --target claude');
      await expect(cli(page)).toContainText('luz-start site new');
      await expect(cli(page)).toContainText('index.html');
      expect(await cli(page).innerText(), 'only the default answers').not.toContain('index.astro');
    });
  });

  test.describe(`${route} with JavaScript`, () => {
    test('Enter brings one line at a time, a click in the terminal too, and a question waits for its answer', async ({ page }) => {
      await open(page, route);
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

      // On to the first question: its buttons come with it, in the place of Enter, the first one focused
      while (!(await asking(page).count())) await page.keyboard.press('Enter');
      await expect(asking(page)).toHaveAttribute('data-ask', 'kind');
      await expect(next(page)).not.toBeVisible();
      await expect(asking(page).locator('button').first()).toBeFocused();
      expect(await cli(page).evaluate((el) => el.getBoundingClientRect().height), 'the terminal keeps its height').toBeCloseTo(height, 0);
    });

    test('the answers pick what follows: a blog in Astro, with the speed agent too, then Play again starts over', async ({ page }) => {
      await open(page, route);
      const height = await cli(page).evaluate((el) => el.getBoundingClientRect().height);
      await playThrough(page, { kind: 'blog', stack: 'astro', agent: ['luz-core-web-vitals-optimizer'] });
      const screen = cli(page).locator('.landing-cli__screen');
      await expect(screen).toContainText('--kind blog --stack astro');
      await expect(screen).toContainText('src/pages/index.astro');
      await expect(screen).toContainText('--ext .astro');
      await expect(screen).toContainText('agent add luz-core-web-vitals-optimizer');
      await expect(screen).toContainText('agent add luz-seo-geo-specialist');
      const said = await screen.innerText();
      expect(said).not.toContain('skill add luz-create-landing');
      expect(said).not.toContain('--kind landing');
      await expect(next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.replay']}`);
      expect(await cli(page).evaluate((el) => el.getBoundingClientRect().height), 'the terminal keeps its height').toBeCloseTo(height, 0);

      await next(page).click();
      await expect(shown(page)).toHaveCount(1);
      await expect(next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.next']}`);
      await expect(cli(page).locator('[data-ask="kind"] [aria-pressed="true"]')).toHaveAttribute('data-value', 'landing');
      await expect(cli(page).locator('[data-ask="agent"] [aria-pressed="true"]')).toHaveCount(2);
    });

    test('the screen is a polite live region, so each new line is read out', async ({ page }) => {
      await open(page, route);
      await expect(cli(page).locator('.landing-cli__screen')).toHaveAttribute('aria-live', 'polite');
    });

    for (const scheme of /** @type {const} */ (['light', 'dark'])) {
      test(`axe finds nothing in the fourth level (${scheme}), with the whole session played`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await open(page, route);
        await playThrough(page);
        await faded(page);
        const results = await new AxeBuilder({ page }).include('#ai').analyze();
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
      await playThrough(page);
      await page.locator('section#ai').scrollIntoViewIfNeeded();
      await faded(page);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 'the page scrolls sideways').toBeLessThanOrEqual(0);
      const outside = await page.locator('section#ai').locator('a, button, h2, p, li, figure').evaluateAll((all) =>
        all
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > window.innerWidth + 0.5 || box.left < -0.5))
          .map(({ el, box }) => `${el.localName}.${el.className} spans ${Math.round(box.left)}-${Math.round(box.right)}`),
      );
      expect(outside, `${lang}: ${outside.join(' | ')}`).toEqual([]);
    });
  }
}
