/**
 * LUZ docs site — the /manifesto/ page (owner, 2026-11-25).
 *
 * One standalone document: the five points of MANIFESTO.md in English, Spanish and
 * Arabic, with a switch of the three made of radios and CSS (no script). Its CSS is
 * inline and its own: it links nothing of the docs, the site or the packages.
 *
 * Unlike /debug/ it is a file on disk, apps/site/manifesto/index.html, served and built
 * as it is: an entry of the Pages build (written to /manifesto/index.html), routed by
 * the dev server, and rendered by buildSite() so its links are checked like any page's.
 * Development tooling: nothing here ships in a package.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The route of the page, and its file (repo-relative). */
export const MANIFESTO_ROUTE = "/manifesto/";
export const MANIFESTO_FILE = "apps/site/manifesto/index.html";

/** humans.txt (humanstxt.org): who makes the site, at the root, served and written as it is (plain text, with llms.txt). */
export const HUMANS_ROUTE = "/humans.txt";
export const HUMANS_FILE = "apps/site/humans.txt";

/** The page as the build serves it: the file, untouched. */
export function readManifesto(repoRoot) {
  return readFileSync(resolve(repoRoot, MANIFESTO_FILE), "utf-8");
}
