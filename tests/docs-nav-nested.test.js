/**
 * LUZ docs site: the HTML elements are listed inside Catalog in the sidebar (owner, 2026-11-25). The area keeps its own
 * routes, its index, its breadcrumb and its place in the A-Z; only its entry in the sidebar moves: no fold of its own, a
 * labelled group in the fold of Catalog (`"nestIn": "catalog"` in site.json), with its index and every page of it once.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, scanSite } from "../scripts/docs-site/site.js";
import { findAll, hasClass, parse, query, queryAll, textOf } from "./helpers/html-dom.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = scanSite(join(repo, "apps/docs"), repo);
const { rendered } = buildSite(site);
const tree = (route) => parse(rendered.get(route), route);
const listIn = (dom) => query(dom, "ul.docs-nav");
const itemOfArea = (dom, id) => listIn(dom).children.filter((n) => n.name === "li").find((li) => query(li, "a.docs-nav__area")?.attrs.get("id") === `a-${id}`);
const htmlPages = site.pages.filter((p) => p.meta.area === "html" && p.meta.nav !== "false").map((p) => p.route);

describe("the HTML elements inside Catalog, in the sidebar", () => {
  it("says it in site.json: the html area is nested in catalog and keeps its slug", () => {
    const html = site.areas.find((a) => a.id === "html");
    expect(html.nestIn).toBe("catalog");
    expect(html.slug).toBe("html");
  });

  it("has no fold of its own in the list of areas", () => {
    for (const route of ["/docs/", "/docs/catalog/", "/docs/html/forms/"]) {
      expect(itemOfArea(tree(route), "html"), route).toBeUndefined();
      expect(queryAll(tree(route), "a.docs-nav__area").map(textOf)).not.toContain("HTML elements");
    }
  });

  it("is a labelled group at the end of the fold of Catalog, with its index and every page of the area once", () => {
    const dom = tree("/docs/catalog/");
    const fold = itemOfArea(dom, "catalog");
    const groups = findAll(fold, (n) => hasClass(n, "docs-nav__group"));
    const group = groups.find((g) => textOf(query(g, ".luz-sidebar__section-label")) === "HTML elements");
    expect(group, "a group of HTML elements in the fold of Catalog").toBeDefined();
    const hrefs = queryAll(group, "a.luz-sidebar__link").map((a) => a.attrs.get("href"));
    expect(hrefs.sort()).toEqual([...htmlPages].sort());
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain("/docs/html/");
  });

  it("opens the fold of Catalog, and only it, on a page of the HTML elements, and marks the page", () => {
    const dom = tree("/docs/html/forms/");
    const open = queryAll(listIn(dom), "details").filter((d) => d.attrs.has("open"));
    expect(open).toHaveLength(1);
    expect(query(open[0].parent, "a.docs-nav__area").attrs.get("id")).toBe("a-catalog");
    const current = queryAll(listIn(dom), "a").filter((a) => a.attrs.get("aria-current") === "page" && a.attrs.get("href") === "/docs/html/forms/");
    expect(current).toHaveLength(1);
  });

  it("keeps the breadcrumb of the area: Docs, HTML elements, the page", () => {
    const crumbs = queryAll(tree("/docs/html/forms/"), ".luz-breadcrumb__item").map(textOf);
    expect(crumbs[1]).toBe("HTML elements");
  });
});
