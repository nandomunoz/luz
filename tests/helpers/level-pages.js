/**
 * The pages of the three levels (tokens, core, catalog) as `extra` documents of buildSite(), for a test that builds the
 * real site: the home links to them, and their catalog keys are used only by them, so a build without them has broken
 * links and orphan keys.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { levelDocuments } from "../../scripts/docs-site/site.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const LEVEL_NAMES = ["tokens", "core", "catalog"];

export function levelPagesOf(site, home = readFileSync(join(repo, "apps/landing/index.html"), "utf-8"), root = repo) {
  const levels = LEVEL_NAMES.map((name) => ({ name, html: readFileSync(join(root, `apps/landing/levels/${name}.html`), "utf-8") }));
  return levelDocuments(site, { file: "apps/landing/index.html", html: home }, levels);
}
