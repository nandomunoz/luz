/**
 * <luz-marquee> of @luz-ds/catalog (`packages/catalog/src/components/marquee.css`, a CSS-only tag): content that loops
 * along one line between two hairlines, fading at both ends: a ul of phrases, a row of links, a <luz-showcase>. The
 * content is written twice as the two children of the tag, the second `aria-hidden="true"`. What the source, the built
 * file, the manifests, the cascade and the docs page say. What a browser paints is tests/marquee.spec.js.
 *
 *  - the stylesheet names the tag and nothing else: no class, every selector wholly inside `:where()` (RL-11, like the
 *    other CSS-only tags), no `:defined` (no script ever defines the tag), and it names no other tag: the showcase and
 *    the marquee know nothing of one another, a `ul` inside any child is nowrap;
 *  - tokens only: no hex, no named colour, no px but the hairline; the one property it declares is
 *    `--luz-marquee-duration`, on the host, from a motion token;
 *  - the motion is two keyframes (left, and right in a right-to-left page), paused while the pointer is over the tag or
 *    something in it has the focus, and under reduced motion and on paper it is the first copy alone: block, no fade,
 *    no animation, the copy not shown, the lists wrapped and centred;
 *  - the star between the phrases is generated content with an empty text alternative;
 *  - it is built once in `luz.catalog`, its print rules in `luz.print`; packed; listed in custom-elements.json as a
 *    CSS-only tag with no attribute; in CASCADE after the showcase;
 *  - its page is a page of the Catalog, group `content`, that fits a landing page best, with the structure every page
 *    of a component has (the shape of all of them is in tests/docs-site.test.js).
 *
 * Needs `pnpm catalog:build` first (the built file is read from dist). No weight of marquee.css is pinned here.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isBare } from "../scripts/stylelint/no-bare-element.js";
import { CASCADE, catalogPatterns } from "../scripts/docs-site/kinds.js";
import { selectorsOf } from "./helpers/css-blocks.js";
import { site } from "./helpers/docs-site.js";
import { parse, queryAll } from "./helpers/html-dom.js";
import { repo } from "./helpers/page-facts.js";

const read = (path) => readFileSync(`${repo}/${path}`, "utf-8");
// A missing built file is an assertion below, not a crash of the whole file
const readJson = (path, empty) => (existsSync(`${repo}/${path}`) ? JSON.parse(read(path)) : empty);
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const TAG = "luz-marquee";
const SOURCE = "packages/catalog/src/components/marquee.css";
const DIST = "packages/catalog/dist";
// A missing file is an assertion below, not a crash of the whole file
const raw = existsSync(`${repo}/${SOURCE}`) ? read(SOURCE) : "";
const css = stripComments(raw);
const selectors = selectorsOf(css).flatMap((prelude) => prelude.split(/,(?![^(]*\))/).map((s) => s.trim()));

/** Remove every :where(…) group, whatever it holds. */
function withoutWhere(selector) {
  let s = selector;
  for (let i = s.indexOf(":where("); i !== -1; i = s.indexOf(":where(")) {
    let depth = 0;
    let j = s.indexOf("(", i);
    for (; j < s.length; j++) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")" && --depth === 0) break;
    }
    s = s.slice(0, i) + s.slice(j + 1);
  }
  return s;
}

/** The text between the braces of the block that starts with `prelude`, brace-matched; "" when there is none. */
function blockOf(text, prelude) {
  const start = text.indexOf(prelude);
  if (start === -1) return "";
  let depth = 0;
  for (let i = text.indexOf("{", start); i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(text.indexOf("{", start) + 1, i);
  }
  return "";
}

/** The declarations of the rule whose selector is exactly `selector`, inside `text`; "" when there is none. */
function ruleBody(text, selector) {
  const at = text.indexOf(`${selector} {`);
  return at === -1 ? "" : blockOf(text.slice(at), selector);
}

const tagIn = new RegExp(`(?<![.#\\w-])${TAG}(?![\\w-])`);

