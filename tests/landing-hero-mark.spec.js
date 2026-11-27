// @ts-check
/* global atob, createImageBitmap, Blob, OffscreenCanvas -- used inside page.evaluate(), which runs in the browser */
/**
 * The mark of the home's hero: the word LUZ, an SVG of three paths (`.landing-wordmark`, one per letter, outlined
 * from ET Book and inlined from apps/site/_partials/luz-wordmark.html) in `.landing-hero__brand.landing-imago` in the
 * h1, with the three tints of the prism as a faint mask over it. The prism is the logo of the header and the footer;
 * the hero is the word alone. What is read here:
 *
 * - what a reader hears: the drawing is hidden from the tree (`aria-hidden`, `lang="en"`, `dir="ltr"`), a visually
 *   hidden "LUZ" is what is said, and the h1 is "LUZ" and the sentence, in every language;
 * - the size: the drawing is .7 of the brand's em tall, 2756 by 1434 in proportion, and the brand follows the
 *   window's width (clamp(8rem, 2rem + 40vw, 14rem); the title's size is in tests/landing-hero-title.spec.js);
 * - the pixels: the mask only lowers the alpha. With it on, the word has the same ink as with it off (the U whole),
 *   and no pixel is lighter than the lowest tint, in the three modes; in forced colours the mask is gone and the
 *   word is drawn in the system's text colour;
 * - no sideways scroll at 320 px, nor at 640 px (200 % zoom of a desktop window), in the three languages.
 *
 * Runs in `chromium` and `chromium-nojs`: the word is markup and CSS.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { faded } from './helpers/settle.js';

const CATALOG = (code) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${code}.json`, import.meta.url), 'utf-8'));
const ROUTES = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];
/** The lowest tint of the mask: the word keeps at least this share of its ink. */
const LOWEST_TINT = 0.72;

test.describe('the hero mark: what a reader hears', () => {
  for (const [route, code] of ROUTES) {
    test(`${route}: the drawing is hidden, a hidden "LUZ" is said, and the h1 is LUZ and the sentence`, async ({ page }) => {
      await page.goto(route);
      const brand = page.locator('#hero-title .landing-hero__brand.landing-imago');
      await expect(brand, 'the word is in the h1').toHaveCount(1);
      await expect(brand).toHaveAttribute('lang', 'en');
      await expect(brand).toHaveAttribute('dir', 'ltr');
      const word = brand.locator('svg.landing-wordmark');
      await expect(word).toHaveCount(1);
      await expect(word).toHaveAttribute('aria-hidden', 'true');
      await expect(word.locator('path')).toHaveClass(['landing-wordmark__l', 'landing-wordmark__u', 'landing-wordmark__z']);
      await expect(brand.locator('.u-sr-only')).toHaveText('LUZ');
      const sentence = CATALOG(code)['hero.title'].replace(/<[^>]*>/g, '');
      await expect(page.locator('#hero-title')).toHaveAccessibleName(`LUZ ${sentence}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });
  }
});

/** A page in a window of `width` by `height`, with the word's numbers read in it. */
async function measure(page, route, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(route);
  return page.evaluate(() => {
    const brand = document.querySelector('.landing-imago');
    const word = document.querySelector('.landing-wordmark');
    const box = word.getBoundingClientRect();
    return {
      brand: parseFloat(getComputedStyle(brand).fontSize),
      height: box.height,
      width: box.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

test.describe('the hero mark: the size', () => {
  for (const width of [320, 390, 768, 1280, 1920]) {
    test(`at ${width} px wide the drawing is .7 of the brand's em tall, in the proportion of its box`, async ({ page }) => {
      const m = await measure(page, '/', width, 900);
      expect(m.height, 'height').toBeCloseTo(0.7 * m.brand, 1);
      expect(m.width / m.height, 'proportion').toBeCloseTo(2756 / 1434, 2);
    });
  }

  for (const width of [320, 340, 360, 375]) {
    for (const [route] of ROUTES) {
      test(`${route} at ${width} px wide the three letters stand in one row, left to right, inside the window`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);
        const { letters, box, inner } = await page.locator('.landing-wordmark').evaluate((svg) => ({
          letters: [...svg.querySelectorAll('path')].map((path) => path.getBoundingClientRect().toJSON()),
          box: svg.getBoundingClientRect().toJSON(),
          inner: document.documentElement.clientWidth,
        }));
        expect(letters, 'L, U and Z').toHaveLength(3);
        // One row: each letter overlaps the first one vertically; left to right also in Arabic (the word is dir="ltr")
        for (const letter of letters) {
          expect(letter.top, 'starts above the bottom of the row').toBeLessThan(letters[0].bottom);
          expect(letter.bottom, 'ends below the top of the row').toBeGreaterThan(letters[0].top);
        }
        expect(letters[0].left).toBeLessThan(letters[1].left);
        expect(letters[1].left).toBeLessThan(letters[2].left);
        for (const letter of letters) {
          expect(letter.left, 'inside the window').toBeGreaterThanOrEqual(-0.5);
          expect(letter.right, 'inside the window').toBeLessThanOrEqual(inner + 0.5);
        }
        expect(box.left).toBeGreaterThanOrEqual(-0.5);
        expect(box.right).toBeLessThanOrEqual(inner + 0.5);
      });
    }
  }
});

