// @ts-check
/**
 * The tunnel behind the hero of the home (owner, 2026-11-26): thirteen frames of the logo's triangle that fly towards
 * the reader, a drawing with no meaning, in the CSS of apps/landing/landing.css (the script only pauses it off screen
 * and tilts it under a desktop pointer). What the browser must do with it, in the three languages:
 *
 *  - it renders: the hero shows its title and two buttons, the thirteen frames are drawn, and the tunnel is hidden from
 *    assistive technology and takes no pointer, so the buttons stay clickable;
 *  - it moves only when the reader allows it: with `prefers-reduced-motion: reduce` no frame animates and the thirteen
 *    stand still, each in its own place; with motion allowed one cycle is long (91 s) and it never stops by itself,
 *    which tests/accessibility-map's 2.2.2 row says out loud as a known issue (there is no pause control);
 *  - it never makes the page wider: no sideways scroll at 320 px, with the text at 400 %, and the hero keeps its height
 *    inside the window (the tunnel is clipped, `contain: strict`);
 *  - it leaves the room to the reader's colours: in high contrast it is gone, in forced colours its lines are CanvasText.
 *
 * It works with no script, so it runs in `chromium` and `chromium-nojs`.
 */
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/es/', '/ar/'];
const frames = (page) => page.locator('#hero .landing-tunnel__frame');

