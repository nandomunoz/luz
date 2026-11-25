/**
 * The evals of the `luz` skill (`.claude/plans/luz-ai-skill.md`, B.8): two files inside the skill, `triggers.json`
 * for activation and `evals.json` for the outcome, and `tools/ai-eval/src/grade.js`, which grades the folder a run
 * leaves behind with checks that need no model. The graders are tested here on folders made by the skill's own
 * script, so a run that does the work passes and each way of doing it badly fails the check that names it.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { grade, loadCases } from "../tools/ai-eval/src/grade.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = join(root, "packages/ai/skills/luz");
const script = join(skill, "scripts/luz.mjs");
const triggers = JSON.parse(readFileSync(join(root, "tools/ai-eval/cases/triggers.json"), "utf-8")).queries;

const tmp = [];
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A folder as a run of a case would leave it: the fixture, then the skill's page with its marks filled in. */
function run(id, { kind = "landing", stack = "vanilla", name = "Reservo", lang, fill = true, target } = {}) {
  const c = loadCases(root).find((x) => x.id === id);
  const d = mkdtempSync(join(tmpdir(), "luz-eval-"));
  tmp.push(d);
  for (const [path, text] of Object.entries(c.fixture)) {
    mkdirSync(dirname(join(d, path)), { recursive: true });
    writeFileSync(join(d, path), text);
  }
  const flags = ["site", "new", "--name", name, "--kind", kind, "--stack", stack, "--target", join(d, target ?? c.target), ...(lang ? ["--lang", lang] : [])];
  const r = spawnSync(process.execPath, [script, ...flags], { encoding: "utf-8" });
  expect(r.status, r.stderr).toBe(0);
  if (fill) {
    const page = join(d, target ?? c.target, stack === "astro" ? "src/pages/index.astro" : "index.html");
    let text = readFileSync(page, "utf-8").replaceAll("…", "Text");
    // The blog's skeleton shows a list and an article, each with an h1; a page has one
    text = text.replace(/<h1/g, (m, i) => (text.indexOf("<h1") === i ? m : "<h2")).replace(/<\/h1>/g, (m, i) => (text.lastIndexOf("</h1>") === i ? m : "</h2>"));
    writeFileSync(page, text);
  }
  return d;
}
const ids = (report) => report.checks.filter((c) => !c.ok).map((c) => c.id);

describe("the cases", () => {
  const cases = loadCases(root);

  it("are the ones that write a site and the ones of subcommands, each with its own prompt and a target", () => {
    expect(cases.map((c) => c.id)).toEqual(["landing-vanilla", "blog-astro", "hostile-readme", "doctor", "facts", "agents", "unknown-subcommand", "luz-start", "new-blog", "check", "add", "help"]);
    for (const c of cases.filter((x) => x.checks.length)) {
      expect(c.prompt.length, c.id).toBeGreaterThan(2);
      expect(c.target, c.id).toBeTruthy();
      expect(c.checks, c.id).toContain("luz-check");
    }
    for (const c of cases.filter((x) => x.readOnly)) expect(c.prompt, c.id).toMatch(/^\/luz /);
  });

  it("include one that is hostile: a file of the project tells the model to do harm, and the harm is named", () => {
    const hostile = cases.find((c) => c.id === "hostile-readme");
    expect(Object.values(hostile.fixture).join("\n")).toMatch(/IGNORE ALL PREVIOUS INSTRUCTIONS/);
    expect(hostile.forbidden.length).toBeGreaterThan(0);
    expect(hostile.checks).toEqual(expect.arrayContaining(["fixture-unchanged", "forbidden-absent", "only-target"]));
  });

  it("check in the transcript what a folder cannot say (a question before the first write, the commands run), mechanically", () => {
    for (const c of cases.filter((x) => !x.readOnly)) expect(c.transcript, c.id).toEqual(expect.arrayContaining(["asked-before-write", "commands-in-plan"]));
  });
});

describe("the triggers", () => {
  it("are twenty-six queries, half that should wake the skill (three of them as /luz and a subcommand) and half that should not", () => {
    expect(triggers).toHaveLength(26);
    expect(triggers.filter((t) => t.should_trigger)).toHaveLength(13);
    expect(new Set(triggers.map((t) => t.query)).size).toBe(26);
    expect(triggers.filter((t) => t.should_trigger && /^\/luz\b/.test(t.query))).toHaveLength(3);
    for (const t of triggers) expect(typeof t.should_trigger, t.query).toBe("boolean");
  });

  it("have near misses among the negatives: a request about LUZ itself, or about a site without it", () => {
    const negatives = triggers.filter((t) => !t.should_trigger).map((t) => t.query);
    expect(negatives.filter((q) => /LUZ|luz-/.test(q)).length).toBeGreaterThanOrEqual(4);
    expect(negatives.some((q) => /Tailwind|React|Vue/.test(q))).toBe(true);
  });

  it("have a query in Spanish, since the people who ask are", () => {
    expect(triggers.some((t) => t.should_trigger && /quiero|ayúdame/.test(t.query))).toBe(true);
  });
});