test.describe('the hero mark: no sideways scroll', () => {
  for (const [route] of ROUTES) {
    for (const width of [320, 640]) {
      test(`${route} at ${width} px nothing scrolls sideways`, async ({ page }) => {
        const m = await measure(page, route, width, 800);
        expect(m.overflow).toBeLessThanOrEqual(0);
      });
    }
  }
});

/**
 * The ink of the word with the mask on, off, and the page under it, as three screenshots of the word's box, read in
 * the page. A pixel's ink is how far it is from the same pixel with the word hidden.
 */
async function inkOf(page) {
  await page.addStyleTag({
    content: `
      html, body { background: #fff !important; }
      body * { visibility: hidden !important; }
      .landing-imago, .landing-imago * { visibility: visible !important; }
      .landing-imago { filter: none !important; }`,
  });
  const clip = await page.locator('.landing-wordmark').evaluate((word) => {
    const r = word.getBoundingClientRect();
    const grow = 12;
    return { x: Math.max(0, Math.floor(r.left - grow)), y: Math.max(0, Math.floor(r.top - grow)), width: Math.ceil(r.width + 2 * grow), height: Math.ceil(r.height + 2 * grow) };
  });
  const take = () => page.screenshot({ clip, animations: 'disabled' });
  const withMask = await take();
  await page.addStyleTag({ content: '.landing-wordmark { mask-image: none !important; -webkit-mask-image: none !important; }' });
  const withoutMask = await take();
  await page.addStyleTag({ content: '.landing-imago { visibility: hidden !important; } .landing-imago * { visibility: hidden !important; }' });
  const blank = await take();
  return page.evaluate(async ({ a, b, c }) => {
    const decode = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      return { width: bitmap.width, height: bitmap.height, data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data };
    };
    const [on, off, none] = await Promise.all([decode(a), decode(b), decode(c)]);
    const distance = (img, i) => Math.abs(img.data[i] - none.data[i]) + Math.abs(img.data[i + 1] - none.data[i + 1]) + Math.abs(img.data[i + 2] - none.data[i + 2]);
    const box = (limit, img) => {
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, count = 0;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (distance(img, (y * img.width + x) * 4) >= limit) {
            count += 1;
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
        }
      }
      return { x0, y0, x1, y1, count };
    };
    let lowest = Infinity;
    let highest = 0;
    for (let i = 0; i < off.data.length; i += 4) {
      const full = distance(off, i);
      if (full < 150) continue;
      const share = distance(on, i) / full;
      lowest = Math.min(lowest, share);
      highest = Math.max(highest, share);
    }
    return { on: box(60, on), off: box(90, off), lowest, highest };
  }, { a: withMask.toString('base64'), b: withoutMask.toString('base64'), c: blank.toString('base64') });
}

test.describe('the hero mark: the mask never erases the word', () => {
  test.skip(({ javaScriptEnabled }) => javaScriptEnabled === false, 'the pixels are read by a script');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  for (const mode of ['light', 'dark', 'high-contrast']) {
    test(`in ${mode} the word is whole under the mask: same ink, the U not cut, no pixel lighter than the lowest tint`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, mode);
      await faded(page);
      const ink = await inkOf(page);
      expect(ink.off.count, 'the word paints something').toBeGreaterThan(2000);
      // Same extent in every direction: the bottom of the U is the one that was cut flat
      for (const side of ['x0', 'y0', 'x1', 'y1']) expect(Math.abs(ink.on[side] - ink.off[side]), `the mask does not cut the ${side} side`).toBeLessThanOrEqual(1);
      expect(ink.lowest, 'the mask lowers the alpha, never below the lowest tint').toBeGreaterThanOrEqual(LOWEST_TINT - 0.04);
      expect(ink.highest).toBeLessThanOrEqual(1.02);
      expect(ink.lowest, 'and the mask is there: the fan of the three tints crosses the word').toBeLessThan(0.92);
    });
  }

  test('in the Arabic page the word is the same: whole under the mask, left to right', async ({ page }) => {
    await page.goto('/ar/');
    const ink = await inkOf(page);
    expect(ink.off.count).toBeGreaterThan(2000);
    for (const side of ['x0', 'y0', 'x1', 'y1']) expect(Math.abs(ink.on[side] - ink.off[side]), side).toBeLessThanOrEqual(1);
    expect(ink.lowest).toBeGreaterThanOrEqual(LOWEST_TINT - 0.04);
  });

  test('in forced colours there is no mask: the word is drawn in the text colour, whole', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
    const style = await page.locator('.landing-wordmark').evaluate((word) => ({ mask: getComputedStyle(word).maskImage, color: getComputedStyle(word).color, filter: getComputedStyle(word.parentElement).filter }));
    expect(style.mask, 'no mask').toBe('none');
    expect(style.filter, 'no glow').toBe('none');
    const probe = await page.evaluate(() => {
      const el = document.createElement('span');
      el.style.color = 'CanvasText';
      document.body.append(el);
      const color = getComputedStyle(el).color;
      el.remove();
      return color;
    });
    expect(style.color, 'the system text colour').toBe(probe);
    const ink = await inkOf(page);
    expect(ink.off.count, 'the word paints something').toBeGreaterThan(2000);
    expect(ink.lowest, 'the whole word, not a lighter one').toBeGreaterThanOrEqual(0.97);
  });
});
