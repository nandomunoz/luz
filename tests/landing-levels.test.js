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
const { rendered, problems } = buildSite(site, { extra });
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

  it.each(NAMES.flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: lists every element the home lists for the level, link for link", (name, code, prefix) => {
    const page = rendered.get(`${prefix}${name}/`);
    const wanted = listsOf(rendered.get(prefix), LEVEL[name].list);
    expect(wanted.length).toBeGreaterThan(0);
    const all = page.slice(page.indexOf('id="all"'));
    for (const list of wanted) expect(all, `${prefix}${name}/ has the list`).toContain(list);
  });

  it.each(NAMES.flatMap((name) => LANGS.map(([code, prefix]) => [name, code, prefix])))("%s in %s: its links to the home are the language's, and the page links to the docs of its level", (name, code, prefix) => {
    const html = rendered.get(`${prefix}${name}/`);
    // no link to a section the page does not have: they go to the home of the language
    expect(hrefsOf(html, /href="(#[^"]*)"/g).filter((href) => href !== "#main-content" && !href.startsWith("#all") && !href.startsWith("#install") && !href.startsWith("#hero"))).toEqual([]);
    expect(html).toMatch(new RegExp(`href="${prefix}#inside"`));
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
});
