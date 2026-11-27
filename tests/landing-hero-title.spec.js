// @ts-check
/**
 * The type of the home's first screen and the page's rhythm, in English, Spanish and Arabic (it was
 * tests/landing-hero-lead.spec.js while the hero had a lead).
 *
 * The hero (the tunnel hero, owner 2026-11-27) is the word LUZ, the title and two buttons. It has no lead: the three
 * words Light, Usable and Zero-dependency are the head of Who we are, in English in every language. The title
 * follows the window's width in rem and vw, so the reader's text size still scales it (WCAG 1.4.4): from 2.75rem on
 * every phone to 4.5rem, clamp(2.75rem, 1.25rem + 5vw, 4.5rem), at line height 1.05 (1.25 in Arabic, whose letters
 * reach higher and lower), a column of 14em at most, centred and balanced. The word above it is clamp(8rem, 2rem +
 * 40vw, 14rem), so it is larger than the title at every width.
 *
 * The sections of the home stand four times the package's gap apart (4 x --luz-space-3xl, 256 px at the default size).
 *
 * Runs with and without JavaScript: it is the page's CSS.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];

/** The computed size, in px, of a CSS length written in the page (a clamp of rem and vw, for one). */
const px = (page, value) => page.evaluate((v) => {
  const probe = document.createElement('span');
  probe.style.fontSize = v;
  document.body.append(probe);
  const size = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  return size;
}, value);

test.describe('the hero has no lead', () => {
  for (const [route] of ROUTES) {
    test(`${route}: no lead paragraph, and nothing but the title and the buttons in the copy`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.luz-hero__lead')).toHaveCount(0);
      expect(await page.locator('#hero .luz-hero__copy > *').evaluateAll((all) => all.map((el) => el.localName + (el.className ? `.${el.className.split(' ')[0]}` : '')))).toEqual(['h1.luz-hero__title', 'div.o-actions']);
    });
  }

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the hero is the same: the title and two buttons, no lead', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.luz-hero__lead')).toHaveCount(0);
      await expect(page.locator('#hero a.luz-btn')).toHaveCount(2);
    });
  });
});

test.describe('the hero title and the word LUZ', () => {
  for (const [route] of ROUTES) {
    for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1920, 1080]]) {
      test(`${route} at ${width} x ${height}: the title is clamp(2.75rem, 1.25rem + 5vw, 4.5rem) at line height 1.05 (1.25 in Arabic), the word clamp(8rem, 2rem + 40vw, 14rem)`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const title = await page.locator('.luz-hero__title').evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight) }));
        expect(title.size, 'title').toBeCloseTo(await px(page, 'clamp(2.75rem, 1.25rem + 5vw, 4.5rem)'), 1);
        expect(title.line / title.size, 'line height').toBeCloseTo(route === '/ar/' ? 1.25 : 1.05, 2);
        const brand = await page.locator('.landing-hero__brand').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(brand, 'the word').toBeCloseTo(await px(page, 'clamp(8rem, 2rem + 40vw, 14rem)'), 1);
        expect(brand, 'the word is larger than the title').toBeGreaterThan(title.size);
      });
    }
  }

  test('the title is a column of 14em at most, centred, balanced', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const found = await page.locator('.luz-hero__title').evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const hero = el.closest('.luz-hero').getBoundingClientRect();
      return { width: r.width, em: parseFloat(cs.fontSize), wrap: cs.textWrapStyle, align: cs.textAlign, centre: (r.left + r.right) / 2, hero: (hero.left + hero.right) / 2 };
    });
    expect(found.width).toBeLessThanOrEqual(14 * found.em + 0.5);
    expect(found.wrap).toBe('balance');
    expect(found.align).toBe('center');
    expect(Math.abs(found.centre - found.hero)).toBeLessThanOrEqual(1);
  });

  for (const [route] of ROUTES) {
    for (const [width, height] of [[320, 568], [360, 640], [390, 844]]) {
      test(`${route} at ${width} x ${height}: the title keeps its size on a short phone, as on a tall one`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const size = () => page.locator('.luz-hero__title').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        const phone = await size();
        await page.setViewportSize({ width, height: 1000 });
        expect(await size()).toBe(phone);
      });
    }
  }
});

test.describe('the gap between the sections', () => {
  for (const width of [375, 1280]) {
    test(`${width}px: the sections of the home are 4 x --luz-space-3xl apart`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const found = await page.locator('.landing-wrap').first().evaluate((wrap) => {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;inline-size:var(--luz-space-3xl)';
        wrap.append(probe);
        const unit = probe.getBoundingClientRect().width;
        probe.remove();
        return { gap: parseFloat(getComputedStyle(wrap).rowGap), unit };
      });
      expect(found.unit).toBeGreaterThan(0);
      expect(found.gap).toBeCloseTo(found.unit * 4, 1);
    });
  }

  test('at the default text size and 1280 px it is 256 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const gap = await page.locator('.landing-wrap').first().evaluate((wrap) => parseFloat(getComputedStyle(wrap).rowGap));
    expect(gap).toBe(256);
  });

  test('two neighbouring sections stand that far apart on the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const gaps = await page.locator('.landing-wrap').first().evaluate((wrap) => {
      const sections = [...wrap.children].filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
      const out = [];
      for (let i = 1; i < sections.length; i++) out.push(Math.round(sections[i].getBoundingClientRect().top - sections[i - 1].getBoundingClientRect().bottom));
      return out;
    });
    expect(gaps.length).toBeGreaterThan(4);
    expect(gaps.filter((gap) => gap === 256).length, `gaps ${gaps}`).toBeGreaterThanOrEqual(gaps.length - 2);
  });
});
