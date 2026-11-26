// @ts-check
/**
 * The commands and sentences on the cards of /ai/ (› /luz add luz-agent-accessibility, $ npx @luz-ds/check) copy
 * themselves (owner, 2026-11-26): a click on one puts it on the clipboard, and a small copy icon shows at the far end
 * of the line (the right, the left in a right-to-left page) when the pointer is over it or the focus is on it. It is a
 * native button that the script makes of the code, so without JavaScript the line is the plain code it was.
 *
 *   - the button holds the code and an icon (aria-hidden); its name says copy, in the page's language, and the command;
 *   - a click copies the text of the code (not the sign) and says so in the polite live region; the icon turns into a tick;
 *   - the icon is hidden until hover or focus where there is a pointer, and always there on a touch screen;
 *   - at 320 px nothing leaves the viewport, and axe finds nothing in light and dark.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/ai/', '/es/ai/', '/ar/ai/'];
const COPY = { '/ai/': 'Copy', '/es/ai/': 'Copiar', '/ar/ai/': 'نسخ' };

test.describe('without JavaScript the lines stay plain code', () => {
  test.use({ javaScriptEnabled: false });
  for (const route of ROUTES) {
    test(`${route}: no button in a line of a card`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.landing-ai__ask code').first()).toBeVisible();
      await expect(page.locator('.landing-ai__ask button')).toHaveCount(0);
    });
  }
});

test.describe('with JavaScript every line copies itself', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  for (const route of ROUTES) {
    test(`${route}: each line is a button with its code, an icon that shows on hover, and a name that says copy`, async ({ page }) => {
      await page.goto(route);
      const lines = page.locator('.landing-ai__ask');
      const n = await lines.count();
      expect(n).toBeGreaterThanOrEqual(17);
      for (let i = 0; i < n; i++) {
        const line = lines.nth(i);
        const button = line.locator('button.landing-ai__copy');
        await expect(button, `line ${i}`).toHaveCount(1);
        await expect(button.locator('code')).toHaveCount(1);
        const text = (await button.locator('code').textContent()) ?? '';
        const name = (await button.getAttribute('aria-label')) ?? '';
        expect(name.startsWith(COPY[route]), name).toBe(true);
        expect(name.endsWith(text.trim()), name).toBe(true);
        await expect(button.locator('svg[aria-hidden="true"]').first()).toHaveCount(1);
      }
    });

    test(`${route}: the icon is hidden until hover or focus, then at the far end of the line`, async ({ page }) => {
      await page.goto(route);
      const line = page.locator('#a-agents .landing-ai__ask').first();
      await line.scrollIntoViewIfNeeded();
      const icon = line.locator('.landing-ai__copy-icon');
      await expect(icon).toHaveCSS('opacity', '0');
      await line.hover();
      await expect(icon).toHaveCSS('opacity', '1');
      const box = await line.boundingBox();
      const ib = await icon.boundingBox();
      expect(box && ib).toBeTruthy();
      if (box && ib) {
        const rtl = route === '/ar/ai/';
        const gap = rtl ? ib.x - box.x : box.x + box.width - (ib.x + ib.width);
        expect(gap, 'the icon is at the end of the line').toBeLessThanOrEqual(16);
        expect(gap).toBeGreaterThanOrEqual(0);
      }
      await page.mouse.move(0, 0);
      await expect(icon).toHaveCSS('opacity', '0');
      await line.locator('button').focus();
      await expect(icon).toHaveCSS('opacity', '1');
    });

    test(`${route}: a click copies the command without its sign, says so, and the icon turns into a tick`, async ({ page }) => {
      await page.goto(route);
      const line = page.locator('#a-agents .landing-ai__ask').first();
      await line.scrollIntoViewIfNeeded();
      const text = ((await line.locator('code').textContent()) ?? '').trim();
      expect(text).toBe('/luz add luz-agent-accessibility');
      await line.locator('button').click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
      await expect(page.locator('#luz-live-region')).not.toBeEmpty();
      await expect(line.locator('button')).toHaveClass(/is-copied/);
      await expect(line.locator('code')).toHaveText(text);
    });
  }

  test('on a touch screen the icon is always there', async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/ai/');
    const icon = page.locator('#a-agents .landing-ai__copy-icon').first();
    await icon.scrollIntoViewIfNeeded();
    await expect(icon).toHaveCSS('opacity', /^(0\.[5-9]|1)/);
    await ctx.close();
  });

  for (const route of ROUTES) {
    test(`${route} at 320 px: no line leaves the viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(route);
      const outside = await page.locator('.landing-ai__ask, .landing-ai__copy').evaluateAll((all) =>
        all.filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > window.innerWidth + 0.5 || b.left < -0.5); }).map((el) => el.className),
      );
      expect(outside).toEqual([]);
    });

    for (const scheme of /** @type {const} */ (['light', 'dark'])) {
      test(`${route}: axe finds nothing in the cards with their copy buttons (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(route);
        const results = await new AxeBuilder({ page }).include('#a-commands').include('#a-agents').include('#a-skill').analyze();
        expect(results.violations, results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join(' | ')).toEqual([]);
      });
    }
  }
});
