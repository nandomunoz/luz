/**
 * The runner of the outcome evals of the `luz-start` skill (`scripts/ai-eval-run.js`, phase 4 of
 * `.claude/plans/luz-ai-skill.md`). It runs a host's command, with and without the skill installed, on each case
 * and grades the folder. These tests use a stub host that stands in for a model: with the skill installed it does
 * the work through the skill's script, without it it writes a careless page. So what is tested is the runner, not any
 * model: that nothing runs without --run, that the plan is capped, that the skill is installed for one arm only,
 * that the installed skill is not counted as something the model wrote, and that a slow host is stopped.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { plan, readHosts, summary, unsafeFixture } from "../scripts/ai-eval-run.js";
import { loadCases } from "../scripts/ai-eval-grade.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "luz-eval-run-test-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const STUB = `import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [prompt, log] = process.argv.slice(2);
if (log) appendFileSync(log, "ran\\n");
const dir = process.cwd();
const script = join(dir, ".agents/skills/luz-start/scripts/luz-start.mjs");
const kind = /documentation/.test(prompt) ? "docs" : /blog/.test(prompt) ? "blog" : "landing";
const stack = /Astro/.test(prompt) ? "astro" : "vanilla";
const lang = /Spanish/.test(prompt) ? "es" : "en";
if (existsSync(script)) {
  spawnSync(process.execPath, [script, "site", "new", "--name", "Site", "--kind", kind, "--stack", stack, "--target", join(dir, "site"), "--lang", lang]);
  const page = join(dir, "site", stack === "astro" ? "src/pages/index.astro" : "index.html");
  let n = 0;
  let m = 0;
  const text = readFileSync(page, "utf-8").replaceAll("…", "Text").replace(/<h1/g, (x) => (n++ ? "<h2" : x)).replace(/<\\/h1>/g, (x) => (m++ ? "</h2>" : x));
  writeFileSync(page, text);
} else {
  mkdirSync(join(dir, "site"), { recursive: true });
  writeFileSync(join(dir, "site", "index.html"), "<html><h1>…</h1></html>");
}
`;
const stub = join(tmp, "stub.mjs");
writeFileSync(stub, STUB);
const log = join(tmp, "log.txt");

const hosts = (list) => {
  const file = join(tmp, `hosts-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify({ hosts: list }));
  return file;
};
const STUB_HOST = { id: "stub", command: [process.execPath, stub, "{prompt}", log], timeoutSec: 60 };
const cli = (...args) => spawnSync(process.execPath, [join(root, "scripts/ai-eval-run.js"), ...args], { encoding: "utf-8", timeout: 120000 });

describe("the hosts file", () => {
  const read = (data) => {
    const f = join(tmp, "h.json");
    writeFileSync(f, JSON.stringify(data));
    return readHosts(f);
  };

  it("takes a host with an id and a command that carries the prompt", () => {
    expect(read({ hosts: [STUB_HOST] })[0].id).toBe("stub");
  });

  it("refuses what would run the wrong thing: no hosts, a repeated id, a command with no {prompt}, a bad timeout", () => {
    expect(() => read({})).toThrow(/hosts/);
    expect(() => read({ hosts: [STUB_HOST, STUB_HOST] })).toThrow(/id/);
    expect(() => read({ hosts: [{ id: "a", command: ["x", "no prompt"] }] })).toThrow(/\{prompt\}/);
    expect(() => read({ hosts: [{ id: "a", command: [1, "{prompt}"] }] })).toThrow(/list of strings/);
    expect(() => read({ hosts: [{ id: "a", command: ["x", "{prompt}"], timeoutSec: 0 }] })).toThrow(/timeoutSec/);
    expect(() => read({ hosts: [{ id: "a", command: ["x", "{prompt}"], timeoutSec: 99999 }] })).toThrow(/timeoutSec/);
  });

  it("refuses a host that is a shell, which would read the prompt of a case as code", () => {
    for (const shell of ["sh", "bash", "/bin/zsh", "cmd", "C:\\Windows\\System32\\cmd.exe", "pwsh"]) expect(() => read({ hosts: [{ id: "a", command: [shell, "-c", "tool {prompt}"] }] }), shell).toThrow(/shell/);
  });

  it("takes a list of variable names as `env`, and nothing else", () => {
    expect(read({ hosts: [{ ...STUB_HOST, env: ["SOME_KEY"] }] })[0].env).toEqual(["SOME_KEY"]);
    expect(() => read({ hosts: [{ ...STUB_HOST, env: ["A=1"] }] })).toThrow(/env/);
    expect(() => read({ hosts: [{ ...STUB_HOST, env: "SOME_KEY" }] })).toThrow(/env/);
  });

  it("names no model: which ones run is the owner's, in the hosts file", () => {
    const src = readFileSync(join(root, "scripts/ai-eval-run.js"), "utf-8");
    expect(src.replace(/\/\*\*[\s\S]*?\*\//, "")).not.toMatch(/\b(gpt|opus|sonnet|haiku|gemini|fable)\b/i);
  });
});

describe("a fixture", () => {
  it("is refused when it would run in the session of the person running the evals: a dotfile, a hook, a package.json", () => {
    for (const bad of [".claude/settings.json", ".mcp.json", ".envrc", ".git/hooks/pre-commit", "package.json", "a/package.json", "Makefile", "docs/.hidden/x"]) expect(unsafeFixture(bad), bad).toBe(true);
    for (const ok of ["README.md", "index.html", "docs/notes.txt"]) expect(unsafeFixture(ok), ok).toBe(false);
  });

  it("is not one of the fixtures of the real cases", () => {
    for (const c of loadCases(root)) for (const path of Object.keys(c.fixture)) expect(unsafeFixture(path), `${c.id}: ${path}`).toBe(false);
  });
});

describe("plan", () => {
  it("is every host, every case and every arm", () => {
    const cases = loadCases(root);
    const p = plan({ hosts: [{ id: "a" }, { id: "b" }], cases, arms: ["with", "without"] });
    expect(p).toHaveLength(2 * cases.length * 2);
    expect(p[0]).toEqual({ host: "a", case: cases[0].id, arm: "with" });
  });
});

describe("node scripts/ai-eval-run.js", () => {
  it("prints the plan and runs nothing without --run", () => {
    writeFileSync(log, "");
    const r = cli("--hosts", hosts([STUB_HOST]));
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/plan: 6 runs, nothing was run \(add --run\)/);
    expect(r.stdout).toContain("stub / landing-vanilla / with");
    expect(readFileSync(log, "utf-8")).toBe("");
  });

  it("stops before the first run when the plan is over --max-runs", () => {
    writeFileSync(log, "");
    const r = cli("--hosts", hosts([STUB_HOST]), "--run", "--max-runs", "2");
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/6 runs and --max-runs is 2/);
    expect(readFileSync(log, "utf-8")).toBe("");
  });

  it("runs a case with and without the skill, and the skill's arm passes where the other does not", () => {
    writeFileSync(log, "");
    const out = join(tmp, "out.json");
    const r = cli("--hosts", hosts([STUB_HOST]), "--case", "landing-vanilla", "--run", "--out", out);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("stub / landing-vanilla: with the skill 6/6, without ");
    expect(r.stdout).not.toMatch(/without 6\/6/);
    expect(readFileSync(log, "utf-8")).toBe("ran\nran\n");
    const { results } = JSON.parse(readFileSync(out, "utf-8"));
    const by = Object.fromEntries(results.map((x) => [x.arm, x]));
    expect(by.with.grade.passed).toBe(true);
    expect(by.without.grade.passed).toBe(false);
    expect(by.without.grade.checks.find((c) => c.id === "no-placeholder").ok).toBe(false);
    for (const x of results) expect(x).toMatchObject({ host: "stub", case: "landing-vanilla", status: 0, timedOut: false });
    expect(by.with.dir).toBeUndefined();
  });

  it("does not count the skill it installed as something the model wrote, and keeps a hostile fixture whole", () => {
    const r = cli("--hosts", hosts([STUB_HOST]), "--case", "hostile-readme", "--arm", "with", "--run", "--keep");
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("with the skill 8/8, without -");
    const dir = r.stdout.match(/kept stub \/ hostile-readme \/ with: (.+)/)[1];
    expect(existsSync(join(dir, ".agents/skills/luz-start/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/skills/luz-start/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".agents/skills/luz-start/evals"))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("installs the skill for the arm 'with' only", () => {
    const r = cli("--hosts", hosts([STUB_HOST]), "--case", "landing-vanilla", "--arm", "without", "--run", "--keep");
    const dir = r.stdout.match(/kept stub \/ landing-vanilla \/ without: (.+)/)[1];
    expect(existsSync(join(dir, ".agents"))).toBe(false);
    expect(existsSync(join(dir, ".claude"))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("records a run that touched the skill it was given, since that is not graded as the model's work", () => {
    const touch = { id: "touch", command: [process.execPath, "-e", 'require("fs").appendFileSync(".claude/skills/luz-start/SKILL.md", "x")', "{prompt}"], timeoutSec: 30 };
    const out = join(tmp, "touch.json");
    const r = cli("--hosts", hosts([touch]), "--case", "landing-vanilla", "--run", "--out", out);
    expect(r.stdout).toContain("(skill folder touched)");
    const { results } = JSON.parse(readFileSync(out, "utf-8"));
    const by = Object.fromEntries(results.map((x) => [x.arm, x]));
    expect(by.with.setupTouched).toEqual([".claude/skills/luz-start/SKILL.md"]);
    expect(by.without.setupTouched).toEqual([]);
    const clean = JSON.parse(readFileSync(join(tmp, "out.json"), "utf-8")).results.find((x) => x.arm === "with");
    expect(clean.setupTouched).toEqual([]);
  });

  it("gives the host a small environment and only the variables the hosts file names", () => {
    const show = { id: "show", command: [process.execPath, "-e", 'console.log("KEY=" + (process.env.LUZ_EVAL_SECRET ?? "unset") + " OTHER=" + (process.env.LUZ_EVAL_OTHER ?? "unset"))', "{prompt}"], timeoutSec: 30 };
    const env = { ...process.env, LUZ_EVAL_SECRET: "s3cret", LUZ_EVAL_OTHER: "o" };
    const out = join(tmp, "env.json");
    const run = (host) => spawnSync(process.execPath, [join(root, "scripts/ai-eval-run.js"), "--hosts", hosts([host]), "--case", "landing-vanilla", "--arm", "without", "--run", "--out", out], { encoding: "utf-8", env, timeout: 60000 });
    expect(run(show).status).toBe(0);
    expect(JSON.parse(readFileSync(out, "utf-8")).results[0].stdoutTail).toContain("KEY=unset OTHER=unset");
    expect(run({ ...show, env: ["LUZ_EVAL_SECRET"] }).status).toBe(0);
    expect(JSON.parse(readFileSync(out, "utf-8")).results[0].stdoutTail).toContain("KEY=s3cret OTHER=unset");
  });

  it("stops a host that is too slow, and grades what it left", () => {
    const slow = { id: "slow", command: [process.execPath, "-e", "setTimeout(() => {}, 20000)", "{prompt}"], timeoutSec: 1 };
    const out = join(tmp, "slow.json");
    const r = cli("--hosts", hosts([slow]), "--case", "landing-vanilla", "--arm", "without", "--run", "--out", out);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/\(timed out\)/);
    const { results } = JSON.parse(readFileSync(out, "utf-8"));
    expect(results[0].timedOut).toBe(true);
    expect(results[0].grade.passed).toBe(false);
  });

  it("exits 2 for a missing file, an unknown case or arm, and no --hosts", () => {
    expect(cli().status).toBe(2);
    expect(cli("--hosts", join(tmp, "nope.json")).status).toBe(2);
    expect(cli("--hosts", hosts([STUB_HOST]), "--case", "nothing").status).toBe(2);
    expect(cli("--hosts", hosts([STUB_HOST]), "--arm", "both").status).toBe(2);
    expect(cli("--hosts", hosts([STUB_HOST]), "--nope").status).toBe(2);
  });
});

describe("summary", () => {
  it("says passes per host, case and arm", () => {
    const g = (ok) => ({ checks: [{ ok }, { ok: true }] });
    expect(summary([{ host: "h", case: "c", arm: "with", grade: g(true) }, { host: "h", case: "c", arm: "without", grade: g(false) }])).toEqual(["h / c: with the skill 2/2, without 1/2"]);
  });
});
