// @ts-check
/**
 * `<luz-marquee>` of @luz-ds/catalog (`components/marquee.css`, a CSS-only tag): content that loops along one line,
 * between two hairlines, fading at both ends. The content is written twice as the two children of the tag; the second has
 * `aria-hidden="true"` and its links `tabindex="-1"`, and is never inert.
 *
 *   ul of phrases   a nowrap row, each phrase followed by a decorative star (`content: "\2726" / ""`: no text alternative)
 *   any child       a flex row that does not shrink and moves by its own width (`luz-marquee-run`, `luz-marquee-run-rtl` in a
 *                   right-to-left page) for `--luz-marquee-duration`; a `ul` inside it, a showcase's, never wraps
 *   hover, focus    the motion stops while the pointer is over the tag or something in it has the focus
 *   reduced motion, paper   the first copy alone: block, no fade, no animation, wrapped and centred, the copy not shown
 *
 * tests/fixtures/marquee.html: tokens, core, `showcase.css` and `marquee.css`, no script. Everything is CSS, so it runs in
 * `chromium` and in `chromium-nojs` (playwright.config.js: `'**\/marquee.spec.js'` in the `testMatch` of `chromium-nojs`).
 * Axe and the check that no script defines the tag need script and are skipped there. The sources are tests/marquee.test.js.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { MODES } from './helpers/design-tokens.js';
import { settled } from './helpers/settle.js';

const FIXTURE = '/tests/fixtures/marquee.html';
/** Sub-pixel rounding of a box. */
const EPS = 1;
/** The factor of the default duration, `calc(var(--luz-duration-lazy) * 50)` (marquee.css). */
const LAZY_TIMES = 50;
const STAR = '✦';

const PHRASES = ['Zero dependencies', 'Native first', 'Accessible, always', 'Works without JavaScript', 'Tokens, not values', 'One stylesheet each', 'Tested, without overdoing it', 'Made to be read'];
const NAMES = ['Marea Bikes', 'Bodega Sur', 'Faro Press', 'Olivar Studio', 'Salinas Co-op', 'Atlas Notes', 'Tinta Cooperativa', 'Norte Labs'];
const ROWS = ['ticker', 'logos', 'logos-rtl'];

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

/** The CSS animations on each child of a row: name, state, duration (ms) and the last keyframe's translate. */
const animations = (page, id) => page.evaluate((i) => [...document.querySelectorAll(`#${i} > *`)].map((child) => child.getAnimations().map((a) => {
  const frames = a.effect?.getKeyframes() ?? [];
  return {
    name: /** @type {CSSAnimation} */ (a).animationName,
    state: a.playState,
    duration: Number(a.effect?.getTiming().duration),
    to: String(frames[frames.length - 1]?.translate ?? ''),
  };
})), id);
const states = async (page, id) => (await animations(page, id)).map(([a]) => a?.state ?? 'no animation');

/** The first link of the first copy of a row: the one a reader meets first. */
/**
 * The left edge of two moving elements, read in one script call: the two boxes are of the same frame, so the distance between
 * them is what the layout says. Two calls read them some milliseconds apart, and a row that moves at ~100 px/s skews them by px.
 * @param {import('@playwright/test').Locator} a
 * @param {import('@playwright/test').Locator} b
 */
async function lefts(a, b) {
  return a.evaluate((el, other) => ({ a: el.getBoundingClientRect().left, b: other.getBoundingClientRect().left }), await b.elementHandle());
}
const first = (page, id) => page.locator(`#${id} > :first-child a`).first();
const copyOf = (page, id) => page.locator(`#${id} > [aria-hidden="true"]`);