describe("marquee.css: the tag and what is inside it, all in :where()", () => {
  it("exists, with the header of a CSS-only tag: its @element and no @attr", () => {
    expect(existsSync(`${repo}/${SOURCE}`), SOURCE).toBe(true);
    expect(raw).toMatch(/@element luz-marquee - CSS-only: no script defines this tag\./);
    expect(raw).not.toMatch(/@attr /);
  });

  it("names the tag in every rule, and each selector that names it is wholly inside :where() (red line 11)", () => {
    expect(selectors.length, `${SOURCE} has rules`).toBeGreaterThan(8);
    const named = selectors.filter((s) => tagIn.test(s));
    expect(named.length, "rules that name the tag").toBeGreaterThan(8);
    expect(named.filter((s) => tagIn.test(withoutWhere(s)))).toEqual([]);
    // The direction and the pseudo-element are the only things outside or beside a :where(), and keyframe steps
    expect(selectors.filter((s) => !/^:where\(/.test(s) && !/^(?:to|from|\d+%)$/.test(s))).toEqual([]);
  });

  it("no selector is a bare element once :where() is stripped, and it styles the children, the lists and the phrases", () => {
    expect(selectors.filter((s) => !/^(?:to|from|\d+%)$/.test(s)).filter(isBare)).toEqual([]);
    const text = selectors.join("\n");
    expect(text).toMatch(/luz-marquee > \*\)/);
    expect(text).toMatch(/luz-marquee ul\)/);
    expect(text).toMatch(/luz-marquee li\)/);
    expect(text).toMatch(/luz-marquee > ul > li\)::after/);
    expect(text).toMatch(/luz-marquee:dir\(rtl\) > \*\)/);
    expect(text).toMatch(/luz-marquee:hover > \*/);
    expect(text).toMatch(/luz-marquee:focus-within > \*/);
    // selectorsOf blanks a quoted value: [aria-hidden="true"] reads [aria-hidden=""]
    expect(text).toMatch(/luz-marquee > \[aria-hidden=""\]\)/);
  });

  it("is selected by the tag and its markup: no class, no id, no `luz-site-` name, never `:defined`, and no other tag", () => {
    const text = selectors.join("\n");
    expect(text, "no class in a selector").not.toMatch(/\.[a-z_-]/i);
    expect(text, "no id in a selector").not.toMatch(/#[a-z_-]/i);
    expect(css).not.toMatch(/:defined/);
    expect(css).not.toMatch(/luz-site-/);
    expect([...new Set([...css.matchAll(/(?<![\w-])(luz-[a-z-]+)(?![\w-])/g)].map((m) => m[1]).filter((n) => !n.startsWith("luz-marquee-run")))].sort()).toEqual(["luz-marquee"]);
  });

  it("reads tokens only: no hex or named colour, no px typed in a size but the 1px hairline", () => {
    expect(css, SOURCE).not.toBe("");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?<![\w-])(?:red|blue|green|black|white|gray|grey|orange|purple|yellow)(?![\w-])/i);
    expect(css.replace(/\b1px solid\b/g, "")).not.toMatch(/\d+px/);
    expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/);
    for (const token of ["--luz-divider", "--luz-brand-primary", "--luz-text-primary", "--luz-text-lg", "--luz-text-sm", "--luz-space-md", "--luz-space-xl", "--luz-duration-lazy", "--luz-font-sans"]) expect(css, token).toContain(token);
  });

  it("declares one property, --luz-marquee-duration, on the host: how long a loop takes, from a motion token", () => {
    expect([...css.matchAll(/(?:^|[\s;{])(--luz-[\w-]+)\s*:/g)].map((m) => m[1])).toEqual(["--luz-marquee-duration"]);
    const host = ruleBody(css, ":where(luz-marquee)");
    expect(host).toMatch(/--luz-marquee-duration:\s*calc\(var\(--luz-duration-lazy\)\s*\*\s*50\)/);
  });
});

