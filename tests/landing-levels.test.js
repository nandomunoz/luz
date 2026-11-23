/**
 * The pages of the three levels, tokens, core and components (the catalog): a page of its own each, in the look of the
 * home, with every element of the level listed (owner, 2026-11-23). They are routes of the site, `/tokens/`, `/core/`
 * and `/components/`, and `/es/…`, `/ar/…` in the other languages.
 *
 * Each page is the home's template with its <main> replaced by `apps/landing/levels/<name>.html`
 * (`levelDocuments()`): the head, the header, the drawer and the footer are the home's, and nothing is written twice.
 * What the page needs from the generator is that its own address is the one the canonical link, the alternates and
 * the language switch say.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, levelDocuments, scanSite } from "../scripts/docs-site/site.js";
import { quoted } from "./helpers/quoted-attributes.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const HOME = "apps/landing/index.html";
const NAMES = ["tokens", "core", "components"];
/** The level of the home each page is the page of, and the list the home shows for it. */
const LEVEL = { tokens: { key: "l1", list: "in1-list" }, core: { key: "l2", list: "in2-list" }, components: { key: "l3", list: "in3-list" } };
const LANGS = [["en", "/"], ["es", "/es/"], ["ar", "/ar/"]];

const site = scanSite(join(repo, "apps/docs"), repo);
const home = read(HOME);
const levels = NAMES.map((name) => ({ name, file: `apps/landing/levels/${name}.html`, html: read(`apps/landing/levels/${name}.html`) }));
const extra = [...landingDocuments(site, HOME, home), ...levelDocuments(site, { file: HOME, html: home }, levels)];
const built = buildSite(site, { extra });
/** What the build wrote, with the quotes of its attributes restored to read it. */
const rendered = new Map([...built.rendered].map(([route, page]) => [route, quoted(page)]));
const { problems } = built;
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
const hrefsOf = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[1]);
/** The tag lists of a pane of the home: the blocks a reader sees under "List". */
const listsOf = (html, id) => {
  const start = html.indexOf(`id="${id}"`);
  const end = html.indexOf("</section>", start);
  return html.slice(start, end).match(/<div class="landing-names"[\s\S]*?<\/ul>\s*<\/div>/g) ?? [];
};

