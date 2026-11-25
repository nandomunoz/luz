/**
 * The site's domain is luzds.com (owner, 2026-11-25): GitHub Pages serves it at the
 * root of that domain, not under /luz/.
 *
 *   1  PAGES_BASE is "/" and SITE_URL "https://luzds.com/": the not-found page, which is
 *      served at any missing URL, loads its assets from the root of the domain
 *   2  the build writes CNAME with the domain, so a deploy never drops it
 *   3  /robots.txt exists, served as plain text from apps/site/robots.txt
 *   4  no file of the repository names the old address, nandomunoz.github.io
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cnameOf, docsSite } from "../scripts/docs-site/plugin.js";
import { PAGES_BASE, SITE_URL } from "../vite.config.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("the domain", () => {
  it("is luzds.com, at the root", () => {
    expect(SITE_URL).toBe("https://luzds.com/");
    expect(PAGES_BASE).toBe("/");
  });

  it("is written to CNAME by the build, and a github.io address gets none", () => {
    expect(cnameOf(SITE_URL)).toBe("luzds.com");
    expect(cnameOf("https://someone.github.io/luz/")).toBeNull();
  });

  it("is the only address of the site in the repository: nandomunoz.github.io is gone", () => {
    let hits = "";
    try {
      // Written or escaped in a regular expression (nandomunoz\.github\.io)
      // This file and the changesets name the old address on purpose: the one to look for, the one that went
      hits = execFileSync("git", ["grep", "-l", "-E", "nandomunoz(\\\\)?\\.github(\\\\)?\\.io", "--", ".", ":!tests/site-domain.test.js", ":!.changeset"], { cwd: repo, encoding: "utf-8" });
    } catch {
      hits = ""; // git grep exits 1 when nothing matches
    }
    expect(hits.trim().split("\n").filter(Boolean)).toEqual([]);
  });
});

describe("robots.txt", () => {
  it("is served at /robots.txt as plain text, from apps/site/robots.txt, and lets every crawler in", async () => {
    const middlewares = [];
    docsSite({ repoRoot: repo, relative: false, outRoot: join(tmpdir(), "luz-domain-out") }).configureServer({
      watcher: { on() {} },
      ws: { send() {} },
      middlewares: { use: (fn) => middlewares.push(fn) },
      transformIndexHtml: async (_file, html) => html,
    });
    const got = await new Promise((done) => {
      const headers = {};
      const req = { url: "/robots.txt", originalUrl: "/robots.txt" };
      const res = { statusCode: 200, setHeader: (k, v) => (headers[k.toLowerCase()] = v), end: (body) => done({ headers, body }) };
      middlewares[0](req, res, () => done({ next: true }));
    });
    expect(got.next, "/robots.txt is answered").toBeUndefined();
    expect(got.headers["content-type"]).toMatch(/^text\/plain/);
    const body = String(got.body);
    expect(body).toBe(readFileSync(join(repo, "apps/site/robots.txt"), "utf-8"));
    expect(body).toMatch(/^User-agent: \*$/m);
    expect(body).toMatch(/^Allow: \/$/m);
  }, 120_000);
});