describe("marquee.css: the band", () => {
  it("the host is a flex band that hides what overflows, with a hairline above and below and a fade at both ends", () => {
    const host = ruleBody(css, ":where(luz-marquee)");
    expect(host).toMatch(/display:\s*flex/);
    expect(host).toMatch(/overflow:\s*hidden/);
    expect(host).toMatch(/border-block:\s*1px solid var\(--luz-divider\)/);
    expect(host).toMatch(/mask-image:\s*linear-gradient\(/);
    expect(host).toMatch(/font-family:\s*var\(--luz-font-sans\)/);
  });

  it("a child is a flex row that does not shrink, with room after it, and loops for --luz-marquee-duration in a straight line", () => {
    const child = ruleBody(css, ":where(luz-marquee > *)");
    expect(child).toMatch(/display:\s*flex/);
    expect(child).toMatch(/flex:\s*none/);
    expect(child).toMatch(/padding-inline-end:\s*var\(--luz-space-xl\)/);
    expect(child).toMatch(/animation:\s*luz-marquee-run var\(--luz-marquee-duration\) linear infinite/);
  });

  it("what a child holds never wraps: a ul is a nowrap row that starts at the start", () => {
    const list = ruleBody(css, ":where(luz-marquee ul)");
    expect(list).toMatch(/display:\s*flex/);
    expect(list).toMatch(/flex-wrap:\s*nowrap/);
    expect(list).toMatch(/justify-content:\s*flex-start/);
    expect(list).toMatch(/list-style:\s*none/);
    expect(list).toMatch(/padding:\s*0/);
    expect(list).toMatch(/margin:\s*0/);
    expect(ruleBody(css, ":where(luz-marquee li)")).toMatch(/margin:\s*0/);
  });

  it("a phrase is text on --luz-text-primary, --luz-text-lg, on one line, and the star after it is --luz-brand-primary with no text alternative", () => {
    const phrase = ruleBody(css, ":where(luz-marquee > ul > li)");
    expect(phrase).toMatch(/color:\s*var\(--luz-text-primary\)/);
    expect(phrase).toMatch(/font-size:\s*var\(--luz-text-lg\)/);
    expect(phrase).toMatch(/white-space:\s*nowrap/);
    const star = ruleBody(css, ":where(luz-marquee > ul > li)::after");
    expect(star).toMatch(/content:\s*"\\2726"\s*\/\s*""/);
    expect(star).toMatch(/color:\s*var\(--luz-brand-primary\)/);
    expect(star).toMatch(/font-size:\s*var\(--luz-text-sm\)/);
  });
});

describe("marquee.css: the motion", () => {
  it("has two keyframes: luz-marquee-run to -100% and luz-marquee-run-rtl to 100%, and a right-to-left page runs the second", () => {
    expect(blockOf(css, "@keyframes luz-marquee-run ")).toMatch(/translate:\s*-100%\s+0/);
    expect(blockOf(css, "@keyframes luz-marquee-run-rtl ")).toMatch(/translate:\s*100%\s+0/);
    expect([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]).sort()).toEqual(["luz-marquee-run", "luz-marquee-run-rtl"]);
    expect(ruleBody(css, ":where(luz-marquee:dir(rtl) > *)")).toMatch(/animation-name:\s*luz-marquee-run-rtl/);
  });

  it("stops while the pointer is over the host or something in it has the focus", () => {
    const paused = ruleBody(css, ":where(luz-marquee:hover > *, luz-marquee:focus-within > *)");
    expect(paused).toMatch(/animation-play-state:\s*paused/);
  });

  for (const [name, prelude] of [["reduced motion", "@media (prefers-reduced-motion: reduce)"], ["paper", "@media print"]]) {
    it(`${name}: the first copy alone, block, no fade, no animation, the copy not shown, the lists wrapped and centred`, () => {
      const media = blockOf(css, prelude);
      expect(media, `${prelude} block`).not.toBe("");
      const host = ruleBody(media, ":where(luz-marquee)");
      expect(host).toMatch(/display:\s*block/);
      expect(host).toMatch(/mask-image:\s*none/);
      const child = ruleBody(media, ":where(luz-marquee > *)");
      expect(child).toMatch(/animation:\s*none/);
      expect(child).toMatch(/justify-content:\s*center/);
      expect(child).toMatch(/padding-inline-end:\s*0/);
      expect(ruleBody(media, ':where(luz-marquee > [aria-hidden="true"])')).toMatch(/display:\s*none/);
      const list = ruleBody(media, ":where(luz-marquee ul)");
      expect(list).toMatch(/flex-wrap:\s*wrap/);
      expect(list).toMatch(/justify-content:\s*center/);
      expect(ruleBody(media, ":where(luz-marquee > ul > li)")).toMatch(/white-space:\s*normal/);
    });
  }
});

