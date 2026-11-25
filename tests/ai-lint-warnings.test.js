/**
 * The lists of fields that lint reads (Gemini CLI, Codex, Claude Code) were read at their sources on a date, and an assistant
 * adds a field with a release. A field that is not in the list is a warning, with its name, and never a failure: it exits 0,
 * and neither `doctor` nor `lint` blocks a project because a list is a month old. What is wrong in a file (a name that does
 * not match, a missing description, a hidden character) is still a problem and exits 1.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const SCRIPT = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "packages/ai/skills/luz/scripts/luz.mjs");
const run = (args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8" });
  return { code: r.status, out: r.stdout };
};
const tmp = [];
const project = (files) => {
  const d = mkdtempSync(join(tmpdir(), "luz-warn-"));
  tmp.push(d);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(d, dirname(path)), { recursive: true });
    writeFileSync(join(d, path), text);
  }
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const SKILL = (extra = "") => `---\nname: demo\ndescription: "Does one thing."\n${extra}---\n\nBody.\n`;
const GEMINI = (extra = "") => `---\nname: demo\ndescription: x\n${extra}---\n\nBody.\n`;

describe("an unknown field is a warning", () => {
  it("in a skill, an agent of Gemini CLI, a Codex agent and openai.yaml: exit 0, the field named, no problem", () => {
    const cases = {
      "a skill": { ".agents/skills/demo/SKILL.md": SKILL("mystery: 1\n") },
      "a Gemini CLI agent": { ".gemini/agents/demo.md": GEMINI("max-turns: 5\n") },
      "a Codex agent": { ".codex/agents/demo.toml": `name = "demo"\ndescription = "x"\nsandbox_mode = "read-only"\ndeveloper_instructions = '''\nDo it.\n'''\n` },
      "openai.yaml": { ".agents/skills/demo/SKILL.md": SKILL(), ".agents/skills/demo/agents/openai.yaml": "mystery: 1\n" },
    };
    for (const [what, files] of Object.entries(cases)) {
      const r = run(["lint", "--json", "--dir", project(files)]);
      const report = JSON.parse(r.out);
      expect(r.code, what).toBe(0);
      expect(report.problems, what).toEqual([]);
      expect(report.warnings.join(" "), what).toContain("field/unknown");
    }
  });

  it("says it in the text of the report, as a warning", () => {
    const r = run(["lint", project({ ".agents/skills/demo/SKILL.md": SKILL("mystery: 1\n") })]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/0 problems, 1 warning/);
    expect(r.out).toMatch(/field\/unknown/);
  });

  it("does not make doctor fail either", () => {
    const r = run(["doctor", "--json", "--dir", project({ ".claude/skills/demo/SKILL.md": SKILL("mystery: 1\n") })]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).warnings.join(" ")).toMatch(/mystery/);
  });

  it("leaves a real problem a problem: a name that is not the folder's still exits 1", () => {
    const r = run(["lint", "--json", "--dir", project({ ".agents/skills/other/SKILL.md": SKILL("mystery: 1\n") })]);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).problems.map((p) => p.rule)).toContain("name/folder");
  });
});
