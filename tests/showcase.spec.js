// @ts-check
/**
 * `<luz-showcase>` of @luz-ds/catalog (`components/showcase.css`, a CSS-only tag): a row of links, each a logo and a name.
 * `luz-showcase > ul > li > a[href] > (svg[aria-hidden="true"] | img[alt=""]) + span`: the span is the name of the link.
 *
 *   a row that wraps, centred, still: nothing moves, nothing fades, nothing is clipped. The motion is `<luz-marquee>`
 *   (tests/marquee.spec.js), which holds a showcase twice; the showcase knows nothing of it
 *
 * tests/fixtures/showcase.html: tokens, core and `showcase.css`, no script. Everything is CSS, so it runs in `chromium` and in
 * `chromium-nojs` (playwright.config.js: `'**\/showcase.spec.js'` in the `testMatch` of `chromium-nojs`). Axe and the
 * check that no script defines the tag need script and are skipped there. The sources are tests/showcase.test.js.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/showcase.html';
const EM = 1.5;
/** Sub-pixel rounding of a box. */
const EPS = 1;

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ width?: number, mode?: string }} [options]
 */
async function open(page, { width = 1280, mode = 'light' } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(FIXTURE);
  await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
  // The colours fade when the mode changes: measure them after (the wait runs a script, so not without JavaScript)
  if (test.info().project.use.javaScriptEnabled !== false) await settled(page);
}

/**
 * What a token is in the page now, in its computed form: a colour as `rgb(…)`, a length in px, a time in s. A probe element
 * takes the token as the value of the property, so the test types no value.
 * @param {import('@playwright/test').Page} page
 * @param {string} property
 * @param {string} token
 */
const token = (page, property, token) => page.evaluate(([p, t]) => {
  const probe = document.createElement('div');
  probe.style.setProperty(p, `var(${t})`);
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(p);
  probe.remove();
  return value;
}, [property, token]);

const style = (locator, ...props) => locator.evaluate((el, names) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n)]));
}, props);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right, top: r.top }; });
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const NAMES = ['Marea Bikes', 'Bodega Sur', 'Faro Press', 'Olivar Studio', 'Salinas Co-op'];

test.describe('showcase: the markup', () => {
  test('every row is one ul > li > a[href] > a decorative svg or an img with an empty alt, then a span', async ({ page }) => {
    await open(page);
    const rows = await page.locator('luz-showcase').evaluateAll((hosts) => hosts.map((host) => ({
      id: host.id,
      lists: [...host.children].map((ul) => ({
        tag: ul.localName,
        hidden: ul.getAttribute('aria-hidden'),
        items: [...ul.children].map((li) => ({
          tag: li.localName,
          display: getComputedStyle(li).display,
          links: li.querySelectorAll(':scope > a[href]').length,
          parts: [...(li.querySelector(':scope > a')?.children ?? [])].map((c) => c.localName),
          decorative: [...li.querySelectorAll(':scope > a > svg, :scope > a > img')].map((m) => (m.localName === 'svg' ? m.getAttribute('aria-hidden') : m.getAttribute('alt'))),
        })),
      })),
    })));
    expect(rows.map((r) => r.id)).toEqual(['still', 'still-rtl']);
    for (const row of rows) {
      expect(row.lists.map((l) => l.tag), `#${row.id}: the list, once: the showcase has no copy of it`).toEqual(['ul']);
      expect(row.lists.map((l) => l.hidden), `#${row.id}: nothing is aria-hidden`).toEqual([null]);
      for (const list of row.lists) {
        expect(list.items.length, `#${row.id}`).toBeGreaterThan(0);
        for (const item of list.items) {
          expect(item.tag).toBe('li');
          expect(item.display, `#${row.id}: an li is never display: contents`).not.toBe('contents');
          expect(item.links, `#${row.id}: one link in each li`).toBe(1);
          expect(item.parts.slice(-1), `#${row.id}: the name is last`).toEqual(['span']);
          expect(item.parts.length, `#${row.id}: a logo, then the name`).toBe(2);
          expect(['true', ''], `#${row.id}: the logo is decorative`).toContain(item.decorative[0]);
        }
      }
    }
  });

  test('no class: the tag is the block, and nothing in it is styled by a class', async ({ page }) => {
    await open(page);
    expect(await page.locator('luz-showcase [class]').count()).toBe(0);
    expect(await page.locator('luz-showcase[class]').count()).toBe(0);
  });

  test('the name of each link is its span: the svg and the empty-alt img add nothing', async ({ page }) => {
    await open(page);
    const links = page.locator('#still > ul:first-child a');
    expect(await links.count()).toBe(NAMES.length);
    for (const [i, name] of NAMES.entries()) await expect(links.nth(i)).toHaveAccessibleName(name);
  });
});

