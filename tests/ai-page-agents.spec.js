// @ts-check
/**
 * The agents of /ai/ (owner, 2026-11-26, from the prototype): one sentence per agent, the name first.
 *
 *   - On a phone, and without JavaScript, they are a list: each item shows its icon, its name, what it does to your files
 *     and its own sentence to copy; nothing changes out of view.
 *   - On a wide screen with JavaScript, the same list becomes five tiles to pick from (a radio group: click, arrows), under
 *     a stage that shows the sentence of the one picked, large, what it does to your files and its text.
 *   - axe finds nothing in light and dark, at both widths.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

for (const route of ROUTES) {
  test(`${route}: on a short phone the agents are a list, each with its own sentence in view, and no stage`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 640 });
    await page.goto(route);
    const items = page.locator('#a-agents li.landing-ai-agent');
    await expect(items).toHaveCount(5);
    for (const item of await items.all()) {
      await expect(item.locator('.landing-ai-agent__title')).toBeVisible();
      await expect(item.locator('.landing-ai-agent__kind')).toBeVisible();
      await expect(item.locator('.landing-ai__ask')).toBeVisible();
      await expect(item).not.toHaveAttribute('role', 'radio');
    }
    await expect(page.locator('#a-agents .landing-ai-agents__stage')).toBeHidden();
  });

  test(`${route}: on a wide screen the list is five tiles in a row under a stage; picking one changes the stage`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    const items = page.locator('#a-agents li.landing-ai-agent');
    if (info.project.name.endsWith('nojs')) {
      // Without JavaScript the list stays a list, every sentence in view
      for (const item of await items.all()) await expect(item.locator('.landing-ai__ask')).toBeVisible();
      return;
    }
    const stage = page.locator('#a-agents .landing-ai-agents__stage');
    await expect(stage).toBeVisible();
    await expect(page.locator('#a-agents .landing-ai-agents__list')).toHaveAttribute('role', 'radiogroup');
    const tops = await items.evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row').toBe(1);
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
    for (const item of await items.all()) await expect(item.locator('.landing-ai__ask')).toBeHidden();
    const sentence = stage.locator('.landing-ai__ask code');
    await expect(sentence).toContainText('luz-agent-accessibility');
    // Picking the third shows its sentence and its text
    await items.nth(2).click();
    await expect(items.nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'false');
    const name = await items.nth(2).getAttribute('data-agent');
    await expect(sentence).toContainText(name ?? '');
    const text = await items.nth(2).locator('.landing-ai-agent__text').textContent();
    await expect(stage.locator('.landing-ai-agents__text')).toHaveText(text ?? '');
    await expect(stage.locator('.landing-ai-agent__kind')).toBeVisible();
    // The arrows move the choice, as in any radio group (the other way in a right-to-left page)
    await items.nth(2).focus();
    await page.keyboard.press(route === '/ar/ai/' ? 'ArrowLeft' : 'ArrowRight');
    await expect(items.nth(3)).toHaveAttribute('aria-checked', 'true');
    await expect(items.nth(3)).toBeFocused();
    // A click on the stage's sentence copies all of it
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await stage.locator('.landing-ai__ask button').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.startsWith(`${await items.nth(3).getAttribute('data-agent')} `)).toBe(true);
  });

  for (const [width, scheme] of /** @type {const} */ ([[1280, 'light'], [1280, 'dark'], [375, 'light'], [375, 'dark']])) {
    test(`${route} at ${width} px: axe finds nothing in the agents (${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).include('#a-agents').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
