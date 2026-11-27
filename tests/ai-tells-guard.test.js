/**
 * R-07 of the legal audit of 2026-11-27: `luz-readme/references/ai-tells.md` was written for luz-ai, not copied from
 * another project's list, and stays that way. An earlier version (git history, before the rewrite) followed the
 * skeleton and the examples of public guides to machine-written text and closed with a "Prior art" paragraph naming
 * them. This test fails if the file brings back that paragraph or any of the distinctive phrases of that version.
 *
 * A link as further reading is allowed. Only the exact phrases below are forbidden, compared after lowercasing and
 * collapsing white space, so a reflowed copy is caught too.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "packages/ai/skills/luz/assets/skills/luz-readme/references/ai-tells.md";
const text = readFileSync(join(root, FILE), "utf-8");
const flat = (s) => s.toLowerCase().replace(/\s+/g, " ");

// Six words or more from the old version (commit 8d297400), each one a sentence of its own there
const OLD_PHRASES = [
  "parses a 40 mb file in 0.8 s on a 2020 laptop",
  "hard hits. never use:",
  "harmless once, a tell when it repeats",
  "fix any soft pattern that appears three or more times",
  "the signal is volume and uniformity",
  "humans write some of them too",
  "the single strongest readme tell",
  "title case headings with ampersands & pairs",
  "badge soup: more than eight badges",
  "end on the last useful fact, such as the license line",
  "add what a human would know and an ai would not volunteer",
  "perfect symmetry: three features, three steps, three use cases",
  "describing the author instead of the project",
  "re-explaining what the reader already knows",
  "state the point in the first sentence",
  "replacing a vague sentence with a concrete one",
  "sections that announce themselves",
  "a closing summary that repeats the page",
  "no history. no reason it exists",
  "every feature gets the same grammatical form",
  "this catalogue draws on",
  "the lists here are rewritten and adapted to readmes",
];

// Examples of the first rewrite (before 2026-11-27) that kept the example, the order or the wording of that version
// with a few words changed. The file gives its own examples now, from other projects and other sentences
const MIRRORED = [
  "script in `bench/`",
  "blazing fast",
  "runs quickly",
  "whether you are a beginner or a seasoned developer",
  "a one-line paragraph written for effect",
  "a heading that is a question, followed by a pitch",
  "ideal for modern teams",
  "ensuring a smooth experience",
  "trusted by developers",
  "made with love",
  "star this repo",
  "more badges than questions a visitor has",
  "a rule line between all sections",
  "teaching what the reader already knows",
  "sumérgete en",
  "lleva x al siguiente nivel",
  "una solución integral",
];

describe("R-07: ai-tells.md is written for luz-ai and does not copy", () => {
  it("has no 'Prior art' section, and no paragraph that credits lists it adapts", () => {
    expect(text).not.toMatch(/^#+\s*prior art/im);
    expect(flat(text)).not.toContain("rewritten and adapted");
    expect(flat(text)).not.toContain("original rules");
  });

  it.each(OLD_PHRASES)("does not contain the phrase of the earlier version: %s", (phrase) => {
    expect(flat(text)).not.toContain(phrase);
  });

  it.each(MIRRORED)("gives its own example, not the one of the earlier version: %s", (phrase) => {
    expect(flat(text)).not.toContain(phrase);
  });

  it("still does its job: the families of patterns, the hard and soft counting and the other languages", () => {
    expect(text).toMatch(/hard/i);
    expect(text).toMatch(/soft/i);
    expect(text).toMatch(/^## .*other languages/im);
    expect(text.length).toBeGreaterThan(3000);
  });
});
