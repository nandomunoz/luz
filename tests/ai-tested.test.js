/**
 * "Tested in" (`.claude/plans/ai-eval-lab.md`, phase 5): a green pass of the release layer writes `packages/ai/tested.json`;
 * the release gate fails without a pass for the version to publish, or with a frozen example older than the skill; every
 * place that talks about the assistants says that only Claude Code is tested, and points to the issue form for the others.
 */
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");
const tmp = [];
const mk = () => {
  const d = mkdtempSync(join(tmpdir(), "luz-tested-"));
  tmp.push(d);
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));
const lab = (f) => import(join(root, "tools/ai-eval/src", f));
const gate = () => import(join(root, "scripts/check-ai-tested.js"));

const green = (extra = {}) => ({ runId: "r", meta: { layer: "release", model: "opus", mode: "script", caseIds: ["a", "b"] }, cases: { a: { status: "pass", runs: [] }, b: { status: "pass", runs: [] } }, rounds: [], ...extra });

describe("tested.json: what a green release pass writes", () => {
  it("records host, model, versions, date and the cases, for a green script run of the release layer", async () => {
    const { makeTested } = await lab("tested.js");
    const t = makeTested(green(), { skillVersion: "0.2.0", packageVersion: "0.4.1", cli: "2.1.331", now: new Date("2026-11-24T10:00:00Z") });
    expect(t).toEqual({ host: "claude-code", cli: "2.1.331", model: "opus", skillVersion: "0.2.0", packageVersion: "0.4.1", date: "2026-11-24", cases: ["a", "b"], failed: [] });
  });

  it("refuses a run that is not the release layer, not a script run, or with too many cases red", async () => {
    const { makeTested } = await lab("tested.js");
    const o = { skillVersion: "1", packageVersion: "1", cli: "1" };
    expect(() => makeTested(green({ meta: { layer: "full", model: "sonnet", mode: "script", caseIds: [] } }), o)).toThrow(/release layer/);
    expect(() => makeTested(green({ meta: { layer: "release", model: "opus", mode: "auto", caseIds: [] } }), o)).toThrow(/script/);
    expect(() => makeTested(green({ cases: { a: { status: "fail", runs: [] } } }), o)).toThrow(/did not pass/);
  });

  it("takes a pass with a few cases red: 9 of 10 is written with the case that failed, 8 of 10 is not", async () => {
    const { makeTested } = await lab("tested.js");
    const o = { skillVersion: "1", packageVersion: "1", cli: "1", now: new Date("2026-11-25T10:00:00Z") };
    const cases = (red) => Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`c${i}`, { status: i < red ? "fail" : "pass", runs: [] }]));
    const t = makeTested(green({ cases: cases(1) }), o);
    expect(t.cases).toHaveLength(10);
    expect(t.failed).toEqual(["c0"]);
    expect(makeTested(green({ cases: cases(0) }), o).failed).toEqual([]);
    expect(() => makeTested(green({ cases: cases(2) }), o)).toThrow(/did not pass/);
  });

  it("the command writes it next to the package and refuses without a release run", () => {
    const run = join(mk(), "r");
    mkdirSync(run, { recursive: true });
    writeFileSync(join(run, "state.json"), JSON.stringify(green({ meta: { layer: "smoke", model: "haiku", mode: "script", caseIds: [] } })));
    const r = spawnSync(process.execPath, [join(root, "tools/ai-eval/src/cli.js"), "tested", run], { encoding: "utf-8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/release layer/);
  });
});

