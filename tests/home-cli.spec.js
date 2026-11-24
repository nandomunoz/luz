// @ts-check
/**
 * The terminal of the luz-start skill (.claude/plans/luz-ai-skill.md, part A, and the owner on 2026-11-24), an
 * emulation of a real session, in two places:
 *
 * THE HOME (`#ai` of /, /es/ and /ar/) plays it again and again, as an animation with nothing to answer:
 *   - without JavaScript, or when the visitor prefers reduced motion, the session of the default answers shows, still,
 *     with no button and no question's buttons;
 *   - with JavaScript and motion welcome, it waits until it is in view, then brings a line at a time; a question shows
 *     its answers and one of them is picked by the animation, never by the visitor (the screen is inert and hidden from
 *     a reader, so there is nothing to focus or to press); at its end it starts over with another answer;
 *   - a button pauses it and plays it again (WCAG 2.2.2), and a paused or out-of-view animation does not move;
 *   - axe passes, in light and dark; reflow (WCAG 1.4.10) holds at 320 px and at 400 % text.
 *
 * THE PAGE OF THE SKILL (/ai/, /es/ai/, /ar/ai/) lets the visitor answer, in its hero:
 *   - the first line shows, Enter on the button brings the next one, a click in the terminal does too; a question
 *     shows its buttons in the place of Enter, the first focused; the answer picks the lines that follow (a blog in
 *     Astro, the speed agent too); the last line turns the button into Play again; the terminal keeps its height;
 *   - axe passes with the whole session played, and reflow holds.
 *
 * The sources are tests/home-cli.test.js.
 * Run with: pnpm exec playwright test tests/home-cli.spec.js --project=chromium --project=chromium-nojs
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { faded } from './helpers/settle.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const catalog = (lang) => JSON.parse(readFileSync(fromRepo(`apps/landing/i18n/${lang}.json`), 'utf-8'));

const HOME = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];
const SKILL = [
  ['/ai/', 'en'],
  ['/es/ai/', 'es'],
  ['/ar/ai/', 'ar'],
];

/** The terminal of a page: in the fourth level of the home, in the hero of the page of the skill. */
const where = (scope) => ({
  scope,
  cli: (page) => page.locator(`${scope} .landing-cli`),
  screen: (page) => page.locator(`${scope} .landing-cli__screen`),
  shown: (page) => page.locator(`${scope} .landing-cli__screen > :not([hidden])`),
  next: (page) => page.locator(`${scope} .landing-cli__next`),
  pause: (page) => page.locator(`${scope} .landing-cli__pause`),
  asking: (page) => page.locator(`${scope} .landing-cli__choices:not([hidden])`),
});
const home = where('section#ai');
const skill = where('#hero');

async function open(page, route) {
  await page.goto(route);
  await page.waitForLoadState('load');
}

/**
 * Plays the session of the page of the skill to its end: Enter while a line comes, and at each question the answer of
 * `pick` ({ kind, stack, agent: [names to toggle] }) or the default (the pressed button, or Continue).
 */
async function playThrough(page, pick = {}) {
  const { asking, next, cli } = skill;
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
    if (await cli(page).locator('[data-cli-replay]').isVisible()) return;
    await next(page).click();
  }
  throw new Error('the session never ended');
}

/** With the clock ours: the page runs the time we give it, so a session of a minute takes a moment. */
async function openWithClock(page, route) {
  await page.clock.install();
  await open(page, route);
}

/** Scrolls the terminal of the home into view and lets the animation take it from there. */
async function bringIntoView(page) {
  await home.cli(page).scrollIntoViewIfNeeded();
  await page.clock.runFor(100);
}

/* ======================= The home: the animation ======================= */

