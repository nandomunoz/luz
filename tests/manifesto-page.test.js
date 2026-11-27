/**
 * The manifesto (owner, 2026-11-25): one page at /manifesto/, the five points of
 * MANIFESTO.md in English, Spanish and Arabic, a switch of the three with no script,
 * and a link back to the home page at the end of each language.
 *
 *   1  the route: /manifesto/, an entry of the Pages build, answered by the dev server,
 *      rendered by buildSite() so its links are checked like any page's
 *   2  the content: the three languages in this order, with their lang (and dir="rtl" for
 *      Arabic), five points each, the same five as MANIFESTO.md
 *   3  the way back: each language ends with a link to the home page
 *   4  no script, and nothing from another site
 */
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { docsSite } from "../scripts/docs-site/plugin.js";
import { PAGES_BASE, SITE_URL } from "../vite.config.js";
import { buildReal, findAll, hasClass, parse, repo, textOf } from "./helpers/debug-page.js";

const ROUTE = "/manifesto/";
const LANGUAGES = [
  { code: "en", dir: null },
  { code: "es", dir: null },
  { code: "ar", dir: "rtl" },
];

const rendered = () => {
  const html = buildReal().rendered.get(ROUTE);
  if (typeof html !== "string") throw new Error(`buildSite() renders no document at ${ROUTE}`);
  return html;
};
const tree = () => parse(rendered(), ROUTE);
const blocks = () => findAll(tree(), (n) => n.attrs?.has("data-l"));

describe("the route", () => {
  it("is an entry of the Pages build (docs/manifesto/index.html)", () => {
    const options = { repoRoot: repo, relative: true, outRoot: join(tmpdir(), "luz-manifesto-out"), pagesBase: PAGES_BASE, siteUrl: SITE_URL };
    const { build } = docsSite(options).config();
    expect(Object.values(build.rollupOptions.input).some((file) => String(file).endsWith("manifesto/index.html"))).toBe(true);
  });

  it("is answered by the dev server: /manifesto redirects to /manifesto/, and /manifesto/ is routed to its source", async () => {
    const middlewares = [];
    docsSite({ repoRoot: repo, relative: false, outRoot: join(tmpdir(), "luz-manifesto-out") }).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    const serve = (url) =>
      new Promise((done) => {
        const headers = {};
        const req = { url, originalUrl: url };
        const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => done({ headers, body, statusCode: res.statusCode, req }) };
        middlewares[0](req, res, () => done({ next: true, req }));
      });
    const bare = await serve("/manifesto");
    expect(bare.statusCode).toBe(301);
    expect(bare.headers.location).toBe(ROUTE);
    const got = await serve(ROUTE);
    const rewritten = got.next === true && got.req.url !== ROUTE && existsSync(join(repo, got.req.url.split("?")[0]));
    expect(rewritten, `the dev server points ${ROUTE} at its file (got ${JSON.stringify({ next: got.next, url: got.req.url })})`).toBe(true);
  }, 120_000);

  it("is rendered by buildSite(), so its links are checked", () => {
    expect(rendered()).toContain("<html");
  }, 120_000);
});

describe("the content", () => {
  it("has the three languages in this order, English, Spanish, Arabic, each with its lang and Arabic right to left", () => {
    const found = blocks().map((b) => ({ code: b.attrs.get("lang"), dir: b.attrs.get("dir") ?? null }));
    expect(found).toEqual(LANGUAGES);
  });

  it("has five points in each language, the same five headings MANIFESTO.md has in that language", () => {
    const md = readFileSync(join(repo, "MANIFESTO.md"), "utf-8");
    for (const block of blocks()) {
      const headings = findAll(block, (n) => n.name === "h2").map((h) => textOf(h).trim());
      expect(headings, block.attrs.get("lang")).toHaveLength(5);
      for (const h of headings) expect(md, `MANIFESTO.md has "${h}"`).toContain(h);
    }
  });

  it("switches language with three radios, the first language checked by default being one of them", () => {
    const radios = findAll(tree(), (n) => n.name === "input" && n.attrs.get("type") === "radio");
    expect(radios).toHaveLength(3);
    expect(radios.filter((r) => r.attrs.has("checked"))).toHaveLength(1);
  });
});

describe("the way back", () => {
  it("ends each language with a link to the home page", () => {
    for (const block of blocks()) {
      const footer = findAll(block, (n) => n.name === "footer")[0];
      expect(footer, `${block.attrs.get("lang")} has a footer`).toBeTruthy();
      const home = findAll(footer, (n) => n.name === "a" && n.attrs.get("href") === "/");
      expect(home, `${block.attrs.get("lang")}: a link to /`).toHaveLength(1);
      expect(textOf(home[0]).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("isolated", () => {
  it("runs no script and loads nothing from another site", () => {
    const html = rendered();
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/(?:src|href)="https?:\/\//i);
    expect(findAll(tree(), (n) => hasClass(n, "t")).length).toBe(3);
  });
});

describe("humans.txt", () => {
  it("is served at /humans.txt as plain text, from apps/site/humans.txt", async () => {
    const middlewares = [];
    docsSite({ repoRoot: repo, relative: false, outRoot: join(tmpdir(), "luz-manifesto-out") }).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    const got = await new Promise((done) => {
      const headers = {};
      const req = { url: "/humans.txt", originalUrl: "/humans.txt" };
      const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => done({ headers, body }) };
      middlewares[0](req, res, () => done({ next: true }));
    });
    expect(got.next, "/humans.txt is answered").toBeUndefined();
    expect(got.headers["content-type"]).toMatch(/^text\/plain/);
    expect(String(got.body)).toBe(readFileSync(join(repo, "apps/site/humans.txt"), "utf-8"));
    expect(String(got.body)).toContain("/* TEAM */");
  }, 120_000);

  it("says WCAG 2.2 AA is an aim, not an audit, and credits ET Book with its licence file", () => {
    const text = readFileSync(join(repo, "apps/site/humans.txt"), "utf-8");
    expect(text).not.toMatch(/Standards:[^\n]*WCAG 2\.2 AA\s*$/m);
    expect(text).toMatch(/Standards:[^\n]*aims for WCAG 2\.2 AA[^\n]*not audited[^\n]*\/docs\/accessibility\//);
    expect(text).toContain("Fonts: ET Book, MIT, Copyright (c) 2015 Dmitry Krasny, Bonnie Scranton, Edward Tufte (/assets/LICENSE-ETBook.txt)");
    expect(text).toMatch(/^Last update: 2026\/11\/27$/m);
  });
});
