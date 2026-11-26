// @ts-check
/**
 * Above the links of /ai/, a marquee the width of the window says what the skill is in short lines (owner, 2026-11-26: it
 * replaces the strip "Works in any AI harness"). Moving text has a way to stop it (WCAG 2.2.2):
 *
 *   - with JavaScript and no wish for less motion, the line moves: the list is doubled for a seamless loop (the copy is
 *     aria-hidden and inert), a pause button shows, and pressing it stops the line (aria-pressed); hover and focus pause it too;
 *   - with prefers-reduced-motion, or without JavaScript, nothing moves and the lines wrap, centred, and no pause button shows;
 *   - it spans the window from edge to edge and the page never scrolls sideways; axe finds nothing in light and dark.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];

for (const route of ROUTES) {
  test(`${route}: the marquee spans the window, and the page does not scroll sideways`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    const box = await page.locator('#a-assistants .landing-marquee').evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth };
    });
    expect(box.left).toBeLessThanOrEqual(0.5);
    expect(box.right).toBeGreaterThanOrEqual(box.width - 0.5);
    expect(box.scroll).toBeLessThanOrEqual(box.width);
    await expect(page.locator('#a-assistants h2')).toHaveCount(1);
    expect(await page.locator('#a-assistants .landing-marquee__list').first().locator('li').count()).toBeGreaterThanOrEqual(8);
  });

  test(`${route}: with JavaScript the line moves, doubled for the loop, and the pause button stops it`, async ({ page }, info) => {
    test.skip(info.project.name.endsWith('nojs'), 'needs JavaScript');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(route);
    const marquee = page.locator('#a-assistants .landing-marquee');
    const lists = marquee.locator('.landing-marquee__list');
    await expect(lists).toHaveCount(2);
    await expect(lists.nth(1)).toHaveAttribute('aria-hidden', 'true');
    expect(await lists.nth(1).evaluate((el) => el.inert)).toBe(true);
    const track = marquee.locator('.landing-marquee__track');
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
    const pause = marquee.locator('button.landing-marquee__pause');
    await expect(pause).toBeVisible();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    expect((await pause.getAttribute('aria-label'))?.length ?? 0).toBeGreaterThan(3);
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(0, 0);
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
  });

  test(`${route}: with less motion, or without JavaScript, nothing moves, the lines wrap and no pause button shows`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 800 });
    if (!info.project.name.endsWith('nojs')) await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    const marquee = page.locator('#a-assistants .landing-marquee');
    expect(await marquee.locator('.landing-marquee__track').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(marquee.locator('button.landing-marquee__pause')).toBeHidden();
    const outside = await marquee.locator('.landing-marquee__list:not([aria-hidden]) li').evaluateAll((all) =>
      all.filter((el) => { const b = el.getBoundingClientRect(); return b.right > window.innerWidth + 0.5 || b.left < -0.5; }).map((el) => el.textContent),
    );
    expect(outside).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  for (const scheme of /** @type {const} */ (['light', 'dark'])) {
    test(`${route}: axe finds nothing in the marquee (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).include('#a-assistants').analyze();
      expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
    });
  }
}