describe("the pages of the three levels", () => {
  it("are routes of the site in every language, with no broken link and no catalog key left over", () => {
    for (const [, prefix] of LANGS) for (const name of NAMES) expect(rendered.has(`${prefix}${name}/`), `${prefix}${name}/`).toBe(true);
    expect(problems).toEqual([]);
  });

  it.each(NAMES.flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: one h1, its own title, no template syntax", (name, code, prefix) => {
    const html = rendered.get(`${prefix}${name}/`);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`<html lang="${code}"`);
    expect(html).not.toMatch(/\{\{|\}\}|\{n:/);
    const title = /<title>([^<]*)<\/title>/.exec(html)[1];
    expect(title).not.toBe(/<title>([^<]*)<\/title>/.exec(rendered.get(prefix))[1]);
    expect(title).toBe(catalog(code)[`level.${name}.meta.title`].replace(/&/g, "&amp;"));
  });

  it.each(NAMES.flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: the address of the canonical link, the alternates and the language switch is the page's own", (name, code, prefix) => {
    const html = rendered.get(`${prefix}${name}/`);
    expect(hrefsOf(html, /<link rel="canonical" href="([^"]*)"/g)).toEqual([`${prefix}${name}/`]);
    const alternates = hrefsOf(html, /<link rel="alternate" hreflang="[^"]*" href="([^"]*)"/g);
    expect(alternates).toEqual(["/", "/es/", "/ar/", "/"].map((p) => `${p}${name}/`));
    expect(hrefsOf(html, /class="luz-lang-switch__link" href="([^"]*)"/g)).toEqual(["/", "/es/", "/ar/"].map((p) => `${p}${name}/`));
    // the footer's list of languages too
    const footer = html.slice(html.indexOf('class="page-nav__row"'));
    expect(hrefsOf(footer, /<li><a href="([^"]*)" hreflang/g).slice(0, 3)).toEqual(["/", "/es/", "/ar/"].map((p) => `${p}${name}/`));
  });

  it.each(["core", "components"].flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: lists every element the home lists for the level, link for link", (name, code, prefix) => {
    const page = rendered.get(`${prefix}${name}/`);
    const wanted = listsOf(rendered.get(prefix), LEVEL[name].list);
    expect(wanted.length).toBeGreaterThan(0);
    const all = page.slice(page.indexOf('id="all"'));
    for (const list of wanted) expect(all, `${prefix}${name}/ has the list`).toContain(list);
  });

  it.each(NAMES.flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: its links to the home are the language's, and the page links to the docs of its level", (name, code, prefix) => {
    const html = rendered.get(`${prefix}${name}/`);
    // no link to a section the page does not have: they go to the home of the language
    expect(hrefsOf(html, /<a\b[^>]*\shref="(#[^"]*)"/g).filter((href) => href !== "#main-content" && !href.startsWith("#all") && !href.startsWith("#install") && !href.startsWith("#hero") && !href.startsWith("#t-") && href !== "#steps")).toEqual([]);
    expect(html).toMatch(new RegExp(`href="${prefix}#inside"`));
    // the icons are the page's own: a <use> keeps pointing at the sprite, never at the home
    const uses = hrefsOf(html, /<use\b[^>]*\shref="([^"]*)"/g);
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.filter((href) => !/^#i\d+$/.test(href))).toEqual([]);
    expect(html).toMatch(/href="[^"]*\/docs\/(tokens|components|catalog)\/"/);
  });

  it("the home's buttons of the three levels go to their pages, in the language of the home", () => {
    for (const [, prefix] of LANGS) {
      const html = rendered.get(prefix);
      for (const name of NAMES) {
        const id = { tokens: "inside", core: "inside-2", components: "inside-3" }[name];
        const start = html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`));
        const section = html.slice(start, html.indexOf("<section", start + 1));
        expect(section, `${prefix} #${id}`).toMatch(new RegExp(`<a\\b[^>]*class="luz-btn[^"]*"[^>]*href="${prefix}${name}/"`));
      }
    }
  });

  describe("the page of the tokens: what a token is and how to use it, at a glance (owner, 2026-11-23)", () => {
    const tokens = [...new Set([...read("packages/tokens/dist/luz-tokens.css").matchAll(/^\s*(--luz-[\w-]+):/gm)].map((m) => m[1]))];
    const css = read("apps/landing/landing.css");
    const BLOCKS = [
      ["color", ["primitives", "semantic"]],
      ["scales", ["spacing", "typography", "radius", "shadows"]],
      ["motion", ["motion"]],
      ["breakpoints", ["breakpoints"]],
    ];
    const DOCS = { primitives: "palette", semantic: "color", spacing: "spacing", typography: "typography", radius: "radius", shadows: "shadows", motion: "motion", breakpoints: "layout" };
    /** A section by its id, from its opening tag to the next section (or the end of the main). */
    const sectionOf = (html, id) => {
      const start = html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`));
      if (start < 0) return "";
      const next = html.indexOf("<section", start + 1);
      return html.slice(start, next < 0 ? html.indexOf("</main>", start) : next);
    };
    const codesOf = (html) => [...html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)].map((m) => m[1]);

    it.each(LANGS)("in %s: the hero is the page's own, not a level of the home: centred, one line that says what a token is, and the demo inside it", (code, prefix) => {
      const hero = sectionOf(rendered.get(`${prefix}tokens/`), "hero");
      expect(hero).toMatch(/^<section class="landing-tokens__hero landing-demo"/);
      expect(hero).not.toMatch(/landing-inside\b/);
      const what = /<p class="landing-tokens__what">([\s\S]*?)<\/p>/.exec(hero)?.[1] ?? "";
      expect(what).toBe(catalog(code)["level.tokens.what"]);
      // one line: a sentence a developer reads at once, with no example to decode
      expect(what.replace(/<[^>]+>/g, "").length).toBeLessThanOrEqual(140);
      expect(what).not.toContain("<code>");
      expect(hero).not.toContain("landing-tokens__before");
      expect(hero).not.toContain("landing-tokens__after");
      expect(hero).toMatch(/<a class="luz-btn luz-btn--primary" href="#steps">/);
      // the h1 comes before the demo: what it is, then try it
      expect(hero.indexOf("<h1")).toBeLessThan(hero.indexOf("<fieldset"));
    });

    it.each(LANGS)("in %s: the hero's numbers are one quiet line under its buttons: the tokens, the modes, the weight and no dependency", (code, prefix) => {
      const hero = sectionOf(rendered.get(`${prefix}tokens/`), "hero");
      const head = hero.slice(hero.indexOf('class="landing-tokens__head"'), hero.indexOf('class="landing-tokens__stage"'));
      // in the head, after the buttons: a line of reassurance, not a block of its own at the foot of the band
      expect(head.indexOf('class="o-actions"')).toBeGreaterThan(0);
      expect(head.indexOf('class="landing-tokens__facts"')).toBeGreaterThan(head.indexOf('class="o-actions"'));
      expect(hero).not.toContain("landing-level__stats");
      const facts = /<ul class="landing-tokens__facts">([\s\S]*?)<\/ul>/.exec(head)?.[1] ?? "";
      const items = [...facts.matchAll(/<li><strong>([^<]+)<\/strong> ([^<]+)<\/li>/g)].map((m) => [m[1], m[2]]);
      const deps = Object.keys(JSON.parse(read("packages/tokens/package.json")).dependencies ?? {}).length;
      expect(items.map(([n]) => n).filter((n, i) => i !== 2)).toEqual([String(tokens.length), "3", String(deps)]);
      expect(items.map(([, label]) => label)).toEqual(["tokens", "modes", "weight", "deps"].map((key) => catalog(code)[`level.tokens.stat.${key}`]));
      // the weight, in the language's unit
      expect(items[2][0]).toMatch(new RegExp(`^\\d+[.,]\\d ${catalog(code)["why.weight.unit"]}$`));
    });

    it.each(LANGS)("in %s: the hero's demo is a set of looks, each a whole look and feel from the tokens of every group (colour, type, corners, depth, motion), by CSS alone", (code, prefix) => {
      const hero = sectionOf(rendered.get(`${prefix}tokens/`), "hero");
      expect(hero).toMatch(/<fieldset\b/);
      expect(hero).toContain(`<legend>${catalog(code)["level.tokens.demo.legend"]}</legend>`);
      const looks = [...hero.matchAll(/<input type="radio" name="look" value="([a-z]+)"/g)].map((m) => m[1]);
      expect(looks.length).toBeGreaterThanOrEqual(4);
      expect(hero).toMatch(new RegExp(`<input type="radio" name="look" value="${looks[0]}" checked`));
      expect(hero).toContain('class="landing-demo__product"');
      expect(hero).not.toContain("<script");
      const reads = {};
      for (const look of looks) {
        // its name, in the language of the page
        expect(hero, look).toContain(`>${catalog(code)[`level.tokens.look.${look}`]}</span></label>`);
        // landing.css gives the look every property the product reads
        const rule = new RegExp(`\\.landing-demo:has\\(input\\[value="${look}"\\]:checked\\)\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
        for (const prop of ["--demo-brand", "--demo-font", "--demo-radius", "--demo-shadow", "--demo-ease", "--demo-duration"]) expect(rule, `${look}: ${prop}`).toContain(`${prop}:`);
        // the code says the tokens the look reads, one of each group, every one a token of luz-tokens.css
        const block = (new RegExp(`<code class="landing-demo__look" data-look="${look}">([\\s\\S]*?)</code>`).exec(hero)?.[1] ?? "").replace(/<[^>]+>/g, "");
        const named = [...block.matchAll(/var\((--luz-[\w-]+)\)/g)].map((m) => m[1]);
        for (const name of named) expect(tokens, `${look}: ${name}`).toContain(name);
        const group = (re) => named.find((n) => re.test(n));
        reads[look] = [group(/^--luz-(blue|teal|green|purple|red|yellow|gray)-\d+$/), group(/^--luz-font-/), group(/^--luz-radius-/), group(/^--luz-shadow-|^--luz-easing-/), group(/^--luz-easing-/)];
        expect(reads[look].every(Boolean), `${look} reads ${named}`).toBe(true);
      }
      // every look is its own: no two share their colour, and any two differ in at least three of the five
      expect(new Set(looks.map((l) => reads[l][0])).size).toBe(looks.length);
      for (const a of looks) for (const b of looks) if (a < b) expect(reads[a].filter((x, i) => x !== reads[b][i]).length, `${a} vs ${b}`).toBeGreaterThanOrEqual(3);
      // the hero itself follows the look: its primary button reads the look's corners and type
      expect(css).toMatch(/\.landing-tokens__hero \.luz-btn--primary\s*\{[^}]*var\(--demo-radius\)[^}]*\}/);
      expect(css).toMatch(/\.landing-tokens__hero \.luz-btn--primary\s*\{[^}]*var\(--demo-font\)[^}]*\}/);
    });

    it.each(LANGS)("in %s: the demo reads top down: the title and the looks centred above, then the product beside the code in an editor; the legend is for screen readers only", (code, prefix) => {
      const hero = sectionOf(rendered.get(`${prefix}tokens/`), "hero");
      const at = (needle) => hero.indexOf(needle);
      expect(at('class="landing-demo__top"')).toBeGreaterThan(0);
      expect(at('class="landing-demo__top"')).toBeLessThan(at("<fieldset"));
      expect(at("</fieldset>")).toBeLessThan(at('class="landing-demo__product"'));
      expect(at('class="landing-demo__product"')).toBeLessThan(at('class="landing-demo__editor"'));
      expect(at('class="landing-demo__editor"')).toBeLessThan(at('class="landing-demo__code"'));
      // the code is a rule, so it reads as CSS a developer would write
      expect(hero).toMatch(/<code class="landing-demo__look" data-look="[a-z]+"><span class="landing-demo__sel">\.card<\/span> \{\n/);
      // the legend names the group for a screen reader, out of sight
      expect(css).toMatch(/\.landing-demo__picker legend\s*\{[^}]*clip-path:\s*inset\(50%\)/);
    });

    it("while the demo is one column (phone and tablet) the hero and its demo lose their frames: no border on either, and the demo no side padding", () => {
      // the demo turns to two columns at 900px (landing.css): below it, one column and no frames
      expect(css).toMatch(/@media \(min-width: 900px\) \{\s*\.landing-demo__window \{\s*grid-template-columns: minmax\(0, [\d.]+fr\) minmax\(0, 1fr\)/);
      const phone = [...css.matchAll(/@media \(max-width: 899px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
      const rule = (selector) => new RegExp(`${selector.replace(/[.$]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(phone)?.[1] ?? "";
      // the band itself has no border at any width, not only on a phone (owner, 2026-11-23)
      const band = new RegExp("\\.landing-tokens__hero\\s*\\{([^}]*)\\}").exec(css)?.[1] ?? "";
      expect(band).toMatch(/border:\s*0/);
      expect(band).toMatch(/border-radius:\s*0/);
      const stage = rule(".landing-tokens__stage");
      expect(stage).toMatch(/border:\s*0/);
      expect(stage).toMatch(/box-shadow:\s*none/);
      expect(stage).toMatch(/padding-inline:\s*0/);
    });

    it.each(LANGS)("in %s: the product and its code are one browser window, the page beside its devtools, glued with no gap", (code, prefix) => {
      const hero = sectionOf(rendered.get(`${prefix}tokens/`), "hero");
      const win = hero.slice(hero.indexOf('class="landing-demo__window"'));
      expect(hero).toContain('class="landing-demo__window"');
      const at = (needle) => win.indexOf(needle);
      expect(at('class="landing-demo__chrome"')).toBeGreaterThan(0);
      expect(at('class="landing-demo__chrome"')).toBeLessThan(at('class="landing-demo__viewport"'));
      expect(at('class="landing-demo__viewport"')).toBeLessThan(at('class="landing-demo__product"'));
      expect(at('class="landing-demo__product"')).toBeLessThan(at('class="landing-demo__editor"'));
      // devtools colours: a property and its value apart
      expect(win).toMatch(/<span class="landing-demo__prop">--luz-brand-fill<\/span>: <span class="landing-demo__val">var\(--luz-[a-z]+-60\)<\/span>;/);
      // one frame: the window has the border, the panes none, and no gap between them
      expect(css).toMatch(/\.landing-demo__window\s*\{[^}]*border:[^}]*overflow:\s*hidden/);
      expect(css).toMatch(/\.landing-demo__window\s*\{[^}]*gap:\s*0/);
      expect(css).toMatch(/\.landing-demo__editor\s*\{[^}]*border:\s*0/);
      // the page fills its pane: no margin around the product, which loses its own frame inside the window's
      expect(css).toMatch(/\.landing-demo__viewport\s*\{[^}]*padding:\s*0/);
      expect(css).toMatch(/\.landing-demo__window \.landing-demo__product\s*\{[^}]*border-radius:\s*0[^}]*box-shadow:\s*none/);
    });

    it.each(LANGS)("in %s: three steps, install, use and make it yours, each with code to copy", (code, prefix) => {
      const steps = sectionOf(rendered.get(`${prefix}tokens/`), "steps");
      expect(steps).toMatch(/<h2\b[^>]*>/);
      const items = [...steps.matchAll(/<li class="landing-tokens__step landing-tokens__step--(\w+)"/g)].map((m) => m[1]);
      expect(items).toEqual(["1", "2", "3", "result"]);
      for (const n of [1, 2, 3]) expect(steps).toContain(catalog(code)[`level.tokens.steps.${n}.title`]);
      const ids = [...steps.matchAll(/data-copy-from="([^"]+)"/g)].map((m) => m[1]);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      for (const id of ids) expect(steps, id).toContain(`<code id="${id}">`);
      expect(steps).toContain("npm install @luz-ds/tokens");
      for (const body of codesOf(steps)) for (const m of body.matchAll(/--luz-[\w-]+/g)) expect(tokens, m[0]).toContain(m[0]);
    });

    it.each(LANGS)("in %s: the steps are a path joined by lines, 1 and 2 above, 3 under 2, and in the corner left what you get, in words", (code, prefix) => {
      const steps = sectionOf(rendered.get(`${prefix}tokens/`), "steps");
      const result = steps.slice(steps.indexOf('landing-tokens__step--result'));
      expect(result).toContain(catalog(code)["level.tokens.steps.result.title"]);
      const outcomes = [...(/<ul class="landing-tokens__outcomes">([\s\S]*?)<\/ul>/.exec(result)?.[1] ?? "").matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      expect(outcomes).toEqual([1, 2, 3].map((n) => catalog(code)[`level.tokens.steps.result.${n}`]));
      expect(result).not.toContain("landing-tokens__result");
      // the path: two columns, 1 2 above and the result beside 3 below; a line joins each step to the next
      expect(css).toMatch(/\.landing-tokens__step-list\s*\{[^}]*grid-template-areas:\s*"one two"\s*"result three"/);
      for (const n of ["1", "2", "3"]) expect(css, n).toMatch(new RegExp(`\\.landing-tokens__step--${n}::after[^{]*\\{[^}]*content:\\s*""`));
      // a line spans the gap between two boxes, from border to border, and goes into neither
      expect(css).not.toMatch(/\.landing-tokens__step--\d::after[^{]*\{[^}]*calc\(100% - /);
      // line and arrow are one piece, an SVG mask painted in the border's colour, so they cannot part
      expect(css).toMatch(/\.landing-tokens__step--1::after[^{]*\{[^}]*background:\s*var\(--luz-divider\)[^}]*mask:[^}]*url\("data:image\/svg\+xml/);
      expect(css).not.toMatch(/\.landing-tokens__step--[\w]+::before/);
      // and a step does not move under the pointer, so the path stays joined
      expect(css).not.toMatch(/\.landing-tokens__step:hover[^{]*\{[^}]*translate/);
    });

    it.each(LANGS)("in %s: four blocks, color, scales, motion and breakpoints, each a level of the home that links every group it holds to its docs", (code, prefix) => {
      const html = rendered.get(`${prefix}tokens/`);
      const starts = BLOCKS.map(([id]) => html.search(new RegExp(`<section\\b[^>]*\\sid="t-${id}"`)));
      expect(starts.every((at) => at > 0), starts.join()).toBe(true);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
      expect(html.match(/<section\b[^>]*\sid="t-/g)).toHaveLength(4);
      let total = 0;
      BLOCKS.forEach(([id, groups], i) => {
        const block = sectionOf(html, `t-${id}`);
        expect(block, id).toMatch(new RegExp(`^<section class="landing-inside${i % 2 ? " landing-inside--flip" : ""}\\b`));
        expect(block, id).toContain(`<h2 class="landing-inside__title" id="t-${id}-title">${catalog(code)[`level.tokens.${id}.title`]}</h2>`);
        expect(block, id).toContain(`<p class="landing-inside__lead">${catalog(code)[`level.tokens.${id}.lead`]}</p>`);
        for (const group of groups) {
          const link = new RegExp(`<a class="landing-tokens__group-link" href="(/${code})?/docs/tokens/${DOCS[group]}/"(?: hreflang="en")?>${catalog(code)[`inside.list.${group}`].replace(/&/g, "&amp;")} <span class="landing-names__n">(\\d+)</span></a>`).exec(block);
          expect(link, `${id}: ${group}`).toBeTruthy();
          total += Number(link[2]);
        }
        expect(block, id).toContain('class="landing-panel landing-tokens__panel"');
        for (const body of codesOf(block)) for (const m of body.matchAll(/--luz-[\w-]+/g)) expect(tokens, `${id}: ${m[0]}`).toContain(m[0]);
      });
      expect(total).toBe(tokens.length);
    });

    it.each(LANGS)("in %s: color is a mosaic in the framed panel: the semantic tokens in large tiles that follow the mode, and the primitives in deep, mid and pale tiles with their value; scales and the rest read their tokens through --v", (code, prefix) => {
      const html = rendered.get(`${prefix}tokens/`);
      const color = sectionOf(html, "t-color");
      expect(color).not.toContain("landing-tokens__matrix");
      expect(color).not.toContain("landing-tokens__palette");
      // the semantic tiles: a name each, the colour read live (so it follows the mode), a semantic ink on it
      const semantic = [...color.matchAll(/<li class="landing-tokens__tile" style="--v:var\((--luz-[\w-]+)\);--ink:var\((--luz-[\w-]+)\)"><code>(--luz-[\w-]+)<\/code><\/li>/g)];
      expect(semantic.length).toBeGreaterThanOrEqual(5);
      for (const [, bg, ink, name] of semantic) {
        expect(name).toBe(bg);
        expect(tokens).toContain(bg);
        expect(tokens).toContain(ink);
        expect(bg, `${bg} is semantic`).not.toMatch(/^--luz-(blue|gray|green|red|yellow|teal|purple)-\d+$/);
      }
      // the primitive tiles: three steps of every family, deep to pale, each its name and its value, an ink that reads on it
      const json = JSON.parse(read("packages/tokens/tokens.json")).color;
      const swatches = [...color.matchAll(/<li class="landing-tokens__swatch" style="--v:var\(--luz-([a-z]+)-(\d+)\);--ink:var\(--luz-gray-(\d+)\)"><code>--luz-\1-\2<\/code><span>(#[0-9a-f]{6})<\/span><\/li>/g)];
      expect(swatches.map((m) => m[1])).toEqual(Object.keys(json).flatMap((f) => [f, f, f]));
      const lum = (hex) => {
        const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      for (const [, family, step, inkStep, hex] of swatches) {
        expect(hex, `${family}-${step}`).toBe((json[family][step].value ?? json[family][step].$value).toLowerCase());
        const ink = json.gray[inkStep].value ?? json.gray[inkStep].$value;
        expect(ratio(hex, ink), `${family}-${step} on gray-${inkStep}`).toBeGreaterThanOrEqual(4.5);
      }
      // in the look of the site: the text as any level's, the mosaic inside the framed panel, its tiles touching
      expect(css).not.toMatch(/\.landing-tokens__block--color \.landing-inside__copy\s*\{[^}]*background/);
      expect(css).not.toMatch(/\.landing-tokens__block--color \.landing-tokens__panel\s*\{[^}]*display:\s*contents/);
      expect(color).toMatch(/<div class="landing-panel landing-tokens__panel" dir="ltr"><div class="landing-tokens__mosaic">/);
      expect(css).toMatch(/\.landing-tokens__mosaic\s*\{[^}]*gap:\s*0[^}]*overflow:\s*hidden/);
      const scales = sectionOf(html, "t-scales");
      for (const name of ["--luz-space-md", "--luz-text-2xl", "--luz-radius-md", "--luz-shadow-lg"]) expect(scales).toContain(`--v:var(${name})`);
      expect(sectionOf(html, "t-motion")).toContain("landing-tokens__curve");
    });

    it.each(LANGS)("in %s: the breakpoints are devices, small wireframes as wide as their breakpoint, not bars", (code, prefix) => {
      const more = sectionOf(rendered.get(`${prefix}tokens/`), "t-breakpoints");
      expect(more).not.toContain("landing-tokens__specimen--ruler");
      const list = /<ul class="landing-tokens__specimen landing-tokens__specimen--devices"[^>]*>([\s\S]*?)<\/ul>/.exec(more)?.[1] ?? "";
      const devices = [...list.matchAll(/<li><span class="landing-tokens__device landing-tokens__device--([a-z]+)" style="--share:([\d.]+)"><\/span><code class="landing-tokens__label">([a-z]+) (\d+)px<\/code><\/li>/g)];
      const mq = tokens.filter((n) => n.startsWith("--luz-mq-"));
      expect(devices.map((m) => `--luz-mq-${m[3]}`)).toEqual(mq);
      expect(devices.map((m) => m[1])).toEqual(["phone", "tablet", "laptop", "laptop", "desktop", "desktop"]);
      const widest = Math.max(...devices.map((m) => Number(m[4])));
      for (const [, , share, , px] of devices) expect(Number(share)).toBeCloseTo(Number(px) / widest, 3);
    });

    it.each(LANGS)("in %s: motion and breakpoints are sections of their own, their panel the specimen and its code with no card inside", (code, prefix) => {
      const html = rendered.get(`${prefix}tokens/`);
      for (const id of ["motion", "breakpoints"]) {
        const block = sectionOf(html, `t-${id}`);
        expect(block, id).toContain(`class="landing-tokens__specimen landing-tokens__specimen--${id === "motion" ? "curves" : "devices"}"`);
        expect(block, id).not.toContain("landing-tokens__scale");
        expect(block, id).toContain('<pre class="luz-code-block" data-lang="css"');
      }
      expect(html).not.toContain('id="t-more"');
    });

    it("scales are a level like the others, zigzagging with them: the four cards a 2 x 2 in a panel with no frame of its own, one column on a phone", () => {
      const panel = new RegExp("\\.landing-tokens__block--scales \\.landing-tokens__panel\\s*\\{([^}]*)\\}").exec(css)?.[1] ?? "";
      expect(panel).toMatch(/border:\s*0/);
      expect(panel).toMatch(/padding:\s*0/);
      // no more cards as the section's own grid items, nor the text in the middle
      expect(css).not.toMatch(/\.landing-tokens__block--scales[^{]*\{[^}]*display:\s*contents/);
      expect(css).not.toMatch(/\.landing-tokens__block--scales[^{]*\{[^}]*grid-template-areas/);
      expect(css).toMatch(/\.landing-tokens__block--scales \.landing-tokens__scales\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
      expect(css).toMatch(/@media \(max-width: 640px\) \{\s*\.landing-tokens__block--scales \.landing-tokens__scales\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    });

    it.each(LANGS)("in %s: the page ends with the next step: core, and the docs", (code, prefix) => {
      const next = sectionOf(rendered.get(`${prefix}tokens/`), "next");
      expect(next).toContain(catalog(code)["level.tokens.next.title"]);
      expect(next).toMatch(new RegExp(`href="${prefix}core/"`));
      expect(next).toMatch(/href="(\/[a-z]{2})?\/docs\/tokens\/"/);
    });

    it("has no jump links, no list of every token and no repeated 'Read the docs'", () => {
      const html = rendered.get("/tokens/");
      expect(html).not.toContain("landing-level__jump");
      expect(html).not.toContain("landing-tokens__name");
      expect(html).not.toContain("landing-level__list");
    });
  });
});