test.describe('marquee: the markup', () => {
  test('every row is the content written twice: two children, only the second aria-hidden, never inert', async ({ page }) => {
    await open(page);
    const rows = await page.locator('luz-marquee').evaluateAll((hosts) => hosts.map((host) => ({
      id: host.id,
      children: [...host.children].map((c) => ({ tag: c.localName, hidden: c.getAttribute('aria-hidden'), inert: /** @type {HTMLElement} */ (c).inert, text: (c.textContent ?? '').replace(/\s+/g, ' ').trim() })),
    })));
    expect(rows.map((r) => r.id)).toEqual(ROWS);
    for (const row of rows) {
      expect(row.children.length, `#${row.id}: two children`).toBe(2);
      expect(row.children.map((c) => c.hidden), `#${row.id}: only the copy is aria-hidden`).toEqual([null, 'true']);
      expect(row.children.map((c) => c.inert), `#${row.id}: a pointer can click the copy`).toEqual([false, false]);
      expect(row.children[1].text, `#${row.id}: the copy says what the first says`).toBe(row.children[0].text);
    }
  });

  test('the links of the copy are tabindex -1 and the links of the first are not', async ({ page }) => {
    await open(page);
    for (const id of ['logos', 'logos-rtl']) {
      expect(await page.locator(`#${id} > :first-child a`).evaluateAll((els) => els.map((el) => el.getAttribute('tabindex'))), id).toEqual(Array(8).fill(null));
      expect(await copyOf(page, id).locator('a').evaluateAll((els) => els.map((el) => el.getAttribute('tabindex'))), id).toEqual(Array(8).fill('-1'));
    }
  });

  test('no class: the tag is the block, and nothing in it is styled by a class', async ({ page }) => {
    await open(page);
    expect(await page.locator('luz-marquee [class]').count()).toBe(0);
    expect(await page.locator('luz-marquee[class]').count()).toBe(0);
  });
});

test.describe('marquee: the band', () => {
  test('the tag is a flex band the width of the page, hiding what overflows, with a fade at both ends, and the page does not widen', async ({ page }) => {
    await open(page);
    for (const id of ROWS) {
      const look = await style(page.locator(`#${id}`), 'display', 'overflow-x', 'overflow-y', 'mask-image');
      expect(look.display, id).toBe('flex');
      expect(look['overflow-x'], id).toBe('hidden');
      expect(look['overflow-y'], id).toBe('hidden');
      expect(look['mask-image'], id).toContain('linear-gradient');
      expect((await box(page.locator(`#${id}`))).width, `#${id}: as wide as the page`).toBeGreaterThan(1200);
    }
    expect(await sideways(page), 'what is past the edge does not widen the page').toBeLessThanOrEqual(0);
  });

  for (const mode of MODES) {
    test(`${mode}: a hairline of --luz-divider above and below, and nothing at the sides`, async ({ page }) => {
      await open(page, { mode });
      const divider = await token(page, 'border-top-color', '--luz-divider');
      for (const id of ROWS) {
        const look = await style(page.locator(`#${id}`), 'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width', 'border-top-style', 'border-top-color', 'border-bottom-color');
        expect(look, id).toEqual({ 'border-top-width': '1px', 'border-bottom-width': '1px', 'border-left-width': '0px', 'border-right-width': '0px', 'border-top-style': 'solid', 'border-top-color': divider, 'border-bottom-color': divider });
      }
    });
  }

  test('a child is a flex row that does not shrink, and each is wider than the band, so that the copy can follow it with no gap', async ({ page }) => {
    await open(page);
    for (const id of ROWS) {
      const kids = await page.locator(`#${id} > *`).evaluateAll((els) => els.map((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { display: cs.display, grow: cs.flexGrow, shrink: cs.flexShrink, left: r.left, right: r.right, width: r.width }; }));
      expect(kids.length, id).toBe(2);
      for (const kid of kids) {
        // The marquee's rule is after the showcase's in the cascade: a showcase that is a child is a flex row, not a block
        expect(kid.display, `#${id}`).toBe('flex');
        expect([kid.grow, kid.shrink], `#${id}`).toEqual(['0', '0']);
        expect(kid.width, `#${id}: wider than the band`).toBeGreaterThan(1280);
      }
      const [one, two] = kids;
      // Both move by the same amount, so the copy touches the first where it ends: at its right, or at its left in a right-to-left row
      const gap = id === 'logos-rtl' ? one.left - two.right : two.left - one.right;
      expect(Math.abs(gap), `#${id}: the copy follows the first with no gap`).toBeLessThanOrEqual(EPS);
    }
  });

  test('the width of what a child holds never makes it wrap: a showcase inside is one row of links, nowrap, from the start', async ({ page }) => {
    await open(page);
    for (const id of ['logos', 'logos-rtl']) {
      for (const list of await page.locator(`#${id} ul`).all()) {
        const look = await style(list, 'display', 'flex-wrap', 'justify-content', 'list-style-type', 'padding-inline-start', 'margin-block-start');
        expect(look, id).toEqual({ display: 'flex', 'flex-wrap': 'nowrap', 'justify-content': 'flex-start', 'list-style-type': 'none', 'padding-inline-start': '0px', 'margin-block-start': '0px' });
        const tops = await list.locator('a').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
        expect(tops.length).toBe(NAMES.length);
        expect(Math.max(...tops) - Math.min(...tops), `#${id}: one row`).toBeLessThanOrEqual(EPS);
      }
    }
  });
});

