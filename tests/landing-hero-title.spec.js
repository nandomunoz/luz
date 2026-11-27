// @ts-check
/**
 * Two things of the home's first screen and the page's rhythm, in English, Spanish and Arabic.
 *
 * The lead of the hero (the tunnel hero, owner 2026-11-26): "Tokens, CSS and a little vanilla JavaScript, built on
 * what the browser already does. Light, Usable and Zero-dependency: start a project, or migrate it page by page."
 * The three words Light, Usable and Zero-dependency are <strong> (weight 600, the strong ink); "Zero-dependency" never
 * breaks at its hyphen, nor leaves the colon after it alone on the next line; there are no parentheses. Spanish and
 * Arabic keep the three words in English (lang="en"). Its size is clamp(1.25rem, 0.8vw + 1.05rem, 1.5rem), line
 * height 1.45, in a column of 36rem at most; the title is a section's title (--luz-text-4xl) from 769 px, and
 * clamp(2.75rem, 13vw, 3.75rem) at line height 1 below.
 *
 * The sections of the home stand four times the package's gap apart (4 x --luz-space-3xl, 256 px at the default size).
 *
 * Runs with and without JavaScript: it is the page's CSS.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [['/', 'en'], ['/es/', 'es'], ['/ar/', 'ar']];
const WORDS = ['Light', 'Usable', 'Zero-dependency'];

for (const [route, code] of ROUTES) {
  test.describe(`the lead of ${route}`, () => {
    test('has three strong words, in the strong ink at weight 600, and no parentheses', async ({ page }) => {
      await page.goto(route);
      const strong = page.locator('.luz-hero__lead strong');
      await expect(strong).toHaveText(WORDS);
      const found = await strong.evaluateAll((all) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--luz-text-primary)';
        document.body.append(probe);
        const ink = getComputedStyle(probe).color;
        probe.remove();
        return all.map((el) => ({ weight: Number(getComputedStyle(el).fontWeight), color: getComputedStyle(el).color, ink }));
      });
      for (const word of found) {
        expect(word.weight).toBe(600);
        expect(word.color).toBe(word.ink);
      }
      const text = await page.locator('.luz-hero__lead').innerText();
      expect(text).not.toMatch(/[()]/);
    });

    test('keeps Zero-dependency whole, and the colon after it on its line, at 320, 375, 700 and 1280 px', async ({ page }) => {
      for (const width of [320, 375, 700, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const word = page.locator('.luz-hero__lead strong', { hasText: 'Zero-dependency' });
        const found = await word.evaluate((el) => {
          // The colon is the first character after the word (after the lang="en" span and the isolate, in Spanish and Arabic)
          const walker = document.createTreeWalker(el.closest('.luz-hero__lead'), NodeFilter.SHOW_TEXT);
          walker.currentNode = el.lastChild;
          let colon = null;
          while (walker.nextNode()) {
            const at = walker.currentNode.textContent.indexOf(':');
            if (at > -1) {
              colon = document.createRange();
              colon.setStart(walker.currentNode, at);
              colon.setEnd(walker.currentNode, at + 1);
              break;
            }
          }
          const lines = new Set([...el.getClientRects()].map((r) => Math.round(r.top))).size;
          return { lines, word: el.getBoundingClientRect().bottom, colon: colon?.getBoundingClientRect().bottom ?? NaN };
        });
        expect(found.lines, `${width}px: one line`).toBe(1);
        expect(Math.abs(found.colon - found.word), `${width}px: the colon on the line of the word`).toBeLessThanOrEqual(4);
      }
    });

    if (code !== 'en') {
      test('keeps LUZ\'s three words in English: lang="en" around Light, Usable and Zero-dependency', async ({ page }) => {
        await page.goto(route);
        const english = page.locator('.luz-hero__lead [lang="en"]');
        await expect(english).toHaveCount(1);
        await expect(english.locator('strong')).toHaveText(['Light', 'Usable', 'Zero-dependency']);
      });
    }
  });
}

test.describe('the hero on a phone', () => {
  for (const [route] of ROUTES) {
    for (const [width, height] of [[320, 568], [360, 640], [390, 844]]) {
      test(`${route} at ${width} x ${height}: the lead is short and no smaller than the base text, the title as large as on a tall phone`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const sizes = () => page.evaluate(() => {
          const px = (selector) => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
          const probe = document.createElement('span');
          probe.style.fontSize = 'var(--luz-text-base)';
          document.body.append(probe);
          const base = parseFloat(getComputedStyle(probe).fontSize);
          probe.remove();
          return { lead: px('.luz-hero__lead'), title: px('.luz-hero__title'), base, length: document.querySelector('.luz-hero__lead').textContent.trim().length };
        });
        const phone = await sizes();
        expect(phone.lead, 'lead >= base').toBeGreaterThanOrEqual(phone.base);
        expect(phone.length, 'lead characters').toBeLessThanOrEqual(190);
        await page.setViewportSize({ width, height: 1000 });
        const tall = await sizes();
        expect(phone.title, 'title keeps its size on a short phone').toBe(tall.title);
      });
    }
  }
});

test.describe('the hero title and lead', () => {
  const px = (page, value) => page.evaluate((v) => {
    const probe = document.createElement('span');
    probe.style.fontSize = v;
    document.body.append(probe);
    const size = parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();
    return size;
  }, value);

  for (const [route] of ROUTES) {
    for (const [width, height] of [[1280, 800], [1024, 768]]) {
      test(`${route} at ${width} x ${height}: the title is a section's title, the lead the hero's clamp`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const size = (selector) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(await size('.luz-hero__title'), 'title').toBe(await size('.landing-inside__title'));
        expect(await size('.luz-hero__lead'), 'lead').toBeCloseTo(await px(page, 'clamp(1.25rem, 0.8vw + 1.05rem, 1.5rem)'), 1);
      });
    }

    for (const [width, height] of [[320, 568], [390, 844], [768, 1024]]) {
      test(`${route} at ${width} x ${height}: the title is clamp(2.75rem, 13vw, 3.75rem) at line height 1 (more room in Arabic), the lead the hero's clamp`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        const title = await page.locator('.luz-hero__title').evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight) }));
        expect(title.size).toBeCloseTo(await px(page, 'clamp(2.75rem, 13vw, 3.75rem)'), 1);
        expect(title.line / title.size).toBeCloseTo(route === '/ar/' ? 1.25 : 1, 2);
        expect(await page.locator('.luz-hero__lead').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(await px(page, 'clamp(1.25rem, 0.8vw + 1.05rem, 1.5rem)'), 1);
      });
    }
  }

  test('the lead is a column of 36rem at most, line height 1.45, centred under the title', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const lead = await page.locator('.luz-hero__lead').evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const t = el.closest('.luz-hero').querySelector('.luz-hero__title').getBoundingClientRect();
      return { width: r.width, line: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), wrap: cs.textWrapStyle, centre: (r.left + r.right) / 2, title: (t.left + t.right) / 2 };
    });
    expect(lead.width).toBeLessThanOrEqual(36 * 16 + 0.5);
    expect(lead.line).toBeCloseTo(1.45, 2);
    expect(lead.wrap).toBe('pretty');
    expect(Math.abs(lead.centre - lead.title)).toBeLessThanOrEqual(1);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the lead keeps its three strong words', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.luz-hero__lead strong')).toHaveText(WORDS);
  });
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