for (const [route, lang] of HOME) {
  const words = catalog(lang);

  test.describe(`${route} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test('the session of the default answers shows, still, with no button and no question to answer', async ({ page }) => {
      await open(page, route);
      expect(await home.shown(page).count()).toBeGreaterThanOrEqual(25);
      await expect(home.pause(page)).toBeHidden();
      await expect(home.next(page)).toHaveCount(0);
      await expect(home.cli(page).locator('.landing-cli__choices:visible')).toHaveCount(0);
      await expect(home.cli(page)).toHaveAttribute('dir', 'ltr');
      await expect(home.cli(page)).toHaveAccessibleName(words['inside.l4.panel']);
      await expect(home.cli(page)).toContainText(words['inside.cli.ask']);
      await expect(home.cli(page)).toContainText('npx @luz-ds/ai init --target claude');
      await expect(home.cli(page)).toContainText('luz-start site new');
      await expect(home.cli(page)).toContainText('index.html');
      expect(await home.cli(page).innerText(), 'only the default answers').not.toContain('index.astro');
    });
  });

  test.describe(`${route} with reduced motion`, () => {
    test('the session of the default answers shows, whole and still, with nothing to pause', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.clock.install();
      await open(page, route);
      await bringIntoView(page);
      const count = await home.shown(page).count();
      expect(count).toBeGreaterThanOrEqual(25);
      await expect(home.pause(page)).toBeHidden();
      await expect(home.cli(page).locator('.landing-cli__choices:visible')).toHaveCount(0);
      await page.clock.runFor(60_000);
      expect(await home.shown(page).count(), 'it does not move').toBe(count);
      await expect(home.screen(page)).not.toHaveAttribute('inert', /.*/);
    });
  });

  test.describe(`${route} with JavaScript`, () => {
    test('waits until it is in view, and has no Enter, no question to press and nothing to focus', async ({ page }) => {
      await openWithClock(page, route);
      await expect(home.shown(page)).toHaveCount(1);
      await page.clock.runFor(10_000);
      await expect(home.shown(page), 'out of view it does not run').toHaveCount(1);
      await expect(home.next(page)).toHaveCount(0);
      await expect(home.screen(page)).toHaveAttribute('inert', '');
      await expect(home.screen(page)).toHaveAttribute('aria-hidden', 'true');
      await expect(home.cli(page)).toHaveAccessibleName(words['inside.l4.panel']);
    });

    test('plays a line at a time once in view, shows each question with its answers and picks one itself', async ({ page }) => {
      await openWithClock(page, route);
      await bringIntoView(page);
      const height = await home.cli(page).evaluate((el) => el.getBoundingClientRect().height);
      const counts = [];
      let sawQuestion = false;
      for (let i = 0; i < 80; i++) {
        await page.clock.runFor(1000);
        counts.push(await home.shown(page).count());
        if (await home.asking(page).count()) {
          sawQuestion = true;
          await expect(home.asking(page).locator('[aria-pressed="true"]').first()).toBeVisible();
        }
      }
      expect(Math.max(...counts), 'it brings lines').toBeGreaterThan(8);
      expect(sawQuestion, 'a question showed its answers').toBe(true);
      expect(await home.cli(page).evaluate((el) => el.getBoundingClientRect().height), 'the terminal keeps its height').toBeCloseTo(height, 0);
      await expect(home.screen(page)).toHaveAttribute('inert', '');
    });

    test('a click in the terminal does nothing: the visitor does not answer it', async ({ page }) => {
      await openWithClock(page, route);
      await bringIntoView(page);
      await page.clock.runFor(2000);
      const before = await home.shown(page).count();
      await home.screen(page).click({ position: { x: 8, y: 8 }, force: true });
      expect(await home.shown(page).count()).toBe(before);
    });

    test('starts over when the session ends, and answers differently the next time', async ({ page }) => {
      await openWithClock(page, route);
      await bringIntoView(page);
      const kinds = new Set();
      let previous = 0;
      let restarts = 0;
      for (let i = 0; i < 700 && (restarts < 1 || kinds.size < 2); i++) {
        await page.clock.runFor(2000);
        const count = await home.shown(page).count();
        if (count < previous) restarts++;
        previous = count;
        kinds.add(await home.cli(page).locator('[data-ask="kind"] [aria-pressed="true"]').getAttribute('data-value'));
      }
      expect(restarts, 'it started over').toBeGreaterThanOrEqual(1);
      expect(kinds.size, 'another answer in the next session').toBeGreaterThanOrEqual(2);
    });

    test('a button pauses it and plays it again, and a paused animation does not move', async ({ page }) => {
      await openWithClock(page, route);
      await bringIntoView(page);
      await expect(home.pause(page)).toBeVisible();
      await expect(home.pause(page)).toHaveAccessibleName(words['inside.l4.pause']);
      await page.clock.runFor(6000);
      await home.pause(page).click();
      await expect(home.pause(page)).toHaveAccessibleName(words['inside.l4.play']);
      const still = await home.shown(page).count();
      await page.clock.runFor(30_000);
      expect(await home.shown(page).count(), 'paused').toBe(still);
      await home.pause(page).click();
      await expect(home.pause(page)).toHaveAccessibleName(words['inside.l4.pause']);
      await page.clock.runFor(8000);
      expect(await home.shown(page).count(), 'playing again').toBeGreaterThan(still);
    });

    test('stops while it is out of view and goes on when it is back', async ({ page }) => {
      await openWithClock(page, route);
      await bringIntoView(page);
      await page.clock.runFor(6000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.clock.runFor(200);
      const away = await home.shown(page).count();
      await page.clock.runFor(30_000);
      expect(await home.shown(page).count(), 'out of view').toBe(away);
      await bringIntoView(page);
      await page.clock.runFor(8000);
      expect(await home.shown(page).count(), 'back in view').toBeGreaterThan(away);
    });
  });

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the fourth level (${scheme}), still, with reduced motion`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await open(page, route);
      await faded(page);
      const results = await new AxeBuilder({ page }).include('#ai').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }

  test(`${route}: axe finds nothing in the fourth level while the animation plays`, async ({ page }) => {
    await openWithClock(page, route);
    await bringIntoView(page);
    await page.clock.runFor(14_000);
    await faded(page);
    const results = await new AxeBuilder({ page }).include('#ai').analyze();
    expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
  });
}

