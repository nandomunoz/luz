// @ts-check
/**
 * The terminal of the luz skill (.claude/plans/luz-ai-skill.md, part A, and the owner on 2026-11-24), an
 * emulation of a real session, in two places:
 *
 * THE HOME (`#ai` of /, /es/ and /ar/) shows a person installing the skill (owner, 2026-11-25), once per assistant:
 *   - still (no script, or reduced motion), Claude Code's install shows whole: the command, what init prints, the
 *     assistant and the request; the other assistants' lines are hidden and there is nothing to pause;
 *   - with motion, it plays once in view, a line at a time, then the next assistant's install (Codex…), and a button
 *     pauses it (WCAG 2.2.2): paused, it does not move;
 *   - the command's copy button shows with JavaScript and copies it, and stays hidden without it;
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

/** The terminal of the page of the skill, in its hero. */
const where = (scope) => ({
  scope,
  cli: (page) => page.locator(`${scope} .landing-cli`),
  screen: (page) => page.locator(`${scope} .landing-cli__screen`),
  shown: (page) => page.locator(`${scope} .landing-cli__screen > :not([hidden])`),
  next: (page) => page.locator(`${scope} .landing-cli__next`),
  pause: (page) => page.locator(`${scope} .landing-cli__pause`),
  asking: (page) => page.locator(`${scope} .landing-cli__choices:not([hidden])`),
});
// The hero is four tabs (owner, 2026-11-25; tests/ai-page-tabs.spec.js): Claude's is the session played here
const skill = where('#hero-claude');

async function open(page, route) {
  await page.goto(route);
  await page.waitForLoadState('load');
}

/**
 * The page of the skill, its tab Use Claude open (with JavaScript Install opens first; without it every pane shows).
 * Opening the tab starts Autoplay (tests/ai-page-tabs.spec.js): it is paused here, so the visitor plays by hand.
 */