test.describe('the hero and its tunnel', () => {
  for (const route of ROUTES) {
    test(`${route}: the hero shows its title and two buttons over thirteen frames, hidden from assistive technology`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route);
      await expect(page.locator('#hero h1')).toBeVisible();
      await expect(page.locator('#hero .o-actions > a.luz-btn')).toHaveCount(2);
      await expect(page.locator('#hero .landing-tunnel__back')).toHaveAttribute('aria-hidden', 'true');
      await expect(frames(page)).toHaveCount(13);
      // Drawn: every frame has a box, and its triangle a visible line
      const drawn = await frames(page).evaluateAll((all) =>
        all.map((el) => {
          const svg = el.querySelector('svg');
          const polygon = el.querySelector('polygon');
          const style = svg ? getComputedStyle(svg) : null;
          return { width: el.getBoundingClientRect().width, stroke: style?.stroke ?? '', polygon: Boolean(polygon), nonScaling: polygon ? getComputedStyle(polygon).vectorEffect : '' };
        }),
      );
      for (const frame of drawn) {
        expect(frame.width).toBeGreaterThan(100);
        expect(frame.polygon).toBe(true);
        expect(frame.stroke).not.toBe('none');
        expect(frame.nonScaling, 'a line as fine at every depth').toBe('non-scaling-stroke');
      }
    });

    test(`${route}: the tunnel takes no pointer: the buttons are what is under their centre`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route);
      expect(await page.locator('#hero .landing-tunnel__back').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
      for (const index of [0, 1]) {
        const button = page.locator('#hero .o-actions > a.luz-btn').nth(index);
        const hit = await button.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return top === el || el.contains(top);
        });
        expect(hit, `button ${index + 1} is not covered`).toBe(true);
      }
    });

    test(`${route}: with motion allowed the frames fly in one slow loop, each a step behind the one before`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(route);
      const motion = await frames(page).evaluateAll((all) =>
        all.map((el) => {
          const style = getComputedStyle(el);
          return { name: style.animationName, duration: style.animationDuration, count: style.animationIterationCount, delay: style.animationDelay };
        }),
      );
      expect(motion.map((m) => m.name)).toEqual(Array(13).fill('landing-tunnel-fly'));
      expect(new Set(motion.map((m) => m.count))).toEqual(new Set(['infinite']));
      // One cycle is 91 s (13 frames, 7 s from one to the next), the same for all, and the delays are 13 different, negative ones
      expect(new Set(motion.map((m) => m.duration))).toEqual(new Set(['91s']));
      expect(new Set(motion.map((m) => m.delay)).size).toBe(13);
      for (const m of motion) expect(parseFloat(m.delay)).toBeLessThanOrEqual(0);
    });

    test(`${route}: with reduced motion no frame animates, and the thirteen stand still, each in its own place`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      const read = () => frames(page).evaluateAll((all) => all.map((el) => ({ name: getComputedStyle(el).animationName, transform: getComputedStyle(el).transform })));
      const before = await read();
      expect(before.map((f) => f.name)).toEqual(Array(13).fill('none'));
      expect(new Set(before.map((f) => f.transform)).size, 'thirteen places').toBe(13);
      await page.waitForTimeout(400);
      expect(await read(), 'nothing moved').toEqual(before);
    });

    test(`${route}: no sideways scroll at 320 px, nor at 400 % text, and the tunnel stays inside the hero`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      for (const size of ['100%', '400%']) {
        await page.evaluate((value) => { document.documentElement.style.fontSize = value; }, size);
        const { page: pageWidth, window: windowWidth, back, hero } = await page.evaluate(() => {
          const rect = (selector) => {
            const box = document.querySelector(selector).getBoundingClientRect();
            return { left: box.left, right: box.right };
          };
          return { page: document.documentElement.scrollWidth, window: document.documentElement.clientWidth, back: rect('#hero .landing-tunnel__back'), hero: rect('#hero') };
        });
        expect(pageWidth, `${size}: the page is ${pageWidth} px in a window of ${windowWidth} px`).toBeLessThanOrEqual(windowWidth);
        expect(back.left, `${size}: the tunnel starts inside the window`).toBeGreaterThanOrEqual(-0.5);
        expect(back.right, `${size}: the tunnel ends inside the window`).toBeLessThanOrEqual(windowWidth + 0.5);
        expect(hero.right - hero.left).toBeLessThanOrEqual(windowWidth + 0.5);
      }
    });

    test(`${route}: in high contrast the tunnel is not drawn`, async ({ page }) => {
      await page.goto(route);
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'high-contrast'));
      expect(await page.locator('#hero .landing-tunnel__back').evaluate((el) => getComputedStyle(el).display)).toBe('none');
      await expect(page.locator('#hero h1')).toBeVisible();
    });
  }

  // The floating colour-mode button (bottom end corner, 44 px, from the script) covers the end of a hero button on a short
  // phone: at 320 x 568 it sits at y 508 to 552 and the buttons stack from y 410 (English) to y 627 (Spanish), so the hero
  // cannot be made to clear it without a smaller title. On a short phone it waits for the first scroll instead: hidden (and
  // out of the tab order) at the top, where the buttons are, drawn once the reader has scrolled past them.
  for (const route of ROUTES) {
    test(`${route} at 320 x 568: at the top of the page the floating colour-mode button is not over a hero button, and it is drawn once the page is scrolled`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(route);
      const fixed = page.locator('.luz-theme-mode__button--fixed');
      const state = () => fixed.evaluate((el) => ({ visibility: getComputedStyle(el).visibility, opacity: Number(getComputedStyle(el).opacity), box: el.getBoundingClientRect().toJSON() }));
      const hits = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const buttons = await page.locator('#hero .o-actions > a.luz-btn').evaluateAll((all) => all.map((el) => el.getBoundingClientRect().toJSON()));
      if (await fixed.count()) {
        const top = await state();
        for (const [index, box] of buttons.entries()) {
          expect(top.visibility === 'hidden' || !hits(top.box, box), `hero button ${index + 1} is not covered by the floating button at the top`).toBe(true);
        }
        await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
        await expect.poll(async () => (await state()).visibility, 'drawn after the first screen').toBe('visible');
        await expect.poll(async () => (await state()).opacity).toBe(1);
      }
    });
  }

  test('/ at 390 x 844 and at 1280 x 800: the floating colour-mode button is drawn at the top, as before', async ({ page }) => {
    for (const [width, height] of [[390, 844], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      const fixed = page.locator('.luz-theme-mode__button--fixed');
      if (await fixed.count()) expect(await fixed.evaluate((el) => `${getComputedStyle(el).visibility} ${getComputedStyle(el).opacity}`), `${width} x ${height}`).toBe('visible 1');
    }
  });

  test('/: in forced colours the lines are the system text colour, not the brand', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    const { stroke, canvasText } = await page.locator('#hero .landing-tunnel__frame svg').first().evaluate((svg) => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const canvasText = getComputedStyle(probe).color;
      probe.remove();
      return { stroke: getComputedStyle(svg).stroke, canvasText };
    });
    expect(stroke).toBe(canvasText);
  });
});