test.describe('marquee: a ul of phrases', () => {
  test('each phrase is on one line in --luz-text-primary at --luz-text-lg, and the list is one row that does not wrap', async ({ page }) => {
    await open(page);
    const primary = await token(page, 'color', '--luz-text-primary');
    const size = await token(page, 'font-size', '--luz-text-lg');
    const list = await style(page.locator('#ticker > ul').first(), 'display', 'flex-wrap', 'list-style-type', 'justify-content');
    expect(list).toEqual({ display: 'flex', 'flex-wrap': 'nowrap', 'list-style-type': 'none', 'justify-content': 'flex-start' });
    const items = page.locator('#ticker > ul:first-child > li');
    expect(await items.count()).toBe(PHRASES.length);
    for (const li of await items.all()) {
      const look = await style(li, 'color', 'font-size', 'white-space', 'margin-block-start');
      expect(look).toEqual({ color: primary, 'font-size': size, 'white-space': 'nowrap', 'margin-block-start': '0px' });
    }
    const tops = await items.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops), 'one row').toBeLessThanOrEqual(EPS);
  });

  for (const mode of MODES) {
    test(`${mode}: a star in --luz-brand-primary, at --luz-text-sm, follows each phrase`, async ({ page }) => {
      await open(page, { mode });
      const brand = await token(page, 'color', '--luz-brand-primary');
      const size = await token(page, 'font-size', '--luz-text-sm');
      for (const li of await page.locator('#ticker > ul > li').all()) {
        const star = await li.evaluate((el) => { const cs = getComputedStyle(el, '::after'); return { content: cs.content, color: cs.color, size: cs.fontSize, display: cs.display }; });
        expect(star.content).toContain(STAR);
        expect(star.color).toBe(brand);
        expect(star.size).toBe(size);
        expect(star.display).not.toBe('none');
      }
    });
  }

  test('the star has no text alternative: the accessibility tree has each phrase once, and no star', async ({ page }) => {
    await open(page);
    // The star is drawn…
    expect(await page.locator('#ticker > ul:first-child > li').first().evaluate((el) => getComputedStyle(el, '::after').content)).toContain(STAR);
    // …and not in the tree: the copy is aria-hidden, so every phrase is read once, as the text of its item
    const tree = await page.locator('#ticker').ariaSnapshot();
    expect(tree).not.toContain(STAR);
    for (const phrase of PHRASES) expect(tree.split(phrase).length - 1, phrase).toBe(1);
    await expect(page.locator('#ticker').getByRole('listitem')).toHaveCount(PHRASES.length);
    for (const [i, phrase] of PHRASES.entries()) await expect(page.locator('#ticker').getByRole('listitem').nth(i)).toHaveText(phrase);
  });
});

