/**
 * LUZ Design System — Landing page checks
 * The home (apps/landing, served at /, /es/ and /ar/), section by section, in
 * the order of the page: the hero and the light (the first screen), the four
 * levels of "What's inside", the FAQ, and the footer (a brand and two columns).
 *
 * It is a level-3 consumer on top of catalog's landing files, with the base color
 * modes and the six lights of the hour. What other files own is not repeated
 * here: the header, the drawer and the language switch in tests/site-header.spec.js
 * and tests/landing-i18n.spec.js; <home-light> in tests/home-light.spec.js;
 * the numbers in the copy in tests/landing-numbers.test.js. The documentation,
 * with every component and its guidance, is in tests/docs.spec.js.
 * Run with: pnpm test:ui
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { faded } from './helpers/settle.js';
import { copiedText, recordCopies } from './helpers/clipboard.js';
import { KEY as MODE_KEY, LIGHTS, NO_CHOICE, TIMEZONE, atTime, channels, colorOf, pinHour, seedMode, vejer } from './helpers/site-lights.js';

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

test.use({ timezoneId: TIMEZONE, storageState: NO_CHOICE });

const MODES = ['light', 'dark', 'high-contrast'];
/** The ids of the sections of the home, in the order of the page: the four levels are four sections. */
const SECTIONS = ['hero', 'light', 'tokens', 'core', 'catalog', 'ai', 'faq'];
/** The sections of the drawer's "On this page", in the order of the page. */
const DRAWER = ['tokens', 'faq'];
const ROUTES = [
  ['/', 'en'],
  ['/es/', 'es'],
  ['/ar/', 'ar'],
];

const catalog = (lang) => JSON.parse(readFileSync(fromRepo(`apps/landing/i18n/${lang}.json`), 'utf-8'));
const EN = catalog('en');
/** The text of a catalog value that is trusted inline HTML, as a reader gets it. */
const plain = (html) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const version = (pkg) => JSON.parse(readFileSync(fromRepo(`packages/${pkg}/package.json`), 'utf-8')).version;
// The home pins every package with the version of core (`{{version}}`); tokens, core and catalog share one version (changesets `fixed`)
// once released, and catalog is at 0.0.0 until its first release, so it is read from core too
const cdn = (pkg, file) => `@luz-ds/${pkg}@${version(pkg === 'catalog' ? 'core' : pkg)}/dist/${file}`;

/** The id of each level's section, by its number. */
const LEVEL_ID = { 1: 'tokens', 2: 'core', 3: 'catalog', 4: 'ai' };

/** The levels of adoption of the first three sections of "What's inside". */
const LEVELS = [
  { id: 'tokens', n: 1, npm: 'npm install @luz-ds/tokens', files: [cdn('tokens', 'luz-tokens.min.css')], absent: ['@luz-ds/core', '@luz-ds/catalog'], list: ['inside.list.tokens'] },
  {
    id: 'core',
    n: 2,
    npm: 'npm install @luz-ds/tokens @luz-ds/core',
    files: [cdn('tokens', 'luz-tokens.min.css'), cdn('core', 'luz.min.css'), cdn('core', 'luz.min.js')],
    absent: ['@luz-ds/catalog'],
    list: ['inside.list.components', 'inside.list.objects'],
  },
  {
    id: 'catalog',
    n: 3,
    npm: 'npm install @luz-ds/tokens @luz-ds/core @luz-ds/catalog',
    files: [cdn('tokens', 'luz-tokens.min.css'), cdn('core', 'luz.min.css'), cdn('catalog', 'components/search.min.css'), cdn('core', 'luz.min.js'), cdn('catalog', 'catalog.min.js')],
    absent: [],
    list: ['inside.list.catalog'],
  },
];

/* ---- Helpers ----------------------------------------------------------- */

/** Open the landing and collect failed requests and console problems. */
async function open(page, path = '/') {
  const requests = [];
  const failed = [];
  const problems = [];
  page.on('request', (req) => requests.push(req.url()));
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(res.url());
  });
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return { requests, failed, problems };
}

/** Open the home with JavaScript on and wait until <luz-theme-time> (a lazy chunk) has upgraded; `time` pins that hour (the light of it). */
async function openLive(page, path = '/?look=city', time) {
  if (time) await pinHour(page, time);
  const seen = await open(page, path);
  await expect.poll(() => page.evaluate(() => !!customElements.get('luz-theme-time'))).toBe(true);
  return seen;
}

/** Is a tab panel the one on show? A hidden=until-found panel keeps its box, so the attribute is the answer. */
const shown = (page, id) => page.locator(`#${id}`).evaluate((el) => !el.hasAttribute('hidden'));
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const light = (page) => page.evaluate(() => document.documentElement.dataset.moment);
/** The number of KB in a text such as "2.5 KB" or "up to 44.1 KB". */
const kb = (text) => Number(/([\d.]+)\s*KB/.exec(text)?.[1] ?? Number.NaN);

