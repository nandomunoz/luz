/**
 * The first phase of the `luz-start` skill (`.claude/plans/luz-ai-skill.md`, B.9): the one executable of the
 * skill, `packages/ai/skills/luz-start/scripts/luz-start.mjs`, with `doctor` and `check`, and the two files of data
 * beside it. It writes nothing, never asks, never reaches the network and works from any folder, because a skill
 * is run by assistants that disagree on where a script runs.
 */
import { afterAll, describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BY_NEED, buildAiFacts, buildAiFiles } from "../scripts/build-ai-facts.js";

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
    expect(Object.keys(files).length).toBe(11);
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

  it("echoes the name of a file it did not write without hidden characters and in at most 80, so a report is not a way to pass a model text", () => {
    const evil = `A\u202E${"x".repeat(200)}`;
    const r = run(["check", "--json", dir({ ".agents/skills/demo/SKILL.md": `---\nname: ${evil}\ndescription: x\n---\n` })]);
    const messages = JSON.parse(r.out).problems.filter((p) => p.rule !== "chars/hidden").map((p) => p.message);
    expect(messages.length).toBeGreaterThan(0);
    for (const m of messages) {
      expect(m, m).not.toMatch(/\u202E/);
      expect(m.length, m).toBeLessThan(400);
    }
    const bad = run(["check", "--json", dir({ ".agents/skills/demo/SKILL.md": `---\nname: demo\n${"y".repeat(300)}\u202E\n---\n` })]);
    for (const p of JSON.parse(bad.out).problems.filter((x) => x.rule === "yaml/syntax")) expect(p.message).not.toMatch(/\u202E/);
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
    // Sixteen processes: more than the default five seconds when the whole suite runs at once
  }, 60000);

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

  it("escapes the braces of a name, which an Astro page would run as JavaScript", () => {
    for (const stack of ["astro", "vanilla"]) {
      const d = dir();
      expect(run(flags(d, { stack, name: "{process.env.SECRET} {await import('x')}" })).code).toBe(0);
      const page = read(join(d, stack === "astro" ? "src/pages/index.astro" : "index.html"));
      expect(page, stack).not.toMatch(/\{process|\{await/);
      expect(page, stack).toContain("&#123;process.env.SECRET&#125;");
    }
  });

  it("refuses a --target or --dir that is not one plain line or starts with a dash, since it reaches a command an agent runs", () => {
    for (const bad of ["a\nrm -rf ~", "a\u202Eb", "--config=x", "-x"]) {
      expect(run(flags(bad)).code, JSON.stringify(bad)).toBe(2);
      expect(run(["init", "--target", "claude", "--dir", bad, "--dry-run"]).code, JSON.stringify(bad)).toBe(2);
      expect(run(["agent", "add", "luz-ai-auditor", "--for", "claude", "--dir", bad, "--dry-run"]).code, JSON.stringify(bad)).toBe(2);
    }
    expect(run(flags(join(dir(), "a b")), tmpdir()).code).toBe(0);
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
    for (const m of body.matchAll(/`(site new|agent|skill|facts|check|doctor)\b/g)) expect(help, m[1]).toContain(m[1]);
  });

  it("has no hidden or bidi character in any file", () => {
    for (const file of all()) {
      const bad = [...read(file)].filter((ch) => /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(ch) || (ch.codePointAt(0) >= 0xe0000 && ch.codePointAt(0) <= 0xe007f));
      expect(bad, file).toEqual([]);
    }
  });
});

describe("the agents and skills of luz-ai", () => {
  const assets = join(skill, "assets");
  const AGENTS = ["luz-accessibility-auditor", "luz-ai-auditor", "luz-core-web-vitals-optimizer", "luz-seo-geo-specialist"];
  const SKILLS = ["luz-create-landing", "luz-create-video", "luz-readme"];
  const list = (kind) => JSON.parse(run([kind, "list", "--json"]).out);
  const bodyOf = (text) => text.replace(/^---\n[\s\S]*?\n---\n+/, "").trim();
  const add = (d, name, flags = []) => run(["agent", "add", name, "--dir", d, "--json", ...flags]);

  it("are the four agents and three skills of the repository luz-ai, kept here and passing the check", () => {
    expect(list("agent").map((a) => a.name)).toEqual(AGENTS);
    // luz-start adds itself too, so it is the fourth the list names
    expect(list("skill").map((s) => s.name)).toEqual([...SKILLS, "luz-start"]);
    const r = run(["check", "--json", join(assets, "agents"), join(assets, "skills")]);
    expect(JSON.parse(r.out).problems).toEqual([]);
    expect(JSON.parse(r.out).checked.length).toBe(7);
  });

  it("have every agent a startup rule that stops while a field is left, and every field a hint", () => {
    for (const a of AGENTS) {
      const text = read(join(assets, "agents", `${a}.md`));
      expect(text, a).toMatch(/Startup rule/);
      expect(text, a).toMatch(/\[ADAPT: \.\.\.\]/);
      expect(text, a).toMatch(/stop and tell the user which fields are missing/);
    }
    for (const a of list("agent")) expect(a.fields.length, a.name).toBeGreaterThan(5);
  });

  it("have a way in the catalogue for what the person says matters, and every name in it exists", () => {
    const catalogue = read(join(skill, "references/agents.md"));
    for (const [, name] of BY_NEED) expect(AGENTS, name).toContain(name);
    for (const name of [...AGENTS, ...SKILLS]) expect(catalogue, name).toContain(`\`${name}\``);
  });

  it("writes one agent for each assistant: the same instructions, the front matter or keys that assistant reads, each passing check", () => {
    const d = dir();
    const r = add(d, "luz-accessibility-auditor", ["--for", "claude,gemini,codex"]);
    expect(r.code, r.err).toBe(0);
    const source = bodyOf(read(join(assets, "agents/luz-accessibility-auditor.md")));
    const claude = read(join(d, ".claude/agents/luz-accessibility-auditor.md"));
    const gemini = read(join(d, ".gemini/agents/luz-accessibility-auditor.md"));
    const codex = read(join(d, ".codex/agents/luz-accessibility-auditor.toml"));
    expect(bodyOf(claude)).toBe(source);
    expect(bodyOf(gemini)).toBe(source);
    expect(claude).toMatch(/^tools: Read, Grep, Glob$/m);
    expect(gemini).toMatch(/^tools:\n {2}- read_file\n {2}- grep_search\n---/m);
    expect(codex).toMatch(/^name = "luz-accessibility-auditor"$/m);
    expect(codex).toContain(`developer_instructions = ${"'".repeat(3)}\n${source}\n${"'".repeat(3)}\n`);
    const c = run(["check", "--json"], d);
    expect(JSON.parse(c.out).problems).toEqual([]);
    expect(JSON.parse(c.out).checked.length).toBe(3);
  });

  it("writes every agent for the assistants that can have it, and says which cannot", () => {
    const d = dir();
    const rows = list("agent");
    for (const a of rows) expect(add(d, a.name, ["--for", a.for.join(",")]).code, a.name).toBe(0);
    expect(rows.find((a) => a.name === "luz-core-web-vitals-optimizer").for).toEqual(["claude", "codex"]);
    expect(rows.find((a) => a.name === "luz-seo-geo-specialist").for).toEqual(["claude", "gemini", "codex"]);
    expect(JSON.parse(run(["check", "--json"], d).out).problems).toEqual([]);
  });

  it("refuses an agent for Gemini CLI when it needs a tool Gemini CLI has no verified name for, and writes nothing", () => {
    const d = dir();
    const r = add(d, "luz-core-web-vitals-optimizer", ["--for", "claude,gemini"]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/Edit/);
    expect(readdirSync(d)).toEqual([]);
  });

  it("fills the fields it is given, one plain line each, and leaves the rest [ADAPT], the stop rule untouched", () => {
    const d = dir();
    const r = add(d, "luz-accessibility-auditor", ["--for", "claude", "--set", "Target conformance level=WCAG 2.2 AA", "--set", "Site languages=English and Arabic"]);
    const out = JSON.parse(r.out);
    expect(out.filled.map((f) => f.field)).toEqual(["Target conformance level", "Site languages"]);
    expect(out.unfilled).toHaveLength(5);
    const text = read(join(d, ".claude/agents/luz-accessibility-auditor.md"));
    expect(text).toContain("- Target conformance level: WCAG 2.2 AA\n");
    expect(text).toContain("- Site languages: English and Arabic\n");
    expect((text.match(/\[ADAPT: [^\n]*\]\n/g) ?? []).length).toBe(5);
    // Only the filled lines differ from the package's text
    const was = bodyOf(read(join(assets, "agents/luz-accessibility-auditor.md"))).split("\n");
    const now = bodyOf(text).split("\n");
    expect(now.length).toBe(was.length);
    expect(now.filter((l, i) => l !== was[i])).toEqual(["- Target conformance level: WCAG 2.2 AA", "- Site languages: English and Arabic"]);
    expect(text).toMatch(/If it still contains\n?\s*`\[ADAPT: \.\.\.\]`|`\[ADAPT: \.\.\.\]` placeholders, stop/);
  });

  it("fills a field under a parent by Parent/Label", () => {
    const d = dir();
    const r = add(d, "luz-core-web-vitals-optimizer", ["--for", "claude", "--set", "Commands/Build=npm run build"]);
    expect(JSON.parse(r.out).filled).toEqual([{ field: "Commands/Build", value: "npm run build" }]);
    expect(read(join(d, ".claude/agents/luz-core-web-vitals-optimizer.md"))).toContain("  - Build: npm run build\n");
  });

  it("refuses a field that is not the agent's, and a value that is not one plain line", () => {
    const bad = (extra) => add(dir(), "luz-accessibility-auditor", ["--for", "claude", ...extra]);
    expect(bad(["--set", "Nothing=x"]).code).toBe(2);
    expect(bad(["--set", "Audit scope"]).code).toBe(2);
    expect(bad(["--set", "Audit scope=one\ntwo"]).code).toBe(2);
    expect(bad(["--set", "Audit scope=a\u202Eb"]).code).toBe(2);
    expect(bad(["--set", "Audit scope=[ADAPT: more]"]).code).toBe(2);
    expect(bad(["--set", `Audit scope=${"x".repeat(301)}`]).code).toBe(2);
    expect(bad(["--set", `Audit scope=${"x".repeat(300)}`]).code).toBe(0);
  });

  it("asks for what is missing, says which, and never overwrites without --force", () => {
    expect(run(["agent", "add"]).code).toBe(2);
    expect(run(["agent", "add", "luz-nothing", "--for", "claude"]).code).toBe(2);
    const noFor = run(["agent", "add", "luz-ai-auditor"]);
    expect(noFor.code).toBe(2);
    expect(noFor.err).toContain("--for");
    expect(add(dir(), "luz-ai-auditor", ["--for", "cursor"]).code).toBe(2);
    const d = dir({ ".claude/agents/luz-ai-auditor.md": "mine\n" });
    expect(add(d, "luz-ai-auditor", ["--for", "claude"]).code).toBe(2);
    expect(read(join(d, ".claude/agents/luz-ai-auditor.md"))).toBe("mine\n");
    expect(add(d, "luz-ai-auditor", ["--for", "claude", "--force"]).code).toBe(0);
  });

  it("writes nothing with --dry-run and prints the files, the fields filled and the fields left", () => {
    const d = dir();
    const r = run(["agent", "add", "luz-ai-auditor", "--for", "claude,codex", "--dir", d, "--set", "Audit scope=src", "--dry-run"]);
    expect(r.code).toBe(0);
    expect(readdirSync(d)).toEqual([]);
    expect(r.out.split("\n")[0]).toMatch(/would write 2 files .* 1 of 10 fields filled, 9 still \[ADAPT\]/);
    expect(r.out).toContain("Audit scope: src");
    expect(r.out).toContain("the agent stops and asks");
    expect(r.out).toMatch(/note: .*codex/);
    expect(r.out.length).toBeLessThan(3000);
    const json = JSON.parse(run(["agent", "add", "luz-ai-auditor", "--for", "claude", "--dir", d, "--dry-run", "--json"]).out);
    expect(json.files[0].content).toContain("[ADAPT:");
  });

  it("adds a skill as the same folder in .agents/skills and .claude/skills, and never overwrites without --force", () => {
    const d = dir();
    const r = run(["skill", "add", "luz-readme", "--dir", d, "--json"]);
    expect(r.code, r.err).toBe(0);
    const rel = (base) => readdirSync(join(d, base, "luz-readme"), { recursive: true }).sort();
    expect(rel(".agents/skills")).toEqual(rel(".claude/skills"));
    expect(rel(".agents/skills")).toEqual(expect.arrayContaining(["SKILL.md", "references", "references/anatomy.md"]));
    for (const f of rel(".agents/skills").filter((x) => x.endsWith(".md"))) expect(read(join(d, ".agents/skills/luz-readme", f))).toBe(read(join(d, ".claude/skills/luz-readme", f)));
    expect(JSON.parse(run(["check", "--json"], d).out).problems).toEqual([]);
    expect(run(["skill", "add", "luz-readme", "--dir", d]).code).toBe(2);
    expect(run(["skill", "add", "luz-readme", "--dir", d, "--force"]).code).toBe(0);
    expect(run(["skill", "add", "luz-nothing", "--dir", d]).code).toBe(2);
    expect(run(["skill", "add"]).code).toBe(2);
  });

  it("never writes through a symbolic link, which a cloned repository may have at .claude", () => {
    const outside = dir();
    const d = dir();
    symlinkSync(outside, join(d, ".claude"));
    const r = add(d, "luz-ai-auditor", ["--for", "claude"]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/symbolic link/);
    expect(readdirSync(outside)).toEqual([]);
    const dangling = dir();
    mkdirSync(join(dangling, ".claude/agents"), { recursive: true });
    symlinkSync(join(outside, "nothing.md"), join(dangling, ".claude/agents/luz-ai-auditor.md"));
    expect(add(dangling, "luz-ai-auditor", ["--for", "claude", "--force"]).code).toBe(2);
    expect(readdirSync(outside)).toEqual([]);
  });

  it("does not read a field called __proto__ or constructor as one", () => {
    expect(add(dir(), "luz-ai-auditor", ["--for", "claude", "--set", "__proto__=x"]).code).toBe(2);
    expect(add(dir(), "luz-ai-auditor", ["--for", "claude", "--set", "constructor=x"]).code).toBe(2);
  });

  it("takes only list or add after the noun", () => {
    expect(run(["agent"]).code).toBe(2);
    expect(run(["agent", "remove", "x"]).code).toBe(2);
    expect(run(["skill", "list", "extra"]).code).toBe(2);
  });
});

describe("check: the formats of Gemini CLI and Codex", () => {
  const gemini = (front, name = "demo") => dir({ [`.gemini/agents/${name}.md`]: `---\n${front}\n---\n\nBody.\n` });
  const codex = (text, name = "demo") => dir({ [`.codex/agents/${name}.toml`]: text });
  const TRIPLE = "'".repeat(3);
  const GOOD_TOML = `name = "demo"\ndescription = "Does a thing."\ndeveloper_instructions = ${TRIPLE}\nLine one.\nLine two.\n${TRIPLE}\n`;

  it("reads a list of tools in a Gemini CLI agent, and fails a string or a field that is not Gemini's", () => {
    expect(run(["check", "--json", gemini("name: demo\ndescription: x\ntools:\n  - read_file\n  - grep_search\nmax_turns: 5")]).code).toBe(0);
    expect(rules(run(["check", "--json", gemini("name: demo\ndescription: x\ntools: read_file")]))).toContain("field/type");
    expect(rules(run(["check", "--json", gemini("name: demo\ndescription: x\nmax-turns: 5")]))).toContain("field/unknown");
    expect(rules(run(["check", "--json", gemini("name: demo\ndescription: x\ntools:\n  - a\n  - b: c")]))).toContain("yaml/plain-scalar");
  });

  it("takes a name of its own in a Gemini CLI agent, since Gemini CLI does not say it is the file's", () => {
    expect(run(["check", "--json", gemini("name: other_name\ndescription: x")]).code).toBe(0);
    expect(rules(run(["check", "--json", gemini("name: Bad Name\ndescription: x")]))).toContain("name/pattern");
  });

  it("reads a Codex agent file and needs name, description and developer_instructions", () => {
    expect(run(["check", "--json", codex(GOOD_TOML)]).code).toBe(0);
    expect(rules(run(["check", "--json", codex(GOOD_TOML.replace(/description = .*\n/, ""))]))).toContain("description/missing");
    expect(rules(run(["check", "--json", codex(`name = "demo"\ndescription = "x"\n`)]))).toContain("instructions/missing");
  });

  it("fails a Codex key that is not one of its keys, a table that is not one, and a string that is not closed", () => {
    expect(rules(run(["check", "--json", codex(`${GOOD_TOML}sandbox_mode = "read-only"\n`)]))).toContain("field/unknown");
    expect(rules(run(["check", "--json", codex(`${GOOD_TOML}[mystery]\nx = 1\n`)]))).toContain("field/unknown");
    expect(run(["check", "--json", codex(`${GOOD_TOML}[features]\nshell_tool = false\n`)]).code).toBe(0);
    expect(rules(run(["check", "--json", codex(`name = "demo"\ndescription = "x"\ndeveloper_instructions = ${TRIPLE}\nnever closed\n`)]))).toContain("toml/syntax");
    expect(rules(run(["check", "--json", codex(`name = demo\n${GOOD_TOML}`)]))).toContain("toml/syntax");
  });

  it("fails text after the closing of a multi-line literal string", () => {
    const closed = (tail) => GOOD_TOML.slice(0, GOOD_TOML.lastIndexOf(TRIPLE)) + TRIPLE + tail + "\n";
    expect(rules(run(["check", "--json", codex(closed(" extra"))]))).toContain("toml/syntax");
    expect(run(["check", "--json", codex(closed(" # a comment"))]).code).toBe(0);
  });

  it("fails a hidden character in a Codex file", () => {
    expect(rules(run(["check", "--json", codex(GOOD_TOML.replace("Line one.", "Line \u202E one."))]))).toContain("chars/hidden");
  });

  it("lets a reference point to another that SKILL.md names, and fails one that it does not", () => {
    const base = ".agents/skills/demo";
    const ok = dir({ [`${base}/SKILL.md`]: `${GOOD}\nRead [a](references/a.md) and [b](references/b.md).\n`, [`${base}/references/a.md`]: "See [b](b.md).\n", [`${base}/references/b.md`]: "b\n" });
    expect(run(["check", "--json", ok]).code).toBe(0);
  });

  it("looks in .codex/agents when no path is given", () => {
    expect(JSON.parse(run(["check", "--json"], codex(GOOD_TOML)).out).checked).toEqual([".codex/agents/demo.toml"]);
  });
});

describe("portability", () => {
  const openai = join(skill, "agents/openai.yaml");

  it("gives Codex its own file for the skill, which every other assistant ignores, and the check reads it", () => {
    const text = read(openai);
    expect(text).toMatch(/^interface:/m);
    expect(text).toMatch(/^policy:\n {2}allow_implicit_invocation: true$/m);
    expect(run(["check", "--json", skill]).code).toBe(0);
  });

  it("fails an agents/openai.yaml with a key Codex does not read, a flag that is not true or false, and a value that is a comment", () => {
    const withOpenai = (yaml) => dir({ ".agents/skills/demo/SKILL.md": GOOD, ".agents/skills/demo/agents/openai.yaml": yaml });
    const bad = (yaml) => JSON.parse(run(["check", "--json", withOpenai(yaml)]).out).problems;
    expect(bad("interface:\n  display_name: \"Demo\"\n").length).toBe(0);
    expect(bad("interface:\n  title: \"Demo\"\n").map((p) => p.rule)).toContain("field/unknown");
    expect(bad("policy:\n  allow_implicit_invocation: maybe\n").map((p) => p.rule)).toContain("field/type");
    expect(bad("policy:\n  implicit: true\n").map((p) => p.rule)).toContain("field/unknown");
    expect(bad("mystery: 1\n").map((p) => p.rule)).toContain("field/unknown");
    expect(bad("interface:\n  brand_color: #3B82F6\n").map((p) => p.rule)).toContain("yaml/plain-scalar");
    expect(bad("interface:\n  brand_color: \"#3B82F6\"\n")).toEqual([]);
    const p = bad("interface:\n  title: x\n")[0];
    expect(p.file).toMatch(/agents\/openai\.yaml$/);
    // The line of the map the key is in
    expect(p.line).toBe(1);
  });

  it("installs itself, as the same folder in .agents/skills and .claude/skills, with the evals left behind", () => {
    const d = dir();
    const r = run(["skill", "add", "luz-start", "--dir", d, "--json"]);
    expect(r.code, r.err).toBe(0);
    const tree = (base) => readdirSync(join(d, base, "luz-start"), { recursive: true }).sort();
    expect(tree(".agents/skills")).toEqual(tree(".claude/skills"));
    expect(tree(".agents/skills")).toEqual(expect.arrayContaining(["SKILL.md", "agents/openai.yaml", "scripts/luz-start.mjs", "assets/agents/luz-ai-auditor.md", "references/levels.md"]));
    expect(tree(".agents/skills").some((f) => f.startsWith("evals"))).toBe(false);
    expect(read(join(d, ".agents/skills/luz-start/SKILL.md"))).toBe(read(join(skill, "SKILL.md")));
  });

  it("copies only what the skill carries, and no file that starts with a dot, whatever else is in its folder", () => {
    const copy = join(dir(), "luz-start");
    cpSync(skill, copy, { recursive: true });
    for (const [path, text] of Object.entries({ ".env": "SECRET=1", "notes.txt": "x", "node_modules/pkg/index.js": "x", "references/.DS_Store": "x", ".git/config": "x" })) {
      mkdirSync(dirname(join(copy, path)), { recursive: true });
      writeFileSync(join(copy, path), text);
    }
    const d = dir();
    const r = spawnSync(process.execPath, [join(copy, "scripts/luz-start.mjs"), "skill", "add", "luz-start", "--dir", d], { encoding: "utf-8" });
    expect(r.status, r.stderr).toBe(0);
    const files = readdirSync(join(d, ".claude/skills/luz-start"), { recursive: true });
    for (const bad of [".env", "notes.txt", "node_modules", ".git", "references/.DS_Store"]) expect(files.some((f) => f === bad || f.startsWith(`${bad}/`)), bad).toBe(false);
    expect(files).toEqual(expect.arrayContaining(["SKILL.md", "scripts/luz-start.mjs"]));
  });

  it("works from the copy it installed: from any folder, with nothing of the repository", () => {
    const d = dir();
    run(["skill", "add", "luz-start", "--dir", d]);
    const copy = join(d, ".claude/skills/luz-start/scripts/luz-start.mjs");
    const go = (args, cwd) => spawnSync(process.execPath, [copy, ...args], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    expect(go(["doctor", "--dir", d], tmpdir()).status).toBe(0);
    const site = join(d, "site");
    expect(go(["site", "new", "--name", "X", "--kind", "docs", "--stack", "vanilla", "--target", site], tmpdir()).status).toBe(0);
    expect(existsSync(join(site, "index.html"))).toBe(true);
    const agent = go(["agent", "add", "luz-ai-auditor", "--for", "claude,codex", "--dir", d], tmpdir());
    expect(agent.status, agent.stderr).toBe(0);
    expect(existsSync(join(d, ".codex/agents/luz-ai-auditor.toml"))).toBe(true);
  });

  it("warns, and does not fail, when the two copies of a skill have drifted apart, and says how to put them right", () => {
    const d = dir();
    run(["skill", "add", "luz-readme", "--dir", d]);
    expect(JSON.parse(run(["doctor", "--json", "--dir", d]).out).warnings).toEqual([]);
    writeFileSync(join(d, ".claude/skills/luz-readme/SKILL.md"), `${read(join(d, ".claude/skills/luz-readme/SKILL.md"))}\nextra\n`);
    const r = run(["doctor", "--json", "--dir", d]);
    expect(r.code).toBe(0);
    const warning = JSON.parse(r.out).warnings.join(" ");
    expect(warning).toMatch(/luz-readme is not the same in \.agents\/skills and \.claude\/skills/);
    expect(warning).toContain("skill add luz-readme --force");
  });

  it("writes the skill to .claude/skills because Claude Code does not document .agents/skills", () => {
    const d = dir();
    run(["skill", "add", "luz-readme", "--dir", d]);
    expect(existsSync(join(d, ".claude/skills/luz-readme/SKILL.md"))).toBe(true);
    expect(existsSync(join(d, ".agents/skills/luz-readme/SKILL.md"))).toBe(true);
  });
});

describe("the title of luz-start: the mark and the word LUZ in ASCII (owner, 2026-11-24)", () => {
  const SCRIPT_FILE = join(root, "packages/ai/skills/luz-start/scripts/luz-start.mjs");
  const source = readFileSync(SCRIPT_FILE, "utf-8");
  const banner = JSON.parse(/^const BANNER = (\[[\s\S]*?\]);$/m.exec(source)?.[1] ?? "[]");
  /** What main() writes to stdout, as if stdout were a terminal or not. */
  const say = async (argv, tty) => {
    const { main } = await import(SCRIPT_FILE);
    const chunks = [];
    const write = process.stdout.write;
    process.stdout.write = (chunk) => chunks.push(String(chunk)) > 0;
    try {
      main(argv, { tty });
    } finally {
      process.stdout.write = write;
    }
    return chunks.join("");
  };

  it("is plain JSON in the script, seven lines of ASCII, none past 80 columns, and spells LUZ in capitals with serifs", () => {
    expect(banner).toHaveLength(7);
    for (const line of banner) {
      expect(line).toMatch(/^[\x20-\x7e]*$/);
      expect(line.length).toBeLessThanOrEqual(80);
    }
    // the serifs of L and U: a foot under the L, the ticks on top of each stem
    expect(banner[1]).toMatch(/`\| \|'.*`\| \|'.*`\| \|'/);
    expect(banner[6]).toMatch(/_\|_+\|/);
  });

  it("is printed by --help and by init in a terminal, first", async () => {
    const dir = mkdtempSync(join(tmpdir(), "luz-banner-"));
    try {
      expect(await say(["--help"], true)).toMatch(new RegExp(`^${banner.join("\n").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\n\nluz-start: `));
      expect((await say(["init", "--target", "claude", "--dir", dir, "--dry-run"], true)).startsWith(`${banner.join("\n")}\n\ninit: would write `)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is never printed to a pipe or in JSON, so an assistant reads the report first", async () => {
    const dir = mkdtempSync(join(tmpdir(), "luz-banner-"));
    try {
      expect(await say(["--help"], false)).toMatch(/^luz-start: /);
      expect(await say(["init", "--target", "claude", "--dir", dir, "--dry-run"], false)).toMatch(/^init: would write /);
      expect(await say(["init", "--target", "claude", "--dir", dir, "--dry-run", "--json"], true)).toMatch(/^\{/);
      const piped = spawnSync(process.execPath, [SCRIPT_FILE, "--help"], { encoding: "utf-8" });
      expect(piped.stdout).toMatch(/^luz-start: /);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
