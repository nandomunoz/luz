/**
 * @luz-ds/catalog has no weight limit (owner decision, 2026-11-02): tokens and core keep their ceilings, catalog's
 * sizes are only reported by `pnpm check:size`. The rows are tested in tests/size-guard.test.js; this file holds the
 * words that say so, where a reader or an agent will look for them:
 *   - PRINCIPLES.md red line 17 and section 8,
 *   - AGENTS.md (rule 4 and the catalog JS paragraph), dev/TESTING.md, dev/CORE-JS.md,
 *   - the docs page "How LUZ is built", in English and in Spanish,
 *   - the home's claim about size ceilings, in its three catalogs.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const DATE = "2026-11-02";

describe("PRINCIPLES.md: catalog has no weight limit", () => {
  const principles = read("PRINCIPLES.md");

  it("red line 17 keeps its rule for the budgeted artifacts and says catalog has no ceiling, with the owner's date", () => {
    const rl17 = principles.split("\n").find((line) => /^17\.\s+\*\*/.test(line));
    expect(rl17, "the paragraph of red line 17").toBeDefined();
    expect(rl17).toMatch(/Ceilings are never raised/);
    expect(rl17).toMatch(/@luz-ds\/catalog/);
    expect(rl17).toMatch(/no ceiling/i);
    expect(rl17).toContain(DATE);
  });

  it("section 8 states that catalog has no weight limit, with the date, and that check:size reports it", () => {
    const paragraph = principles.split("\n").find((line) => /^`@luz-ds\/catalog` has no weight limit/.test(line));
    expect(paragraph, "a paragraph of section 8 that begins with the statement").toBeDefined();
    expect(paragraph).toContain(DATE);
    expect(paragraph).toContain("catalog (no limit, reported)");
    expect(paragraph).toMatch(/never fails on it/);
    expect(paragraph).toMatch(/SEC-CHUNK-1 and SEC-CHUNK-2[^.]*still fail/);
    expect(paragraph).toMatch(/Tokens and core keep their ceilings/);
  });

  it("the size bullet says catalog has no row, and the table has no word about catalog", () => {
    const bullet = principles.split("\n").find((line) => /^- \*\*Size budgets\*\*/.test(line));
    expect(bullet).toMatch(/catalog[^.]*no row/);
    const lines = principles.split("\n");
    const header = lines.findIndex((line) => /^\|\s*Artifact\s*\|.*\|\s*Ceiling\s*\|$/.test(line));
    const table = lines.slice(header + 2).filter((line, i, all) => all.slice(0, i + 1).every((l) => l.startsWith("|")));
    expect(table.filter((row) => /catalog/i.test(row))).toEqual([]);
  });
});

describe("AGENTS.md and the contributor guides", () => {
  const agents = read("AGENTS.md");

  it("AGENTS.md keeps the ceilings sentence for budgets.json and says catalog is reported, with no limit", () => {
    expect(agents).toContain("Size ceilings in `budgets.json` are a red line: never raise one.");
    expect(agents).toMatch(/`@luz-ds\/catalog` has no weight limit \(owner, 2026-11-02\)/);
    expect(agents).toMatch(/`check:size` reports its sizes and never fails on them/);
    expect(agents).toMatch(/tokens and core keep their ceilings/);
  });

  it("AGENTS.md no longer says a catalog chunk has a budget row of its own, and says it is reported", () => {
    const paragraph = agents.split("\n").find((line) => /^- Catalog JS:/.test(line));
    expect(paragraph, "the catalog JS paragraph").toBeDefined();
    expect(paragraph).not.toMatch(/budget row \(`catalog JS lazy chunk/);
    expect(paragraph).not.toMatch(/has its own budget row/);
    expect(paragraph).toMatch(/no weight limit/);
    expect(paragraph).toContain("catalog (no limit, reported)");
    expect(paragraph, "SEC-CHUNK-1/2 are kept").toMatch(/SEC-CHUNK-1\/2/);
  });

  it("dev/TESTING.md names catalog as the exception to the ceilings, and dev/CORE-JS.md gives its chunks no row", () => {
    const testing = read("dev/TESTING.md");
    expect(testing).toMatch(/It is a red line: never raise a ceiling\./);
    expect(testing).toMatch(/@luz-ds\/catalog[^.]*exception[^.]*no weight limit/);
    expect(testing).toContain("catalog (no limit, reported)");
    expect(read("dev/CORE-JS.md")).not.toMatch(/has its own budget row/);
  });
});

describe("the docs page How LUZ is built promises a ceiling for tokens and core, not for catalog", () => {
  it("in English", () => {
    const page = read("apps/docs/pages/get-started/how-luz-is-built.html");
    expect(page).not.toMatch(/A file that grows past its ceiling fails/);
    expect(page).not.toMatch(/Size budgets are a red line: a check fails when a file grows past its ceiling/);
    expect(page).toMatch(/Size budgets[\s\S]{0,80}tokens or core[^.]*ceiling[^.]*fails/i);
    expect(page).toMatch(/Catalog has no limit/);
    expect(page).toMatch(/red line for tokens and core/);
  });

  it("in Spanish", () => {
    const page = read("apps/docs/i18n/es/pages/get-started/how-luz-is-built.html");
    expect(page).not.toMatch(/Si un archivo supera su límite, la comprobación falla/);
    expect(page).not.toMatch(/una comprobación falla si un archivo supera su límite/);
    expect(page).toMatch(/tokens o core[^.]*límite/);
    expect(page).toMatch(/Catalog solo se informa, sin límite/);
    expect(page).toMatch(/línea roja para tokens y core/);
  });
});

describe("the home does not say every package has a size ceiling: tokens and core do, catalog does not", () => {
  // The paragraph that said it went with the home's "Three words" section (owner, 2026-11-23); nothing may say it again
  const CLAIM = { en: /each package has a size ceiling/, es: /cada paquete tiene un techo/, ar: /لكل حزمة[^.\u06D4]*سقف/ };

  it.each(["en", "es", "ar"])("%s: no value of the catalog promises a ceiling for every package", (code) => {
    const catalog = JSON.parse(read(`apps/landing/i18n/${code}.json`));
    for (const [key, value] of Object.entries(catalog)) expect(value, `${code} ${key}`).not.toMatch(CLAIM[code]);
  });
});
