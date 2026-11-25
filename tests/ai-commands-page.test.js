/**
 * The page of the commands of /luz (`ai/commands`, plan `.claude/plans/ai-eval-lab.md`, phase 3): nothing on it is
 * typed. Its table is the Subcommands table of SKILL.md, the terminal output is what the script prints, and each conversation is
 * the text of a green run of `pnpm ai:eval`, frozen. A command with no example fails, and so does a page that drifts.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXTRA, commandRows, fillCommandMarkers, loadExample, slugOf, terminalOutput } from "../scripts/docs-site/ai-commands.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");
const strings = (lang) => JSON.parse(read(`apps/docs/i18n/${lang}/strings.json`));
const SLUGS = ["start", "new", "doctor", "check", "facts", "agents", "add", "help"];

describe("the rows come from SKILL.md", () => {
  it("are the eight subcommands, in the order of the table, with what the script runs and whether it writes", () => {
    const rows = commandRows(root);
    expect(rows.map((r) => r.slug)).toEqual(SLUGS);
    expect(rows.map((r) => r.writes)).toEqual([true, true, false, false, false, false, true, false]);
    for (const r of rows) expect(r.slug).toMatch(/^[a-z-]+$/);
    expect(slugOf("/luz")).toBe("start");
    expect(slugOf("/luz new <landing, blog, app or docs>")).toBe("new");
  });

  it("have each a sentence in English and in Spanish, and the two languages the same keys", () => {
    const en = strings("en");
    const es = strings("es");
    const keys = (s) => Object.keys(s).filter((k) => k.startsWith("ai.cmd.")).sort();
    expect(keys(en)).toEqual(keys(es));
    for (const slug of [...SLUGS, ...EXTRA]) {
      expect(en[`ai.cmd.what.${slug}`], slug).toBeTruthy();
      expect(es[`ai.cmd.what.${slug}`], slug).toBeTruthy();
    }
    for (const slug of EXTRA) expect(en[`ai.cmd.title.${slug}`], slug).toBeTruthy();
  });
});

describe("the examples: a conversation for each command", () => {
  it("has a frozen example for every command and for the two extras, each with turns of a person and an assistant", () => {
    for (const slug of [...SLUGS, ...EXTRA]) {
      const ex = loadExample(slug, root);
      expect(ex.example, slug).toBe(slug);
      expect(ex.turns.length, slug).toBeGreaterThan(0);
      for (const t of ex.turns) {
        expect(typeof t.user, slug).toBe("string");
        expect(t.assistant.length, slug).toBeGreaterThan(0);
      }
    }
  });

  it("names the command a person typed in the first turn, as the case of the lab says", () => {
    const grade = JSON.parse(read("tools/ai-eval/cases/evals.json")).cases;
    for (const c of grade.filter((x) => x.example)) expect(loadExample(c.example, root).turns[0].user, c.example).toBe(c.prompt);
  });

  it("fails the build, naming the command, when one has no example", () => {
    expect(() => loadExample("nope", root)).toThrow(/no frozen example for "nope".*pnpm ai:eval freeze/);
  });
});

describe("the terminal output is what the script prints", () => {
  it.each(SLUGS)("%s: a command line and its output, with no folder of this machine in it", (slug) => {
    const out = terminalOutput(slug, root);
    expect(out.command).toMatch(/^luz-ai /);
    expect(out.text.length).toBeGreaterThan(10);
    expect(out.text).not.toMatch(/\/tmp\/|\/home\/|luz-commands-/);
    expect(out.text.split("\n").length).toBeLessThanOrEqual(25);
  });

  it("is the help for help and the facts of this release for facts, run now and never typed", () => {
    expect(terminalOutput("help", root).text).toContain("Commands:");
    expect(terminalOutput("facts", root).text).toContain(`@luz-ds/core ${JSON.parse(read("packages/core/package.json")).version}`);
  });
});

describe("the page", () => {
  const html = (lang) => {
    const t = (key, params) => String(strings(lang)[key] ?? `?${key}`).replace(/\{(\w+)\}/g, (_, k) => params?.[k] ?? `{${k}}`);
    return fillCommandMarkers("    <!-- luz:commands -->", { t }, { file: "x", root });
  };

  it.each(["en", "es"])("in %s: a table with a row for each command, and a section with a terminal and a conversation for each", (lang) => {
    const out = html(lang);
    for (const slug of [...SLUGS, ...EXTRA]) {
      expect(out, slug).toContain(`id="cmd-${slug}"`);
      expect(out, slug).toContain(`id="cmd-${slug}-chat"`);
    }
    for (const slug of SLUGS) expect(out, slug).toContain(`id="cmd-${slug}-terminal"`);
    expect(out.match(/<tr>/g)).toHaveLength(SLUGS.length + 1);
    expect(out).not.toMatch(/\{\{|\?ai\.cmd/);
  });

  it("escapes what a model said: no tag of a conversation reaches the page", () => {
    const out = html("en");
    const hostile = loadExample("hostile", root).turns.map((t) => t.assistant).join("");
    if (/<[a-z]/i.test(hostile)) expect(out).not.toContain(hostile.match(/<[a-z][^>]*>/i)[0]);
    expect(out).not.toMatch(/<script/i);
  });

  it("keeps each conversation and each terminal output out of llms-full.txt: they are demos, text a model wrote or output of this build", () => {
    const out = html("en");
    expect(out.match(/<div data-docs-specimen>/g)).toHaveLength(SLUGS.length + EXTRA.length + SLUGS.length);
  });

  it("has the two pages, in English and Spanish, with one marker each, and the English one links the Spanish its siblings", () => {
    for (const f of ["apps/docs/pages/ai/commands.html", "apps/docs/i18n/es/pages/ai/commands.html"]) {
      expect(existsSync(join(root, f)), f).toBe(true);
      expect(read(f).match(/^\s*<!-- luz:commands -->$/gm), f).toHaveLength(1);
    }
    expect(read("apps/docs/pages/ai/commands.html")).toMatch(/^generate: ai-commands$/m);
  });

  it("is in llms-full.txt as its summary and a pointer to its URL, like the migration page: the commands are in the page, the conversations are for a person", () => {
    expect(read("scripts/docs-site/ai.js")).toContain('["/docs/ai/commands/"');
  });

  it("is linked from the page about working with AI, the README of the package and the landing's /ai/", () => {
    for (const f of ["apps/docs/pages/ai/index.html", "apps/docs/i18n/es/pages/ai/index.html"]) expect(read(f), f).toContain("/docs/ai/commands/");
    expect(read("packages/ai/README.md")).toContain("docs/ai/commands/");
    expect(read("scripts/docs-site/ai-page.js")).toContain("/docs/ai/commands/");
  });

  it("has every example file of the repository used by the page", () => {
    const files = readdirSync(join(root, "tools/ai-eval/cases/examples")).map((f) => f.replace(/\.json$/, "")).sort();
    expect(files).toEqual([...SLUGS, ...EXTRA].sort());
  });
});
