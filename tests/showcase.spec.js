// @ts-check
/**
 * `<luz-showcase>` of @luz-ds/catalog (`components/showcase.css`, a CSS-only tag): a row of links, each a logo and a name.
 * `luz-showcase > ul > li > a[href] > (svg[aria-hidden="true"] | img[alt=""]) + span`: the span is the name of the link.
 *
 *   still      a row that wraps, centred; a second `ul[aria-hidden="true"]` is not shown
 *   scroll     a marquee: the list is written twice, both lists move (`luz-showcase-run`, `luz-showcase-run-rtl` in a
 *              right-to-left page) for `--luz-showcase-duration`, stopped while the pointer is over the tag or a link in it
 *              has the focus. The copy's links are `tabindex="-1"` (Tab meets each link once, a reader reads each once) and
 *              the copy is not inert (a pointer can click either)
 *   reduced motion, paper   the still row again, one list, no animation
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
/** The factor of the default duration, `calc(var(--luz-duration-lazy) * 50)` (showcase.css header). */
const LAZY_TIMES = 50;

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

/** The CSS animations on each list of a row: name, state, duration (ms) and the last keyframe's translate. */
const animations = (page, id) => page.evaluate((i) => [...document.querySelectorAll(`#${i} > ul`)].map((ul) => ul.getAnimations().map((a) => {
  const frames = a.effect?.getKeyframes() ?? [];
  return {
    name: /** @type {CSSAnimation} */ (a).animationName,
    state: a.playState,
    duration: Number(a.effect?.getTiming().duration),
    to: String(frames[frames.length - 1]?.translate ?? ''),
  };
})), id);

/** The first link of the first list of a row: the one a reader meets first. */
const first = (page, id) => page.locator(`#${id} > ul:first-child a`).first();
const copyOf = (page, id) => page.locator(`#${id} > ul[aria-hidden="true"]`);

const NAMES = ['Marea Bikes', 'Bodega Sur', 'Faro Press', 'Olivar Studio', 'Salinas Co-op'];