test.describe('marquee: it moves', () => {
  test('every child of every row moves, for --luz-marquee-duration: by default --luz-duration-lazy times 50, to -100% of its own width', async ({ page }) => {
    await open(page);
    const lazy = parseFloat(await token(page, 'transition-duration', '--luz-duration-lazy')) * 1000;
    expect(lazy).toBeGreaterThan(0);
    for (const id of ['ticker', 'logos']) {
      const found = await animations(page, id);
      expect(found.map((list) => list.length), id).toEqual([1, 1]);
      for (const [animation] of found) {
        expect(animation?.name, id).toBe('luz-marquee-run');
        expect(animation?.state, id).toBe('running');
        expect(animation?.duration, id).toBeCloseTo(lazy * LAZY_TIMES, 0);
        expect(animation?.to, id).toMatch(/^-100%/);
      }
    }
  });

  test('--luz-marquee-duration on the tag sets how long a loop takes, for that tag only', async ({ page }) => {
    await open(page);
    await page.locator('#ticker').evaluate((el) => el.style.setProperty('--luz-marquee-duration', '12s'));
    for (const [animation] of await animations(page, 'ticker')) expect(animation?.duration).toBe(12000);
    expect((await animations(page, 'logos'))[0][0]?.duration, 'the other rows are untouched').toBeGreaterThan(12000);
    // A row of a showcase takes the property from its own marquee
    await page.locator('#logos').evaluate((el) => el.style.setProperty('--luz-marquee-duration', '7s'));
    for (const [animation] of await animations(page, 'logos')) expect(animation?.duration).toBe(7000);
  });

  test('the first copy moves to the left, and so does the copy, at the same pace', async ({ page }) => {
    await open(page);
    for (const id of ['ticker', 'logos']) {
      const link = id === 'ticker' ? page.locator(`#${id} > :first-child li`).first() : first(page, id);
      const copy = id === 'ticker' ? page.locator(`#${id} > [aria-hidden="true"] li`).first() : copyOf(page, id).locator('a').first();
      const start = await lefts(link, copy);
      await expect.poll(async () => (await box(link)).left, `#${id}: the first item moves left`).toBeLessThan(start.a - 1);
      const now = await lefts(link, copy);
      // Both boxes are read in one call, so what they moved is compared at the same instant: the copy keeps its distance from the first
      expect(Math.abs((now.a - start.a) - (now.b - start.b)), `#${id}: the copy keeps its place after the first`).toBeLessThanOrEqual(EPS);
    }
  });

  test('it stops while the pointer is over it, and runs again when the pointer leaves; only that row stops', async ({ page }) => {
    await open(page);
    await page.locator('#logos').hover();
    await expect.poll(() => states(page, 'logos')).toEqual(['paused', 'paused']);
    expect(await states(page, 'ticker'), 'the other rows keep going').toEqual(['running', 'running']);
    const stopped = (await box(first(page, 'logos'))).left;
    await page.waitForTimeout(250);
    expect((await box(first(page, 'logos'))).left, 'it does not move while paused').toBe(stopped);
    await page.mouse.move(0, 0);
    await expect.poll(() => states(page, 'logos')).toEqual(['running', 'running']);
  });

  test('it stops while a link in it has the focus, and runs again when the focus leaves', async ({ page }) => {
    await open(page);
    await first(page, 'logos').focus();
    await expect.poll(() => states(page, 'logos')).toEqual(['paused', 'paused']);
    expect(await states(page, 'logos-rtl'), 'only that row stops').toEqual(['running', 'running']);
    await first(page, 'logos').blur();
    await expect.poll(() => states(page, 'logos')).toEqual(['running', 'running']);
  });

  test('a pointer can click a link of the copy: it is not inert, it is a link to a pointer, and the click follows it', async ({ page }) => {
    await open(page);
    const info = await copyOf(page, 'logos').evaluate((child) => ({
      inert: /** @type {HTMLElement} */ (child).inert || child.closest('[inert]') !== null,
      pointerEvents: getComputedStyle(/** @type {Element} */ (child.querySelector('a'))).pointerEvents,
      cursor: getComputedStyle(/** @type {Element} */ (child.querySelector('a'))).cursor,
      visibility: getComputedStyle(/** @type {Element} */ (child.querySelector('a'))).visibility,
    }));
    expect(info).toEqual({ inert: false, pointerEvents: 'auto', cursor: 'pointer', visibility: 'visible' });
    expect((await animations(page, 'logos')).map((list) => list.length), 'both copies move').toEqual([1, 1]);
    // Stop the loop with the copy's first link in the band, then click it where it is
    await page.evaluate(() => {
      const host = /** @type {Element} */ (document.querySelector('#logos'));
      const width = /** @type {Element} */ (host.firstElementChild).getBoundingClientRect().width;
      for (const child of host.children) {
        const [a] = child.getAnimations();
        a.pause();
        a.currentTime = Number(a.effect?.getTiming().duration) * (1 - 400 / width);
      }
    });
    const link = copyOf(page, 'logos').locator('a').first();
    expect((await box(link)).left, 'the copy is in the band').toBeLessThan(1280);
    await link.click({ trial: true });
    expect(new URL(page.url()).hash).toBe('');
    await link.click();
    expect(new URL(page.url()).hash, 'the click followed the link of the copy').toBe('#logos-0');
  });
});

