/**
 * Core names nothing of catalog (decision 31), and a token of catalog is a name too: the
 * colours of the sidebar (`--luz-sidebar-text-hover`) are the sidebar's, and core's legacy
 * custom-theme button read one for its focus ring. A focus ring is `--luz-focus-ring`
 * (DR of states), whichever surface a control sits on.
 *
 * `--luz-sidebar-width` stays: the setting `.o-shell` reads.
 * Read as text: the sources and the built stylesheets of core, no browser.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(repo, path), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every custom property of the sidebar a rule reads, `var(--luz-sidebar-…)`, bar its width. */
const sidebarReads = (css) => [...css.matchAll(/var\(\s*(--luz-sidebar-[a-z-]+)/g)].map((m) => m[1]).filter((name) => name !== "--luz-sidebar-width");

describe("core reads no custom property of catalog's sidebar", () => {
  // every stylesheet of core's sources; themes/_template.css declares the tokens, it reads none
  const under = (dir) => readdirSync(join(repo, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? under(`${dir}/${e.name}`) : e.name.endsWith(".css") ? [`${dir}/${e.name}`] : []));
  const sources = under("packages/core/src").filter((f) => !f.includes("/themes/"));

  it("no rule of core's sources reads --luz-sidebar-* but the width", () => {
    const found = sources.filter((f) => sidebarReads(read(f)).length > 0).map((f) => `${f}: ${sidebarReads(read(f)).join(", ")}`);
    expect(found).toEqual([]);
  });

  it("the focus ring of the legacy custom-theme button is --luz-focus-ring", () => {
    const css = read("packages/core/src/components/theme-mode.css");
    const rule = css.match(/\.luz-theme-apply-btn:focus-visible\s*\{([^}]*)\}/);
    expect(rule, "the :focus-visible rule of .luz-theme-apply-btn").not.toBeNull();
    expect(rule[1]).toMatch(/outline:\s*2px solid var\(--luz-focus-ring\)/);
  });

  it.skipIf(!existsSync(join(repo, "packages/core/dist/luz.css")))("the built luz.css reads none either", () => {
    expect(sidebarReads(read("packages/core/dist/luz.css"))).toEqual([]);
  });
});