/* ---- Reflow of the home (WCAG 1.4.10) ---------------------------------------- */

for (const [route, lang] of HOME.filter(([, lang]) => lang !== 'es')) {
  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} nothing of the fourth level leaves the viewport sideways`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
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

/* ======================= The page of the skill: the visitor answers ======================= */

for (const [route, lang] of SKILL) {
  const words = catalog(lang);

  test.describe(`${route} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test('the session of the default answers shows, still, with no button and no question to answer', async ({ page }) => {
      await open(page, route);
      expect(await skill.shown(page).count()).toBeGreaterThanOrEqual(25);
      await expect(skill.next(page)).toBeHidden();
      await expect(skill.cli(page).locator('.landing-cli__choices:visible')).toHaveCount(0);
      await expect(skill.cli(page)).toHaveAttribute('dir', 'ltr');
      await expect(skill.cli(page)).toHaveAccessibleName(words['inside.l4.panel']);
      await expect(skill.cli(page)).toContainText(words['inside.cli.ask']);
      await expect(skill.cli(page)).toContainText('npx @luz-ds/ai init --target claude');
      await expect(skill.cli(page)).toContainText('luz-start site new');
      await expect(skill.cli(page)).toContainText('index.html');
      expect(await skill.cli(page).innerText(), 'only the default answers').not.toContain('index.astro');
    });
  });

  test.describe(`${route} with JavaScript`, () => {
    test('Enter brings one line at a time, a click in the terminal too, and a question waits for its answer', async ({ page }) => {
      await open(page, route);
      await expect(skill.shown(page)).toHaveCount(1);
      await expect(skill.next(page)).toBeVisible();
      await expect(skill.next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.next']}`);
      await expect(skill.pause(page)).toHaveCount(0);
      const height = await skill.cli(page).evaluate((el) => el.getBoundingClientRect().height);

      await skill.next(page).focus();
      await page.keyboard.press('Enter');
      await expect(skill.shown(page)).toHaveCount(2);

      await skill.screen(page).click({ position: { x: 8, y: 8 } });
      await expect(skill.shown(page)).toHaveCount(3);
      await expect(skill.next(page)).toBeFocused();

      // On to the first question: its buttons come with it, in the place of Enter, the first one focused
      while (!(await skill.asking(page).count())) await page.keyboard.press('Enter');
      await expect(skill.asking(page)).toHaveAttribute('data-ask', 'kind');
      await expect(skill.next(page)).not.toBeVisible();
      await expect(skill.asking(page).locator('button').first()).toBeFocused();
      expect(await skill.cli(page).evaluate((el) => el.getBoundingClientRect().height), 'the terminal keeps its height').toBeCloseTo(height, 0);
    });

    test('the answers pick what follows: a blog in Astro, with the speed agent too, then Play again starts over', async ({ page }) => {
      await open(page, route);
      const height = await skill.cli(page).evaluate((el) => el.getBoundingClientRect().height);
      await playThrough(page, { kind: 'blog', stack: 'astro', agent: ['luz-core-web-vitals-optimizer'] });
      const screen = skill.screen(page);
      await expect(screen).toContainText('--kind blog --stack astro');
      await expect(screen).toContainText('src/pages/index.astro');
      await expect(screen).toContainText('--ext .astro');
      await expect(screen).toContainText('agent add luz-core-web-vitals-optimizer');
      await expect(screen).toContainText('agent add luz-seo-geo-specialist');
      const said = await screen.innerText();
      expect(said).not.toContain('skill add luz-create-landing');
      expect(said).not.toContain('--kind landing');
      await expect(skill.next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.replay']}`);
      expect(await skill.cli(page).evaluate((el) => el.getBoundingClientRect().height), 'the terminal keeps its height').toBeCloseTo(height, 0);

      await skill.next(page).click();
      await expect(skill.shown(page)).toHaveCount(1);
      await expect(skill.next(page)).toHaveAccessibleName(`Enter ${words['inside.l4.next']}`);
      await expect(skill.cli(page).locator('[data-ask="kind"] [aria-pressed="true"]')).toHaveAttribute('data-value', 'landing');
      await expect(skill.cli(page).locator('[data-ask="agent"] [aria-pressed="true"]')).toHaveCount(2);
    });

    test('the screen is a polite live region, so each new line is read out', async ({ page }) => {
      await open(page, route);
      await expect(skill.screen(page)).toHaveAttribute('aria-live', 'polite');
      await expect(skill.screen(page)).not.toHaveAttribute('inert', /.*/);
    });

    for (const scheme of /** @type {const} */ (['light', 'dark'])) {
      test(`axe finds nothing in the hero (${scheme}), with the whole session played`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await open(page, route);
        await playThrough(page);
        await faded(page);
        const results = await new AxeBuilder({ page }).include('#hero').analyze();
        expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
      });
    }
  });
}

/* ---- Reflow of the page of the skill (WCAG 1.4.10) --------------------------------- */

for (const [route, lang] of SKILL.filter(([, lang]) => lang !== 'es')) {
  for (const zoom of [100, 400]) {
    test(`${route}: at 320 px${zoom === 400 ? ' and 400 % text' : ''} nothing of the hero leaves the viewport sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      if (zoom === 400) await page.evaluate(() => { document.documentElement.style.fontSize = '400%'; });
      await playThrough(page);
      await page.locator('#hero').scrollIntoViewIfNeeded();
      await faded(page);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 'the page scrolls sideways').toBeLessThanOrEqual(0);
      const outside = await page.locator('#hero').locator('a, button, h1, h2, p, li, figure').evaluateAll((all) =>
        all
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.right > window.innerWidth + 0.5 || box.left < -0.5))
          .map(({ el, box }) => `${el.localName}.${el.className} spans ${Math.round(box.left)}-${Math.round(box.right)}`),
      );
      expect(outside, `${lang}: ${outside.join(' | ')}`).toEqual([]);
    });
  }
}
