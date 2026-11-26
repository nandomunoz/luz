/**
 * Install, list and uninstall (owner, 2026-11-26): `init` puts the minimum (only /luz), `init --all` puts everything (the skill,
 * the agents and the small skills), `add <name>` one piece at a time, `list` says what the project has and what it does not,
 * and `remove <name>` takes one piece away. The chat says the same words (`/luz list`, `/luz remove <name>`).
 *
 * `remove` deletes only files of luz-ai, by name: a file of the person's in the same folder stays, and nothing is followed
 * through a symbolic link or written outside the project.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(root, "packages/ai/skills/luz");
const SCRIPT = join(SKILL, "scripts/luz.mjs");
const run = (args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const json = (args) => JSON.parse(run([...args, "--json"]).out);
const tmp = [];
const dir = () => {
  const d = mkdtempSync(join(tmpdir(), "luz-install-"));
  tmp.push(d);
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const AGENTS = json(["agents"]).map((a) => a.name);
const SKILLS = json(["skills"]).map((s) => s.name);
const paths = (report, d) => report.files.map((f) => relative(d, f.path)).sort();
const piece = (report, name) => report.pieces.find((p) => p.name === name);

describe("init: the minimum and everything", () => {
  it("writes only /luz without --all", () => {
    const d = dir();
    const files = paths(json(["init", "--target", "claude", "--dir", d, "--dry-run"]), d);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.startsWith(".claude/skills/luz/"))).toBe(true);
  });

  it("with --all writes the skill, every agent and every small skill, for Claude Code", () => {
    const d = dir();
    const files = paths(json(["init", "--target", "claude", "--all", "--dir", d, "--dry-run"]), d);
    expect(files).toContain(".claude/skills/luz/SKILL.md");
    for (const a of AGENTS) expect(files, a).toContain(`.claude/agents/${a}.md`);
    for (const s of SKILLS) for (const place of [".agents/skills", ".claude/skills"]) expect(files, s).toContain(`${place}/${s}/SKILL.md`);
  });

  it("writes the agents for Codex as TOML and leaves the one Gemini CLI cannot limit, saying so", () => {
    const d = dir();
    const codex = paths(json(["init", "--target", "codex", "--all", "--dir", d, "--dry-run"]), d);
    for (const a of AGENTS) expect(codex, a).toContain(`.codex/agents/${a}.toml`);
    const gemini = json(["init", "--target", "gemini", "--all", "--dir", d, "--dry-run"]);
    const files = paths(gemini, d);
    expect(files).toContain(".gemini/agents/luz-agent-accessibility.md");
    expect(files).not.toContain(".gemini/agents/luz-agent-optimiza.md");
    expect(gemini.notes.join("\n")).toMatch(/luz-agent-optimiza.*not written for gemini/);
  });

  it("writes no agent for Cursor or AGENTS.md, which have no agent file, and says so", () => {
    const d = dir();
    const cursor = json(["init", "--target", "cursor", "--all", "--dir", d, "--dry-run"]);
    expect(paths(cursor, d).some((f) => /^\.(claude|gemini|codex)\/agents\//.test(f))).toBe(false);
    expect(paths(cursor, d)).toContain(`.agents/skills/${SKILLS[0]}/SKILL.md`);
    expect(cursor.notes.join("\n")).toMatch(/cursor has no agent file/);
  });

  it("writes the agents with their fields still [ADAPT], so they stop until filled", () => {
    const d = dir();
    expect(run(["init", "--target", "claude", "--all", "--dir", d]).code).toBe(0);
    expect(readFileSync(join(d, ".claude/agents/luz-agent-ux.md"), "utf-8")).toMatch(/\[ADAPT:/);
  });

  it("refuses --all outside init, and never overwrites without --force", () => {
    const d = dir();
    expect(run(["add", "luz-readme", "--all", "--dir", d]).code).toBe(2);
    expect(run(["init", "--target", "claude", "--all", "--dir", d]).code).toBe(0);
    const again = run(["init", "--target", "claude", "--all", "--dir", d]);
    expect(again.code).toBe(2);
    expect(again.err).toMatch(/exists: nothing was written/);
    expect(run(["init", "--target", "claude", "--all", "--dir", d, "--force"]).code).toBe(0);
  });
});

describe("list: what the project has and what it does not", () => {
  it("says every piece is not installed in an empty project, and reads nothing else", () => {
    const d = dir();
    const report = json(["list", "--dir", d]);
    expect(report.pieces.map((p) => p.name).sort()).toEqual(["luz", ...AGENTS, ...SKILLS].sort());
    expect(report.pieces.every((p) => p.places.length === 0)).toBe(true);
    expect(readdirSync(d)).toEqual([]);
    expect(run(["list", "--dir", d]).out).toMatch(/not installed/);
  });

  it("finds a piece added, in the places it was written, and tells a piece the person changed", () => {
    const d = dir();
    expect(run(["add", "luz-agent-ux", "--for", "claude,codex", "--dir", d]).code).toBe(0);
    expect(run(["add", SKILLS[0], "--dir", d]).code).toBe(0);
    let report = json(["list", "--dir", d]);
    expect(piece(report, "luz-agent-ux").places.sort()).toEqual([".claude/agents/luz-agent-ux.md", ".codex/agents/luz-agent-ux.toml"]);
    expect(piece(report, SKILLS[0]).places.sort()).toEqual([`.agents/skills/${SKILLS[0]}`, `.claude/skills/${SKILLS[0]}`]);
    expect(piece(report, SKILLS[0]).changed).toBe(false);
    expect(piece(report, "luz-agent-accessibility").places).toEqual([]);
    writeFileSync(join(d, `.claude/skills/${SKILLS[0]}/SKILL.md`), "edited\n");
    report = json(["list", "--dir", d]);
    expect(piece(report, SKILLS[0]).changed).toBe(true);
  });

  it("finds /luz itself after init", () => {
    const d = dir();
    run(["init", "--target", "claude", "--dir", d]);
    expect(piece(json(["list", "--dir", d]), "luz").places).toEqual([".claude/skills/luz"]);
  });
});

describe("remove: one piece away, and only what luz-ai wrote", () => {
  it("removes an agent from every place and a skill from both folders", () => {
    const d = dir();
    run(["init", "--target", "claude,codex", "--all", "--dir", d]);
    expect(run(["remove", "luz-agent-ux", "--dir", d]).code).toBe(0);
    expect(existsSync(join(d, ".claude/agents/luz-agent-ux.md"))).toBe(false);
    expect(existsSync(join(d, ".codex/agents/luz-agent-ux.toml"))).toBe(false);
    expect(existsSync(join(d, ".claude/agents/luz-agent-legal.md"))).toBe(true);
    expect(run(["remove", SKILLS[0], "--dir", d]).code).toBe(0);
    for (const place of [".agents/skills", ".claude/skills"]) expect(existsSync(join(d, place, SKILLS[0]))).toBe(false);
    expect(existsSync(join(d, ".claude/skills", SKILLS[1], "SKILL.md"))).toBe(true);
    expect(piece(json(["list", "--dir", d]), SKILLS[0]).places).toEqual([]);
  });

  it("leaves a file of the person's in a skill folder, and the folder with it", () => {
    const d = dir();
    run(["add", SKILLS[0], "--dir", d]);
    writeFileSync(join(d, `.claude/skills/${SKILLS[0]}/MY-NOTES.md`), "mine\n");
    expect(run(["remove", SKILLS[0], "--dir", d]).code).toBe(0);
    expect(readFileSync(join(d, `.claude/skills/${SKILLS[0]}/MY-NOTES.md`), "utf-8")).toBe("mine\n");
    expect(existsSync(join(d, `.claude/skills/${SKILLS[0]}/SKILL.md`))).toBe(false);
  });

  it("does not delete an agent file that is not luz-ai's, whatever its name", () => {
    const d = dir();
    mkdirSync(join(d, ".claude/agents"), { recursive: true });
    writeFileSync(join(d, ".claude/agents/luz-agent-ux.md"), "---\nname: something-else\ndescription: mine\n---\nmy own agent\n");
    const r = run(["remove", "luz-agent-ux", "--dir", d]);
    expect(r.code).toBe(0);
    expect(existsSync(join(d, ".claude/agents/luz-agent-ux.md"))).toBe(true);
    expect(r.out).toMatch(/not luz-ai's/);
  });

  it("with --dry-run shows what it would delete and deletes nothing", () => {
    const d = dir();
    run(["add", "luz-agent-ux", "--for", "claude", "--dir", d]);
    const r = json(["remove", "luz-agent-ux", "--dir", d, "--dry-run"]);
    expect(r.dryRun).toBe(true);
    expect(paths(r, d)).toEqual([".claude/agents/luz-agent-ux.md"]);
    expect(existsSync(join(d, ".claude/agents/luz-agent-ux.md"))).toBe(true);
  });

  it("says a piece is not installed and exits 0, and refuses an unknown name, luz itself and a missing name", () => {
    const d = dir();
    const none = run(["remove", "luz-agent-ux", "--dir", d]);
    expect(none.code).toBe(0);
    expect(none.out).toMatch(/luz-agent-ux is not installed/);
    const unknown = run(["remove", "nope", "--dir", d]);
    expect(unknown.code).toBe(2);
    expect(unknown.err).toMatch(/"nope" is not an agent or a skill/);
    expect(run(["remove", "luz", "--dir", d]).code).toBe(2);
    expect(run(["remove", "--dir", d]).code).toBe(2);
  });

  it("does not follow a symbolic link out of the project", () => {
    const d = dir();
    const outside = dir();
    writeFileSync(join(outside, "luz-agent-ux.md"), "---\nname: luz-agent-ux\n---\nkeep\n");
    mkdirSync(join(d, ".claude"), { recursive: true });
    symlinkSync(outside, join(d, ".claude/agents"));
    const r = run(["remove", "luz-agent-ux", "--dir", d]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/symbolic link/);
    expect(existsSync(join(outside, "luz-agent-ux.md"))).toBe(true);
  });
});

describe("the words of the chat", () => {
  it("has list and remove in the help of the script, and --all in the help of init", () => {
    expect(run(["--help"]).out).toMatch(/^ {2}list\b/m);
    expect(run(["--help"]).out).toMatch(/^ {2}remove\b/m);
    expect(run(["init", "--help"]).out).toMatch(/--all/);
    expect(run(["list", "--help"]).out).toMatch(/^luz-ai list: /);
    expect(run(["remove", "--help"]).out).toMatch(/^luz-ai remove: /);
  });

  it("has list as a command that only reads and remove as one that writes, in SKILL.md", () => {
    const text = readFileSync(join(SKILL, "SKILL.md"), "utf-8");
    expect(text).toMatch(/^\| `\/luz list` \| [^|]* \| `list` \| no \|/m);
    expect(text).toMatch(/^\| `\/luz remove <name>` \| [^|]* \| `remove` \| yes, after "go" \|/m);
    expect(text).toMatch(/A subcommand that only reads \(`doctor`, `lint`, `facts`, `agents`, `skills`, `list`, `help`\)/);
    expect(text).toMatch(/`\/luz --help` is `\/luz help`/);
  });
});
