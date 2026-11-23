/**
 * The first phase of the `luz-start` skill (`.claude/plans/luz-ai-skill.md`, B.9): the one executable of the
 * skill, `packages/ai/skills/luz-start/scripts/luz-start.mjs`, with `doctor` and `check`, and the two files of data
 * beside it. It writes nothing, never asks, never reaches the network and works from any folder, because a skill
 * is run by assistants that disagree on where a script runs.
 */
import { afterAll, describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAiFacts, buildAiFiles } from "../scripts/build-ai-facts.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = join(root, "packages/ai/skills/luz-start");
const script = join(skill, "scripts/luz-start.mjs");
const read = (p) => readFileSync(p, "utf-8");
const json = (p) => JSON.parse(read(p));

/** Runs the script from `cwd` with a closed stdin, as a host without a terminal does. */
function run(args, cwd = root) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const tmp = [];
function dir(files = {}) {
  const d = mkdtempSync(join(tmpdir(), "luz-start-"));
  tmp.push(d);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(d, path)), { recursive: true });
    writeFileSync(join(d, path), text);
  }
  return d;
}
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const GOOD = `---\nname: demo\ndescription: "Does one thing: it demos."\n---\n\n# Demo\n\nBody.\n`;
const skillOf = (front, body = "# Demo\n\nBody.\n", name = "demo") => dir({ [`.agents/skills/${name}/SKILL.md`]: `---\n${front}\n---\n\n${body}` });
const rules = (r) => JSON.parse(r.out).problems.map((p) => p.rule);