async function openSkill(page, route) {
  await open(page, route);
  const tab = page.locator('#hero a.luz-tab[href="#hero-claude"][role="tab"]');
  if (!(await tab.count())) return;
  await tab.click();
  const stop = page.locator('#hero-claude .landing-cli__auto [data-cli-stop]');
  if (await stop.isVisible()) await page.locator('#hero-claude .landing-cli__auto').click();
  await page.locator('#hero-claude .landing-cli__screen > :not([hidden])').first().waitFor();
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

/* ======================= The home: a person installing the skill ======================= */

for (const [route, lang] of HOME) {
  const words = catalog(lang);
  const term = (page) => page.locator('section#ai figure.landing-cli--install');
  const shown = (page) => term(page).locator('.landing-cli__line:not([hidden])');
  // The terminal is in the tab Use: with JavaScript the tab Install opens first
  const toUse = async (page, javaScriptEnabled) => {
    if (javaScriptEnabled) await page.locator('section#ai .landing-clitabs .luz-tab').nth(1).click();
  };

  test(`${route}: still (no script, or reduced motion), the terminal shows Claude Code's install whole, the other assistants' hidden, nothing to pause`, async ({ page, javaScriptEnabled }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, route);
    await toUse(page, javaScriptEnabled);
    await expect(term(page)).toHaveAccessibleName(words['inside.l4.install.title']);
    await expect(shown(page).first()).toHaveText('$ npx @luz-ds/ai init --target claude');
    await expect(shown(page).last()).toContainText(words['level.ai.steps.2.ask']);
    for (const line of await shown(page).all()) await expect(line).toBeVisible();
    await expect(term(page).locator('[data-when="target=codex"]:not([hidden])')).toHaveCount(0);
    await expect(term(page).locator('.landing-cli__pause')).toBeHidden();
    await expect(term(page).locator('figcaption .landing-cli__tested')).toHaveText(words['inside.l4.install.tested']);
  });

  test(`${route}: with motion, it plays once in view, a line at a time, then the next assistant's install, and a button pauses it`, async ({ page, javaScriptEnabled }) => {
    test.skip(!javaScriptEnabled, 'the loop needs JavaScript');
    await page.clock.install();
    await open(page, route);
    await toUse(page, javaScriptEnabled);
    await term(page).scrollIntoViewIfNeeded();
    await page.clock.runFor(200);
    // The pause button is in the foot, beside the note
    await expect(term(page).locator('figcaption .landing-cli__pause')).toBeVisible();
    await expect(shown(page)).toHaveCount(1);
    await expect(shown(page).first()).toHaveText('$ npx @luz-ds/ai init --target claude');
    // The whole round, the pause at its end, then the second round: Codex
    await page.clock.runFor(12_000);
    await expect(shown(page).first()).toHaveText('$ npx @luz-ds/ai init --target codex');
    // Paused, it does not move
    await term(page).locator('.landing-cli__pause').click();
    const before = await shown(page).count();
    await page.clock.runFor(10_000);
    await expect(shown(page)).toHaveCount(before);
  });

  test(`${route}: two tabs, Install and Use: Install has npm and the usual commands, Use the terminal; without JavaScript both show, one under the other`, async ({ page, javaScriptEnabled }) => {
    await open(page, route);
    const tabs = page.locator('section#ai .landing-clitabs .luz-tab');
    const install = page.locator('section#ai #ai-install');
    await expect(tabs).toHaveText([words['inside.tab.install'], words['inside.tab.use']]);
    await expect(install.locator('code#ai-npm')).toHaveText('npx @luz-ds/ai init');
    await expect(install.locator('code#ai-commands')).toContainText('luz-ai site new');
    await expect(install.locator('figure.landing-cli')).toHaveCount(0);
    if (!javaScriptEnabled) {
      await expect(install).toBeVisible();
      await expect(term(page)).toBeVisible();
      return;
    }
    await expect(install).toBeVisible();
    await expect(term(page)).toBeHidden();
    await toUse(page, javaScriptEnabled);
    await expect(term(page)).toBeVisible();
    await expect(install).toBeHidden();
  });

  test(`${route}: the command's copy button shows with JavaScript and copies it, and stays hidden without it`, async ({ page, context, javaScriptEnabled }) => {
    await open(page, route);
    await toUse(page, javaScriptEnabled);
    const copy = term(page).locator('.luz-copy-btn');
    await expect(copy).toHaveCount(1);
    if (!javaScriptEnabled) {
      await expect(copy).toBeHidden();
      return;
    }
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await expect(copy).toBeVisible();
    await expect(copy).toHaveAccessibleName(words['level.ai.copy.init']);
    await copy.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('npx @luz-ds/ai init --target claude');
  });

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the fourth level (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await open(page, route);
      await faded(page);
      const results = await new AxeBuilder({ page }).include('#ai').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
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
      await openSkill(page, route);
      expect(await skill.shown(page).count()).toBeGreaterThanOrEqual(25);
      await expect(skill.next(page)).toBeHidden();
      await expect(skill.cli(page).locator('.landing-cli__choices:visible')).toHaveCount(0);
      await expect(skill.cli(page)).toHaveAttribute('dir', 'ltr');
      await expect(skill.cli(page)).toHaveAccessibleName(words['inside.l4.panel']);
      await expect(skill.cli(page)).toContainText(words['inside.cli.ask']);
      await expect(skill.cli(page)).toContainText('npx @luz-ds/ai init --target claude');
      await expect(skill.cli(page)).toContainText('luz-ai site new');
      await expect(skill.cli(page)).toContainText('index.html');
      expect(await skill.cli(page).innerText(), 'only the default answers').not.toContain('index.astro');
    });
  });

  test.describe(`${route} with JavaScript`, () => {
    test('Enter brings one line at a time, a click in the terminal too, and a question waits for its answer', async ({ page }) => {
      await openSkill(page, route);
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
      await openSkill(page, route);
      const height = await skill.cli(page).evaluate((el) => el.getBoundingClientRect().height);
      await playThrough(page, { kind: 'blog', stack: 'astro', agent: ['luz-core-web-vitals-optimizer'] });
      const screen = skill.screen(page);
      await expect(screen).toContainText('--kind blog --stack astro');
      await expect(screen).toContainText('src/pages/index.astro');
      await expect(screen).toContainText('--ext .astro');
      await expect(screen).toContainText('agent add luz-core-web-vitals-optimizer');
      await expect(screen).toContainText('agent add luz-seo-geo-specialist');
      const said = await screen.innerText();
      expect(said).not.toContain('skill add luz-landing');
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
      await openSkill(page, route);
      await expect(skill.screen(page)).toHaveAttribute('aria-live', 'polite');
      await expect(skill.screen(page)).not.toHaveAttribute('inert', /.*/);
    });

    for (const scheme of /** @type {const} */ (['light', 'dark'])) {
      test(`axe finds nothing in the hero (${scheme}), with the whole session played`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await openSkill(page, route);
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
      await openSkill(page, route);
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