test.describe('showcase: the markup', () => {
  test('every list is ul > li > a[href] > a decorative svg or an img with an empty alt, then a span', async ({ page }) => {
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
    expect(rows.map((r) => r.id)).toEqual(['still', 'marquee', 'marquee-rtl']);
    for (const row of rows) {
      expect(row.lists.map((l) => l.tag), `#${row.id}: the list, written twice`).toEqual(['ul', 'ul']);
      expect(row.lists.map((l) => l.hidden), `#${row.id}: only the copy is aria-hidden`).toEqual([null, 'true']);
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

  test('nothing moves: no animation, no fade, the page is not clipped', async ({ page }) => {
    await open(page);
    expect(await animations(page, 'still')).toEqual([[], []]);
    const look = await style(page.locator('#still'), 'overflow-x', 'mask-image');
    expect(look['overflow-x']).toBe('visible');
    expect(look['mask-image']).toBe('none');
  });

  test('the copy is not shown without `scroll`: display none, no box, no link to visit', async ({ page }) => {
    await open(page);
    expect((await style(copyOf(page, 'still'), 'display')).display).toBe('none');
    expect((await box(copyOf(page, 'still'))).height).toBe(0);
    for (const link of await copyOf(page, 'still').locator('a').all()) await expect(link).toBeHidden();
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

test.describe('showcase: scroll, the marquee', () => {
  test('the tag is a band that hides what overflows, with a fade at both ends', async ({ page }) => {
    await open(page);
    const look = await style(page.locator('#marquee'), 'display', 'overflow-x', 'overflow-y', 'mask-image');
    expect(look.display).toBe('flex');
    expect(look['overflow-x']).toBe('hidden');
    expect(look['overflow-y']).toBe('hidden');
    expect(look['mask-image']).toContain('linear-gradient');
    const host = await box(page.locator('#marquee'));
    expect(host.width, 'the band is as wide as the page').toBeGreaterThan(1200);
    expect(await sideways(page), 'the lists past the edge do not widen the page').toBeLessThanOrEqual(0);
  });

  test('the copy is shown, and the two lists do not wrap: one row each, side by side', async ({ page }) => {
    await open(page);
    expect((await style(copyOf(page, 'marquee'), 'display')).display).toBe('flex');
    const [one, two] = await page.locator('#marquee > ul').evaluateAll((els) => els.map((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { wrap: cs.flexWrap, tops: [...el.querySelectorAll('a')].map((a) => a.getBoundingClientRect().top), left: r.left, right: r.right, width: r.width }; }));
    for (const list of [one, two]) {
      expect(list.wrap).toBe('nowrap');
      expect(Math.max(...list.tops) - Math.min(...list.tops), 'one row, every link on the same line').toBeLessThanOrEqual(EPS);
    }
    // Each list is wider than the band, so that the copy can follow it with no gap
    expect(one.width).toBeGreaterThan(1280);
    expect(Math.abs(two.left - one.right), 'the copy starts where the list ends').toBeLessThanOrEqual(EPS);
  });

  test('both lists move, for --luz-showcase-duration: by default --luz-duration-lazy times 50, to -100% of their own width', async ({ page }) => {
    await open(page);
    const lazy = parseFloat(await token(page, 'transition-duration', '--luz-duration-lazy')) * 1000;
    expect(lazy).toBeGreaterThan(0);
    const found = await animations(page, 'marquee');
    expect(found.map((list) => list.length)).toEqual([1, 1]);
    for (const [animation] of found) {
      expect(animation.name).toBe('luz-showcase-run');
      expect(animation.state).toBe('running');
      expect(animation.duration).toBeCloseTo(lazy * LAZY_TIMES, 0);
      expect(animation.to).toMatch(/^-100%/);
    }
  });

  test('--luz-showcase-duration on the tag sets how long a loop takes', async ({ page }) => {
    await open(page);
    await page.locator('#marquee').evaluate((el) => el.style.setProperty('--luz-showcase-duration', '12s'));
    for (const [animation] of await animations(page, 'marquee')) expect(animation.duration).toBe(12000);
    await page.locator('#marquee').evaluate((el) => el.style.removeProperty('--luz-showcase-duration'));
    // The other row is untouched by the one that was changed
    expect((await animations(page, 'marquee-rtl'))[0][0].duration).toBeGreaterThan(12000);
  });

  test('the first link moves to the left, and so does the copy, at the same pace', async ({ page }) => {
    await open(page);
    const link = first(page, 'marquee');
    const copy = copyOf(page, 'marquee').locator('a').first();
    const start = { link: (await box(link)).left, copy: (await box(copy)).left };
    await expect.poll(async () => (await box(link)).left, 'the first link moves left').toBeLessThan(start.link - 1);
    const now = { link: (await box(link)).left, copy: (await box(copy)).left };
    expect(Math.abs((now.link - start.link) - (now.copy - start.copy)), 'the copy keeps its place after the list').toBeLessThanOrEqual(EPS);
  });

  test('it stops while the pointer is over it, and runs again when the pointer leaves', async ({ page }) => {
    await open(page);
    await page.locator('#marquee').hover();
    await expect.poll(async () => (await animations(page, 'marquee')).map(([a]) => a.state)).toEqual(['paused', 'paused']);
    const stopped = (await box(first(page, 'marquee'))).left;
    await page.waitForTimeout(250);
    expect((await box(first(page, 'marquee'))).left, 'it does not move while paused').toBe(stopped);
    await page.mouse.move(0, 0);
    await expect.poll(async () => (await animations(page, 'marquee')).map(([a]) => a.state)).toEqual(['running', 'running']);
  });

  test('it stops while a link in it has the focus, and runs again when the focus leaves', async ({ page }) => {
    await open(page);
    await first(page, 'marquee').focus();
    await expect.poll(async () => (await animations(page, 'marquee')).map(([a]) => a.state)).toEqual(['paused', 'paused']);
    // Only that row stops
    expect((await animations(page, 'marquee-rtl')).map(([a]) => a.state)).toEqual(['running', 'running']);
    await first(page, 'marquee').blur();
    await expect.poll(async () => (await animations(page, 'marquee')).map(([a]) => a.state)).toEqual(['running', 'running']);
  });

  test('a pointer can click a link of the copy: it is not inert and it is a link to a pointer', async ({ page }) => {
    await open(page);
    const info = await copyOf(page, 'marquee').evaluate((ul) => ({
      inert: ul.inert || ul.closest('[inert]') !== null,
      pointerEvents: getComputedStyle(ul.querySelector('a')).pointerEvents,
      cursor: getComputedStyle(ul.querySelector('a')).cursor,
      visibility: getComputedStyle(ul.querySelector('a')).visibility,
    }));
    expect(info).toEqual({ inert: false, pointerEvents: 'auto', cursor: 'pointer', visibility: 'visible' });
    // Stop the loop with the copy's first link in the band, then click it where it is
    await page.evaluate(() => {
      const host = document.querySelector('#marquee');
      const width = host.querySelector(':scope > ul').getBoundingClientRect().width;
      for (const ul of host.querySelectorAll(':scope > ul')) {
        const [a] = ul.getAnimations();
        a.pause();
        a.currentTime = Number(a.effect?.getTiming().duration) * (1 - 400 / width);
      }
    });
    const link = copyOf(page, 'marquee').locator('a').first();
    expect((await box(link)).left, 'the copy is in the band').toBeLessThan(1280);
    await link.click({ trial: true });
    expect(new URL(page.url()).hash).toBe('');
    await link.click();
    expect(new URL(page.url()).hash, 'the click followed the link of the copy').toBe('#marquee-0');
  });
});

test.describe('showcase: right to left', () => {
  test('a row in a right-to-left page runs the other way: luz-showcase-run-rtl, to +100%, and the first link moves right', async ({ page }) => {
    await open(page);
    for (const [animation] of await animations(page, 'marquee-rtl')) {
      expect(animation.name).toBe('luz-showcase-run-rtl');
      expect(animation.to).toMatch(/^100%/);
      expect(animation.to).not.toMatch(/^-/);
    }
    // The list is written first, so it starts at the right, and the copy follows at its left
    const link = first(page, 'marquee-rtl');
    const copy = copyOf(page, 'marquee-rtl').locator('a').first();
    expect((await box(link)).left).toBeGreaterThan((await box(copy)).left);
    const start = (await box(link)).left;
    await expect.poll(async () => (await box(link)).left, 'the first link moves right').toBeGreaterThan(start + 1);
  });

  test('the direction is the page\'s too: dir="rtl" on html turns the left-to-right row around', async ({ page }) => {
    await open(page);
    expect((await animations(page, 'marquee'))[0][0].name).toBe('luz-showcase-run');
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    for (const [animation] of await animations(page, 'marquee')) {
      expect(animation.name).toBe('luz-showcase-run-rtl');
      expect(animation.to).toMatch(/^100%/);
    }
    // And back: a row that says dir="ltr" runs left whatever the page says
    await page.locator('#marquee-rtl').evaluate((el) => { el.dir = 'ltr'; });
    expect((await animations(page, 'marquee-rtl'))[0][0].name).toBe('luz-showcase-run');
  });

  test('the fade and the pause work the same: a band that clips, stopped on hover', async ({ page }) => {
    await open(page);
    expect((await style(page.locator('#marquee-rtl'), 'overflow-x'))['overflow-x']).toBe('hidden');
    await page.locator('#marquee-rtl').hover();
    await expect.poll(async () => (await animations(page, 'marquee-rtl')).map(([a]) => a.state)).toEqual(['paused', 'paused']);
  });
});

for (const [name, emulate] of /** @type {const} */ ([
  ['reduced motion', { reducedMotion: 'reduce' }],
  ['paper', { media: 'print' }],
])) {
  test.describe(`showcase: ${name}`, () => {
    test('the marquee is the still row again: no animation, one list, centred, wrapped, no fade', async ({ page }) => {
      await open(page);
      await page.emulateMedia(emulate);
      for (const id of ['marquee', 'marquee-rtl']) {
        expect(await animations(page, id), `#${id}: nothing moves`).toEqual([[], []]);
        const host = await style(page.locator(`#${id}`), 'display', 'mask-image', 'overflow-x');
        expect(host.display, `#${id}`).toBe('block');
        expect(host['mask-image'], `#${id}: no fade`).toBe('none');
        const list = await style(page.locator(`#${id} > ul:first-child`), 'animation-name', 'flex-wrap', 'justify-content');
        expect(list, `#${id}`).toEqual({ 'animation-name': 'none', 'flex-wrap': 'wrap', 'justify-content': 'center' });
        expect((await style(copyOf(page, id), 'display')).display, `#${id}: the copy is not shown`).toBe('none');
        expect((await box(copyOf(page, id))).height).toBe(0);
      }
    });

    test('every link is shown once, in one band the width of the page, and the first link does not move', async ({ page }) => {
      await open(page);
      await page.emulateMedia(emulate);
      const links = page.locator('#marquee a:visible');
      expect(await links.count(), 'each link once').toBe(8);
      const host = await box(page.locator('#marquee'));
      for (const b of await links.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }))) {
        expect(b.left).toBeGreaterThanOrEqual(host.left - EPS);
        expect(b.right).toBeLessThanOrEqual(host.right + EPS);
      }
      const start = (await box(first(page, 'marquee'))).left;
      await page.waitForTimeout(250);
      expect((await box(first(page, 'marquee'))).left).toBe(start);
    });
  });
}

test.describe('showcase: keyboard and reading', () => {
  test('Tab meets each link once, in the order of the source, and never a link of a copy', async ({ page }) => {
    await open(page);
    const primary = await page.evaluate(() => {
      const links = [...document.querySelectorAll('luz-showcase > ul:not([aria-hidden]) a')];
      links.forEach((a, i) => a.setAttribute('data-n', String(i)));
      return links.length;
    });
    expect(primary).toBe(21);
    const visited = [];
    for (let i = 0; i < primary; i++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => {
        const el = document.activeElement;
        return { n: Number(el?.getAttribute('data-n') ?? -1), inCopy: !!el?.closest('ul[aria-hidden="true"]') };
      }));
    }
    expect(visited.map((v) => v.n)).toEqual([...Array(primary).keys()]);
    expect(visited.some((v) => v.inCopy)).toBe(false);
    // The next stop is the link after the rows: no link of a copy is in between
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('the links of a copy are out of the tab order but are links: tabindex -1, and the focus can still be sent to them', async ({ page }) => {
    await open(page);
    for (const id of ['marquee', 'marquee-rtl']) {
      const tabindexes = await copyOf(page, id).locator('a').evaluateAll((els) => els.map((el) => /** @type {HTMLElement} */ (el).tabIndex));
      expect(tabindexes.length, id).toBe(8);
      expect(new Set(tabindexes), id).toEqual(new Set([-1]));
    }
  });

  test('a reader meets each link once: the copy is out of the accessibility tree, the list is read once', async ({ page }) => {
    await open(page);
    const links = page.locator('#marquee').getByRole('link');
    await expect(links).toHaveCount(8);
    await expect(page.locator('#marquee').getByRole('link', { name: 'Bodega Sur' })).toHaveCount(1);
    // The logo of an img with an empty alt, and an svg that is aria-hidden, add nothing to the name
    await expect(page.locator('#marquee').getByRole('link', { name: 'Bodega Sur' })).toHaveAccessibleName('Bodega Sur');
    await expect(page.locator('#marquee').getByRole('link', { name: 'Marea Bikes' })).toHaveAccessibleName('Marea Bikes');
    // And the still row, with a copy that is not shown, reads once as well
    await expect(page.locator('#still').getByRole('link')).toHaveCount(NAMES.length);
  });

  test('the focus ring is core\'s, and a link that takes the focus in the marquee shows it', async ({ page }) => {
    await open(page);
    await first(page, 'still').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const link = first(page, 'still');
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
    expect(state).toEqual(Array(3).fill({ definition: undefined, defined: false }));
  });
});

test.describe('showcase: axe', () => {
  for (const mode of MODES) {
    test(`axe finds nothing serious on the fixture in ${mode}, the marquee moving`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'chromium-nojs', 'axe needs JavaScript');
      await open(page, { mode });
      await settled(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
    });
  }
});