describe("the data beside the script", () => {
  const fields = json(join(skill, "assets/fields.json"));

  it("has the six fields of the open specification for a portable skill, and no version", () => {
    expect(fields.skill.portable).toEqual(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
    expect(fields.skill.portable).not.toContain("version");
  });

  it("keeps the fields of Claude Code apart, with dashes for skills and camelCase for subagents", () => {
    for (const f of ["argument-hint", "disable-model-invocation", "user-invocable", "disallowed-tools", "when_to_use"]) expect(fields.skill.claude, f).toContain(f);
    for (const f of ["disallowedTools", "permissionMode", "maxTurns", "tools", "model", "effort"]) expect(fields.agent.claude, f).toContain(f);
    for (const f of fields.skill.portable) expect(fields.skill.claude, `claude skills take ${f} too`).toContain(f);
  });

  it("has facts that are exactly what the manifests say", () => {
    expect(json(join(skill, "assets/facts.json"))).toEqual(buildAiFacts({ root }));
  });

  it("has every generated file (the facts, a starter page and a reference per kind, the stacks) as the prompts build it", () => {
    const files = buildAiFiles({ root });
    expect(Object.keys(files).length).toBe(10);
    for (const [file, text] of Object.entries(files)) expect(read(join(root, file)), `${file} is out of step: run node scripts/build-ai-facts.js`).toBe(text);
  });

  it("names the versions, the kinds of site and the stacks, read from the repository, never typed", () => {
    const facts = buildAiFacts({ root });
    for (const pkg of ["tokens", "core", "catalog", "check"]) expect(facts.versions[pkg], pkg).toBe(json(join(root, `packages/${pkg}/package.json`)).version);
    expect(facts.kinds).toEqual(["landing", "blog", "app", "docs"]);
    expect(facts.stacks.map((s) => s.id)).toEqual(json(join(root, "apps/site/prompts/stacks.json")).stacks.map((s) => s.id));
  });
});

describe("the script is one file that depends on nothing", () => {
  const src = read(script);

  it("imports only node: built-ins and reads its data from its own path", () => {
    const specs = [...src.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    expect(specs.length).toBeGreaterThan(0);
    for (const s of specs) expect(s, s).toMatch(/^node:/);
    expect(src).toMatch(/import\.meta\.url/);
    expect(src).not.toMatch(/process\.cwd\(\)[^;\n]*fields\.json/);
  });

  it("never reaches the network, never runs a program, never evaluates text", () => {
    expect(src).not.toMatch(/\bfetch\s*\(|node:(http|https|net|dgram|child_process|worker_threads|vm)|\beval\s*\(|new Function/);
  });

  it("writes in one place only, the files of `site new`, and never deletes or moves one", () => {
    expect(src).not.toMatch(/appendFile|rmSync|rmdir|unlink|rename|copyFile|createWriteStream|chmod/);
    expect(src.match(/writeFileSync\(/g)).toHaveLength(1);
    expect(src.match(/mkdirSync\(/g)).toHaveLength(1);
  });

  it("has no hidden or bidi character", () => {
    expect(src).not.toMatch(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/);
  });
});

describe("help and usage", () => {
  it("says the commands and the exit codes", () => {
    const r = run(["--help"]);
    expect(r.code).toBe(0);
    for (const w of ["site new", "facts", "doctor", "check", "--json", "--no-input", "0", "1", "2"]) expect(r.out, w).toContain(w);
  });

  it("has help at every level, with an example", () => {
    for (const c of ["site", "facts", "doctor", "check"]) {
      const r = run([c, "--help"]);
      expect(r.code, c).toBe(0);
      expect(r.out, c).toMatch(/example/i);
    }
  });

  it("answers an unknown command and an unknown flag with exit 2 and the table", () => {
    const a = run(["make"]);
    expect(a.code).toBe(2);
    expect(a.err).toContain("doctor");
    expect(run(["doctor", "--nope"]).code).toBe(2);
    expect(run([]).code).toBe(2);
  });

  it("accepts --no-input, since it never asks", () => {
    expect(run(["check", "--no-input", "--json", dir({ ".agents/skills/demo/SKILL.md": GOOD })]).code).toBe(0);
  });

  it("exits 2 when a path does not exist", () => {
    const r = run(["check", join(tmpdir(), "luz-start-nothing-here")]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/not found|does not exist/);
  });
});

describe("check: a skill", () => {
  it("passes a good one, from any folder", () => {
    const d = dir({ ".agents/skills/demo/SKILL.md": GOOD });
    const r = run(["check", "--json", d], tmpdir());
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toMatchObject({ ok: true, problems: [] });
  });

  it("finds the skills of the usual folders when no path is given", () => {
    const d = dir({ ".claude/skills/demo/SKILL.md": GOOD, ".agents/skills/other/SKILL.md": GOOD.replace("demo", "other") });
    const r = run(["check", "--json"], d);
    expect(JSON.parse(r.out).checked.length).toBe(2);
    expect(r.code).toBe(0);
  });

  it("fails a file that does not start with ---", () => {
    const d = dir({ ".agents/skills/demo/SKILL.md": `\n${GOOD}` });
    expect(rules(run(["check", "--json", d]))).toContain("frontmatter/missing");
  });

  it("fails a plain value with ': ' or ' #' that a strict YAML parser rejects", () => {
    expect(rules(run(["check", "--json", skillOf("name: demo\ndescription: Does one thing: it demos.")]))).toContain("yaml/plain-scalar");
    expect(rules(run(["check", "--json", skillOf("name: demo\ndescription: Does one thing # it demos.")]))).toContain("yaml/plain-scalar");
  });

  it("takes a quoted value, single or double, and a one-level metadata map", () => {
    const a = run(["check", "--json", skillOf(`name: demo\ndescription: 'It''s: fine'\nmetadata:\n  version: "0.1.0"\n  owner: luz`)]);
    expect(a.code, a.out).toBe(0);
  });

  it("fails a nested map, a flow value and a block scalar: outside the subset", () => {
    expect(rules(run(["check", "--json", skillOf(`name: demo\ndescription: x\nmetadata:\n  a:\n    b: c`)]))).toContain("yaml/nested");
    expect(rules(run(["check", "--json", skillOf(`name: demo\ndescription: [x, y]`)]))).toContain("yaml/flow");
    expect(rules(run(["check", "--json", skillOf(`name: demo\ndescription: >\n  folded`)]))).toContain("yaml/block-scalar");
  });

  it("fails a field the portable list does not have, and says which", () => {
    const r = run(["check", "--json", skillOf(`name: demo\ndescription: x\nargument-hint: "[a]"\nversion: "1"`)]);
    const unknown = JSON.parse(r.out).problems.filter((p) => p.rule === "field/unknown");
    expect(unknown.map((p) => p.message).join(" ")).toMatch(/argument-hint/);
    expect(unknown.map((p) => p.message).join(" ")).toMatch(/version/);
    expect(r.code).toBe(1);
  });

  it("takes a field of Claude Code under .claude/skills only", () => {
    const front = `name: demo\ndescription: x\ndisable-model-invocation: true`;
    const claude = dir({ ".claude/skills/demo/SKILL.md": `---\n${front}\n---\n\nBody.\n` });
    expect(run(["check", "--json", claude]).code).toBe(0);
    expect(rules(run(["check", "--json", "--target", "portable", claude]))).toContain("field/unknown");
  });

  it("fails a name that is not the folder, not a valid name or a reserved word", () => {
    expect(rules(run(["check", "--json", skillOf("name: other\ndescription: x")]))).toContain("name/folder");
    expect(rules(run(["check", "--json", skillOf("name: Demo\ndescription: x", undefined, "Demo")]))).toContain("name/pattern");
    expect(rules(run(["check", "--json", skillOf("name: claude-helper\ndescription: x", undefined, "claude-helper")]))).toContain("name/reserved");
    expect(rules(run(["check", "--json", skillOf("name: a--b\ndescription: x", undefined, "a--b")]))).toContain("name/pattern");
  });

  it("fails a description that is missing, empty or over 1,024 characters", () => {
    expect(rules(run(["check", "--json", skillOf("name: demo")]))).toContain("description/missing");
    expect(rules(run(["check", "--json", skillOf(`name: demo\ndescription: "${"a".repeat(1025)}"`)]))).toContain("description/long");
    expect(run(["check", "--json", skillOf(`name: demo\ndescription: "${"a".repeat(1024)}"`)]).code).toBe(0);
  });

  it("fails a body over 500 lines", () => {
    expect(rules(run(["check", "--json", skillOf("name: demo\ndescription: x", "line\n".repeat(500))]))).toContain("body/long");
    // The blank line after the front matter is part of the body: 499 lines and it make 500
    expect(run(["check", "--json", skillOf("name: demo\ndescription: x", "line\n".repeat(499))]).code).toBe(0);
  });

  it("fails a hidden or bidi character, with its line", () => {
    const r = run(["check", "--json", skillOf("name: demo\ndescription: x", "one\ntwo \u202E three\n")]);
    const p = JSON.parse(r.out).problems.find((x) => x.rule === "chars/hidden");
    expect(p.line).toBeGreaterThan(5);
    expect(r.code).toBe(1);
  });

  it("fails a reference that is missing, outside the folder, or that points on to another one", () => {
    const base = ".agents/skills/demo";
    const a = dir({ [`${base}/SKILL.md`]: `${GOOD}\nRead [the stacks](references/stacks.md).\n` });
    expect(rules(run(["check", "--json", a]))).toContain("reference/missing");
    const b = dir({ [`${base}/SKILL.md`]: `${GOOD}\nRead [x](../../etc/passwd).\n` });
    expect(rules(run(["check", "--json", b]))).toContain("reference/outside");
    const c = dir({ [`${base}/SKILL.md`]: `${GOOD}\nRead \`references/a.md\`.\n`, [`${base}/references/a.md`]: "See [b](b.md).\n", [`${base}/references/b.md`]: "b\n" });
    expect(rules(run(["check", "--json", c]))).toContain("reference/chain");
    const ok = dir({ [`${base}/SKILL.md`]: `${GOOD}\nRead [a](references/a.md) and https://example.com/x.md and [top](#demo).\n`, [`${base}/references/a.md`]: "a\n" });
    expect(run(["check", "--json", ok]).code).toBe(0);
  });
});

describe("check: a subagent", () => {
  const agent = (front, name = "demo-runner") => dir({ [`.claude/agents/${name}.md`]: `---\n${front}\n---\n\nYou are a runner.\n` });

  it("passes one with camelCase fields and a long description", () => {
    const r = run(["check", "--json", agent(`name: demo-runner\ndescription: "${"long ".repeat(300)}"\ntools: Read, Grep\nmodel: sonnet\ndisallowedTools: Write`)]);
    expect(r.code, r.out).toBe(0);
  });

  it("fails a dashed field, which Claude Code ignores without a word", () => {
    expect(rules(run(["check", "--json", agent(`name: demo-runner\ndescription: x\ndisallowed-tools: Write`)]))).toContain("field/unknown");
  });

  it("fails a name that is not the file's, and a plain value with ': '", () => {
    expect(rules(run(["check", "--json", agent(`name: other\ndescription: x`)]))).toContain("name/file");
    expect(rules(run(["check", "--json", agent(`name: demo-runner\ndescription: a: b`)]))).toContain("yaml/plain-scalar");
  });
});

describe("check: this repository", () => {
  it("passes the thirteen agents and the skill it has", () => {
    const r = run(["check", "--json"], root);
    const out = JSON.parse(r.out);
    expect(out.problems, JSON.stringify(out.problems)).toEqual([]);
    expect(out.checked.length).toBeGreaterThanOrEqual(14);
    expect(r.code).toBe(0);
  });
});

describe("text report", () => {
  it("puts the summary first, then the problems, and stays short", () => {
    const d = skillOf("name: other\ndescription: a: b");
    const r = run(["check", d]);
    expect(r.code).toBe(1);
    const lines = r.out.trim().split("\n");
    expect(lines[0]).toMatch(/\d+ problems?/);
    expect(r.out.length).toBeLessThan(10000);
  });

  it("keeps the report within a bound however many problems there are", () => {
    const files = {};
    for (let i = 0; i < 80; i++) files[`.agents/skills/s${i}/SKILL.md`] = `---\nname: x${i}\ndescription: a: b\n---\n`;
    const r = run(["check", dir(files)]);
    expect(r.out.length).toBeLessThan(10000);
    expect(r.out).toMatch(/more/);
  });
});

describe("doctor", () => {
  const sample = () =>
    dir({
      "package.json": JSON.stringify({ name: "site", dependencies: { "@luz-ds/core": "^0.9.0", "@luz-ds/tokens": "^0.9.0" } }),
      "AGENTS.md": "# Site\n",
      ".claude/skills/demo/SKILL.md": GOOD,
    });

  it("exits 0 on a sample project and lists the LUZ packages and the assistants it found", () => {
    const r = run(["doctor", "--json", "--dir", sample()]);
    expect(r.code, r.out).toBe(0);
    const out = JSON.parse(r.out);
    expect(out.ok).toBe(true);
    expect(out.luz).toEqual({ "@luz-ds/core": "^0.9.0", "@luz-ds/tokens": "^0.9.0" });
    expect(out.assistants).toEqual(expect.arrayContaining([".claude", "AGENTS.md"]));
    expect(out.node.ok).toBe(true);
  });

  it("works on a folder with no package.json, since plain HTML is a project", () => {
    expect(run(["doctor", "--json", "--dir", dir({ "index.html": "<p>x</p>" })]).code).toBe(0);
  });

  it("warns, and still exits 0, when AGENTS.md is over the 32 KiB Codex reads", () => {
    const d = dir({ "AGENTS.md": "x".repeat(32 * 1024 + 1) });
    const r = run(["doctor", "--json", "--dir", d]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).warnings.join(" ")).toMatch(/AGENTS\.md/);
  });

  it("exits 1 when a skill it finds does not pass check", () => {
    const d = dir({ ".claude/skills/demo/SKILL.md": GOOD.replace("name: demo", "name: wrong") });
    expect(run(["doctor", "--dir", d]).code).toBe(1);
  });

  it("changes nothing in the folder it reads", () => {
    const d = sample();
    const list = () => readdirSync(d, { recursive: true }).sort().join("\n");
    const before = list();
    run(["doctor", "--dir", d]);
    run(["check", d]);
    expect(list()).toBe(before);
    expect(existsSync(join(d, ".agents"))).toBe(false);
  });

  it("exits 0 on this repository, which is how it runs in CI", () => {
    const r = run(["doctor", "--json", "--dir", root], tmpdir());
    expect(r.code, r.out).toBe(0);
  });
});

describe("facts", () => {
  it("prints what facts.json says, as JSON and as text", () => {
    expect(JSON.parse(run(["facts", "--json"]).out)).toEqual(json(join(skill, "assets/facts.json")));
    const text = run(["facts"]).out;
    for (const w of ["@luz-ds/core", "landing", "astro"]) expect(text, w).toContain(w);
  });
});

describe("site new", () => {
  const KINDS = ["landing", "blog", "app", "docs"];
  const flags = (target, over = {}) => {
    const all = { name: "Acme", kind: "landing", stack: "vanilla", target, ...over };
    return ["site", "new", ...Object.entries(all).flatMap(([k, v]) => (v === undefined ? [] : [`--${k}`, v]))];
  };
  const luzCheck = join(root, "packages/check/dist/luz-check.js");

  it("writes a starter page that LUZ's own check accepts, for every kind and the two stacks it writes", () => {
    expect(existsSync(luzCheck), "pnpm build makes the check").toBe(true);
    for (const kind of KINDS) {
      for (const [stack, file, ext] of [["vanilla", "index.html", []], ["astro", "src/pages/index.astro", ["--ext", ".astro"]]]) {
        const d = dir();
        const r = run(flags(d, { kind, stack }));
        expect(r.code, `${kind} ${stack}: ${r.err}`).toBe(0);
        expect(existsSync(join(d, file)), `${kind} ${stack} writes ${file}`).toBe(true);
        const c = spawnSync(process.execPath, [luzCheck, d, ...ext], { encoding: "utf-8" });
        expect(c.status, `${kind} ${stack}: ${c.stdout}`).toBe(0);
      }
    }
  });

  it("fills the language and the title, and escapes the name", () => {
    const d = dir();
    run(flags(d, { name: 'Tom & "Jerry" <b>', lang: "es" }));
    const page = read(join(d, "index.html"));
    expect(page).toContain('<html lang="es">');
    expect(page).toContain("<title>Tom &amp; &quot;Jerry&quot; &lt;b&gt;</title>");
    expect(page).not.toContain("{{");
  });

  it("writes nothing with --dry-run, and prints the literal page", () => {
    const d = join(dir(), "never");
    const r = run([...flags(d), "--dry-run"]);
    expect(r.code).toBe(0);
    expect(existsSync(d)).toBe(false);
    expect(r.out).toContain("would write");
    expect(r.out).toContain('<html lang="en">');
    expect(r.out.length).toBeGreaterThan(3000);
  });

  it("reports in JSON: the files, the marks to fill in and the command to check with, at the version of the facts", () => {
    const d = dir();
    const out = JSON.parse(run([...flags(d), "--json"]).out);
    expect(out).toMatchObject({ ok: true, dryRun: false });
    expect(out.files).toHaveLength(1);
    expect(out.files[0].content).toBeUndefined();
    expect(out.todo).toBe((read(join(d, "index.html")).match(/…/g) ?? []).length);
    expect(out.todo).toBeGreaterThan(0);
    expect(out.next[0]).toBe(`npx @luz-ds/check@${json(join(skill, "assets/facts.json")).versions.check} ${d}`);
    // A target with a space or a shell character is one quoted word, never a second command
    const odd = JSON.parse(run([...flags(join(dir(), "a b; echo x")), "--dry-run", "--json"]).out);
    expect(odd.next[0]).toMatch(/ '[^']*a b; echo x'$/);
    const dry = JSON.parse(run([...flags(dir()), "--dry-run", "--json"]).out);
    expect(dry.dryRun).toBe(true);
    expect(dry.files[0].content).toContain("<!doctype html>");
  });

  it("asks for every flag that is missing, in one error, with an example, and never asks", () => {
    const r = run(["site", "new", "--kind", "landing"]);
    expect(r.code).toBe(2);
    for (const w of ["--name", "--stack", "--target", "Example"]) expect(r.err, w).toContain(w);
    expect(r.err).not.toContain("--kind (");
  });

  it("never overwrites a file without --force, and says which one", () => {
    const d = dir({ "index.html": "mine\n" });
    const r = run(flags(d));
    expect(r.code).toBe(2);
    expect(r.err).toContain("index.html");
    expect(read(join(d, "index.html"))).toBe("mine\n");
    expect(run([...flags(d), "--force"]).code).toBe(0);
    expect(read(join(d, "index.html"))).toContain("<!doctype html>");
  });

  it("writes under the target only, and creates it when it is not there", () => {
    const base = dir({ "keep.txt": "x" });
    const r = run(flags(join(base, "a/b")));
    expect(r.code).toBe(0);
    expect(readdirSync(base, { recursive: true }).sort()).toEqual(["a", "a/b", "a/b/index.html", "keep.txt"]);
  });

  it("refuses a value outside the closed sets, a name that is not one line, and a target that is a file", () => {
    for (const over of [{ kind: "shop" }, { stack: "svelte" }, { lang: "english" }, { name: "a\nb" }, { name: "a\u202Eb" }, { name: "x".repeat(81) }]) {
      expect(run(flags(dir(), over)).code, JSON.stringify(over)).toBe(2);
    }
    const d = dir({ "file.txt": "x" });
    expect(run(flags(join(d, "file.txt"))).code).toBe(2);
  });

  it("says what to do for a stack it writes no page for", () => {
    const r = run(flags(dir(), { stack: "react" }));
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/--stack vanilla/);
    expect(r.err).toContain("references/stacks.md");
  });

  it("takes only the word new after site, and works from any folder", () => {
    expect(run(["site"]).code).toBe(2);
    expect(run(["site", "old"]).code).toBe(2);
    expect(run(flags(dir()), tmpdir()).code).toBe(0);
  });
});

describe("the skill", () => {
  const all = (base = skill) => readdirSync(base, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
  const body = read(join(skill, "SKILL.md"));

  it("passes its own check", () => {
    const r = run(["check", "--json", skill]);
    expect(JSON.parse(r.out).problems).toEqual([]);
    expect(r.code).toBe(0);
  });

  it("has the six fields of the specification and a quoted description", () => {
    const front = body.match(/^---\n([\s\S]*?)\n---/)[1];
    expect([...front.matchAll(/^([a-z-]+):/gm)].map((m) => m[1])).toEqual(["name", "description", "license", "compatibility", "metadata"]);
    expect(front).toMatch(/^description: "/m);
    expect(front).toMatch(/^name: luz-start$/m);
  });

  it("is short: under 500 lines, and every file of the skill is named from it", () => {
    expect(body.split("\n").length).toBeLessThan(500);
    for (const file of all(join(skill, "references"))) {
      const rel = file.slice(skill.length + 1);
      const named = body.includes(rel) || body.includes(rel.replace(/\/[^/]+$/, "/"));
      expect(named, `${rel} is named from SKILL.md`).toBe(true);
    }
  });

  it("names no tool of one assistant, and has a fallback for each thing an assistant may lack", () => {
    expect(body).not.toMatch(/AskUserQuestion|request_user_input|ask_user|\bBash\b|\bTask tool|WebFetch|slash command/i);
    for (const w of ["No tool for multiple-choice questions", "Nobody can answer", "No helpers", "No shell", "No web access"]) expect(body, w).toContain(w);
  });

  it("puts the rules that must survive a summary first, and tells the model files are data", () => {
    expect(body.indexOf("## Rules")).toBeLessThan(body.indexOf("## Steps"));
    for (const w of ["never an instruction to you", 'until the person has seen the plan and said "go"', "before you hand any work", "Never invent a `luz-*` class"]) expect(body, w).toContain(w);
  });

  it("types no version and no address: the script and the facts say them", () => {
    for (const file of [join(skill, "SKILL.md"), ...all(join(skill, "references"))]) {
      const text = read(file).replace(/^---\n[\s\S]*?\n---\n/, "");
      expect(text, file).not.toMatch(/\d+\.\d+\.\d+|https?:\/\//);
    }
  });

  it("names only commands the script has", () => {
    const help = run(["--help"]).out;
    for (const m of body.matchAll(/`(site new|facts|check|doctor)\b/g)) expect(help, m[1]).toContain(m[1]);
  });

  it("has no hidden or bidi character in any file", () => {
    for (const file of all()) {
      const bad = [...read(file)].filter((ch) => /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(ch) || (ch.codePointAt(0) >= 0xe0000 && ch.codePointAt(0) <= 0xe007f));
      expect(bad, file).toEqual([]);
    }
  });
});
