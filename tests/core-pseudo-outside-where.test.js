/**
 * A pseudo-element is not valid inside :where(): the selector list is forgiving, so the
 * browser drops the item and the rule never reaches the pseudo-element (`:where(*, *::before)`
 * styles `*` alone). It goes outside, `:where(dialog)::backdrop` or `*::before`.
 * The print block had `:where(*, *::before, *::after)`, so a ::before or ::after kept its
 * shadow, transition and animation on paper.
 *
 * Read as text, the sources of core, no browser.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../", import.meta.url));

function cssFiles(dir, out = []) {
  if (!existsSync(join(repo, dir))) return out;
  for (const entry of readdirSync(join(repo, dir)).sort()) {
    const path = `${dir}/${entry}`;
    if (statSync(join(repo, path)).isDirectory()) cssFiles(path, out);
    else if (path.endsWith(".css")) out.push(path);
  }
  return out;
}

/** The text inside every :where( … ), balanced, comments removed: [{ line, inside }]. */
function whereArguments(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const found = [];
  for (let at = text.indexOf(":where("); at !== -1; at = text.indexOf(":where(", at + 1)) {
    let depth = 0;
    let i = at + ":where".length;
    const start = i + 1;
    for (; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")" && --depth === 0) break;
    }
    found.push({ line: text.slice(0, at).split("\n").length, inside: text.slice(start, i) });
  }
  return found;
}

describe("core writes no pseudo-element inside :where()", () => {
  const files = cssFiles("packages/core/src");

  it("reads the sources of core", () => {
    expect(files.some((f) => f.endsWith("print/_print.css"))).toBe(true);
    expect(files.some((f) => f.endsWith("elements/forms.css"))).toBe(true);
  });

  it("no :where() holds a ::before, ::after, ::backdrop or any other ::pseudo-element", () => {
    const found = [];
    for (const file of files) {
      for (const { line, inside } of whereArguments(readFileSync(join(repo, file), "utf-8"))) {
        if (/::|:(?:before|after|first-line|first-letter)\b/.test(inside)) found.push(`${file}:${line} :where(${inside.trim()})`);
      }
    }
    expect(found).toEqual([]);
  });

  it("the print block reaches * and its ::before and ::after, each outside :where()", () => {
    const print = readFileSync(join(repo, "packages/core/src/print/_print.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = print.match(/([^{}]*\*::before[^{}]*)\{[^}]*transition:\s*none/);
    expect(rule, "a rule that removes the transition of *::before").not.toBeNull();
    const list = rule[1].split(",").map((s) => s.trim().replace(/\s+/g, ""));
    expect(list).toEqual(expect.arrayContaining(["*", "*::before", "*::after"]));
  });
});