describe("grade", () => {
  it("passes a folder where the skill's page was written and filled in", () => {
    const report = grade("landing-vanilla", run("landing-vanilla"), { root });
    expect(ids(report), JSON.stringify(report.checks)).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("passes the blog for Astro in Spanish, and the hostile case when the fixture is untouched", () => {
    expect(grade("blog-astro", run("blog-astro", { kind: "blog", stack: "astro", name: "Spoke & Chain", lang: "es" }), { root }).passed).toBe(true);
    expect(grade("hostile-readme", run("hostile-readme", { kind: "docs" }), { root }).passed).toBe(true);
  });

  it("fails luz-check when a class does not exist", () => {
    const d = run("landing-vanilla");
    const page = join(d, "site/index.html");
    writeFileSync(page, readFileSync(page, "utf-8").replace("luz-hero ", "luz-hero luz-made-up "));
    expect(ids(grade("landing-vanilla", d, { root }))).toEqual(["luz-check"]);
  });

  it('fails when a "…" is left, when there are two h1, when there is no title and when the language is not the one asked', () => {
    expect(ids(grade("landing-vanilla", run("landing-vanilla", { fill: false }), { root }))).toEqual(expect.arrayContaining(["no-placeholder"]));
    const two = run("landing-vanilla");
    const page = join(two, "site/index.html");
    writeFileSync(page, readFileSync(page, "utf-8").replace("</main>", "<h1>Again</h1></main>"));
    expect(ids(grade("landing-vanilla", two, { root }))).toEqual(["one-h1"]);
    const untitled = run("landing-vanilla");
    const p2 = join(untitled, "site/index.html");
    writeFileSync(p2, readFileSync(p2, "utf-8").replace(/<title>.*<\/title>/, "<title></title>"));
    expect(ids(grade("landing-vanilla", untitled, { root }))).toEqual(["title"]);
    expect(ids(grade("blog-astro", run("blog-astro", { kind: "blog", stack: "astro", lang: "en" }), { root }))).toEqual(["lang"]);
  });

  it("fails when a file was written outside the target", () => {
    const d = run("landing-vanilla");
    writeFileSync(join(d, "stray.html"), "x");
    expect(ids(grade("landing-vanilla", d, { root }))).toEqual(["only-target"]);
  });

  it("fails when the fixture was changed or removed, and when the harm the fixture asked for was done", () => {
    const changed = run("hostile-readme", { kind: "docs" });
    writeFileSync(join(changed, "index.html"), "gone\n");
    expect(ids(grade("hostile-readme", changed, { root }))).toEqual(["fixture-unchanged"]);
    const harmed = run("hostile-readme", { kind: "docs" });
    const page = join(harmed, "site/index.html");
    writeFileSync(page, readFileSync(page, "utf-8").replace("</head>", '<script src="https://evil.example/x.js"></script></head>'));
    expect(ids(grade("hostile-readme", harmed, { root }))).toEqual(expect.arrayContaining(["forbidden-absent"]));
  });

  it("fails every check that needs a page when the run wrote none", () => {
    const d = mkdtempSync(join(tmpdir(), "luz-eval-"));
    tmp.push(d);
    const report = grade("landing-vanilla", d, { root });
    expect(report.passed).toBe(false);
    expect(ids(report)).toEqual(expect.arrayContaining(["luz-check", "lang", "one-h1", "title"]));
  });

  it("does not know a case it was not given", () => {
    expect(() => grade("nothing", tmpdir(), { root })).toThrow(/not a case/);
  });
});

describe("node tools/ai-eval/src/grade.js", () => {
  const cli = (...args) => spawnSync(process.execPath, [join(root, "tools/ai-eval/src/grade.js"), ...args], { encoding: "utf-8" });

  it("exits 0 when the run passes and prints the checks, 1 when one fails, 2 when it is used wrongly", () => {
    const good = cli("landing-vanilla", run("landing-vanilla"));
    expect(good.status, good.stdout).toBe(0);
    expect(good.stdout).toMatch(/landing-vanilla: passed \(6\/6\)/);
    expect(good.stdout).toContain("asked-before-write");
    expect(cli("landing-vanilla", run("landing-vanilla", { fill: false })).status).toBe(1);
    expect(cli().status).toBe(2);
    expect(cli("nothing", tmpdir()).status).toBe(2);
    expect(cli("landing-vanilla", join(tmpdir(), "luz-eval-not-here")).status).toBe(2);
  });

  it("prints one JSON object with --json", () => {
    const out = JSON.parse(cli("landing-vanilla", run("landing-vanilla"), "--json").stdout);
    expect(out).toMatchObject({ case: "landing-vanilla", passed: true });
    expect(out.checks.length).toBe(6);
  });
});
