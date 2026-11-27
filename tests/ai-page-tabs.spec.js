// @ts-check
/**
 * The hero of the page of the skill (/ai/, /es/ai/, /ar/ai/) is a panel of four tabs (owner, 2026-11-25):
 *
 *   - Install, Use Claude, Use Codex, Use Cursor, in that order; Install opens first. Install has npm (with its copy
 *     button) and the usual commands, as the home's; each Use is the session the visitor answers, for that assistant:
 *     its install (--target), the command that opens it, the skill called as it calls it, and its agents (Cursor has
 *     none, so its session asks nothing about them). Without JavaScript the four panes show, one under the other.
 *   - The panel does not turn by itself: a visitor answering a terminal is never moved off it.
 *   - The foot of each terminal, as the home's: Autoplay, which plays the session by itself (the pressed answers at
 *     each question) until it is pressed again (Pause), and Enter, Next line. Without JavaScript there is no foot.
 *     Opening a Use tab starts Autoplay, leaving it pauses it (with reduced motion only the button starts it).
 *     Autoplay never moves the focus.
 *
 * The sources are tests/home-cli.test.js.
 * Run with: pnpm exec playwright test tests/ai-page-tabs.spec.js --project=chromium --project=chromium-nojs
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const catalog = (lang) => JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url)), 'utf-8'));
const SKILL = [
  ['/ai/', 'en'],
  ['/es/ai/', 'es'],
  ['/ar/ai/', 'ar'],
];
const USES = [
  ['claude', 'claude', '/luz', '--for claude'],
  ['codex', 'codex', '$luz', '--for codex'],
  ['cursor', 'cursor-agent', '/luz', null],
];

for (const [route, lang] of SKILL) {
  const words = catalog(lang);
  const panel = (page) => page.locator('#hero .landing-clitabs');
  const pane = (page, id) => page.locator(`#hero-${id}`);

  test(`${route}: four tabs, Install, Use Claude, Use Codex and Use Cursor; Install has npm and the commands that install, list, add and remove`, async ({ page, javaScriptEnabled }) => {
    await page.goto(route);
    const tabs = panel(page).locator('.luz-tabs .luz-tab');
    await expect(tabs).toHaveText([words['inside.tab.install'], words['level.ai.tab.claude'], words['level.ai.tab.codex'], words['level.ai.tab.cursor']]);
    expect(await tabs.evaluateAll((all) => all.map((a) => a.getAttribute('href')))).toEqual(['#hero-install', '#hero-claude', '#hero-codex', '#hero-cursor']);
    await expect(pane(page, 'install').locator('pre code').first()).toHaveText('npx @luz-ds/ai init');
    // the second block is the install commands: everything for one assistant, then list, add and remove one agent
    await expect(pane(page, 'install').locator('pre code').nth(1)).toHaveText([
      'npx @luz-ds/ai init --target claude --all',
      'npx @luz-ds/ai list',
      'npx @luz-ds/ai add luz-agent-ux',
      'npx @luz-ds/ai remove luz-agent-ux',
    ].join('\n'));
    await expect(pane(page, 'install').locator('.luz-copy-btn')).toHaveCount(1);
    if (javaScriptEnabled) {
      await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
      for (const id of ['claude', 'codex', 'cursor']) await expect(pane(page, id)).toBeHidden();
    } else {
      for (const id of ['install', 'claude', 'codex', 'cursor']) await expect(pane(page, id)).toBeVisible();
    }
  });

  for (const [id, open, trigger, agents] of USES) {
    test(`${route}: Use ${id} is the session for it: --target ${id}, ${open}, ${trigger}${agents ? `, ${agents}` : ', no agents'}`, async ({ page }) => {
      await page.goto(route);
      const cli = pane(page, id).locator('figure.landing-cli[data-landing-cli=""]');
      await expect(cli).toHaveCount(1);
      const said = await cli.locator('.landing-cli__screen').evaluate((el) => el.textContent);
      expect(said).toContain(`npx @luz-ds/ai init --target ${id}`);
      expect(said).toContain(`$ ${open}`);
      expect(said).toContain(words['inside.cli.ask'].replace('/luz', trigger));
      if (agents) {
        expect(said).toContain(`add luz-agent-accessibility ${agents}`);
        await expect(cli.locator('[data-ask="agent"]')).toHaveCount(1);
      } else {
        expect(said).not.toContain('agent add');
        await expect(cli.locator('[data-ask="agent"]')).toHaveCount(0);
        expect(said).toContain(words['inside.cli.adapt.page']);
      }
    });
  }

  test(`${route}: the foot of a terminal has Autoplay and Enter with JavaScript, and is hidden without it`, async ({ page, javaScriptEnabled }) => {
    await page.goto(route);
    const foot = pane(page, 'claude').locator('.landing-cli__foot');
    if (!javaScriptEnabled) {
      await expect(foot).toBeHidden();
      return;
    }
    await panel(page).locator('.luz-tab').nth(1).click();
    await expect(foot).toBeVisible();
    // Opening the tab started it: the button says Pause, and Autoplay once pressed
    await expect(foot.locator('.landing-cli__auto')).toHaveAccessibleName(words['inside.l4.pause']);
    await foot.locator('.landing-cli__auto').click();
    await expect(foot.locator('.landing-cli__auto')).toHaveAccessibleName(words['inside.l4.autoplay']);
    await expect(foot.locator('.landing-cli__next')).toHaveAccessibleName(`Enter ${words['inside.l4.next']}`);
  });
}

test.describe('/ai/ with JavaScript', () => {
  test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'the tabs and the terminal are scripts');

  test('the panel does not turn by itself', async ({ page }) => {
    await page.goto('/ai/');
    await page.locator('#hero .landing-clitabs').scrollIntoViewIfNeeded();
    await page.waitForTimeout(4500);
    await expect(page.locator('#hero .landing-clitabs')).not.toHaveAttribute('data-cycle', /.*/);
    await expect(page.locator('#hero .luz-tab').first()).toHaveAttribute('aria-selected', 'true');
  });

  test('opening a Use tab plays its session by itself, past its questions, with the focus left on the tab; leaving it pauses it', async ({ page }) => {
    await page.goto('/ai/');
    const tabs = page.locator('#hero .luz-tab');
    const codex = page.locator('#hero-codex figure.landing-cli');
    const shown = codex.locator('.landing-cli__screen > .landing-cli__line:not([hidden])');
    const auto = codex.locator('.landing-cli__auto');
    await tabs.nth(2).click();
    await expect(auto).toHaveAccessibleName(catalog('en')['inside.l4.pause']);
    // Past the first question (the kind of site) with no hand on it
    await expect.poll(() => shown.count(), { timeout: 20000 }).toBeGreaterThan(10);
    await expect(tabs.nth(2)).toBeFocused();
    // Another tab: this one pauses where it was, the other plays
    await tabs.nth(3).click();
    // Its pane is closed now, so no accessible name: the label that shows tells
    await expect(auto.locator('[data-cli-stop]')).toHaveAttribute('hidden', '');
    await expect(page.locator('#hero-cursor .landing-cli__auto')).toHaveAccessibleName(catalog('en')['inside.l4.pause']);
    const count = await shown.count();
    await tabs.nth(2).click();
    await auto.click();
    await expect(auto).toHaveAccessibleName(catalog('en')['inside.l4.autoplay']);
    await page.waitForTimeout(2500);
    await expect(shown).toHaveCount(count);
  });

  test('with reduced motion, opening a Use tab starts nothing; Autoplay still plays it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/ai/');
    await page.locator('#hero .luz-tab').nth(1).click();
    const cli = page.locator('#hero-claude figure.landing-cli');
    const shown = cli.locator('.landing-cli__screen > .landing-cli__line:not([hidden])');
    await expect(cli.locator('.landing-cli__auto')).toHaveAccessibleName(catalog('en')['inside.l4.autoplay']);
    await page.waitForTimeout(2000);
    await expect(shown).toHaveCount(1);
    await cli.locator('.landing-cli__auto').click();
    await expect.poll(() => shown.count(), { timeout: 10000 }).toBeGreaterThan(1);
  });
});
