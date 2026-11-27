/**
 * <luz-showcase> of @luz-ds/catalog (`packages/catalog/src/components/showcase.css`, a CSS-only tag): a row of links,
 * each a logo and a name, still and centred. It has no attribute and no motion: to make it move, it goes in a
 * <luz-marquee> (tests/marquee.test.js). What the source, the built file, the manifests, the cascade and the docs page
 * say. What a browser paints is tests/showcase.spec.js.
 *
 *  - the stylesheet names the tag and nothing else: no class, every selector that names it wholly inside `:where()`
 *    (RL-11, like the other CSS-only tags), and no `:defined`: no script ever defines the tag;
 *  - tokens only: no hex, no named colour, no px; it declares no property of its own and holds no motion: no
 *    animation, no keyframes, no mask, no `scroll` attribute, no rule for a copy of the list, no print rules;
 *  - it is built once in `luz.catalog` (and has no `luz.print` layer); packed; listed in custom-elements.json as a
 *    CSS-only tag with no attribute; in CASCADE after the social links;
 *  - its page is a page of the Catalog, group `content`, that fits a landing page best, with the structure every
 *    page of a component has (the shape of all of them is in tests/docs-site.test.js), one still example, and a
 *    pointer to the marquee.
 *
 * Needs `pnpm catalog:build` first (the built file is read from dist). No weight of showcase.css is pinned here.
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

const TAG = "luz-showcase";
const SOURCE = "packages/catalog/src/components/showcase.css";
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

describe("showcase.css: the tag and what is inside it, all in :where()", () => {
  it("exists, with the header of a CSS-only tag: its @element and no @attr, and a word that sends the motion to <luz-marquee>", () => {
    expect(existsSync(`${repo}/${SOURCE}`), SOURCE).toBe(true);
    expect(raw).toMatch(/@element luz-showcase - CSS-only: no script defines this tag\./);
    expect(raw).not.toMatch(/@attr /);
    expect(raw.slice(0, raw.indexOf("@element"))).toContain("<luz-marquee>");
  });

  it("names the tag in every rule, and each selector that names it is wholly inside :where() (red line 11)", () => {
    expect(selectors.length, `${SOURCE} has rules`).toBeGreaterThan(5);
    const named = selectors.filter((s) => tagIn.test(s));
    expect(named.length, "rules that name the tag").toBeGreaterThan(5);
    expect(named.filter((s) => tagIn.test(withoutWhere(s)))).toEqual([]);
    // Everything is inside the :where() too: nothing to specify against
    expect(selectors.filter((s) => !s.startsWith(":where(") && !/^(?:to|from|\d+%)$/.test(s))).toEqual([]);
  });

  it("no selector is a bare element once :where() is stripped, and it styles the list, the link and the logo", () => {
    expect(selectors.filter((s) => !/^(?:to|from|\d+%)$/.test(s)).filter(isBare)).toEqual([]);
    const text = selectors.join("\n");
    expect(text).toMatch(/luz-showcase > ul\)/);
    expect(text).toMatch(/luz-showcase a\)/);
    expect(text).toMatch(/luz-showcase a:hover/);
    expect(text).toMatch(/luz-showcase a:focus-visible/);
    expect(text).toMatch(/luz-showcase a > svg/);
    expect(text).toMatch(/luz-showcase a > img/);
  });

  it("is selected by the tag and its markup: no class, no id, no `luz-site-` name, and it is never `:defined`", () => {
    const text = selectors.join("\n");
    expect(text, "no class in a selector").not.toMatch(/\.[a-z_-]/i);
    expect(text, "no id in a selector").not.toMatch(/#[a-z_-]/i);
    expect(css).not.toMatch(/:defined/);
    expect(css).not.toMatch(/luz-site-/);
  });

  it("the still row is a flex row that wraps, centred, with no bullets or indent", () => {
    const list = ruleBody(css, ":where(luz-showcase > ul)");
    expect(list).toMatch(/display:\s*flex/);
    expect(list).toMatch(/flex-wrap:\s*wrap/);
    expect(list).toMatch(/justify-content:\s*center/);
    expect(list).toMatch(/list-style:\s*none/);
    expect(list).toMatch(/padding:\s*0/);
    expect(list).toMatch(/margin:\s*0/);
  });

  it("holds no motion and no copy: no animation, no keyframes, no mask, no `scroll`, no rule for an aria-hidden list, no media query", () => {
    expect(css).not.toMatch(/animation/);
    expect(css).not.toMatch(/@keyframes/);
    expect(css).not.toMatch(/mask-image/);
    expect(css).not.toMatch(/overflow\s*:\s*hidden/);
    expect(css).not.toMatch(/\[scroll\]/);
    expect(css).not.toMatch(/aria-hidden/);
    expect(css).not.toMatch(/@media/);
    expect(css).not.toMatch(/--luz-showcase-duration/);
    expect(css).not.toMatch(/luz-marquee/);
    expect(css).not.toMatch(/luz-showcase-run/);
  });

  it("the link is quiet (--luz-text-secondary), --luz-text-primary on hover and on keyboard focus, at least --luz-control-md tall", () => {
    const link = ruleBody(css, ":where(luz-showcase a)");
    expect(link).toMatch(/color:\s*var\(--luz-text-secondary\)/);
    expect(link).toMatch(/min-block-size:\s*var\(--luz-control-md\)/);
    expect(link).toMatch(/text-decoration:\s*none/);
    const hover = ruleBody(css, ":where(luz-showcase a:hover, luz-showcase a:focus-visible)");
    expect(hover).toMatch(/color:\s*var\(--luz-text-primary\)/);
  });

  it("the logo follows the text: 1.5em square, an svg or an img", () => {
    const logo = ruleBody(css, ":where(luz-showcase a > svg, luz-showcase a > img)");
    expect(logo).toMatch(/inline-size:\s*1\.5em/);
    expect(logo).toMatch(/block-size:\s*1\.5em/);
  });

  it("reads tokens only: no hex or named colour, no px typed in a size", () => {
    expect(css, SOURCE).not.toBe("");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?<![\w-])(?:red|blue|green|black|white|gray|grey|orange|purple|yellow)(?![\w-])/i);
    expect(css).not.toMatch(/\d+px/);
    expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/);
    for (const token of ["--luz-text-secondary", "--luz-text-primary", "--luz-control-md", "--luz-space-sm", "--luz-space-2xl", "--luz-duration-base"]) expect(css, token).toContain(token);
  });

  it("declares no custom property: the host is a block in the sans family", () => {
    expect([...css.matchAll(/(?:^|[\s;{])(--luz-[\w-]+)\s*:/g)].map((m) => m[1])).toEqual([]);
    const host = ruleBody(css, ":where(luz-showcase)");
    expect(host).toMatch(/display:\s*block/);
    expect(host).toMatch(/font-family:\s*var\(--luz-font-sans\)/);
  });
});

describe("showcase.css, built", () => {
  const file = `${DIST}/components/showcase.css`;
  const built = existsSync(`${repo}/${file}`) ? read(file) : "";

  it("is in luz.catalog once, with no print layer, no keyframes and no media query: the row is the same on screen and on paper", () => {
    expect(built, `${file} (pnpm catalog:build)`).not.toBe("");
    expect(built.match(/^@layer luz\.catalog \{$/gm) ?? []).toHaveLength(1);
    expect(built.match(/^@layer luz\.print \{$/gm) ?? [], "no block in luz.print").toHaveLength(0);
    expect(built).not.toContain("@keyframes");
    expect(built).not.toContain("@media");
  });

  it("has its minified file, and both are in the tarball list", () => {
    expect(existsSync(`${repo}/${DIST}/components/showcase.min.css`), "showcase.min.css").toBe(true);
    const packed = read("packages/catalog/pack-files.txt").split("\n").map((l) => l.trim());
    expect(packed).toContain("dist/components/showcase.css");
    expect(packed).toContain("dist/components/showcase.min.css");
  });
});

describe("<luz-showcase> in the manifests and the cascade", () => {
  it("custom-elements.json lists it once, as a CSS-only tag of components/showcase.css, with no attribute and no event", () => {
    const manifest = readJson(`${DIST}/custom-elements.json`, { modules: [] });
    const tags = manifest.modules.flatMap((m) => (m.declarations ?? []).filter((d) => d.customElement));
    const showcase = tags.filter((d) => d.tagName === TAG);
    expect(showcase).toHaveLength(1);
    expect(showcase[0].stylesheet).toBe("components/showcase.css");
    expect(showcase[0].description).toMatch(/^CSS-only: no script defines this tag\./);
    expect(showcase[0].attributes ?? [], "no attribute: the motion is <luz-marquee>").toEqual([]);
    expect(showcase[0].events ?? []).toEqual([]);
    const module = manifest.modules.find((m) => m.declarations?.some((d) => d.tagName === TAG));
    expect(module?.path).toBe("components/showcase.css");
    expect(module?.exports, "a tag no script defines has no definition").toBeUndefined();
  });

  it("classes.json lists no class of it: the tag is the block and nothing in it has a class", () => {
    const manifest = readJson(`${DIST}/classes.json`, { classes: [] });
    expect(manifest.classes.filter((c) => /luz-showcase/.test(c.name))).toEqual([]);
  });

  it("classes.json lists no property of it: --luz-showcase-duration went with the marquee", () => {
    expect(read(`${DIST}/classes.json`)).not.toContain("luz-showcase-duration");
  });

  it("is in CASCADE once, after the social links", () => {
    expect(CASCADE.filter((name) => name === "showcase")).toHaveLength(1);
    expect(CASCADE.indexOf("showcase")).toBeGreaterThan(CASCADE.indexOf("social"));
  });
});

describe("the page /docs/catalog/showcase/", () => {
  const ROUTE = "/docs/catalog/showcase/";
  // A missing page is an assertion below, not a crash of the whole file
  const page = site.byRoute.get(ROUTE) ?? { meta: {}, body: "", file: "apps/docs/pages/catalog/showcase.html" };

  it("is a page of the Catalog, group content, that fits a landing page best, and names the tag alone in its files", () => {
    expect(site.byRoute.has(ROUTE), "apps/docs/pages/catalog/showcase.html").toBe(true);
    expect(page.file).toBe("apps/docs/pages/catalog/showcase.html");
    expect(page.meta.area).toBe("catalog");
    expect(page.meta.group).toBe("content");
    expect(page.meta["fits-kinds"]).toBe("landing");
    expect(page.meta.fits?.length).toBeGreaterThan(10);
    expect(page.meta.files?.split(/[;,]/).map((f) => f.trim())).toEqual(["<luz-showcase>"]);
    expect(page.meta.toc).toBe("h2,h3");
    expect(page.body).toContain('<div class="docs-component" id="p-showcase">');
  });

  it("is found by the generator as a catalog page that fits a landing page", () => {
    expect(catalogPatterns(repo).find((p) => p.slug === "showcase")).toMatchObject({ kinds: ["landing"], files: ["<luz-showcase>"] });
  });

  it("has the example, the known issues, and the Code and Design tabs with their sections", () => {
    for (const id of ["example", "known-issues", "code", "design", "markup", "variants", "how", "no-js", "keyboard", "when", "when-not", "do-dont", "content", "contrast", "tokens"]) {
      expect(page.body, `#${id}`).toContain(`id="${id}"`);
    }
    expect(page.body).toContain('<nav class="luz-tabs docs-view-tabs" aria-label="Showcase documentation">');
  });

  it("shows one still row live, a single list with no copy, and no `scroll` anywhere: the motion is the marquee's", () => {
    const root = parse(page.body, page.file);
    const hosts = queryAll(root, "luz-showcase");
    expect(hosts.length, "a still row in the page").toBeGreaterThanOrEqual(1);
    for (const host of hosts) {
      expect(host.attrs.has("scroll"), "no `scroll` attribute").toBe(false);
      expect(host.children.filter((c) => c.name === "ul").length, "the list, once").toBe(1);
      expect(host.attrs.has("aria-hidden"), "a showcase of the page is not a copy").toBe(false);
    }
    expect(page.body).not.toContain("--luz-showcase-duration");
    expect(page.body).not.toMatch(/\bscroll\b[^-]*attribute|<code>scroll<\/code>/);
  });

  it("sends whoever wants it to move to <luz-marquee>, with a link to its page", () => {
    expect(page.body).toContain("luz-marquee");
    expect(page.body).toContain('href="/docs/catalog/marquee/"');
  });

  it("lists the tokens the CSS reads in Tokens it uses, and none of the motion", () => {
    const section = page.body.split('<h3 id="tokens">')[1] ?? "";
    for (const token of ["--luz-text-secondary", "--luz-text-primary", "--luz-control-md", "--luz-duration-base"]) expect(section, token).toContain(token);
    expect(section).not.toContain("--luz-duration-lazy");
  });
});
