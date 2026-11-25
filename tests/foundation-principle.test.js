/**
 * The principle "LUZ is a foundation to start from, never a finished site"
 * (owner, 2026-11-02), written in four places: PRINCIPLES.md, the README, the
 * Get started page (English and Spanish) and the five prompts for AI. It is an
 * aspiration, not a rule: it takes no RL or SR number, and no check fails on it.
 * The files are read as text; no browser, no build.
 *
 * Not touched here: the SHA-256 `source` of the five `prompt-<kind>` cases in
 * .claude/evals/prompt-injection/cases.json (tests/prompts.test.js). They go red
 * with the sentence in the prompts and stay red until the sentinel reads the
 * diff and the new `source` is written there.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PUBLISHED } from "../scripts/luz-packages.js";
import { releaseNotes } from "./helpers/release-notes.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf-8");

/* ---- PRINCIPLES.md ------------------------------------------------------- */

const PRINCIPLE =
  "**A foundation, not a finished site.** LUZ is the base you start from to make what you want: a simple website, a newspaper, a product landing page. It never does the whole job, and nothing in it is a page to copy and publish without care; the content, the brand and the final decisions are yours. This is an aspiration, not a rule: no check fails on it.";

describe("PRINCIPLES.md: a foundation, not a finished site", () => {
  const principles = read("PRINCIPLES.md");
  const rulesAt = principles.indexOf("## How the rules work");

  it("says the principle in its introduction, once, after Human-first, AI-ready and before the rules", () => {
    expect(principles.split(PRINCIPLE).length - 1, "the sentence is there once").toBe(1);
    const at = principles.indexOf(PRINCIPLE);
    expect(at).toBeGreaterThan(principles.indexOf("**Human-first, AI-ready.**"));
    expect(at).toBeLessThan(rulesAt);
  });

  it("is a paragraph of its own, not an item of a numbered list or a row of the strong rules table", () => {
    const line = principles.split("\n").find((l) => l.includes("A foundation, not a finished site"));
    expect(line, "the paragraph exists").toBeDefined();
    expect(line).toMatch(/^\*\*A foundation, not a finished site\.\*\*/);
    expect(line).not.toMatch(/^(\d+\.|-|\|)/);
  });

  it("adds no rule: with the principle in place, the red lines are still 1 to 19 and the strong rules SR-1 to SR-10, and the principle takes no id", () => {
    expect(principles, "the principle is written").toContain(PRINCIPLE);
    const redLines = principles.slice(principles.indexOf("## Red lines"), principles.indexOf("### Which check covers which red line"));
    const numbers = [...redLines.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
    expect(numbers).toEqual(Array.from({ length: 19 }, (_, i) => i + 1));
    const strong = principles.slice(principles.indexOf("## Strong rules"), principles.indexOf("## Definition of done"));
    const ids = [...strong.matchAll(/^\| (SR-\d+) \|/gm)].map((m) => m[1]);
    expect(ids).toEqual(Array.from({ length: 10 }, (_, i) => `SR-${i + 1}`));
    const intro = principles.slice(0, rulesAt);
    expect(intro.slice(intro.indexOf(PRINCIPLE))).not.toMatch(/\b(RL|SR)-\d+/);
  });
});

/* ---- README.md ----------------------------------------------------------- */

describe("README.md: a start, not a finished site", () => {
  const readme = read("README.md");
  const SENTENCE =
    "**A start, not a finished site.** LUZ is the base for a simple website, a newspaper or a product landing page, and it never does the whole job. The content, the brand and the final decisions are yours.";

  it("says it, in the paragraph after Human-first, AI-ready", () => {
    expect(readme).toContain(SENTENCE);
    const human = readme.indexOf("**Human-first, AI-ready.**");
    expect(human).toBeGreaterThanOrEqual(0);
    expect(readme.indexOf(SENTENCE)).toBeGreaterThan(human);
    const between = readme.slice(human, readme.indexOf(SENTENCE));
    expect(between.split(/\n\s*\n/).length, "it is the very next paragraph").toBe(2);
  });
});

/* ---- Get started, English and Spanish ------------------------------------ */

describe("Get started: a place to start, not a finished site", () => {
  const nextAfterLead = (html) => {
    const m = html.match(/<p class="docs-lead">[\s\S]*?<\/p>\s*<p>([\s\S]*?)<\/p>/);
    expect(m, "a paragraph follows the lead").not.toBeNull();
    return m[1].replace(/\s+/g, " ").trim();
  };

  it("the English page has, right after the lead, the paragraph that LUZ is a place to start and the content, the brand and the final decisions are the reader's", () => {
    expect(nextAfterLead(read("apps/docs/pages/get-started/index.html"))).toBe(
      "LUZ is a place to start, not a finished site. The content, the brand and the final decisions are yours: check the result before you publish.",
    );
  });

  it("the Spanish page has the same paragraph right after its lead", () => {
    expect(nextAfterLead(read("apps/docs/i18n/es/pages/get-started/index.html"))).toBe(
      "LUZ es un punto de partida, no un sitio terminado. El contenido, la marca y las decisiones finales son tuyos: revisa el resultado antes de publicar.",
    );
  });
});

/* ---- The skill ------------------------------------------------------------ */

describe("the luz skill says the site is a starting point", () => {
  it("its intro says it: the person reviews the site and decides the content, the brand and the rest", () => {
    const skill = read("packages/ai/skills/luz/SKILL.md");
    expect(skill.slice(0, skill.indexOf("\n## "))).toContain("The site is a starting point: the person reviews it and decides");
  });
});

/* ---- The changeset ------------------------------------------------------- */

describe("the changeset of the principle", () => {
  // .changeset/foundation-not-finished-site.md, or its note in the CHANGELOG of check once the Version PR has consumed it
  const file = ".changeset/foundation-not-finished-site.md";
  const note = releaseNotes(root).find((n) => n.file === "foundation-not-finished-site.md" || /PRINCIPLES\.md, the README, Get started \(English and Spanish\) and the five prompts for AI now say that LUZ is a foundation/.test(n.text));
  const text = note?.text ?? "";
  const frontMatter = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  it("exists, names a published package (every changeset must) and says what it records", () => {
    expect(note, `${file} exists, or its note is in a CHANGELOG`).toBeTruthy();
    expect(frontMatter, "has a front matter").not.toBeNull();
    const names = [...frontMatter[1].matchAll(/^"?(@luz-ds\/[a-z-]+)"?:\s*(patch|minor|major)\s*$/gm)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(PUBLISHED.map((p) => `@luz-ds/${p}`)).toContain(name);
  });

  it("mentions the principle: a foundation, never a finished site, and the content, the brand and the final decisions", () => {
    const body = frontMatter?.[2] ?? "";
    expect(body).toMatch(/foundation/i);
    expect(body).toMatch(/finished site/i);
    expect(body).toMatch(/content, the brand and the final decisions/i);
  });
});