test.describe('marquee: right to left', () => {
  test('a row in a right-to-left page runs the other way: luz-marquee-run-rtl, to +100%, and the first link moves right', async ({ page }) => {
    await open(page);
    for (const [animation] of await animations(page, 'logos-rtl')) {
      expect(animation?.name).toBe('luz-marquee-run-rtl');
      expect(animation?.to).toMatch(/^100%/);
      expect(animation?.to).not.toMatch(/^-/);
    }
    // The first copy is written first, so it starts at the right, and the copy follows at its left
    const link = first(page, 'logos-rtl');
    const copy = copyOf(page, 'logos-rtl').locator('a').first();
    expect((await box(link)).left).toBeGreaterThan((await box(copy)).left);
    const start = (await box(link)).left;
    await expect.poll(async () => (await box(link)).left, 'the first link moves right').toBeGreaterThan(start + 1);
  });

  test('the direction is the page\'s too: dir="rtl" on html turns the left-to-right rows around, and dir="ltr" on a row turns one back', async ({ page }) => {
    await open(page);
    expect((await animations(page, 'ticker'))[0][0]?.name).toBe('luz-marquee-run');
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    for (const id of ['ticker', 'logos']) {
      for (const [animation] of await animations(page, id)) {
        expect(animation?.name, id).toBe('luz-marquee-run-rtl');
        expect(animation?.to, id).toMatch(/^100%/);
      }
    }
    await page.locator('#logos-rtl').evaluate((el) => { el.dir = 'ltr'; });
    expect((await animations(page, 'logos-rtl'))[0][0]?.name).toBe('luz-marquee-run');
  });

  test('the band, the fade and the pause work the same: a band that clips, stopped on hover, the page not widened', async ({ page }) => {
    await open(page);
    expect((await style(page.locator('#logos-rtl'), 'overflow-x'))['overflow-x']).toBe('hidden');
    await page.locator('#logos-rtl').hover();
    await expect.poll(() => states(page, 'logos-rtl')).toEqual(['paused', 'paused']);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
});

for (const [name, emulate] of /** @type {const} */ ([
  ['reduced motion', { reducedMotion: 'reduce' }],
  ['paper', { media: 'print' }],
])) {
  test.describe(`marquee: ${name}`, () => {
    test('the first copy alone: block, no fade, no animation, centred and wrapped, the copy not shown', async ({ page }) => {
      await open(page);
      await page.emulateMedia(emulate);
      for (const id of ROWS) {
        expect(await animations(page, id), `#${id}: nothing moves`).toEqual([[], []]);
        const host = await style(page.locator(`#${id}`), 'display', 'mask-image');
        expect(host.display, `#${id}`).toBe('block');
        expect(host['mask-image'], `#${id}: no fade`).toBe('none');
        const child = await style(page.locator(`#${id} > :first-child`), 'animation-name', 'justify-content', 'padding-inline-end');
        expect(child, `#${id}`).toEqual({ 'animation-name': 'none', 'justify-content': 'center', 'padding-inline-end': '0px' });
        expect((await style(copyOf(page, id), 'display')).display, `#${id}: the copy is not shown`).toBe('none');
        expect((await box(copyOf(page, id))).height).toBe(0);
      }
    });

    test('a list wraps and is centred, a phrase may wrap, and nothing scrolls sideways at 320 px', async ({ page }) => {
      await open(page, { width: 320 });
      await page.emulateMedia(emulate);
      for (const id of ROWS) {
        const list = await style(page.locator(`#${id} ul`).first(), 'flex-wrap', 'justify-content');
        expect(list, `#${id}`).toEqual({ 'flex-wrap': 'wrap', 'justify-content': 'center' });
      }
      expect((await style(page.locator('#ticker li').first(), 'white-space'))['white-space']).toBe('normal');
      const rows = (await page.locator('#ticker > ul:first-child > li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).filter((t, i, all) => all.indexOf(t) === i);
      expect(rows.length, 'the phrases wrap onto more rows').toBeGreaterThan(1);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });

    test('every phrase and every link is shown once, inside the band, and the first does not move', async ({ page }) => {
      await open(page);
      await page.emulateMedia(emulate);
      expect(await page.locator('#ticker li:visible').count(), 'each phrase once').toBe(PHRASES.length);
      const links = page.locator('#logos a:visible');
      expect(await links.count(), 'each link once').toBe(NAMES.length);
      const host = await box(page.locator('#logos'));
      for (const b of await links.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }))) {
        expect(b.left).toBeGreaterThanOrEqual(host.left - EPS);
        expect(b.right).toBeLessThanOrEqual(host.right + EPS);
      }
      const start = (await box(first(page, 'logos'))).left;
      await page.waitForTimeout(250);
      expect((await box(first(page, 'logos'))).left).toBe(start);
    });

    test('the links are centred in the band: the same room on both sides', async ({ page }) => {
      await open(page);
      await page.emulateMedia(emulate);
      const host = await box(page.locator('#logos'));
      const boxes = await page.locator('#logos a:visible').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
      const before = Math.min(...boxes.map((b) => b.left)) - host.left;
      const after = host.right - Math.max(...boxes.map((b) => b.right));
      expect(before).toBeGreaterThan(0);
      expect(Math.abs(before - after), 'the same room on both sides').toBeLessThanOrEqual(EPS * 2);
    });
  });
}

test.describe('marquee: keyboard and reading', () => {
  test('Tab meets each link once, in the order of the source, and never a link of a copy', async ({ page }) => {
    await open(page);
    const total = await page.evaluate(() => {
      const links = [...document.querySelectorAll('luz-marquee > :not([aria-hidden]) a')];
      links.forEach((a, i) => a.setAttribute('data-n', String(i)));
      return links.length;
    });
    expect(total).toBe(NAMES.length * 2);
    const visited = [];
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => {
        const el = document.activeElement;
        return { n: Number(el?.getAttribute('data-n') ?? -1), inCopy: !!el?.closest('[aria-hidden="true"]') };
      }));
    }
    expect(visited.map((v) => v.n)).toEqual([...Array(total).keys()]);
    expect(visited.some((v) => v.inCopy)).toBe(false);
    // The next stop is the link after the rows: no link of a copy is in between
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('the links of a copy are out of the tab order but are links: tabindex -1', async ({ page }) => {
    await open(page);
    for (const id of ['logos', 'logos-rtl']) {
      const tabindexes = await copyOf(page, id).locator('a').evaluateAll((els) => els.map((el) => /** @type {HTMLElement} */ (el).tabIndex));
      expect(tabindexes.length, id).toBe(NAMES.length);
      expect(new Set(tabindexes), id).toEqual(new Set([-1]));
    }
  });

  test('a reader meets each link once: the copy is out of the accessibility tree, and the logos add nothing to the names', async ({ page }) => {
    await open(page);
    await expect(page.locator('#logos').getByRole('link')).toHaveCount(NAMES.length);
    for (const name of NAMES) await expect(page.locator('#logos').getByRole('link', { name })).toHaveCount(1);
    await expect(page.locator('#logos').getByRole('link', { name: 'Bodega Sur' })).toHaveAccessibleName('Bodega Sur');
    await expect(page.locator('#logos-rtl').getByRole('link')).toHaveCount(NAMES.length);
  });

  test('the focus ring is core\'s, and a link that takes the focus in the marquee shows it', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Tab');
    const link = first(page, 'logos');
    await expect(link).toBeFocused();
    const ring = await style(link, 'outline-style', 'outline-width', 'outline-color');
    expect(ring['outline-style']).toBe('solid');
    expect(ring['outline-width']).toBe('2px');
    expect(ring['outline-color']).toBe(await token(page, 'color', '--luz-focus-ring'));
  });
});

test.describe('marquee: no script defines the tag', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'needs JavaScript');

  test('after the loader of the catalog has scanned the page, customElements.get() still answers undefined', async ({ page }) => {
    await open(page);
    const state = await page.evaluate(async () => {
      await import('/packages/catalog/dist/catalog.min.js');
      await new Promise((resolve) => globalThis.requestIdleCallback(() => resolve(undefined), { timeout: 2000 }));
      return [...document.querySelectorAll('luz-marquee')].map((el) => ({ definition: customElements.get(el.localName), defined: el.matches(':defined') }));
    });
    expect(state).toEqual(Array(ROWS.length).fill({ definition: undefined, defined: false }));
  });
});

test.describe('marquee: axe', () => {
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
