/**
 * The pages of the three levels, tokens, core and catalog: a page of its own each, in the look of the
 * home, with every element of the level listed (owner, 2026-11-23). They are routes of the site, `/tokens/`, `/core/`
 * and `/catalog/`, and `/es/…`, `/ar/…` in the other languages.
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
import { siteNumbers } from "../scripts/docs-site/i18n.js";
import { FITS_KINDS, kindPatterns } from "../scripts/docs-site/kinds.js";
import { FILES } from "../scripts/docs-site/snippets.js";
import { readdirSync } from "node:fs";
import { quoted } from "./helpers/quoted-attributes.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const HOME = "apps/landing/index.html";
const NAMES = ["tokens", "core", "catalog"];
const LANGS = [["en", "/"], ["es", "/es/"], ["ar", "/ar/"]];

const site = scanSite(join(repo, "apps/docs"), repo);
const home = read(HOME);
const levels = [...NAMES, "ai"].map((name) => ({ name, file: `apps/landing/levels/${name}.html`, html: read(`apps/landing/levels/${name}.html`) }));
const extra = [...landingDocuments(site, HOME, home), ...levelDocuments(site, { file: HOME, html: home }, levels)];
const built = buildSite(site, { extra });
/** What the build wrote, with the quotes of its attributes restored to read it. */
const rendered = new Map([...built.rendered].map(([route, page]) => [route, quoted(page)]));
const { problems } = built;
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
const hrefsOf = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[1]);

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

  it.each(NAMES.flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: its links to the home are the language's, and the page links to the docs of its level", (name, code, prefix) => {
    const html = rendered.get(`${prefix}${name}/`);
    // no link to a section the page does not have: they go to the home of the language
    expect(hrefsOf(html, /<a\b[^>]*\shref="(#[^"]*)"/g).filter((href) => href !== "#main-content" && !href.startsWith("#all") && !href.startsWith("#install") && !href.startsWith("#hero") && !href.startsWith("#t-") && href !== "#steps")).toEqual([]);
    // the drawer lists the sections the home has that the level pages do not (Who we are, the AI level, the FAQ): they
    // go to the language's home. The levels themselves (Tokens, Core, Catalog, AI) are the header's and the drawer's site links.
    for (const id of ["who", "ai", "faq"]) expect(html, `#${id} on the home of the language`).toMatch(new RegExp(`href="${prefix}#${id}"`));
    expect(html).not.toMatch(new RegExp(`href="${prefix}#(?:tokens|core|catalog)"`));
    for (const level of ["ai", "tokens", "core", "catalog"]) expect(html, `${level} in the header and the drawer`).toMatch(new RegExp(`<a\\b[^>]*\\shref="${prefix}${level}/"`));
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
        const id = { tokens: "tokens", core: "core", catalog: "catalog" }[name];
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
      expect(hero).toMatch(/^<section class="landing-intro landing-demo"/);
      expect(hero).not.toMatch(/landing-inside\b/);
      const what = /<p class="landing-intro__what">([\s\S]*?)<\/p>/.exec(hero)?.[1] ?? "";
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
      const head = hero.slice(hero.indexOf('class="landing-intro__head"'), hero.indexOf('class="landing-intro__stage"'));
      // in the head, after the buttons: a line of reassurance, not a block of its own at the foot of the band
      expect(head.indexOf('class="o-actions"')).toBeGreaterThan(0);
      expect(head.indexOf('class="landing-intro__facts"')).toBeGreaterThan(head.indexOf('class="o-actions"'));
      expect(hero).not.toContain("landing-level__stats");
      const facts = /<ul class="landing-intro__facts">([\s\S]*?)<\/ul>/.exec(head)?.[1] ?? "";
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
      expect(css).toMatch(/\.landing-intro \.luz-btn--primary\s*\{[^}]*var\(--demo-radius\)[^}]*\}/);
      expect(css).toMatch(/\.landing-intro \.luz-btn--primary\s*\{[^}]*var\(--demo-font\)[^}]*\}/);
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
      const band = new RegExp("\\.landing-intro\\s*\\{([^}]*)\\}").exec(css)?.[1] ?? "";
      expect(band).toMatch(/border:\s*0/);
      expect(band).toMatch(/border-radius:\s*0/);
      const stage = rule(".landing-intro__stage");
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
      const items = [...steps.matchAll(/<li class="landing-path__step landing-path__step--(\w+)"/g)].map((m) => m[1]);
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
      const result = steps.slice(steps.indexOf('landing-path__step--result'));
      expect(result).toContain(catalog(code)["level.tokens.steps.result.title"]);
      const outcomes = [...(/<ul class="landing-path__outcomes">([\s\S]*?)<\/ul>/.exec(result)?.[1] ?? "").matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      expect(outcomes).toEqual([1, 2, 3].map((n) => catalog(code)[`level.tokens.steps.result.${n}`]));
      expect(result).not.toContain("landing-tokens__result");
      // the path: two columns, 1 2 above and the result beside 3 below; a line joins each step to the next
      expect(css).toMatch(/\.landing-path__list\s*\{[^}]*grid-template-areas:\s*"one two"\s*"result three"/);
      for (const n of ["1", "2", "3"]) expect(css, n).toMatch(new RegExp(`\\.landing-path__step--${n}::after[^{]*\\{[^}]*content:\\s*""`));
      // a line spans the gap between two boxes, from border to border, and goes into neither
      expect(css).not.toMatch(/\.landing-path__step--\d::after[^{]*\{[^}]*calc\(100% - /);
      // line and arrow are one piece, an SVG mask painted in the border's colour, so they cannot part
      expect(css).toMatch(/\.landing-path__step--1::after[^{]*\{[^}]*background:\s*var\(--luz-divider\)[^}]*mask:[^}]*url\("data:image\/svg\+xml/);
      expect(css).not.toMatch(/\.landing-path__step--[\w]+::before/);
      // and a step does not move under the pointer, so the path stays joined
      expect(css).not.toMatch(/\.landing-path__step:hover[^{]*\{[^}]*translate/);
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
          const link = new RegExp(`<a class="landing-block__link" href="(/${code})?/docs/tokens/${DOCS[group]}/"(?: hreflang="en")?>${catalog(code)[`inside.list.${group}`].replace(/&/g, "&amp;")} <span class="landing-names__n">(\\d+)</span></a>`).exec(block);
          expect(link, `${id}: ${group}`).toBeTruthy();
          total += Number(link[2]);
        }
        expect(block, id).toContain('class="landing-panel landing-block__panel"');
        for (const body of codesOf(block)) for (const m of body.matchAll(/--luz-[\w-]+/g)) expect(tokens, `${id}: ${m[0]}`).toContain(m[0]);
      });
      expect(total).toBe(tokens.length);
    });

    it.each(LANGS)("in %s: color is two cards in the look of the scales: the semantic colours as chips that follow the mode, and the primitives a ramp per family with every step; scales and the rest read their tokens through --v", (code, prefix) => {
      const html = rendered.get(`${prefix}tokens/`);
      const color = sectionOf(html, "t-color");
      for (const gone of ["matrix", "palette", "mosaic", "tile", "swatch"]) expect(color, gone).not.toMatch(new RegExp(`landing-(block|cards?|spec)__${gone}`));
      // two cards as the scales', each its title, its specimen and its line of code
      expect(color).toMatch(/<div class="landing-panel landing-block__panel" dir="ltr"><div class="landing-cards"><div class="landing-card landing-card--semantic"><p class="landing-card__title">/);
      expect(color).toContain('<div class="landing-card landing-card--primitives"><p class="landing-card__title">');
      expect(color.match(/<pre class="luz-code-block"/g)?.length).toBe(2);
      // the semantic chips: read live, so they follow the mode; each labelled with its name
      const chips = [...color.matchAll(/<li><span class="landing-spec__box landing-spec__box--color" style="--v:var\((--luz-[\w-]+)\)"><\/span><code class="landing-spec__label">([\w-]+)<\/code><\/li>/g)];
      expect(chips.length).toBeGreaterThanOrEqual(5);
      for (const [, name, text] of chips) {
        expect(name).toBe(`--luz-${text}`);
        expect(tokens).toContain(name);
        expect(name, `${name} is semantic`).not.toMatch(/^--luz-(blue|gray|green|red|yellow|teal|purple)-\d+$/);
      }
      // the primitives: a ramp per family, every step of tokens.json, in its order
      const json = JSON.parse(read("packages/tokens/tokens.json")).color;
      const ramps = [...color.matchAll(/<li><code class="landing-spec__label">([a-z]+)<\/code><span class="landing-tokens__ramp">((?:<span style="--v:var\(--luz-[a-z]+-\d+\)"><\/span>)+)<\/span><\/li>/g)];
      expect(ramps.map((m) => m[1])).toEqual(Object.keys(json));
      for (const [, family, steps] of ramps) expect([...steps.matchAll(/--luz-([a-z]+)-(\d+)/g)].map((m) => `${m[1]}-${m[2]}`), family).toEqual(Object.keys(json[family]).map((step) => `${family}-${step}`));
      // in the look of the site: the text as any level's, the cards the only frames
      expect(css).not.toMatch(/\.landing-block--color \.landing-inside__copy\s*\{[^}]*background/);
      expect(css).toMatch(/\.landing-block__panel:has\(> \.landing-cards\)\s*\{[^}]*border:\s*0/);
      expect(css).not.toMatch(/landing-(block|cards?|spec)__(mosaic|tile|swatch)/);
      const scales = sectionOf(html, "t-scales");
      for (const name of ["--luz-space-md", "--luz-text-2xl", "--luz-radius-md", "--luz-shadow-lg"]) expect(scales).toContain(`--v:var(${name})`);
      expect(sectionOf(html, "t-motion")).toContain("landing-tokens__curve");
    });

    it.each(LANGS)("in %s: the breakpoints are devices, small wireframes as wide as their breakpoint, not bars", (code, prefix) => {
      const more = sectionOf(rendered.get(`${prefix}tokens/`), "t-breakpoints");
      expect(more).not.toContain("landing-spec--ruler");
      const list = /<ul class="landing-spec landing-spec--devices"[^>]*>([\s\S]*?)<\/ul>/.exec(more)?.[1] ?? "";
      const devices = [...list.matchAll(/<li><span class="landing-tokens__device landing-tokens__device--([a-z]+)" style="--share:([\d.]+)"><\/span><code class="landing-spec__label">([a-z]+) (\d+)px<\/code><\/li>/g)];
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
        expect(block, id).toContain(`class="landing-spec landing-spec--${id === "motion" ? "curves" : "devices"}"`);
        expect(block, id).not.toContain("landing-card");
        expect(block, id).toContain('<pre class="luz-code-block" data-lang="css"');
      }
      expect(html).not.toContain('id="t-more"');
    });

    it("scales are a level like the others, zigzagging with them: the four cards a 2 x 2 in a panel with no frame of its own, one column on a phone", () => {
      const panel = new RegExp("\\.landing-block__panel:has\\(> \\.landing-cards\\)\\s*\\{([^}]*)\\}").exec(css)?.[1] ?? "";
      expect(panel).toMatch(/border:\s*0/);
      expect(panel).toMatch(/padding:\s*0/);
      // no more cards as the section's own grid items, nor the text in the middle
      expect(css).not.toMatch(/\.landing-block--scales[^{]*\{[^}]*display:\s*contents/);
      expect(css).not.toMatch(/\.landing-block--scales[^{]*\{[^}]*grid-template-areas/);
      expect(css).toMatch(/\.landing-block__panel > \.landing-cards\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
      expect(css).toMatch(/@media \(max-width: 640px\) \{\s*\.landing-block__panel > \.landing-cards\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
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

describe("the page of core: the HTML you write comes styled, a class adds a component, your CSS wins", () => {
  const css = read("apps/landing/landing.css");
  const numbers = siteNumbers(repo);
  const VIEWS = ["bare", "classes", "yours"];
  const core = (prefix) => rendered.get(`${prefix}core/`);
  const sectionOf = (html, id) => {
    const start = html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`));
    if (start < 0) return "";
    const next = html.indexOf("<section", start + 1);
    return html.slice(start, next < 0 ? html.indexOf("</main>", start) : next);
  };

  it.each(LANGS)("in %s: the hero is the tokens' kind of hero (one line, two buttons, four numbers read from the packages) over a demo of one page written three ways", (code, prefix) => {
    const hero = sectionOf(core(prefix), "hero");
    expect(hero).toMatch(/^<section class="landing-intro landing-demo landing-views"/);
    expect(hero).toContain('class="landing-intro__what"');
    expect(hero.match(/<a class="luz-btn/g)).toHaveLength(2);
    expect(hero).toContain('href="#steps"');
    const facts = [...hero.matchAll(/<li><strong>([^<]+)<\/strong> ([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(facts).toHaveLength(4);
    expect(facts.slice(0, 2)).toEqual([String(numbers.components), String(numbers.objects)]);
    expect(facts[3]).toBe("0");
  });

  it.each(LANGS)("in %s: the demo is one page, three views (no classes, with classes, with your CSS), a radio each with the first checked; the page is real core markup the keyboard does not enter", (code, prefix) => {
    const hero = sectionOf(core(prefix), "hero");
    const radios = [...hero.matchAll(/<input type="radio" name="view" value="([a-z]+)"( checked)?>/g)];
    expect(radios.map((m) => m[1])).toEqual(VIEWS);
    expect(radios.map((m) => Boolean(m[2]))).toEqual([true, false, false]);
    expect(hero).toMatch(/<fieldset class="landing-demo__picker">\s*<legend>[^<]+<\/legend>/);
    expect(hero).toContain('<div class="landing-demo__product landing-views__product" inert>');
    // each page is what lies between its wrapper and the next one, less the closing tags that belong to the wrapper and to the window around it
    const chunks = hero.split('<div class="landing-views__page" data-view="').slice(1).map((chunk) => {
      let inside = chunk.slice(chunk.indexOf('">') + 2, chunk.indexOf('<div class="landing-demo__editor"') > 0 && chunk.includes('<div class="landing-demo__editor"') && !chunk.includes('<div class="landing-views__page"') ? chunk.indexOf('<div class="landing-demo__editor"') : chunk.length);
      const count = (re) => (inside.match(re) ?? []).length;
      while (count(/<\/div>/g) > count(/<div\b/g)) inside = inside.slice(0, inside.lastIndexOf("</div>")).trimEnd();
      return [chunk.slice(0, chunk.indexOf('"')), inside];
    });
    const pages = Object.fromEntries(chunks);
    expect(Object.keys(pages)).toEqual(VIEWS);
    // step one: elements and nothing else, no class and no id
    expect(pages.bare).not.toMatch(/class=|id=/);
    expect(pages.bare).toContain("<button");
    // step two adds the classes of components; step three is that page, and the difference is a rule
    expect(pages.classes).toMatch(/luz-btn luz-btn--primary/);
    expect(pages.classes).toMatch(/luz-field/);
    expect(pages.yours.replaceAll("-yours", "")).toBe(pages.classes);
    // the same markup, as listings in the colours of the devtools, one per view
    const listings = Object.fromEntries([...hero.matchAll(/<code class="landing-demo__look" data-look="([a-z]+)">([\s\S]*?)<\/code>/g)].map((m) => [m[1], m[2]]));
    expect(Object.keys(listings)).toEqual(VIEWS);
    const plain = (text) => text.replace(/<\/?span\b[^>]*>/g, "");
    expect(plain(listings.bare)).not.toContain("class=");
    expect(plain(listings.classes)).toContain("luz-btn--primary");
    expect(plain(listings.yours).startsWith(plain(listings.classes))).toBe(true);
    expect(listings.yours).toMatch(/border-radius<\/span>: <span class="landing-demo__val">var\(--luz-radius-full\)<\/span>/);
    expect(listings.yours).toMatch(/text-transform<\/span>: <span class="landing-demo__val">uppercase<\/span>/);
  });

  it("shows the checked view by CSS alone, laid over the others so the window keeps its height, and the reader's rule is what the listing says, unlayered", () => {
    for (const view of VIEWS) {
      expect(css).toContain(`.landing-views:has(input[value="${view}"]:checked) :is(.landing-views__page[data-view="${view}"], .landing-demo__look[data-look="${view}"])`);
    }
    expect(css).toMatch(/\.landing-views__page,\s*\.landing-views \.landing-demo__look\s*\{[^}]*grid-area:\s*1 \/ 1[^}]*visibility:\s*hidden/);
    // the listing's two lines are the rule's two lines, and the rule is outside every @layer, so it wins with no !important
    const rule = /\.landing-views__page\[data-view="yours"\] \.luz-btn\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/border-radius:\s*var\(--luz-radius-full\)/);
    expect(rule).toMatch(/text-transform:\s*uppercase/);
    expect(rule).not.toMatch(/!important/);
    expect(css).not.toMatch(/@layer/);
  });

  it.each(LANGS)("in %s: five blocks, actions, forms, content, feedback and layout, in the sides of the home (the page zigzags), each cards of real components and the line of HTML that writes them, linking the docs' groups they cover with their counts", (code, prefix) => {
    const html = core(prefix);
    const groups = new Map();
    for (const page of site.pages.filter((p) => p.meta.area === "components" && p.meta.group)) groups.set(page.meta.group, (groups.get(page.meta.group) ?? 0) + 1);
    const BLOCKS = [["actions", ["actions"]], ["forms", ["forms"]], ["content", ["content", "navigation"]], ["feedback", ["feedback", "media"]], ["layout", ["helpers", "objects"]]];
    BLOCKS.forEach(([id, covered], i) => {
      const block = sectionOf(html, `c-${id}`);
      expect(block, id).toMatch(new RegExp(`^<section class="landing-inside${i % 2 ? " landing-inside--flip" : ""} landing-block landing-block--${id} landing-block--wide"`));
      expect(block.match(/<h2\b/g), id).toHaveLength(1);
      const links = [...block.matchAll(/<a class="landing-block__link" href="([^"]+)"[^>]*>[^<]+<span class="landing-names__n">(\d+)<\/span>/g)];
      // the docs of a language are its own (/es/docs/…) once it has them
      expect(links.map((m) => m[1].replace(/^\/(es|ar)\//, "/")), id).toEqual(covered.map((g) => (g === "objects" ? "/docs/components/layout/" : `/docs/components/#group-${g}`)));
      expect(links.map((m) => Number(m[2])), id).toEqual(covered.map((g) => (g === "objects" ? numbers.objects : groups.get(g))));
      if (id === "forms") {
        // not cards: one real form with every kind of control, inert so the keyboard stays out of it, and the markup of a field beside it
        expect(block).toContain('<div class="landing-core__live" inert><form class="landing-form" action="#" autocomplete="off">');
        for (const type of ["text", "email", "password", "date", "tel", "range", "radio", "checkbox"]) expect(block, type).toContain(`type="${type}"`);
        for (const part of ["<select class=\"luz-select\"", "<textarea class=\"luz-input luz-input--textarea\"", 'role="switch"', "<output class=\"luz-output\"", "luz-check-group", "disabled", 'type="submit"']) expect(block, part).toContain(part);
        expect(block.match(/<fieldset class="luz-fieldset">/g)).toHaveLength(2);
        // a field in error says so, to the eye and to the machine
        // its password field holds no value, so no browser offers to save "1234" as a password when the visitor leaves the
        // page (owner, 2026-11-24: Chrome asked on the next page): the dots are its placeholder, and the form says
        // autocomplete off
        expect(block).toMatch(/luz-input luz-input--error" id="core-f-password" type="password" autocomplete="off" placeholder="••••" aria-invalid="true">/);
        expect(block).not.toMatch(/<input[^>]*type="password"[^>]*\svalue=/);
        expect(block).toContain('<form class="landing-form" action="#" autocomplete="off">');
        expect(block).toContain("luz-field__error");
        // every label names a control of the form
        for (const [, target] of block.matchAll(/<label[^>]* for="([^"]+)"/g)) expect(block, target).toContain(`id="${target}"`);
        expect(block).toMatch(/<pre class="luz-code-block" data-lang="html" dir="ltr" tabindex="0">/);
        return;
      }
      if (id === "content") {
        // not cards: one page of a project made of every piece of the two groups it covers, inert, the markup beside it
        expect(block).toContain('<div class="landing-core__live" inert><div class="landing-page">');
        const files = site.pages.filter((p) => p.meta.area === "components" && covered.includes(p.meta.group)).flatMap((p) => [...String(p.meta.files ?? "").matchAll(/components\/([a-z-]+)\.css/g)].map((m) => m[1]));
        expect(files.length).toBe(groups.get("content") + groups.get("navigation"));
        for (const name of files) expect(block, name).toMatch(new RegExp(`class="[^"]*\\bluz-${name}(?=__|[\\s"-])`));
        expect(block).toMatch(/<pre class="luz-code-block" data-lang="html" dir="ltr" tabindex="0">/);
        return;
      }
      if (id === "actions") {
        // the button in every variant, every state (hover, pressed and focus drawn as they look), with an icon and with
        // an icon alone (named by its label), in every size and at the full width
        for (const variant of ["primary", "secondary", "outline", "ghost", "danger", "sm", "lg", "block"]) expect(block, variant).toMatch(new RegExp(`class="luz-btn [^"]*luz-btn--${variant}\\b`));
        for (const state of ["hover", "active", "focus"]) expect(block, state).toContain(`data-state="${state}"`);
        expect(block).toMatch(/<button class="luz-btn[^"]*" type="button" disabled>/);
        expect(block).toMatch(/<button class="luz-btn[^"]*" type="button"><svg [^>]*aria-hidden="true"/);
        expect(block).toMatch(/<button class="luz-btn[^"]*" type="button" aria-label="[^"]+"><svg [^>]*aria-hidden="true"[^>]*>(?:(?!<\/button>).)*<\/svg><\/button>/);
      }
      if (id === "layout") {
        // not cards: the plan of an application made of every object of core, each named by its class, with the
        // utilities and the shared keyframes at work in it, inert, the markup beside it
        expect(block).toContain('<div class="landing-core__live" inert><div class="landing-plan o-shell">');
        const objects = [...new Set([...read("packages/core/src/objects/_objects.css").matchAll(/^\s*\.(o-[a-z]+)\b/gm)].map((m) => m[1]))];
        expect(objects).toHaveLength(numbers.objects);
        for (const name of objects) {
          expect(block, name).toMatch(new RegExp(`class="(?:[^"]* )?${name}(?=[\\s"])`));
          expect(block, name).toMatch(new RegExp(`<code class="landing-plan__name">[^<]*\\b${name}\\b`));
        }
        for (const name of ["u-truncate", "u-sr-only", "u-text-muted", "u-text-mono", "u-flex-between"]) expect(block, name).toMatch(new RegExp(`class="[^"]*\\b${name}\\b`));
        const keyframes = [...read("packages/core/src/components/_animations.css").matchAll(/@keyframes (luz-[a-z-]+)/g), ...read("packages/core/src/components/modal.css").matchAll(/@keyframes (luz-[a-z-]+)/g)].map((m) => m[1]);
        expect(keyframes.length).toBeGreaterThanOrEqual(5);
        for (const name of keyframes) expect(css, name).toMatch(new RegExp(`\\.landing-plan[^{]*\\{[^}]*animation: ${name}\\b`));
        expect(block).toMatch(/<pre class="luz-code-block" data-lang="html" dir="ltr" tabindex="0">/);
        return;
      }
      if (id === "feedback") {
        // every piece of the two groups it covers is in one of its cards
        const files = site.pages.filter((p) => p.meta.area === "components" && covered.includes(p.meta.group)).flatMap((p) => [...String(p.meta.files ?? "").matchAll(/components\/([a-z-]+)\.css/g)].map((m) => m[1]));
        expect(files.length).toBe(groups.get("feedback") + groups.get("media"));
        for (const name of files) expect(block, name).toMatch(new RegExp(`class="[^"]*\\bluz-${name}(?=__|[\\s"-])`));
      }
      // the panel holds cards, each its title, its component (inert: the keyboard stays out of it) and one line of code
      const cards = block.match(/<div class="landing-card landing-card--[a-z]+">[\s\S]*?<\/pre><\/div>/g) ?? [];
      expect(cards.length, id).toBeGreaterThanOrEqual(2);
      for (const card of cards) {
        expect(card).toMatch(/<p class="landing-card__title">[^<]+<\/p><div class="landing-core__live" inert>/);
        expect(card).toMatch(/<pre class="luz-code-block" data-lang="html" dir="ltr" tabindex="0">/);
      }
    });
    expect(html).toContain('class="luz-btn luz-btn--primary"');
    expect(html).toContain('class="o-stack"');
  });

  it.each(LANGS)("in %s: shows every class of core's components in its blocks, every variant, size, state and part, but for the few that cannot be shown in a card", (code, prefix) => {
    const html = core(prefix);
    const blocks = html.slice(html.indexOf('<div class="landing-level__blocks">'), html.indexOf('<section class="landing-level__next"'));
    const used = new Set([...blocks.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    // what a card cannot show: the text a player shows only without JavaScript and the status of a MIDI file, the
    // colour mode's button fixed to the corner of the window and its live region (hidden by design), and the buttons
    // of the legacy custom themes, which wait for applyTheme()
    const UNSHOWN = ["luz-player-fallback", "luz-player-midi-status", "luz-theme-mode__button--fixed", "luz-theme-mode__status", "luz-theme-apply-btn", "luz-theme-mode-btn"];
    const dir = join(repo, "packages/core/src/components");
    const missing = readdirSync(dir)
      .filter((file) => file.endsWith(".css") && !file.startsWith("_"))
      .flatMap((file) => [...new Set([...read(`packages/core/src/components/${file}`).matchAll(/\.(luz-[a-z0-9_-]+)/g)].map((m) => m[1]))].map((name) => `${file}: ${name}`))
      .filter((entry) => !used.has(entry.split(": ")[1]) && !UNSHOWN.includes(entry.split(": ")[1]));
    expect(missing).toEqual([]);
  });

  it("keeps the words of every block of a level's page in view while its panel goes by, on a wide screen", () => {
    const wide = css.match(/@media \(min-width: 1024px\) \{\s*\.landing-level__blocks \.landing-inside__copy \{([^}]*)\}/);
    expect(wide).not.toBeNull();
    expect(wide[1]).toMatch(/position: sticky;/);
    expect(wide[1]).toMatch(/inset-block-start: var\(--luz-space-3xl\);/);
    expect(wide[1]).toMatch(/align-self: start;/);
  });

  it("gives a panel of cards no frame of its own, in every block", () => {
    expect(css).toMatch(/\.landing-block__panel:has\(> \.landing-cards\)\s*\{[^}]*border:\s*0/);
  });

  it.each(LANGS)("in %s: three steps (install, write HTML, add a class) and what you get, then the next step to the catalog, and no list of names: every component is live in the blocks", (code, prefix) => {
    const html = core(prefix);
    const steps = sectionOf(html, "steps");
    expect(steps.match(/class="landing-path__step landing-path__step--(1|2|3|result)"/g)).toHaveLength(4);
    expect(steps.match(/<li>/g)).toHaveLength(3);
    expect(steps).toContain("npm install @luz-ds/tokens @luz-ds/core");
    const next = sectionOf(html, "next");
    expect(next).toContain(`href="${prefix}catalog/"`);
    expect(next).toMatch(/href="(\/(es|ar))?\/docs\/components\/"/);
    expect(html).not.toContain('id="all"');
    expect(html).not.toContain("landing-level__fold");
  });
});

describe("the page of the catalog: a stylesheet per piece, linked only when used, its script loaded when the piece is there", () => {
  const css = read("apps/landing/landing.css");
  const sheets = readdirSync(join(repo, "packages/catalog/src/components")).filter((n) => n.endsWith(".css") && n !== "index.css" && !n.startsWith("_")).map((n) => n.slice(0, -4));
  const catalogPage = (prefix) => rendered.get(`${prefix}catalog/`);
  const sectionOf = (html, id) => {
    const start = html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`));
    if (start < 0) return "";
    const next = html.indexOf("<section", start + 1);
    return html.slice(start, next < 0 ? html.indexOf("</main>", start) : next);
  };

  it("lives at /catalog/ (it was /components/), and the home links it there", () => {
    expect(rendered.has("/catalog/")).toBe(true);
    expect(rendered.has("/components/")).toBe(false);
    expect(rendered.get("/")).toContain('href="/catalog/"');
    expect(rendered.get("/")).not.toContain('href="/components/"');
  });

  it.each(LANGS)("in %s: the hero has one line, two buttons and four numbers read from the packages (the pieces, the scripts, the weight, the dependencies)", (code, prefix) => {
    const hero = sectionOf(catalogPage(prefix), "hero");
    expect(hero).toMatch(/^<section class="landing-intro landing-demo landing-views"/);
    expect(hero.match(/<a class="luz-btn/g)).toHaveLength(2);
    const facts = [...hero.matchAll(/<li><strong>([^<]+)<\/strong> ([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(facts).toHaveLength(4);
    expect(facts[0]).toBe(String(sheets.length));
    expect(facts[1]).toBe(String(FILES.catalog.chunks.length));
    expect(facts[3]).toBe("0");
  });

  it.each(LANGS)("in %s: the demo picks a kind of site: a wireframe of its patterns beside the links of the stylesheets it needs, in cascade order, then the script", (code, prefix) => {
    const hero = sectionOf(catalogPage(prefix), "hero");
    const radios = [...hero.matchAll(/<input type="radio" name="view" value="([a-z]+)"( checked)?>/g)];
    expect(radios.map((m) => m[1])).toEqual(FITS_KINDS);
    expect(radios.map((m) => Boolean(m[2]))).toEqual([true, false, false, false]);
    expect(hero).toContain('<div class="landing-demo__product landing-views__product" inert>');
    const plain = (text) => text.replace(/<\/?span\b[^>]*>/g, "").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"');
    for (const kind of FITS_KINDS) {
      const { files, pages } = kindPatterns(kind, repo, null);
      const page = new RegExp(`<div class="landing-views__page landing-views__page--site" data-view="${kind}">([\\s\\S]*?)</span></div>(?=<div class="landing-views__page|\\s*</div>)`).exec(hero)?.[1] ?? "";
      const named = [...page.matchAll(/<code>([a-z-]+)<\/code>/g)].map((m) => m[1]);
      expect(named.length, kind).toBeGreaterThanOrEqual(5);
      for (const name of named) expect(pages, `${kind} draws ${name}`).toContain(name);
      const listing = new RegExp(`<code class="landing-demo__look" data-look="${kind}">([\\s\\S]*?)</code>`).exec(hero)?.[1] ?? "";
      const lines = plain(listing).split("\n");
      expect(lines.slice(0, -1), kind).toEqual(files.map((file) => `<link rel="stylesheet" href="…/${file.replace(/\.css$/, ".min.css")}">`));
      expect(lines.at(-1), kind).toBe('<script type="module" src="…/catalog.min.js"></script>');
    }
  });

  // a block holds sections of its own (an announcement, the cookie banner): it ends where the next block or the next step starts
  const blockOf = (html, id) => {
    const start = html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`));
    if (start < 0) return "";
    const ends = [html.indexOf('<section class="landing-inside', start + 1), html.indexOf('<section class="landing-level__next"', start)].filter((n) => n > 0);
    return html.slice(start, Math.min(...ends));
  };

  it.each(LANGS)("in %s: four blocks, structure, content, charts and site-wide, in the sides of the home with the panel on the wider side, each every piece of the docs' groups it covers, live, linking those groups with their counts", (code, prefix) => {
    const html = catalogPage(prefix);
    const groups = new Map();
    for (const page of site.pages.filter((p) => p.meta.area === "catalog" && p.meta.group)) groups.set(page.meta.group, (groups.get(page.meta.group) ?? 0) + 1);
    const BLOCKS = [["structure", ["navigation", "page-structure"]], ["content", ["content"]], ["charts", ["charts"]], ["sitewide", ["site-wide", "documentation"]]];
    // every group of the catalog's docs but the reference of the classes is a block's
    expect([...groups.keys()].filter((g) => g !== "reference").sort()).toEqual(BLOCKS.flatMap(([, covered]) => covered).sort());
    BLOCKS.forEach(([id, covered], i) => {
      const block = blockOf(html, `k-${id}`);
      expect(block, id).toMatch(new RegExp(`^<section class="landing-inside${i % 2 ? " landing-inside--flip" : ""} landing-block landing-block--${id} landing-block--wide"`));
      const links = [...block.matchAll(/<a class="landing-block__link" href="([^"]+)"[^>]*>[^<]+<span class="landing-names__n">(\d+)<\/span>/g)];
      expect(links.map((m) => m[1].replace(/^\/(es|ar)\//, "/")), id).toEqual(covered.map((g) => `/docs/catalog/#group-${g}`));
      expect(links.map((m) => Number(m[2])), id).toEqual(covered.map((g) => groups.get(g)));
      // each piece is there, live: its class or its CSS-only tag; page transition has no look of its own, so a card shows it
      const pieces = site.pages.filter((p) => p.meta.area === "catalog" && covered.includes(p.meta.group)).map((p) => p.route.split("/").filter(Boolean).at(-1));
      expect(pieces.length, id).toBe(covered.reduce((n, g) => n + groups.get(g), 0));
      for (const name of pieces) {
        if (name === "page-transition") expect(block).toContain('class="landing-card landing-card--page-transition"');
        else expect(block, `${id} shows ${name}`).toMatch(new RegExp(`class="(?:[^"]* )?luz-${name}(?=__|[\\s"-])|<luz-${name}[\\s>]`));
      }
      // what is live is inert, so the keyboard stays out of it, and no panel is forced left to right
      const live = block.match(/<div class="landing-core__live[^"]*"[^>]*>/g) ?? [];
      expect(live.length, id).toBeGreaterThan(0);
      for (const tag of live) expect(tag, id).toMatch(/\sinert>$/);
      expect(block).toMatch(/<div class="landing-panel landing-block__panel">/);
    });
  });

  it.each(LANGS)("in %s: no piece in the blocks wakes a script (catalog.js would load it and a cookie banner would really ask), and none links away", (code, prefix) => {
    const html = catalogPage(prefix);
    const blocks = html.slice(html.indexOf('<div class="landing-level__blocks">'), html.indexOf('<section class="landing-level__next"'));
    for (const tag of ["luz-search", "luz-cookie-consent", "luz-theme-time", "luz-timeline", "luz-embed", "luz-chart"]) expect(blocks, tag).not.toMatch(new RegExp(`<${tag}[\\s>]`));
    expect(blocks).not.toMatch(/data-luz-spy|data-luz-consent\b/);
    // only the links of the words to the docs' groups go somewhere
    expect(blocks.replace(/<pre\b[\s\S]*?<\/pre>/g, "").replace(/<ul class="landing-block__groups">[\s\S]*?<\/ul>/g, "")).not.toMatch(/<a\b[^>]*\shref=/);
  });

  it("links every stylesheet of the catalog, once and before the landing's, on its page only", () => {
    for (const [, prefix] of LANGS) {
      const head = catalogPage(prefix).split("</head>")[0];
      const linked = [...head.matchAll(/<link rel="stylesheet" href="\/packages\/catalog\/dist\/components\/([a-z-]+)\.css">/g)].map((m) => m[1]);
      expect([...linked].sort()).toEqual([...sheets].sort());
      expect(head.lastIndexOf("/packages/catalog/dist/components/")).toBeLessThan(head.indexOf("/apps/landing/landing.css"));
      for (const page of [prefix, `${prefix}core/`, `${prefix}tokens/`]) expect(rendered.get(page).split("</head>")[0]).not.toContain("/components/docs-layout.css");
    }
  });

  it.each(LANGS)("in %s: three steps (install, link the pieces you use, add the script once) and what you get, then the next step to the kinds of site, and no list of names: every piece is live in the blocks", (code, prefix) => {
    const html = catalogPage(prefix);
    const steps = sectionOf(html, "steps");
    expect(steps.match(/class="landing-path__step landing-path__step--(1|2|3|result)"/g)).toHaveLength(4);
    expect(steps).toContain("npm install @luz-ds/tokens @luz-ds/core @luz-ds/catalog");
    expect(steps).toContain("components/search.min.css");
    expect(steps).toContain("catalog.min.js");
    expect(sectionOf(html, "next")).toMatch(/href="(\/(es|ar))?\/docs\/ai\/"/);
    expect(html).not.toContain('id="all"');
    expect(html).not.toContain("landing-level__fold");
  });

  it("draws a wireframe as a grid its generator places, and a kind of site large", () => {
    expect(css).toMatch(/\.landing-wf\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--cols\), minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.landing-wf--page\s*\{[^}]*block-size/);
  });
});