describe("marquee.css, built", () => {
  const file = `${DIST}/components/marquee.css`;
  const built = existsSync(`${repo}/${file}`) ? read(file) : "";

  it("is in luz.catalog once, and its paper rules in luz.print", () => {
    expect(built, `${file} (pnpm catalog:build)`).not.toBe("");
    expect(built.match(/^@layer luz\.catalog \{$/gm) ?? []).toHaveLength(1);
    expect(built.match(/^@layer luz\.print \{$/gm) ?? []).toHaveLength(1);
    // The reduced-motion block stays in the component's layer; the paper block is the one in luz.print
    const printLayer = built.slice(built.indexOf("@layer luz.print {"));
    expect(printLayer).toContain("@media print");
    expect(printLayer).toContain("luz-marquee");
    expect(built.slice(0, built.indexOf("@layer luz.print {"))).not.toContain("@media print");
    expect(built).toContain("@keyframes luz-marquee-run");
    expect(built).toContain("prefers-reduced-motion");
  });

  it("has its minified file, and both are in the tarball list", () => {
    expect(existsSync(`${repo}/${DIST}/components/marquee.min.css`), "marquee.min.css").toBe(true);
    const packed = read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim());
    expect(packed).toContain("dist/components/marquee.css");
    expect(packed).toContain("dist/components/marquee.min.css");
  });
});

describe("<luz-marquee> in the manifests and the cascade", () => {
  it("custom-elements.json lists it once, as a CSS-only tag of components/marquee.css, with no attribute and no event", () => {
    const manifest = readJson(`${DIST}/custom-elements.json`, { modules: [] });
    const tags = manifest.modules.flatMap((m) => (m.declarations ?? []).filter((d) => d.customElement));
    const marquee = tags.filter((d) => d.tagName === TAG);
    expect(marquee).toHaveLength(1);
    expect(marquee[0].stylesheet).toBe("components/marquee.css");
    expect(marquee[0].description).toMatch(/^CSS-only: no script defines this tag\./);
    expect(marquee[0].attributes ?? []).toEqual([]);
    expect(marquee[0].events ?? []).toEqual([]);
    const module = manifest.modules.find((m) => m.declarations?.some((d) => d.tagName === TAG));
    expect(module?.path).toBe("components/marquee.css");
    expect(module?.exports, "a tag no script defines has no definition").toBeUndefined();
  });

  it("classes.json lists no class of it, and its one property, --luz-marquee-duration, as a property of the component in luz.catalog", () => {
    const manifest = readJson(`${DIST}/classes.json`, { classes: [], properties: [] });
    expect(manifest.classes.filter((c) => /luz-marquee/.test(c.name))).toEqual([]);
    const text = read(`${DIST}/classes.json`);
    expect(text).toContain('"--luz-marquee-duration"');
  });

  it("is in CASCADE once, right after the showcase: its rules are the ones that hold when the two meet", () => {
    expect(CASCADE.filter((name) => name === "marquee")).toHaveLength(1);
    expect(CASCADE.indexOf("marquee")).toBeGreaterThan(CASCADE.indexOf("showcase"));
  });

  it("the catalog's docs stylesheet imports it after the showcase", () => {
    const imports = [...read("apps/docs/catalog-patterns.css").matchAll(/components\/([\w-]+)\.css/g)].map((m) => m[1]);
    expect(imports).toContain("marquee");
    expect(imports.indexOf("marquee")).toBeGreaterThan(imports.indexOf("showcase"));
  });
});

describe("the page /docs/catalog/marquee/", () => {
  const ROUTE = "/docs/catalog/marquee/";
  // A missing page is an assertion below, not a crash of the whole file
  const page = site.byRoute.get(ROUTE) ?? { meta: {}, body: "", file: "apps/docs/pages/catalog/marquee.html" };

  it("is a page of the Catalog, group content, that fits a landing page best, and names the tag in its files", () => {
    expect(site.byRoute.has(ROUTE), "apps/docs/pages/catalog/marquee.html").toBe(true);
    expect(page.file).toBe("apps/docs/pages/catalog/marquee.html");
    expect(page.meta.area).toBe("catalog");
    expect(page.meta.group).toBe("content");
    expect(page.meta["fits-kinds"]).toBe("landing");
    expect(page.meta.fits?.length).toBeGreaterThan(10);
    expect(page.meta.files?.split(/[;,]/).map((f) => f.trim())).toEqual(["<luz-marquee>"]);
    expect(page.meta.toc).toBe("h2,h3");
    expect(page.body).toContain('<div class="docs-component" id="p-marquee">');
  });

  it("is found by the generator as a catalog page that fits a landing page", () => {
    expect(catalogPatterns(repo).find((p) => p.slug === "marquee")).toMatchObject({ kinds: ["landing"], files: ["<luz-marquee>"] });
  });

  it("has the example, the known issues, and the Code and Design tabs with their sections", () => {
    for (const id of ["example", "known-issues", "code", "design", "markup", "variants", "how", "no-js", "keyboard", "when", "when-not", "do-dont", "content", "contrast", "tokens"]) {
      expect(page.body, `#${id}`).toContain(`id="${id}"`);
    }
    expect(page.body).toContain('<nav class="luz-tabs docs-view-tabs" aria-label="Marquee documentation">');
  });

  it("shows a marquee live: the content twice, the copy aria-hidden with its links out of the tab order, and not inert", () => {
    const root = parse(page.body, page.file);
    const marquees = queryAll(root, "luz-marquee");
    expect(marquees.length, "a marquee in the page").toBeGreaterThanOrEqual(1);
    for (const marquee of marquees) {
      const copies = marquee.children.filter((c) => c.name);
      expect(copies.length, "the content, written twice").toBe(2);
      expect(copies[0].attrs.has("aria-hidden")).toBe(false);
      expect(copies[1].attrs.get("aria-hidden")).toBe("true");
      expect(copies[1].attrs.has("inert"), "the copy is not inert: a pointer can follow its links").toBe(false);
      const links = queryAll(copies[1], "a");
      expect(links.length).toBe(queryAll(copies[0], "a").length);
      for (const a of links) expect(a.attrs.get("tabindex")).toBe("-1");
      for (const a of queryAll(copies[0], "a")) expect(a.attrs.has("tabindex")).toBe(false);
    }
  });

  it("shows both kinds of content live: a ul of phrases, and a <luz-showcase>", () => {
    const root = parse(page.body, page.file);
    const marquees = queryAll(root, "luz-marquee");
    expect(marquees.some((m) => m.children.some((c) => c.name === "ul")), "a ticker of phrases").toBe(true);
    expect(marquees.some((m) => m.children.some((c) => c.name === "luz-showcase")), "a marquee of a showcase").toBe(true);
  });

  it("says how to read it: the duration property, the reduced motion state, the copy and the tab order", () => {
    expect(page.body).toContain("--luz-marquee-duration");
    expect(page.body).toMatch(/reduced motion/i);
    expect(page.body).toContain('aria-hidden="true"');
    expect(page.body).toContain('tabindex="-1"');
  });

  it("lists the tokens the CSS reads in Tokens it uses", () => {
    const section = page.body.split('<h3 id="tokens">')[1] ?? "";
    for (const token of ["--luz-divider", "--luz-brand-primary", "--luz-text-primary", "--luz-duration-lazy"]) expect(section, token).toContain(token);
  });
});