test.describe('Landing page', () => {
  test.describe('loading and color modes', () => {
    test('loads cleanly, with base color modes only', async ({ page }) => {
      const { requests, failed, problems } = await open(page);

      expect(failed).toEqual([]);
      expect(problems).toEqual([]);
      // No custom theme is loaded, mentioned in markup, or applied
      expect(requests.filter((url) => /themes\//.test(url))).toEqual([]);
      expect(await page.locator('link[href*="themes/"]').count()).toBe(0);
      // data-mode is the mode (written by <luz-theme-mode> and the boot script): only <html> has it, and it is a base mode
      expect(await page.locator('[data-mode]').count()).toBe(1);
      expect(MODES).toContain(await theme(page));
      expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe(await theme(page));
      // The core behaviors are imported one by one: luz.js would apply its own theme
      expect(requests.filter((url) => /\/luz(\.min)?\.js/.test(url))).toEqual([]);
    });

    test('the footer switcher is a radio group that becomes one round button: Auto (the system\'s), Light, Dark and High contrast', async ({ page }) => {
      // Auto is the system's mode, shown checked, and the hour counts only when it is pinned: this file starts from no
      // choice (NO_CHOICE), and the system is light (Chromium's default), so Auto reads as Light
      // This test is about the group and the announcement, not about the transitions: with reduced motion the durations
      // are zero, so a click does not wait for the page to repaint about 200 colour transitions
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await seedMode(page, 'light');
      await open(page);

      // The native radio group stays in the page, under the button
      const switcher = page.locator('footer fieldset.luz-theme-mode__group');
      await expect(switcher).toHaveCount(1);
      await expect(switcher.locator('legend')).toHaveText('Color mode');
      await expect(switcher.locator('input[type="radio"][name="luz-theme-mode"]')).toHaveCount(4);
      expect(await theme(page)).toBe('light');

      const button = page.locator('footer button.luz-theme-mode__button');
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAccessibleName('Color mode: Light');
      await expect(switcher.locator('.luz-theme-mode__option').first()).toBeHidden();

      // The announcement is cleared 3 s after the change (on purpose), and click() can take longer than that on a loaded
      // runner (the page repaints about 200 colour transitions while Playwright waits), so a read after the click may find
      // it empty. A recorder in the page keeps every text the status region takes, and the test asks it afterwards.
      await page.evaluate(() => {
        window.__announced = [];
        const status = document.querySelector('footer [role="status"]');
        new MutationObserver(() => status.textContent && window.__announced.push(status.textContent)).observe(status, { childList: true, characterData: true, subtree: true });
      });

      // Dark, High contrast, Auto (the system's, light) and then Dark again: Light is the mode Auto already shows
      for (const [mode, label, shown] of [['dark', 'Dark', 'dark'], ['high-contrast', 'High contrast', 'high-contrast'], ['light', 'Light', 'light'], ['dark', 'Dark', 'dark']]) {
        await button.click();
        await expect.poll(() => page.evaluate(() => window.__announced.at(-1))).toBe(`Color mode: ${label}`);
        expect(await theme(page)).toBe(shown);
        await expect(page.locator('input[name="luz-theme-mode"]:checked')).toHaveValue(mode);
        await expect(button).toHaveAccessibleName(`Color mode: ${label}`);
      }
    });

    test('the cycle button works from the keyboard', async ({ page }) => {
      await seedMode(page, 'light');
      await open(page);

      await page.locator('footer .luz-theme-mode__button').focus();
      await page.keyboard.press('Enter');
      expect(await theme(page)).toBe('dark');
      await page.keyboard.press('Space');
      expect(await theme(page)).toBe('high-contrast');
    });

    test('the chosen mode survives a reload, under core\'s key', async ({ page }) => {
      await seedMode(page, 'light');
      await open(page);
      // light → dark → high contrast
      await page.click('footer .luz-theme-mode__button');
      await page.click('footer .luz-theme-mode__button');

      expect(await page.evaluate((key) => localStorage.getItem(key), MODE_KEY)).toBe('high-contrast');
      // The site has no key of its own
      expect(await page.evaluate(() => localStorage.getItem('luz-site-mode'))).toBeNull();

      await page.reload();
      expect(await theme(page)).toBe('high-contrast');
      // The documentation page follows the same choice
      await page.goto('/docs/');
      expect(await theme(page)).toBe('high-contrast');
    });

    // EX-009: core's theme-boot.js and catalog's theme-time-boot.js sets the mode before the first paint (the
    // clock, the light and the dark OS preference are in tests/site-boot.spec.js).
    // The pages' modules are blocked, so only the boot script can have set it.
    for (const path of ['/', '/docs/']) {
      test(`${path} applies the stored mode before any module runs`, async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('luz-theme', 'high-contrast'));
        await page.route(/\/apps\/(landing\/landing|docs\/reference|site\/header)\.js/, (route) => route.abort());
        await page.goto(path);
        expect(await theme(page)).toBe('high-contrast');
      });
    }
  });

  /* ---- The page, section by section -------------------------------------- */

  test.describe('the map of the page', () => {
    for (const [route, lang] of ROUTES) {
      test(`${route}: seven sections, in order, one h1, each named by its heading (${lang})`, async ({ page }) => {
        await open(page, route);

        // The sections of the page: the groups of the FAQ are sections inside the FAQ, with no id
        expect(await page.locator('main section[id]').evaluateAll((all) => all.map((el) => el.id))).toEqual(SECTIONS);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('#hero h1')).toHaveCount(1);
        // The sections that went, with their ids
        for (const gone of ['what', 'see', 'adopt', 'fit', 'type', 'start', 'why', 'native', 'modes']) await expect(page.locator(`#${gone}`), `#${gone}`).toHaveCount(0);
        // Every section is named by a heading of its own: h1 for the hero, h2 for the others
        const named = await page.locator('main section[id]').evaluateAll((all) =>
          all.map((el) => {
            const heading = document.getElementById(el.getAttribute('aria-labelledby') ?? '');
            return [el.id, heading ? heading.tagName : null, el.contains(heading)];
          }),
        );
        expect(named).toEqual(SECTIONS.map((id) => [id, id === 'hero' ? 'H1' : 'H2', true]));
      });

      test(`${route}: the heads say what the catalog says: eyebrow, title and lead (${lang})`, async ({ page }) => {
        const words = catalog(lang);
        await open(page, route);
        // textContent: the eyebrows are set in capitals by CSS, which innerText would return
        const text = async (selector) => plain((await page.locator(selector).first().textContent()) ?? '');

        // The other sections are headed by the home's own: an eyebrow with its icon, a title with one marked word, a lead
        const heads = [
          ['tokens', 'inside.l1'],
          ['core', 'inside.l2'],
          ['catalog', 'inside.l3'],
          ['ai', 'inside.l4'],
          ['faq', 'faq'],
        ];
        for (const [id, key] of heads) {
          expect(await text(`#${id} .landing-inside__eyebrow`), `${id} eyebrow`).toBe(plain(words[`${key}.eyebrow`]));
          expect(await text(`#${id} h2.landing-inside__title`), `${id} title`).toBe(plain(words[`${key}.title`]));
          expect(await text(`#${id} .landing-inside__lead`), `${id} lead`).toBe(plain(words[`${key}.lead`]));
          await expect(page.locator(`#${id} h2 .landing-mark`), `${id}: one marked word`).toHaveCount(1);
          await expect(page.locator(`#${id} .landing-inside__eyebrow svg`), `${id}: the icon is decorative`).toHaveAttribute('aria-hidden', 'true');
        }
      });
    }

    test('no placeholder of the template is left in the text of the page', async ({ page }) => {
      await open(page);

      const text = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll('[aria-label], [title], [alt]')].map((el) => el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.getAttribute('alt')).join(' '));
      expect(text).not.toMatch(/\{\{|\}\}|\{n(:\w+)?\}|\{(total|components|tests|mode|shown|query)\}/);
    });

    test('no heading level is skipped, and the title is unique', async ({ page }) => {
      await open(page);

      expect(await page.title()).toMatch(/^LUZ: /);
      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((headings) =>
          headings
            .filter((el) => el.offsetParent !== null || el.classList.contains('u-sr-only'))
            .map((el) => ({ level: Number(el.tagName[1]), text: el.textContent.trim() })),
        );
      expect(levels[0].level).toBe(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i].level - levels[i - 1].level,
          `"${levels[i - 1].text}" (h${levels[i - 1].level}) → "${levels[i].text}" (h${levels[i].level})`,
        ).toBeLessThanOrEqual(1);
      }
    });

    test('every in-page link points at an element that exists', async ({ page }) => {
      await open(page);

      const broken = await page.locator('a[href^="#"]').evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href) => !document.getElementById(href.slice(1))),
      );
      expect(broken).toEqual([]);
    });

    test('code blocks are highlighted without an injected copy button', async ({ page }) => {
      await open(page);

      expect(await page.locator('pre.luz-code-block .tok-name').count()).toBeGreaterThan(0);
      await expect(page.locator('.luz-code-block__copy')).toHaveCount(0);
    });
  });

  test.describe('layout', () => {
    for (const [route, lang] of ROUTES) {
      for (const width of [320, 360, 768, 1280]) {
        test(`${route}: no horizontal overflow at ${width}px (${lang})`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 });
          await open(page, `${route}?look=map`);

          const { scrollWidth, innerWidth, overflowX } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            overflowX: getComputedStyle(document.body).overflowX,
          }));
          expect(scrollWidth).toBe(innerWidth);
          // The overflow is absent, not hidden
          expect(overflowX).toBe('visible');
        });
      }
    }

    test('the color mode button is a target of 24px or more at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await open(page);

      const boxes = await page
        .locator('footer .luz-theme-mode__button')
        .evaluateAll((buttons) => buttons.map((el) => el.getBoundingClientRect()));
      expect(boxes).toHaveLength(1);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    });

    test('footer: the round button shows one icon, the checked label\'s: the system\'s mode first, then each mode\'s own, and Auto\'s once an hour is pinned', async ({ page }) => {
      await open(page);
      const button = page.locator('footer .luz-theme-mode__button');
      const icon = () => button.locator('svg').evaluateAll((all) => all.map((svg) => svg.innerHTML));
      const labelIcon = (value) => page.locator(`footer input[value="${value}"]`).locator('xpath=..').locator('svg').evaluate((svg) => svg.innerHTML);
      // A first visit follows the system (light): Light is checked, and its icon is the one on the button
      await expect(page.locator('footer input[name="luz-theme-mode"]:checked')).toHaveValue('light');
      expect(await icon()).toEqual([await labelIcon('light')]);
      const seen = [await labelIcon('light')];
      // The first press from a light system goes to Dark
      for (const mode of ['dark', 'high-contrast']) {
        await button.click();
        await expect(page.locator(`footer input[value="${mode}"]`)).toBeChecked();
        expect(await icon()).toEqual([await labelIcon(mode)]);
        seen.push(await labelIcon(mode));
      }
      // Auto is checked only while an hour is pinned: its own icon
      await page.locator('footer luz-theme-time').evaluate((node) => /** @type {any} */ (node).pin(14));
      await expect(page.locator('footer input[name="luz-theme-mode"]:checked')).toHaveValue('auto');
      expect(await icon()).toEqual([await labelIcon('auto')]);
      seen.push(await labelIcon('auto'));
      expect(new Set(seen).size, 'four icons, all different').toBe(4);
    });

    for (const width of [320, 360, 1280]) {
      test(`header: the visual order follows the DOM order at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const [menu, brand, nav, search] = await Promise.all(
          ['.site-header__menu', '.site-header__brand', '.site-header__nav', '.site-header__search'].map((selector) =>
            page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON()),
          ),
        );
        const before = (a, b) => a.bottom <= b.top + 1 || (Math.abs(a.top - b.top) < a.height && a.left < b.left);
        // At 768px and below: brand, the search, then the menu button (the site
        // links are in the drawer). Above: brand, site links, search.
        if (width <= 768) {
          expect(before(brand, search)).toBe(true);
          expect(before(search, menu)).toBe(true);
          expect(nav.width).toBe(0);
        } else {
          expect(menu.width).toBe(0);
          expect(before(brand, nav)).toBe(true);
          expect(before(nav, search)).toBe(true);
        }
      });
    }


    test('the menu drawer lists the sections of this page, then Documentation and GitHub, then the languages', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await open(page);

      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const drawer = page.getByRole('navigation', { name: 'Home page' });
      await expect(drawer).toBeVisible();
      // "On this page": the sections that have a head of their own, in the order of the page
      const local = await drawer.locator('a[href^="#"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(local).toEqual(DRAWER.map((id) => `#${id}`));
      for (const href of local) await expect(page.locator(href), href).toHaveCount(1);
      const at = await page.evaluate((ids) => ids.map((id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY), DRAWER);
      expect(at, 'the links follow the order of the page').toEqual([...at].sort((a, b) => a - b));
      // Documentation is one link, GitHub the next, the languages last
      await expect(drawer.locator('a[href^="/docs/"]')).toHaveCount(1);
      await expect(drawer.locator('a[href="/docs/"]')).toHaveText('Documentation');
      await expect(drawer.locator('a[hreflang]')).toHaveCount(3);
    });

    test('content is centred at 1440px, in the site frame with the header', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page);

      // The frame is the page's own: main.o-container pads its inline ends by the gutters,
      // so measure the content boxes of the main and of the footer's container, and the brand
      const edges = (selector) =>
        page.locator(selector).evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            left: rect.left + parseFloat(cs.paddingLeft),
            right: document.documentElement.clientWidth - rect.right + parseFloat(cs.paddingRight),
          };
        });
      const main = await edges('main.o-container');
      const footer = await edges('footer.luz-site-footer > .o-container');
      const brand = await page.locator('.site-header__brand').evaluate((el) => el.getBoundingClientRect().left);
      expect(main.left).toBeGreaterThan(100);
      expect(Math.abs(main.left - main.right), 'main is centred').toBeLessThanOrEqual(1);
      expect(Math.abs(main.left - brand), 'main starts under the brand').toBeLessThanOrEqual(1);
      expect(Math.abs(footer.left - main.left), 'footer starts where main does').toBeLessThanOrEqual(1);
      expect(Math.abs(footer.right - main.right), 'footer ends where main does').toBeLessThanOrEqual(1);
    });
  });

  /* ---- 1. hero ---------------------------------------------------------- */

  test.describe('hero', () => {
    test('is centred: the modifier, the text and the actions', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      const hero = page.locator('section#hero');
      await expect(hero).toHaveClass(/\bluz-hero\b/);
      await expect(hero).toHaveClass(/\bluz-hero--centered\b/);
      expect(await hero.locator('h1').evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
      const centre = await page.evaluate(() => document.documentElement.clientWidth / 2);
      const actions = await hero.locator('a.luz-btn').evaluateAll((all) => {
        const boxes = all.map((el) => el.getBoundingClientRect());
        return { left: Math.min(...boxes.map((b) => b.left)), right: Math.max(...boxes.map((b) => b.right)) };
      });
      expect(Math.abs((actions.left + actions.right) / 2 - centre), 'the buttons sit about the centre').toBeLessThanOrEqual(4);
    });

    test('says what LUZ is (English): the title with the brand and two stressed words, the lead, two actions', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      const hero = page.locator('section#hero');
      // The word LUZ is drawn by CSS with its letters hidden from the tree: the h1 is named "LUZ" and the sentence
      await expect(hero.locator('h1.luz-hero__title')).toHaveAccessibleName('LUZ Design system for humans, ready for AI.');
      await expect(hero.locator('h1 .landing-hero__brand .u-sr-only')).toHaveText('LUZ');
      await expect(hero.locator('h1 .landing-hero__brand .landing-imago__word .ch')).toHaveText(['L', 'U', 'Z']);
      // Both ends are stressed: the human and the AI
      await expect(hero.locator('h1 em')).toHaveText(['humans', 'AI']);
      await expect(hero.locator('.luz-hero__lead')).toHaveText(
        'Tokens, CSS and a little vanilla JavaScript, built on what the browser already does. Start with LUZ, the Light, Usable and Zero-dependency design system.',
      );
      await expect(hero.locator('.luz-hero__lead strong')).toHaveText(['LUZ', 'Light', 'Usable', 'Zero-dependency']);
      // No eyebrow over the title, no second line under the lead, and the lead carries no link
      await expect(hero.locator('.luz-hero__eyebrow')).toHaveCount(0);
      await expect(hero.locator('.landing-built')).toHaveCount(0);
      await expect(hero.locator('.luz-hero__lead a')).toHaveCount(0);

      // Three actions: Get started leads to the levels, Get started with AI (the primary one) to the prompts, and the docs follow
      // (the buttons themselves are in tests/landing-hero-buttons.spec.js)
      await expect(hero.locator('a.luz-btn')).toHaveCount(3);
      await expect(hero.locator('.luz-btn--primary')).toHaveCount(1);
      const primary = hero.locator('a.luz-btn--primary');
      await expect(primary).toHaveText('Get started with AI');
      await expect(primary).toHaveAttribute('href', '#ai');
      await expect(primary).toBeInViewport();
      const outline = hero.locator('a.luz-btn--outline');
      await expect(outline).toHaveText(['Get started', 'Read the docs']);
      await expect(outline.nth(0)).toHaveAttribute('href', '#tokens');
      await expect(outline.nth(1)).toHaveAttribute('href', '/docs/');
      await expect(outline.nth(0)).toBeInViewport();
      await expect(outline.nth(1)).toBeInViewport();
    });

    test('Get started goes to the first level: its section is where the window looks', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await page.locator('#hero a.luz-btn--outline').first().click();
      await expect(page).toHaveURL(/#tokens$/);
      await expect(page.locator('#tokens h2')).toBeInViewport();
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: the title, the lead and the actions are the catalog's (${lang})`, async ({ page }) => {
        const words = catalog(lang);
        await open(page, route);

        const hero = page.locator('section#hero');
        await expect(hero.locator('h1')).toHaveAccessibleName(`LUZ ${plain(words['hero.title'])}`);
        expect(((await hero.locator('.luz-hero__lead').textContent()) ?? '').replace(/\s+/g, ' ').trim()).toBe(plain(words['hero.lead']));
        // The brand is written in capitals in every language; every language stresses the human and the AI
        await expect(hero.locator('h1 .landing-hero__brand .u-sr-only')).toHaveText('LUZ');
        await expect(hero.locator('h1 em')).toHaveCount(2);
        // Get started and Read the docs are outline, the one for AI is the primary (tests/landing-hero-buttons.spec.js)
        await expect(hero.locator('a.luz-btn--primary')).toHaveText(words['hero.start-ai']);
        await expect(hero.locator('a.luz-btn--secondary')).toHaveCount(0);
        await expect(hero.locator('a.luz-btn--outline')).toHaveText([words['hero.start'], words['hero.docs']]);
        if (lang !== 'en') expect(plain(words['hero.title'])).not.toBe(plain(EN['hero.title']));
        // The old keys of the TDD statement and the brand line are gone from the catalog
        expect(Object.keys(words).filter((key) => /^(built|hero\.(eyebrow|github|tdd))/.test(key))).toEqual([]);
      });
    }
  });

  /* ---- 2. light --------------------------------------------------------- */

  test.describe('light', () => {
    test('is <home-light> under a screen-reader heading, in the bleeding wrapper of the hero\'s media', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await expect(page.locator('section#light h2.u-sr-only')).toHaveText(EN['light.title']);
      await expect(page.locator('section#light home-light')).toHaveCount(1);
      expect(await page.locator('home-light').evaluate((el) => !!el.closest('.luz-hero__media--bleed'))).toBe(true);
      // Edge to edge of the window
      const box = await page.locator('home-light').boundingBox();
      const width = await page.evaluate(() => document.documentElement.clientWidth);
      expect(Math.abs((box?.x ?? 99) - 0)).toBeLessThanOrEqual(1);
      expect(Math.abs((box?.width ?? 0) - width)).toBeLessThanOrEqual(1);
    });

    for (const [width, height] of [[1280, 800], [1440, 900]]) {
      test(`the first screen is the hero over the light, from the header to the bottom of the window at ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await open(page);

        const box = (selector) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON());
        const header = await box('header');
        const first = await box('.landing-first');
        expect(Math.abs(first.top - header.bottom), 'starts under the header').toBeLessThanOrEqual(1);
        expect(Math.abs(first.bottom - height), 'ends at the bottom of the window').toBeLessThanOrEqual(2);
        // The hero is written over the sky, and both are inside the first screen
        const hero = await box('#hero');
        const sky = await box('#light');
        for (const inner of [hero, sky]) {
          expect(inner.top).toBeGreaterThanOrEqual(first.top - 1);
          expect(inner.bottom).toBeLessThanOrEqual(first.bottom + 1);
        }
        await expect(page.locator('#hero h1')).toBeInViewport();
        await expect(page.locator('#hero a.luz-btn--primary')).toBeInViewport();
        // The levels start below the fold
        expect((await box('#tokens')).top).toBeGreaterThanOrEqual(height - 1);
      });
    }

    test('on a phone the title and the first action are in the first screen, and the light starts there too', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await open(page);

      await expect(page.locator('#hero h1')).toBeInViewport();
      await expect(page.locator('#hero a.luz-btn--primary')).toBeInViewport();
      expect(await page.locator('#light').evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(740);
    });

    test('with JavaScript the sentence that stands in for the light is gone', async ({ page }) => {
      await open(page);
      await expect.poll(() => page.evaluate(() => !!customElements.get('home-light'))).toBe(true);

      await expect(page.locator('.landing-light__nojs')).toBeHidden();
    });
  });

  /* ---- 3. inside: one section per level of adoption ---------------------- */

  test.describe('tokens', () => {
    for (const [index, id] of ['tokens', 'core', 'catalog'].entries()) {
      test(`#${id}: level ${index + 1} has an eyebrow, a title, a lead and three points, the last of them its weight`, async ({ page }) => {
        await open(page);

        const section = page.locator(`section#${id}`);
        const key = `inside.l${index + 1}`;
        await expect(section.locator('.landing-inside__eyebrow')).toHaveText(EN[`${key}.eyebrow`]);
        await expect(section.locator('h2.landing-inside__title')).toHaveText(plain(EN[`${key}.title`]));
        await expect(section.locator('.landing-inside__lead')).toHaveText(EN[`${key}.lead`]);
        const points = section.locator('.landing-inside__points > li');
        await expect(points).toHaveCount(3);
        await expect(points.nth(0).locator('strong')).toHaveText(EN[`${key}.p1.name`]);
        await expect(points.nth(1).locator('strong')).toHaveText(EN[`${key}.p2.name`]);
        for (const icon of await points.locator('svg').all()) await expect(icon).toHaveAttribute('aria-hidden', 'true');
        // The weight is measured when the page is built: a number of KB, "with everything before it"
        await expect(points.nth(2).locator('strong')).toHaveText(EN['inside.weight']);
        await expect(points.nth(2)).toContainText(EN['inside.gzip']);
        expect(kb(await points.nth(2).innerText()), 'a weight in KB').toBeGreaterThan(0);
      });
    }

    test('#ai: level 4 has an eyebrow, a title, a lead and three points, none of them a weight: a skill adds nothing to the page', async ({ page }) => {
      await open(page);

      const section = page.locator('section#ai');
      await expect(section.locator('.landing-inside__eyebrow')).toHaveText(EN['inside.l4.eyebrow']);
      await expect(section.locator('h2.landing-inside__title')).toHaveText(plain(EN['inside.l4.title']));
      await expect(section.locator('.landing-inside__lead')).toHaveText(EN['inside.l4.lead']);
      const points = section.locator('.landing-inside__points > li');
      await expect(points).toHaveCount(3);
      for (const [index, key] of ['p1', 'p2', 'p3'].entries()) {
        await expect(points.nth(index).locator('strong')).toHaveText(EN[`inside.l4.${key}.name`]);
        await expect(points.nth(index)).toContainText(EN[`inside.l4.${key}.text`]);
      }
      for (const icon of await points.locator('svg').all()) await expect(icon).toHaveAttribute('aria-hidden', 'true');
      await expect(section).not.toContainText(EN['inside.weight']);
      await expect(section).not.toContainText(EN['inside.gzip']);
      expect(kb(await section.innerText()), 'no weight in KB').toBeNaN();
    });

    for (const id of ['tokens', 'core', 'catalog', 'ai']) {
      test(`#${id}: on a wide screen both columns are sticky: scrolled into the section, the shorter one stays under the header while the longer goes by`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 600 });
        await open(page);
        const section = page.locator(`section#${id}`);
        const got = await section.evaluate(async (el) => {
          const cols = [...el.children];
          const styles = cols.map((c) => ({ position: getComputedStyle(c).position, align: getComputedStyle(c).alignSelf }));
          const [a, b] = cols.map((c) => c.getBoundingClientRect().height);
          const short = cols[a <= b ? 0 : 1];
          const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-h')) || 0;
          // Halfway into the difference of heights: the short one has stuck, the section has not ended
          const top = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top + Math.abs(a - b) / 2, behavior: 'instant' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return { styles, diff: Math.abs(a - b), shortTop: short.getBoundingClientRect().top, sectionTop: el.getBoundingClientRect().top, header };
        });
        for (const s of got.styles) expect(s).toEqual({ position: 'sticky', align: 'start' });
        if (got.diff > 40) {
          expect(got.shortTop, 'the shorter column stays in view').toBeGreaterThan(got.sectionTop + 20);
          expect(got.shortTop, 'under the header').toBeGreaterThanOrEqual(got.header);
        }
      });

      test(`#${id}: each point's icon sits on its first line, and the button has more room above it than the points have between them`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 900 });
        await open(page);

        const section = page.locator(`section#${id}`);
        const got = await section.evaluate((el) => {
          const items = [...el.querySelectorAll('.landing-inside__points > li')].map((li) => {
            const icon = li.querySelector('svg').getBoundingClientRect();
            // The span is a flex item: its first line is its top plus one line-height
            const span = li.querySelector('span');
            const box = span.getBoundingClientRect();
            const line = parseFloat(getComputedStyle(span).lineHeight);
            return { iconTop: icon.top, iconBottom: icon.bottom, lineTop: box.top, lineBottom: box.top + line, wraps: box.height > line * 1.5 };
          });
          const list = el.querySelector('.landing-inside__points');
          const actions = el.querySelector('.landing-inside__copy > .o-actions');
          const gapInside = parseFloat(getComputedStyle(list).rowGap);
          const above = actions.getBoundingClientRect().top - list.getBoundingClientRect().bottom;
          return { items, gapInside, above };
        });
        expect(got.items.some((i) => i.wraps), 'at 360 px a point wraps').toBe(true);
        for (const i of got.items) {
          expect(i.iconTop, 'the icon starts within the first line').toBeGreaterThanOrEqual(i.lineTop - 1);
          expect(i.iconBottom, 'the icon ends within the first line').toBeLessThanOrEqual(i.lineBottom + 1);
        }
        expect(got.above, 'the button stands apart from the points').toBeGreaterThan(got.gapInside * 2);
      });
    }

    test('each level weighs what the ones below it weigh, and a little more', async ({ page }) => {
      await open(page);

      const weights = [];
      for (const id of ['tokens', 'core', 'catalog']) weights.push(kb(await page.locator(`#${id} .landing-inside__points > li`).nth(2).innerText()));
      for (let i = 1; i < weights.length; i += 1) expect(weights[i], `level ${i + 1} against level ${i}`).toBeGreaterThanOrEqual(weights[i - 1]);
    });

    for (const level of LEVELS) {
      test(`#${level.id}: the npm command and the CDN tags of level ${level.n}, each pinned and in load order, each with a Copy button for its code`, async ({ page }) => {
        await open(page);

        const section = page.locator(`#${level.id}`);
        await expect(section.locator(`#${level.id}-npm`)).toHaveText(level.npm);
        const snippet = (await section.locator(`#${level.id}-cdn`).textContent()) ?? '';
        let position = -1;
        for (const file of level.files) {
          const found = snippet.indexOf(file);
          expect(found, `${file} in level ${level.n}`).toBeGreaterThan(position);
          position = found;
        }
        for (const name of level.absent) expect(snippet).not.toContain(name);
        expect(snippet.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/\S+?(?=")/g)).toHaveLength(level.files.length);
        for (const script of snippet.match(/<script[^>]*>/g) ?? []) expect(script).toMatch(/^<script type="module" src="[^"]+\.min\.js">$/);

        // Each code block is a focusable, named region; each Copy button points at its own code
        for (const block of await section.locator('.landing-install pre.luz-code-block').all()) {
          await expect(block).toHaveAttribute('tabindex', '0');
          await expect(block).toHaveAttribute('role', 'region');
          await expect(block).toHaveAttribute('aria-label', /\S/);
        }
        for (const [kind, label] of [['npm', EN['inside.copy.npm']], ['cdn', EN['inside.copy.cdn']]]) {
          const button = section.locator(`[data-copy-from="${level.id}-${kind}"]`);
          await expect(button).toHaveCount(1);
          await expect(button).toHaveAttribute('aria-label', label);
        }
      });
    }

    test('the panel is tabs: Install first, then List and Code example; a click or the arrow keys change the tab', async ({ page }) => {
      await open(page);
      await expect.poll(() => page.locator('#tokens .luz-tabs--pill').getAttribute('role')).toBe('tablist');

      const tabs = page.locator('#tokens').getByRole('tab');
      await expect(tabs).toHaveText([EN['inside.tab.install'], EN['inside.tab.list'], EN['inside.tab.code']]);
      await expect(page.locator('#tokens .luz-tabs--pill')).toHaveAccessibleName(EN['inside.l1.panel']);
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
      expect([await shown(page, 'tokens-install'), await shown(page, 'tokens-list'), await shown(page, 'tokens-code')]).toEqual([true, false, false]);

      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect.poll(() => shown(page, 'tokens-list')).toBe(true);
      expect(await shown(page, 'tokens-install')).toBe(false);
      await expect(page.locator('#tokens-list')).toBeVisible();
      // The list names what the level brings and links each name to its page
      await expect(page.locator('#tokens-list h3').first()).toContainText(EN['inside.list.tokens']);
      const links = await page.locator('#tokens-list a').evaluateAll((all) => all.map((a) => new URL(a.href).pathname));
      expect(links.length).toBeGreaterThan(3);
      for (const path of links) expect(path).toMatch(/^\/docs\/tokens\//);

      await tabs.nth(1).focus();
      await page.keyboard.press('ArrowRight');
      await expect(tabs.nth(2)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect.poll(() => shown(page, 'tokens-code')).toBe(true);
      expect(await shown(page, 'tokens-list')).toBe(false);
      await expect(page.locator('#tokens-code')).toContainText('var(--luz-brand-fill)');
    });

    for (const level of LEVELS) {
      test(`#${level.id}: the List tab names ${level.list.map((key) => EN[key]).join(' and ')}`, async ({ page }) => {
        await open(page);

        const headings = await page.locator(`#${level.id}-list h3`).evaluateAll((all) => all.map((h) => h.textContent.trim()));
        expect(headings).toHaveLength(level.list.length);
        for (const [i, key] of level.list.entries()) expect(headings[i]).toContain(EN[key]);
        // Every list carries its count in its title, and every name is a link into the documentation
        for (const count of await page.locator(`#${level.id}-list h3 .landing-names__n`).all()) await expect(count).toHaveText(/^\d+$/);
        const hrefs = await page.locator(`#${level.id}-list li a`).evaluateAll((all) => all.map((a) => new URL(a.href).pathname));
        expect(hrefs.length).toBeGreaterThan(3);
        for (const path of hrefs) expect(path).toMatch(/^\/docs\//);
      });
    }

    test('a Copy button puts the code of its block on the clipboard', async ({ page, context, browserName }) => {
      test.skip(browserName === 'firefox', 'clipboard permissions are not available in Playwright Firefox');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await recordCopies(page);
      await open(page);

      for (const [id, code] of [['tokens', 'tokens-npm'], ['tokens', 'tokens-cdn']]) {
        const button = page.locator(`#${id}-install [data-copy-from="${code}"]`);
        await expect(button).toBeVisible();
        await button.click();
        await expect(button).toHaveClass(/is-copied/);
        expect(await copiedText(page), code).toBe((await page.locator(`#${code}`).textContent())?.trim());
      }
      await expect(page.locator('#luz-live-region')).toHaveText(EN['js.copied-status']);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: level 4 is a terminal that installs the LUZ skill to come, with no prompt and no card of a kind of site, and the words say it is not published yet (${lang})`, async ({ page }) => {
        const words = catalog(lang);
        await open(page, route);

        const cli = page.locator('#ai figure.landing-cli--install');
        // In the tab Use, closed at first with JavaScript: its name and text are read from the markup
        await expect(cli).toHaveAttribute('aria-label', words['inside.l4.install.title']);
        expect(await cli.textContent()).toContain('npx @luz-ds/ai init --target claude');
        await expect(page.locator('#ai .landing-kind, #ai [data-prompt-open], #ai a[href^="/prompts/"]')).toHaveCount(0);
        // The note sits under the panel of the tabs, no longer under the words
        await expect(page.locator('#ai .landing-clitabs + .landing-cli__note')).toContainText(words['inside.l4.soon']);
        await expect(page.locator('#ai .landing-inside__copy .landing-cli__note')).toHaveCount(0);
        // The way to the prompts until the skill is out: the kinds of site in the docs of the language; Arabic has none yet, so it says it is English
        const meanwhile = page.locator('#ai').getByRole('link', { name: words['inside.l4.meanwhile'], exact: true });
        await expect(meanwhile).toHaveAttribute('href', `${lang === 'es' ? '/es' : ''}/docs/kinds/`);
        if (lang === 'ar') await expect(meanwhile).toHaveAttribute('hreflang', 'en');
        else await expect(meanwhile).not.toHaveAttribute('hreflang', /./);
      });
    }

    test('level 4 has one heading, its h2: the terminal is a figure, not a list of headed cards', async ({ page }) => {
      await open(page);

      expect(await page.locator('#ai :is(h2, h3, h4)').evaluateAll((all) => all.map((h) => h.tagName))).toEqual(['H2']);
    });

    test('from 1024px the text and the panel sit side by side, and every other section is flipped; below, they stack', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page);

      const sides = (id, second) =>
        page.locator(`#${id}`).evaluate((section, selector) => {
          const copy = section.querySelector('.landing-inside__copy').getBoundingClientRect();
          const other = section.querySelector(selector).getBoundingClientRect();
          return { copyFirst: copy.left < other.left, sameRow: Math.abs(copy.top - other.top) < Math.max(copy.height, other.height) };
        }, second);
      expect(await sides('tokens', '.landing-panel')).toEqual({ copyFirst: true, sameRow: true });
      expect(await sides('core', '.landing-panel')).toEqual({ copyFirst: false, sameRow: true });
      expect(await sides('catalog', '.landing-panel')).toEqual({ copyFirst: true, sameRow: true });
      expect(await sides('ai', '.landing-cli')).toEqual({ copyFirst: false, sameRow: true });

      await page.setViewportSize({ width: 600, height: 900 });
      for (const id of ['tokens', 'core']) {
        const stacked = await page.locator(`#${id}`).evaluate((section) => {
          const copy = section.querySelector('.landing-inside__copy').getBoundingClientRect();
          const panel = section.querySelector('.landing-panel').getBoundingClientRect();
          return panel.top >= copy.bottom - 1;
        });
        expect(stacked, `${id} stacks`).toBe(true);
      }
    });
  });

  /* ---- The footer -------------------------------------------------------- */

  test.describe('footer', () => {
    const footer = (page) => page.locator('footer.luz-site-footer');

    test('a brand, then a site map of four groups (Documentation, Reference, Resources, Community) on the landing footer grid', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await expect(footer(page).locator('> .o-container.o-container--inline.o-grid')).toHaveCount(1);
      const brand = footer(page).locator('.luz-site-footer__brand');
      await expect(brand).toHaveCount(1);
      await expect(brand).toContainText('LUZ');
      await expect(brand).toContainText(/\d+\.\d+\.\d+/);
      await expect(brand.locator('svg, img').first()).toBeVisible();
      // The titles are headings of the groups of the site map; there is no Language column
      await expect(footer(page).locator('nav.landing-foot-nav')).toHaveAccessibleName(EN['footer.nav']);
      await expect(footer(page).locator('h2.luz-site-footer__col-title')).toHaveText([EN['site.docs'], EN['footer.reference'], EN['footer.resources'], EN['footer.community']]);
      await expect(footer(page).locator('.landing-foot-group')).toHaveCount(4);
      await expect(footer(page).locator('a[hreflang]')).toHaveCount(0);
      // Side by side from 1280px: the brand and the four groups in one row
      const tops = await footer(page).locator('.luz-site-footer__brand, .landing-foot-group').evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
    });

    test('the brand line: one link to the home with the logo, the word and the beta badge; the version is no link to the changelog', async ({ page }) => {
      await open(page);

      const home = footer(page).locator('.landing-brand a.landing-brand__home');
      await expect(home).toHaveCount(1);
      await expect(home).toHaveAttribute('href', '/');
      await expect(home).toHaveAccessibleName(`LUZ ${EN['footer.beta']} v${version('core')}`);
      await expect(home.locator('.site-badge__version')).toHaveText(`v${version('core')}`);
      await expect(home.locator('svg').first()).toHaveAttribute('aria-hidden', 'true');
      await expect(footer(page).locator('.landing-brand a')).toHaveCount(1);
      await expect(footer(page).locator('.landing-brand__version, .landing-brand__beta')).toHaveCount(0);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: the four groups hold the twenty-one links of the site map, in order, under their titles (${lang})`, async ({ page }) => {
        const words = catalog(lang);
        await open(page, route);

        const groups = await footer(page).locator('.landing-foot-group').all();
        expect(groups).toHaveLength(4);
        const titles = ['site.docs', 'footer.reference', 'footer.resources', 'footer.community'].map((key) => words[key]);
        const counts = [];
        for (const [index, group] of groups.entries()) {
          await expect(group.locator('h2')).toHaveText(titles[index]);
          await expect(group.locator('ul')).toHaveAccessibleName(titles[index]);
          counts.push(await group.locator('a').count());
        }
        expect(counts).toEqual([5, 6, 5, 5]);
        // An Arabic reader is told, in the link, that the docs are English
        if (lang === 'ar') for (const a of await footer(page).locator('.landing-foot-nav a[href^="/docs/"]').all()) await expect(a).toHaveAttribute('hreflang', 'en');
      });
    }

    test('the links of the site map are targets of 24px or more', async ({ page }) => {
      await open(page);

      for (const link of await footer(page).locator('.landing-foot-nav a').all()) expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(24);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: the legal line names the MIT licence, with a link to it (${lang})`, async ({ page }) => {
        await open(page, route);

        const legal = footer(page).locator('p.landing-legal');
        await expect(legal).toHaveText(plain(catalog(lang)['footer.legal']));
        await expect(legal.locator('a[href="https://github.com/nandomunoz/luz/blob/main/LICENSE"]')).toHaveCount(1);
        // The author is named, as a link to his GitHub
        await expect(legal.locator('a[href="https://github.com/nandomunoz"]')).toHaveText('Fernando Muñoz');
      });
    }

    test('the colour mode switcher is the <luz-theme-time> of the footer around core\'s <luz-theme-mode>, with its four radios', async ({ page }) => {
      await open(page);

      const time = footer(page).locator('luz-theme-time');
      await expect(time).toHaveCount(1);
      const mode = time.locator('luz-theme-mode');
      await expect(mode).toHaveCount(1);
      expect(await mode.locator('input[name="luz-theme-mode"]').evaluateAll((all) => all.map((r) => r.value))).toEqual(['auto', 'light', 'dark', 'high-contrast']);
      await expect(time.locator('.luz-theme-time__moments input[data-from]')).toHaveCount(6);
    });

    for (const width of [320, 1280]) {
      test(`the switcher's legend, "Color mode", names the round button and is not drawn at ${width}px (the button sits in the window's corner)`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const legend = footer(page).locator('fieldset.luz-theme-mode__group legend');
        await expect(legend).toHaveText('Color mode');
        // The group is out of sight under the button, so the legend is not drawn; the button says it
        expect(await legend.evaluate((el) => el.getClientRects().length)).toBe(0);
        await expect(footer(page).locator('.luz-theme-mode__button')).toHaveAccessibleName(/^Color mode: /);
      });
    }

    for (const width of [320, 360, 768, 1280]) {
      test(`the switcher, the brand and the columns overlap nothing and fit at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page);

        const box = (selector) => footer(page).locator(selector).first().evaluate((el) => el.getBoundingClientRect().toJSON());
        const mode = await box('luz-theme-time');
        expect(mode.left).toBeGreaterThanOrEqual(-1);
        expect(mode.right).toBeLessThanOrEqual(width + 1);
        const others = await footer(page).locator('.luz-site-footer__brand, .landing-foot-group').evaluateAll((all) => all.map((el) => el.getBoundingClientRect().toJSON()));
        for (const other of others) {
          const apart = mode.left >= other.right - 1 || mode.right <= other.left + 1 || mode.top >= other.bottom - 1 || mode.bottom <= other.top + 1;
          expect(apart).toBe(true);
        }
      });
    }
  });

  /* ---- The language, from the page ---------------------------------------- */

  test.describe('language', () => {
    test('the header\'s switch goes to the Spanish home and back, and the page changes language and direction', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await open(page);

      await page.locator('luz-lang-switch button').click();
      await page.locator('luz-lang-switch').getByRole('link', { name: 'Español' }).click();
      await expect(page).toHaveURL(/\/es\/$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page.locator('h1')).toContainText('Sistema de diseño');

      await page.locator('luz-lang-switch button').click();
      await page.locator('luz-lang-switch').getByRole('link', { name: 'العربية' }).click();
      await expect(page).toHaveURL(/\/ar\/$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('Arabic: right to left, the code stays left to right and the two-column sections are mirrored', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, '/ar/');

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      for (const block of await page.locator('#tokens pre.luz-code-block').all()) expect(await block.evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
      // In English the text of the first level is at the start (left) and the panel after it; in Arabic, the other way round
      const copyFirst = await page.locator('#tokens').evaluate((section) => section.querySelector('.landing-inside__copy').getBoundingClientRect().left < section.querySelector('.landing-panel').getBoundingClientRect().left);
      expect(copyFirst).toBe(false);
    });

    for (const width of [320, 360]) {
      test(`Arabic at ${width}px: nothing scrolls sideways, in the sections and in the footer`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, '/ar/');

        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        const wide = await page.locator('main section, footer').evaluateAll((all, w) => all.filter((el) => el.getBoundingClientRect().right > w + 1 || el.getBoundingClientRect().left < -1).map((el) => el.id || el.className), width);
        expect(wide).toEqual([]);
      });
    }
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    for (const width of [360, 1280]) {
      test(`everything is readable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // The markup names no mode: the page is Vejer light because the system is light
        expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false);
        expect(channels(await colorOf(page.locator('html'), '--luz-surface-page'))).toEqual(vejer('light', '--luz-surface-page'));
        // Every section has words to read and nothing is hidden waiting for a script
        for (const id of SECTIONS) {
          const section = page.locator(`main section#${id}`);
          await expect(section, id).toHaveCount(1);
          await expect(section.locator('h1, h2').first(), id).toBeAttached();
          expect((await section.innerText()).trim().length, id).toBeGreaterThan(20);
        }
        await expect(page.locator('h1')).toBeVisible();
        for (const id of ['tokens', 'core', 'catalog', 'ai', 'faq']) {
          for (const element of await page.locator(`#${id} h2, #${id} h3`).all()) await expect(element).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
      });
    }

    test('the light says what the room is for', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('.landing-light__nojs')).toBeVisible();
      await expect(page.locator('.landing-light__nojs')).toHaveText(EN['light.nojs']);
      // Its room is kept: the section does not collapse around a sentence
      expect((await page.locator('#light').boundingBox())?.height ?? 0).toBeGreaterThan(120);
    });

    test('the panels of each level are all there, one under the other: Install, List and Code example', async ({ page }) => {
      await page.goto('/');

      for (const { n } of LEVELS) {
        for (const pane of ['install', 'list', 'code']) await expect(page.locator(`#${LEVEL_ID[n]}-${pane}`), `level ${n} ${pane}`).toBeVisible();
      }
      // Level 4 has no panes: its terminal shows Claude Code's install whole, still (the other assistants' lines stay
      // hidden: tests/home-cli.spec.js), and the way to the prompts is a link
      const lines = page.locator('#ai .landing-cli__line:not([hidden])');
      expect(await lines.count()).toBeGreaterThanOrEqual(5);
      await expect(page.locator('#ai .landing-cli__line:visible')).toHaveCount(await lines.count());
      await expect(page.locator('#ai a[href="/docs/kinds/"]')).toBeVisible();
    });

    test('the controls that need a script are not shown: the Copy buttons', async ({ page }) => {
      await page.goto('/');

      // Levels 1 to 3 have npm and the CDN; level 4 npm and the install command in its terminal
      const copy = page.locator('#tokens [data-copy-from], #core [data-copy-from], #catalog [data-copy-from], #ai [data-copy-from]');
      expect(await copy.count()).toBeGreaterThanOrEqual(8);
      // npm, and the command in its terminal; the usual commands are to read, not to copy
      await expect(page.locator('#ai [data-copy-from]')).toHaveCount(2);
      for (const control of await copy.all()) await expect(control).toBeHidden();
    });

    test('the snippets are text that can be selected, and the code blocks are focusable regions', async ({ page }) => {
      await page.goto('/');

      const blocks = page.locator('main pre.luz-code-block, main pre.luz-terminal__code'); // the terminal's code is not a .luz-code-block
      // Three for each of the three levels: npm, CDN and the code example
      expect(await blocks.count()).toBeGreaterThanOrEqual(9);
      // Level 4 has npm and the usual commands; its other pre is the title the skill prints, a picture hidden from a screen reader (tests/home-cli.test.js)
      await expect(page.locator('#ai pre:not(.landing-cli__art[aria-hidden="true"]):not(.luz-code-block)')).toHaveCount(0);
      await expect(page.locator('#ai pre.luz-code-block')).toHaveCount(2);
      for (const block of await blocks.all()) {
        await expect(block).toHaveAttribute('tabindex', '0');
        await expect(block).toHaveAttribute('role', 'region');
        await expect(block).toHaveAttribute('aria-label', /\S/);
      }
    });

    for (const width of [320, 1280]) {
      test(`the legend of the switcher is shown as text at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/');

        const legend = page.locator('footer fieldset.luz-theme-mode__group legend');
        await expect(legend).toHaveText('Color mode');
        const box = await legend.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, clip: getComputedStyle(el).clip };
        });
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(12);
        expect(box.clip).toBe('auto');
      });
    }

    test('the color mode switcher is four radios (Auto, Light, Dark, High contrast): targets of 24px or more at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/');

      await expect(page.locator('footer .luz-theme-mode__button')).toBeHidden();
      const boxes = await page.locator('footer .luz-theme-mode__option').evaluateAll((labels) => labels.map((el) => el.getBoundingClientRect()));
      expect(boxes).toHaveLength(4);
      for (const box of boxes) {
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    });

    // What the radios change is the page's colors, read from the surface token: the body itself is
    // transparent over the sky
    const surface = (page) => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--luz-surface-page').trim());

    test('the arrow keys move between the modes', async ({ page }) => {
      await page.goto('/');
      const before = await surface(page);

      await page.focus('.luz-theme-mode__group input[value="light"]');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('.luz-theme-mode__group input[value="dark"]')).toBeChecked();
      await expect.poll(() => surface(page)).not.toBe(before);
    });

    test('the color mode switcher works', async ({ page }) => {
      await page.goto('/');
      const before = await surface(page);

      await page.click('footer .luz-theme-mode__option:has(input[value="dark"])');
      await expect(page.locator('footer input[name="luz-theme-mode"][value="dark"]')).toBeChecked();
      await expect.poll(() => surface(page)).not.toBe(before);
    });
  });

  /* ---- Accessibility ------------------------------------------------------ */

  test.describe('structure and accessibility of the page itself', () => {
    test('one banner, one main, one contentinfo, and uniquely named navs', async ({ page }) => {
      await open(page);

      await expect(page.locator('body > header')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);
      // Navs that are displayed: the site links live in the header row or,
      // at 768px and below, in the menu drawer, never in both at once; the
      // footer's columns are named by their titles
      const names = await page
        .locator('nav')
        .evaluateAll((navs) =>
          navs.filter((el) => el.checkVisibility()).map((el) => el.getAttribute('aria-label') ?? document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent?.trim()),
        );
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(names.length);
    });

    for (const [route, lang] of ROUTES) {
      test(`${route}: no two navigation landmarks share a name, the header's language menu and the footer's Language column included (${lang})`, async ({ page }) => {
        await open(page, route);

        // Every nav of the page, shown or not: a menu that is closed now is a landmark once it opens
        const names = await page.locator('nav').evaluateAll((navs) =>
          navs.map((el) => ({
            where: el.className.split(' ')[0],
            name: (el.getAttribute('aria-label') ?? document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent ?? '').trim(),
          })),
        );
        expect(names.every((n) => n.name), JSON.stringify(names)).toBe(true);
        const byName = Object.groupBy(names, (n) => n.name);
        const shared = Object.entries(byName).filter(([, group]) => (group ?? []).length > 1).map(([name, group]) => `${name}: ${(group ?? []).map((g) => g.where).join(' + ')}`);
        expect(shared, 'names used by more than one nav').toEqual([]);
      });
    }

    test('labels say "color mode", never "theme"', async ({ page }) => {
      await open(page);

      // Identifiers (file, class, attribute and export names) live in <code>
      const offenders = await page.evaluate(() => {
        const found = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!/theme/i.test(node.textContent)) continue;
          if (node.parentElement.closest('code, pre, script, style, [aria-hidden="true"]')) continue;
          // The lists of names are the files and elements of the packages (theme-mode, theme-time): identifiers, as in <code>
          if (node.parentElement.closest('.landing-names__list')) continue;
          // The site search's dialog names docs pages by their titles ("Color modes and themes")
          if (node.parentElement.closest('luz-search dialog.luz-search')) continue;
          found.push(node.textContent.trim());
        }
        document.querySelectorAll('[aria-label], [title], [alt]').forEach((el) => {
          for (const name of ['aria-label', 'title', 'alt']) {
            if (/theme/i.test(el.getAttribute(name) ?? '')) found.push(el.getAttribute(name));
          }
        });
        return found;
      });
      expect(offenders).toEqual([]);
    });

    test('the beta and version tags are text', async ({ page }) => {
      await open(page);

      // "beta" and the version are one badge in the link of the brand, in the footer and in the header; neither is a link to the changelog
      await expect(page.locator('footer .landing-brand .site-badge__version')).toHaveText(`v${version('core')}`);
      await expect(page.locator('footer .landing-brand .site-badge')).toContainText(/beta/i);
      await expect(page.locator('.site-header .site-badge__version')).toHaveText(`v${version('core')}`);
      await expect(page.locator('.site-header__version')).toHaveCount(0);
      await expect(page.locator('.site-header .luz-tag')).toHaveCount(0);
      await expect(page.locator('.site-header a[href$="CHANGELOG.md"], footer .landing-brand a[href$="CHANGELOG.md"]')).toHaveCount(0);
    });

    test('the page background is one flat color', async ({ page }) => {
      await open(page);

      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe(
        'none',
      );
    });

    test('standalone links are honest targets', async ({ page }) => {
      await open(page);

      const heights = await page
        .locator('.site-header__nav a, #tokens a, .luz-site-footer a')
        .evaluateAll((links) => links.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(14);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(24);
    });

    for (const mode of MODES) {
      test(`the text of the page has a contrast of 4.5:1 or more in ${mode}`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem('luz-theme', value);
        }, mode);
        await open(page, '/?look=city');
        expect(await theme(page)).toBe(mode);
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
        await faded(page);

        const { checked, failures } = await page.evaluate(() => {
          // Any CSS color a computed style can hold (rgb, color(srgb …), oklab …) as 8-bit sRGB
          const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const parse = (value) => {
            canvas.clearRect(0, 0, 1, 1);
            canvas.fillStyle = '#000';
            canvas.fillStyle = value;
            canvas.fillRect(0, 0, 1, 1);
            const [r, g, b, alpha] = canvas.getImageData(0, 0, 1, 1).data;
            return { r, g, b, a: alpha / 255 };
          };
          const over = (top, bottom) => ({
            r: top.r * top.a + bottom.r * (1 - top.a),
            g: top.g * top.a + bottom.g * (1 - top.a),
            b: top.b * top.a + bottom.b * (1 - top.a),
            a: 1,
          });
          const luminance = ({ r, g, b }) => {
            const channel = (v) => {
              const c = v / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
          };
          const backgroundOf = (el) => {
            const layers = [];
            for (let node = el; node; node = node.parentElement) {
              const color = parse(getComputedStyle(node).backgroundColor);
              if (color.a > 0) layers.push(color);
              if (color.a === 1) break;
            }
            let result = layers.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
            while (layers.length) result = over(layers.pop(), result);
            return result;
          };

          // The text of the main and of the footer, but not <home-light> (it has its own measure over
          // its pixels: tests/home-light.spec.js) nor what is aria-hidden
          const failures = [];
          let checked = 0;
          const walker = document.createTreeWalker(document.querySelector('main').parentElement, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const el = node.parentElement;
            if (!node.textContent.trim() || !el.closest('main, footer') || el.closest('home-light, [aria-hidden="true"], script, style')) continue;
            if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
            checked += 1;
            const background = backgroundOf(el);
            const color = over(parse(getComputedStyle(el).color), background);
            const [a, b] = [luminance(color), luminance(background)];
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < 4.5) {
              failures.push(`${ratio.toFixed(2)} ${el.tagName}.${el.className} "${node.textContent.trim().slice(0, 30)}"`);
            }
          }
          return { checked, failures: [...new Set(failures)] };
        });
        expect(checked).toBeGreaterThan(150);
        expect(failures).toEqual([]);
      });
    }

    test('keyboard: skip link first, then the main content', async ({ page }) => {
      await open(page);

      await page.keyboard.press('Tab');
      await expect(page.locator('.luz-skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
    });

    const BLOCKING = ['serious', 'critical'];
    const violations = async (page) => {
      const { violations: found } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      return found.filter((v) => BLOCKING.includes(v.impact ?? '')).map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s) - ${v.nodes[0]?.target?.join(' ')}`);
    };

    for (const [name, time, mode] of LIGHTS) {
      test(`axe: / in the ${name} light (${time}, ${mode})`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chromium only');
        await openLive(page, '/?look=city', time);
        await expect.poll(() => light(page)).toBe(name);
        expect(await theme(page)).toBe(mode);
        await faded(page);
        expect(await violations(page), 'serious/critical axe violations').toEqual([]);
      });
    }

    for (const mode of MODES) {
      for (const [route] of ROUTES) {
        test(`axe: ${route} in ${mode}`, async ({ page, browserName }) => {
          test.skip(browserName !== 'chromium', 'Chromium only');
          await seedMode(page, mode);
          await atTime(page, '14:00');
          await open(page, `${route}?look=map`);
          expect(await theme(page)).toBe(mode);
          // The List and Code example tabs open too, so axe reads their panels
          for (const n of [1, 2, 3]) {
            await page.locator(`#${LEVEL_ID[n]}-install`).scrollIntoViewIfNeeded();
            await page.locator(`#${LEVEL_ID[n]}`).getByRole('tab').nth(1).click();
          }
          await faded(page);
          expect(await violations(page), 'serious/critical axe violations').toEqual([]);
        });
      }
    }
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no smooth scrolling', async ({ page }) => {
      await open(page);

      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      ).toBe('auto');
    });
  });

  test.describe('install guide', () => {
    // The Install page writes each CDN URL with the version of that package.json (owner decision D9),
    // so the test reads it too: it is 0.1.0 (published by hand on 2026-10-19) and changes with `changeset version`
    const cdn = (pkg, file) => `@luz-ds/${pkg}@${version(pkg)}/dist/${file}`;
    const levels = [
      {
        id: 'level-1-tokens-only',
        install: 'pnpm add @luz-ds/tokens',
        files: [cdn('tokens', 'luz-tokens.min.css')],
        absent: ['@luz-ds/core', '@luz-ds/catalog'],
      },
      {
        id: 'level-2-tokens-and-core',
        install: 'pnpm add @luz-ds/tokens @luz-ds/core',
        files: [
          cdn('tokens', 'luz-tokens.min.css'),
          cdn('core', 'luz.min.css'),
          cdn('core', 'luz.min.js'),
        ],
        absent: ['@luz-ds/catalog'],
      },
      {
        id: 'level-3-tokens-core-and-catalog',
        install: 'pnpm add @luz-ds/tokens @luz-ds/core @luz-ds/catalog',
        files: [
          cdn('tokens', 'luz-tokens.min.css'),
          cdn('core', 'luz.min.css'),
          cdn('catalog', 'components/search.min.css'),
          cdn('core', 'luz.min.js'),
          cdn('catalog', 'catalog.min.js'),
        ],
        absent: [],
      },
    ];

    test('each level has one install command, one CDN snippet and one bundler snippet', async ({ page }) => {
      await page.goto('/docs/get-started/');

      for (const [index, level] of levels.entries()) {
        const section = page.locator('.docs-prose').filter({ has: page.locator(`#${level.id}`) });
        await expect(section.locator('.docs-command-block')).toHaveCount(1);
        await expect(section.locator('pre.luz-code-block')).toHaveCount(2);

        const command = await section.locator('.docs-command-block__cmd').textContent();
        expect(command.replace(/\s+/g, ' ').replace(/^\s*\$\s*/, '').trim()).toBe(level.install);
        await expect(section.locator('.docs-command-block .luz-copy-btn')).toHaveAttribute('data-copy', level.install);
        // Each snippet has its own Copy button, pointing at its code
        for (const kind of ['cdn', 'bundler']) {
          const button = section.locator(`.docs-snippet .luz-copy-btn[data-copy-from="code-${kind}-level-${index + 1}"]`);
          await expect(button).toHaveCount(1);
          await expect(section.locator(`pre.luz-code-block code#code-${kind}-level-${index + 1}`)).toHaveCount(1);
        }

        const snippet = await section.locator(`code#code-cdn-level-${index + 1}`).textContent();
        let position = -1;
        for (const file of level.files) {
          // Present, and in load order
          const found = snippet.indexOf(file);
          expect(found, `${file} in level ${index + 1}`).toBeGreaterThan(position);
          position = found;
        }
        for (const name of level.absent) expect(snippet).not.toContain(name);
        // Every CDN URL pins the exact version of its package
        const urls = snippet.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/\S+?(?=")/g);
        expect(urls).toHaveLength(level.files.length);
        for (const url of urls) {
          const [, pkg, pinned] = url.match(/@luz-ds\/(tokens|core|catalog)@([^/]+)\//) ?? [];
          expect(pkg, url).toBeTruthy();
          expect(pinned, url).toBe(version(pkg));
        }
        for (const script of snippet.match(/<script[^>]*>/g) ?? []) {
          expect(script).toMatch(/^<script type="module" src="[^"]+\.min\.js">$/);
        }
      }
    });
  });
});