test.describe('showcase: the still row', () => {
  test('the tag is a block, the list a flex row that wraps and is centred, with no bullets and no indent', async ({ page }) => {
    await open(page);
    expect((await style(page.locator('#still'), 'display')).display).toBe('block');
    const look = await style(page.locator('#still > ul:first-child'), 'display', 'flex-wrap', 'justify-content', 'list-style-type', 'padding-inline-start', 'margin-block-start');
    expect(look).toEqual({ display: 'flex', 'flex-wrap': 'wrap', 'justify-content': 'center', 'list-style-type': 'none', 'padding-inline-start': '0px', 'margin-block-start': '0px' });
  });

  test('nothing moves in any mode of motion: no animation, no fade, the page is not clipped', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    const look = await style(page.locator('#still'), 'overflow-x', 'mask-image');
    expect(look['overflow-x']).toBe('visible');
    expect(look['mask-image']).toBe('none');
  });

  test('a `scroll` attribute does nothing: the row is still, with no band, no fade and no motion (the marquee is <luz-marquee>)', async ({ page }) => {
    await open(page);
    await page.locator('#still').evaluate((el) => el.setAttribute('scroll', ''));
    const host = await style(page.locator('#still'), 'display', 'overflow-x', 'mask-image');
    expect(host).toEqual({ display: 'block', 'overflow-x': 'visible', 'mask-image': 'none' });
    const list = await style(page.locator('#still > ul'), 'flex-wrap', 'justify-content', 'animation-name');
    expect(list).toEqual({ 'flex-wrap': 'wrap', 'justify-content': 'center', 'animation-name': 'none' });
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test('wide, the links are in one row: every link on the same line', async ({ page }) => {
    await open(page, { width: 1280 });
    const tops = await page.locator('#still > ul:first-child a').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    // A margin of the page's rhythm on an li of the row (core spaces `li + li` of a list with no class) would push all but the first lower
    expect(Math.max(...tops) - Math.min(...tops), 'one row, every link on the same line').toBeLessThanOrEqual(EPS);
  });

  test('wide, the links are centred in the tag: the same room on both sides', async ({ page }) => {
    await open(page, { width: 1280 });
    const host = await box(page.locator('#still'));
    const boxes = await page.locator('#still > ul:first-child a').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
    const before = Math.min(...boxes.map((b) => b.left)) - host.left;
    const after = host.right - Math.max(...boxes.map((b) => b.right));
    expect(before).toBeGreaterThan(0);
    expect(Math.abs(before - after), 'the same room on both sides').toBeLessThanOrEqual(EPS);
  });

  test('narrow, the row wraps onto more rows and nothing scrolls sideways, whatever the direction', async ({ page }) => {
    await open(page, { width: 320 });
    const rows = (await page.locator('#still > ul:first-child li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).filter((t, i, all) => all.indexOf(t) === i);
    expect(rows.length).toBeGreaterThan(1);
    for (const dir of ['ltr', 'rtl']) {
      for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
        expect(await sideways(page), `${dir} ${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });
});

test.describe('showcase: the links', () => {
  test('every link is inline-flex, at least --luz-control-md tall, with its logo and name side by side', async ({ page }) => {
    await open(page);
    const min = parseFloat(await token(page, 'width', '--luz-control-md'));
    expect(min).toBeGreaterThan(0);
    for (const link of await page.locator('#still > ul:first-child a').all()) {
      expect((await style(link, 'display')).display).toBe('inline-flex');
      expect((await box(link)).height).toBeGreaterThanOrEqual(min - EPS);
      const logo = await box(link.locator('svg, img'));
      const name = await box(link.locator('span'));
      expect(Math.abs((logo.top + logo.height / 2) - (name.top + name.height / 2)), 'centred on one line').toBeLessThanOrEqual(EPS * 2);
      expect(logo.right).toBeLessThanOrEqual(name.left + EPS);
    }
  });

  test('the logo is 1.5em square, an svg or an img, whatever the font size', async ({ page }) => {
    await open(page);
    for (const link of [page.locator('#still a').nth(0), page.locator('#still a').nth(1)]) {
      const font = parseFloat((await style(link, 'font-size'))['font-size']);
      const logo = await box(link.locator('svg, img'));
      expect(logo.width).toBeCloseTo(EM * font, 0);
      expect(logo.height).toBeCloseTo(EM * font, 0);
    }
    const before = (await box(page.locator('#still svg').first())).width;
    await page.locator('#still a').first().evaluate((el) => { el.style.fontSize = 'calc(var(--luz-text-xl) * 2)'; });
    expect((await box(page.locator('#still svg').first())).width).toBeGreaterThan(before * 1.5);
  });

  test('the name is the size of --luz-text-xl', async ({ page }) => {
    await open(page);
    expect((await style(page.locator('#still a').first(), 'font-size'))['font-size']).toBe(await token(page, 'font-size', '--luz-text-xl'));
  });

  for (const mode of MODES) {
    test(`${mode}: --luz-text-secondary at rest, --luz-text-primary on hover and on keyboard focus`, async ({ page }) => {
      await open(page, { mode });
      const link = page.locator('#still > ul:first-child a').first();
      const secondary = await token(page, 'color', '--luz-text-secondary');
      const primary = await token(page, 'color', '--luz-text-primary');
      expect(secondary).not.toBe(primary);
      await expect.poll(async () => (await style(link, 'color')).color, 'rest colour').toBe(secondary);
      expect((await style(link, 'text-decoration-line'))['text-decoration-line'], 'not underlined').toBe('none');
      await link.hover();
      await expect.poll(async () => (await style(link, 'color')).color, 'hover colour').toBe(primary);
      await page.mouse.move(0, 0);
      await expect.poll(async () => (await style(link, 'color')).color, 'rest again').toBe(secondary);
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      await expect.poll(async () => (await style(link, 'color')).color, 'focus colour').toBe(primary);
    });
  }
});

test.describe('showcase: right to left', () => {
  test('a row in a right-to-left page is still centred and wraps, and nothing scrolls sideways', async ({ page }) => {
    await open(page);
    expect((await style(page.locator('#still-rtl'), 'direction')).direction).toBe('rtl');
    const look = await style(page.locator('#still-rtl > ul'), 'display', 'flex-wrap', 'justify-content', 'animation-name');
    expect(look).toEqual({ display: 'flex', 'flex-wrap': 'wrap', 'justify-content': 'center', 'animation-name': 'none' });
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await sideways(page), `${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('the first link is at the right: the list reads from the right', async ({ page }) => {
    await open(page);
    const links = await page.locator('#still-rtl a').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
    expect(links[0]).toBeGreaterThan(links[links.length - 1]);
  });
});

test.describe('showcase: keyboard and reading', () => {
  test('Tab meets each link once, in the order of the source, then the link after the rows', async ({ page }) => {
    await open(page);
    const total = await page.evaluate(() => {
      const links = [...document.querySelectorAll('luz-showcase a')];
      links.forEach((a, i) => a.setAttribute('data-n', String(i)));
      return links.length;
    });
    expect(total).toBe(NAMES.length + 3);
    const visited = [];
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => Number(document.activeElement?.getAttribute('data-n') ?? -1)));
    }
    expect(visited).toEqual([...Array(total).keys()]);
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('a reader meets each link once, by its name: the svg and the empty-alt img add nothing', async ({ page }) => {
    await open(page);
    await expect(page.locator('#still').getByRole('link')).toHaveCount(NAMES.length);
    await expect(page.locator('#still').getByRole('link', { name: 'Bodega Sur' })).toHaveAccessibleName('Bodega Sur');
    await expect(page.locator('#still-rtl').getByRole('link')).toHaveCount(3);
  });

  test('the focus ring is core\'s, and a link that takes the focus shows it', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Tab');
    const link = page.locator('#still a').first();
    await expect(link).toBeFocused();
    const ring = await style(link, 'outline-style', 'outline-width', 'outline-color');
    expect(ring['outline-style']).toBe('solid');
    expect(ring['outline-width']).toBe('2px');
    expect(ring['outline-color']).toBe(await token(page, 'color', '--luz-focus-ring'));
  });
});

test.describe('showcase: no script defines the tag', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('after the loader of the catalog has scanned the page, customElements.get() still answers undefined', async ({ page }) => {
    await open(page);
    const state = await page.evaluate(async () => {
      await import('/packages/catalog/dist/catalog.min.js');
      await new Promise((resolve) => globalThis.requestIdleCallback(() => resolve(undefined), { timeout: 2000 }));
      return [...document.querySelectorAll('luz-showcase')].map((el) => ({ definition: customElements.get(el.localName), defined: el.matches(':defined') }));
    });
    expect(state).toEqual(Array(2).fill({ definition: undefined, defined: false }));
  });
});

test.describe('showcase: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious on the fixture in ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, { mode });
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});
