// @ts-check
/**
 * The docs sidebar with the HTML elements as a group inside Catalog, measured in a browser.
 * The owner's decision (2026-11-25): the HTML elements keep their area, their routes and their index, but the sidebar lists
 * them inside the fold of Catalog, as a labelled group at its end (`nestIn` in site.json). The markup, the marks and the
 * breadcrumb are held by tests/docs-nav-nested.test.js and tests/docs-nav-fold.test.js; this file holds what needs a layout,
 * a keyboard or a window:
 *
 *   1  the group is visible on /docs/html/forms/ and /es/docs/html/forms/, after the other groups of Catalog, with its
 *      index and its pages indented like theirs, and the current page is marked by more than colour
 *   2  the sidebar scrolls to the current page (JavaScript)
 *   3  Tab walks the group: its index, its pages, then Accessibility (the folds are tests/docs-nav-fold.spec.js)
 *   4  nothing sticks out of the window at 320 px, at 100 % and at 400 % text
 *   5  the drawer at 375 px lists the group, closes with Escape and on a link
 *   6  axe: no serious or critical violation in light, dark and high contrast on /docs/html/forms/ and /docs/catalog/
 *
 * The no-JS projects run 1, 3, 4 and 5 (the drawer is a native popover); 2 and 6 need a script.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readingOrder } from '../scripts/docs-site/site.js';
import { site } from './helpers/docs-site.js';
import { readingOrder as walkTheTabOrder } from './helpers/reading-order.js';
import { idle } from './helpers/settle.js';
import { seedMode } from './helpers/site-lights.js';

const HTML_INDEX = '/docs/html/';
const CATALOG_INDEX = '/docs/catalog/';
const FORMS = '/docs/html/forms/';
const order = readingOrder(site).map((p) => p.route);
const areaOf = (/** @type {string} */ route) => site.byRoute.get(route)?.meta.area;
/** The links of the group: the index of the area, then its pages, in reading order. */
const listed = order.filter((r) => areaOf(r) === 'html');
const label = (/** @type {string} */ code) => (code ? JSON.parse(readFileSync(fileURLToPath(new URL(`../apps/docs/i18n/${code}/strings.json`, import.meta.url)), 'utf-8'))['area.html'] : 'HTML elements');
/** The group of the HTML elements in the sidebar, and its links. */
const groupOf = (/** @type {import('@playwright/test').Page} */ page, scope = 'nav.luz-docs-nav') => page.locator(`${scope} li.docs-nav__group:has(#nav-html)`);

const LANGUAGES = [
  { code: '', prefix: '' },
  { code: 'es', prefix: '/es' },
];