describe("the release gate", () => {
  const skill = (v) => `---\nname: luz\nmetadata:\n  version: "${v}"\n---\n`;
  const repo = ({ tested, examples = { a: "0.2.0" }, pkg = "0.4.1", skillV = "0.2.0" }) => {
    const d = mk();
    mkdirSync(join(d, "packages/ai/skills/luz"), { recursive: true });
    mkdirSync(join(d, "tools/ai-eval/cases/examples"), { recursive: true });
    writeFileSync(join(d, "packages/ai/package.json"), JSON.stringify({ name: "@luz-ds/ai", version: pkg }));
    writeFileSync(join(d, "packages/ai/skills/luz/SKILL.md"), skill(skillV));
    if (tested) writeFileSync(join(d, "packages/ai/tested.json"), JSON.stringify(tested));
    for (const [n, v] of Object.entries(examples)) writeFileSync(join(d, "tools/ai-eval/cases/examples", `${n}.json`), JSON.stringify({ example: n, skillVersion: v }));
    return d;
  };
  const ok = { host: "claude-code", cli: "2.1.331", model: "opus", skillVersion: "0.2.0", packageVersion: "0.4.1", date: "2026-11-24", cases: ["a"] };

  it("passes with a pass for this package and this skill and examples as new as the skill", async () => {
    const { checkAiTested } = await gate();
    expect(checkAiTested(repo({ tested: ok }))).toEqual([]);
  });

  it("only warns: the lab informs and the deterministic tests are the gate, so the command exits 0 with a problem unless --strict is given", () => {
    const d = repo({});
    const run = (flags = []) => spawnSync(process.execPath, [join(root, "scripts/check-ai-tested.js"), "--root", d, ...flags], { encoding: "utf-8" });
    expect(run().status).toBe(0);
    expect(run().stderr).toMatch(/^check:ai-tested: !/m);
    expect(run(["--strict"]).status).toBe(1);
  });

  it("lists a problem with no tested.json, with another package or skill version, with a stale example and with a model that is not the release layer's", async () => {
    const { checkAiTested } = await gate();
    expect(checkAiTested(repo({}))[0]).toMatch(/tested\.json/);
    expect(checkAiTested(repo({ tested: { ...ok, packageVersion: "0.4.0" } })).join(" ")).toMatch(/package/);
    expect(checkAiTested(repo({ tested: { ...ok, skillVersion: "0.1.0" } })).join(" ")).toMatch(/skill/);
    expect(checkAiTested(repo({ tested: ok, examples: { a: "0.1.0", b: "0.2.0" } })).join(" ")).toMatch(/example a/);
    expect(checkAiTested(repo({ tested: { ...ok, model: "haiku" } })).join(" ")).toMatch(/opus/);
  });

  it("is a step of qa-release that never blocks, and a script of the root package", () => {
    expect(JSON.parse(read("package.json")).scripts["check:ai-tested"]).toBe("node scripts/check-ai-tested.js");
    expect(read("scripts/qa-release.js")).toMatch(/check:ai-tested/);
    expect(read("scripts/qa-release.js")).not.toMatch(/check:ai-tested[^\n]*--strict/);
  });
});

describe("the notes", () => {
  const url = "https://github.com/nandomunoz/luz/issues/new?template=ai-target.yml";

  it("the issue form asks for the target, the CLI version, the command and the output", () => {
    const form = read(".github/ISSUE_TEMPLATE/ai-target.yml");
    expect(form).toMatch(/^name: .*assistant/im);
    expect([...form.matchAll(/^ {4}id: (\w+)$/gm)].map((m) => m[1])).toEqual(["target", "cli", "command", "output"]);
    expect(form).toMatch(/Codex[\s\S]*Gemini[\s\S]*Cursor[\s\S]*AGENTS\.md/);
    expect([...form.matchAll(/required: true/g)]).toHaveLength(4);
  });

  it("init says, for a target that is not Claude Code, that only Claude Code is tested and where to report", () => {
    const run = (t) => JSON.parse(spawnSync(process.execPath, [join(root, "packages/ai/skills/luz/scripts/luz.mjs"), "init", "--target", t, "--dry-run", "--json", "--dir", mk()], { encoding: "utf-8" }).stdout);
    for (const t of ["codex", "gemini", "cursor", "agents-md"]) {
      const notes = run(t).notes.join("\n");
      expect(notes, t).toMatch(/tested only in Claude Code/i);
      expect(notes, t).toContain(url);
    }
    expect(run("claude").notes.join("\n")).not.toMatch(/tested only/i);
  });

  it("the README, the commands page (en and es) and the /ai/ strings say it, and name the host tested.json names", () => {
    expect(read("packages/ai/README.md")).toMatch(/tested only in Claude Code/i);
    expect(read("apps/docs/pages/ai/commands.html")).toMatch(/tested only in Claude Code/i);
    expect(read("apps/docs/i18n/es/pages/ai/commands.html")).toMatch(/solo en Claude Code/i);
    expect(JSON.parse(read("apps/landing/i18n/en.json"))["level.ai.assistants.tested"]).toMatch(/tested only in Claude Code/i);
    expect(JSON.parse(read("apps/landing/i18n/es.json"))["level.ai.assistants.tested"]).toMatch(/solo en Claude Code/i);
    expect(JSON.parse(read("apps/landing/i18n/ar.json"))["level.ai.assistants.tested"]).toContain("Claude Code");
    if (existsSync(join(root, "packages/ai/tested.json"))) expect(JSON.parse(read("packages/ai/tested.json")).host).toBe("claude-code");
  });
});