test.describe('HTML elements on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { code, prefix } of LANGUAGES) {
    const where = code || 'en';

    test(`${where}: the HTML elements are a group at the end of the fold of Catalog, indented like its other groups`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const nav = page.locator('nav.luz-docs-nav');
      await expect(nav.locator(`a.docs-nav__area[href="${prefix}${HTML_INDEX}"]`)).toHaveCount(0);
      const group = groupOf(page);
      await expect(group.locator('#nav-html')).toBeVisible();
      await expect(group.locator('#nav-html')).toHaveText(label(code));
      const links = group.locator('a');
      await expect(links).toHaveCount(listed.length);
      await expect(links.first()).toBeVisible();
      await expect(links.last()).toBeVisible();
      // It is inside the fold of Catalog, after the group of the reference pages
      const inCatalog = nav.locator('li:has(> a.docs-nav__area[href$="/docs/catalog/"]) li.docs-nav__group');
      expect(await inCatalog.last().locator('#nav-html').count(), 'the last group of Catalog is the HTML elements').toBe(1);
      // Geometry: its links are indented under its label, as the pages of the other groups are
      const box = async (/** @type {import('@playwright/test').Locator} */ l) => l.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left + parseFloat(getComputedStyle(el).paddingInlineStart), top: r.top }; });
      const [label0, first] = [await box(group.locator('#nav-html')), await box(links.first())];
      expect(first.top, 'its links are below its label').toBeGreaterThan(label0.top);
      expect(first.left, 'its links are indented under its label').toBeGreaterThanOrEqual(label0.left);
    });

    test(`${where}: the current page is marked by more than colour, and so is Catalog, which holds it`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const nav = page.locator('nav.luz-docs-nav');
      await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}${FORMS}`);
      await expect(page.locator('.docs-nav a[aria-current="true"]')).toHaveCount(1);
      await expect(nav.locator(`a.docs-nav__area[href="${prefix}${CATALOG_INDEX}"]`)).toHaveAttribute('aria-current', 'true');
      const style = (/** @type {string} */ sel) => page.locator(sel).first().evaluate((el) => { const s = getComputedStyle(el); return `${s.fontWeight} ${s.borderInlineStartColor} ${s.borderInlineStartWidth}`; });
      expect(await style('.docs-nav a[aria-current="page"]')).not.toBe(await style(`.docs-nav a[href="${prefix}/docs/html/text/"]`));
    });

    test(`${where}: Tab walks the group, its index and its pages, then Accessibility`, async ({ page }) => {
      // At 1024 px, below the three-column layout: from 80rem "On this page" is a column on the right, before main in the markup, by design
      await page.setViewportSize({ width: 1024, height: 800 });
      await page.goto(`${prefix}${FORMS}`);
      const group = groupOf(page);
      await group.locator('a').first().focus();
      const walked = [await page.evaluate(() => document.activeElement?.getAttribute('href'))];
      for (let i = 1; i < listed.length; i++) {
        await page.keyboard.press('Tab');
        walked.push(await page.evaluate(() => document.activeElement?.getAttribute('href')));
      }
      expect(walked, 'the index and the pages of the HTML elements, in the order the sidebar lists them').toEqual(listed.map((r) => `${prefix}${r}`));
      await page.keyboard.press('Tab');
      await expect(page.locator(`nav.luz-docs-nav a.docs-nav__area[href="${prefix}/docs/accessibility/"]`)).toBeFocused();
      // The order of the markup is the order of the screen (WCAG 2.4.3, 1.3.2)
      const walk = await walkTheTabOrder(page);
      expect(walk.problems).toEqual([]);
    });
  }

  test('the sidebar scrolls to the current page, the last of the HTML elements list', async ({ page, javaScriptEnabled }) => {
    test.skip(javaScriptEnabled === false, 'the sidebar is scrolled by a script');
    const route = listed.at(-1);
    await page.goto(route);
    await idle(page);
    const visible = () =>
      page.evaluate(() => {
        const nav = document.querySelector('#page-nav');
        const current = nav?.querySelector('a[aria-current="page"]');
        if (!nav || !current) return { inside: false, label: 'no current link' };
        const n = nav.getBoundingClientRect();
        const c = current.getBoundingClientRect();
        const top = Math.max(n.top, 0);
        const bottom = Math.min(n.bottom, window.innerHeight);
        return { inside: c.top >= top - 1 && c.bottom <= bottom + 1, label: current.textContent?.trim() };
      });
    await expect.poll(visible, { message: 'the current link is inside the sidebar\'s visible box' }).toMatchObject({ inside: true });
    expect(await page.evaluate(() => window.scrollY), 'the page itself did not scroll').toBe(0);
    expect(await page.evaluate(() => document.activeElement === document.body), 'the focus did not move').toBe(true);
  });
});

test.describe('nothing sticks out of the window at 320 px', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const { code, prefix } of LANGUAGES) {
    for (const scale of ['100%', '200%', '400%']) {
      test(`${code || 'en'}: the open drawer with the HTML elements group, root font size ${scale}`, async ({ page }) => {
        await page.goto(`${prefix}${FORMS}`);
        await page.waitForLoadState('load');
        await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
        await page.locator('.site-header__menu').click();
        const drawer = page.locator('#page-nav');
        await expect(drawer).toBeVisible();
        await expect(groupOf(page, '#page-nav')).toHaveCount(1);
        const out = await page.evaluate(() => {
          const nav = document.querySelector('#page-nav');
          if (!nav) return { sideways: -1, outside: ['no #page-nav'], clipped: [], page: 0 };
          const width = document.documentElement.clientWidth;
          const links = [...(nav.querySelector('#nav-html')?.parentElement?.querySelectorAll('a') ?? [])];
          const box = (a) => ({ text: a.textContent?.trim().slice(0, 30), r: a.getBoundingClientRect() });
          return {
            sideways: nav.scrollWidth - nav.clientWidth,
            // the links of the group stay inside the window...
            outside: links.map(box).filter(({ r }) => r.width > 0 && (r.right > width + 0.5 || r.left < -0.5)).map(({ text, r }) => `${text}: ${Math.round(r.left)}..${Math.round(r.right)}`),
            // ...and their text stays inside the link (it wraps, even a long word, instead of running on)
            clipped: links.filter((a) => a.scrollWidth > a.clientWidth + 1).map((a) => `${a.textContent?.trim().slice(0, 30)}: ${a.scrollWidth} > ${a.clientWidth}`),
            page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        expect(out.outside, 'links of the group outside the window').toEqual([]);
        expect(out.clipped, 'links of the group whose text runs past the link').toEqual([]);
        // The areas and pages above already run wide at 200 % and 400 % text (a word such as
        // "Documentation" is wider than the drawer): the whole drawer and the page are held at the size where they fit today
        if (scale === '100%') {
          expect(out.sideways, 'the drawer scrolls sideways by px').toBeLessThanOrEqual(0);
          expect(out.page, 'the page scrolls sideways by px').toBeLessThanOrEqual(0);
        }
      });
    }
  }
});

test.describe('the drawer at 375 px', () => {
  test.use({ viewport: { width: 375, height: 700 } });

  for (const { code, prefix } of LANGUAGES) {
    test(`${code || 'en'}: lists the HTML elements group, Escape closes it, its index closes it and goes there`, async ({ page }) => {
      await page.goto(`${prefix}${FORMS}`);
      const toggle = page.locator('.site-header__menu');
      const drawer = page.locator('#page-nav');
      await expect(drawer).toBeHidden();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(drawer).toBeVisible();
      const group = groupOf(page, '#page-nav');
      await expect(group).toHaveCount(1);
      await group.scrollIntoViewIfNeeded();
      await expect(group.locator('#nav-html')).toHaveText(label(code));
      await expect(group.locator('a')).toHaveCount(listed.length);
      await expect(drawer.locator('a[aria-current="page"]')).toHaveAttribute('href', `${prefix}${FORMS}`);
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(toggle).toBeFocused();

      await toggle.click();
      const index = group.locator(`a[href="${prefix}${HTML_INDEX}"]`);
      await index.scrollIntoViewIfNeeded();
      await index.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}${HTML_INDEX}$`));
      await expect(drawer).toBeHidden();
    });
  }
});

test.describe('axe: the pages around the HTML elements group', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the mode is chosen by a script');
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const mode of ['light', 'dark', 'high-contrast']) {
    for (const route of [FORMS, CATALOG_INDEX]) {
      test(`${route} in ${mode}: no serious or critical violation`, async ({ page }) => {
        await seedMode(page, mode);
        await page.goto(route);
        await idle(page);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(mode);
        await expect(groupOf(page)).toHaveCount(1);
        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const blocking = violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
        expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(' ')}`)).toEqual([]);
      });
    }
  }
});
