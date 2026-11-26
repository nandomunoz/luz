/**
 * The words of the chat and the words of the script are the same (owner's review, 2026-11-25): `/luz new`, `/luz agents`,
 * `/luz add` and `/luz doctor` run `luz-ai new`, `agents`, `add` and `doctor`, and the one that checks skills and agents is
 * `lint` in both, so that "the check" is only luz-check, the one that reads the pages. The longer forms (`site new`,
 * `agent list`, `agent add`) still work.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(root, "packages/ai/skills/luz");
const SCRIPT = join(SKILL, "scripts/luz.mjs");
const run = (args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const tmp = [];
const dir = () => {
  const d = mkdtempSync(join(tmpdir(), "luz-sub-"));
  tmp.push(d);
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const rows = () => [...readFileSync(join(SKILL, "SKILL.md"), "utf-8").matchAll(/^\| `(\/luz[^`]*)` \| [^|]* \| `([^`]*)` \|/gm)].map((m) => ({ chat: m[1], script: m[2] }));

describe("the chat and the script say the same words", () => {
  it("runs new, agents and add as the long forms do", () => {
    const flags = ["--name", "Acme", "--kind", "blog", "--stack", "vanilla", "--target", join(dir(), "site"), "--dry-run"];
    expect(run(["new", ...flags])).toEqual(run(["site", "new", ...flags]));
    expect(run(["agents"])).toEqual(run(["agent", "list"]));
    const d = dir();
    const add = ["luz-agent-accessibility", "--for", "claude", "--dir", d, "--dry-run"];
    expect(run(["add", ...add])).toEqual(run(["agent", "add", ...add]));
    expect(run(["new", ...flags]).code).toBe(0);
    expect(readdirSync(d)).toEqual([]);
  });

  it("calls the check of skills and agents lint, and no longer check, which is luz-check's word for the pages", () => {
    const d = dir();
    mkdirSync(join(d, ".claude/skills/mine"), { recursive: true });
    expect(run(["lint", "--dir", d]).code).toBe(0);
    expect(run(["lint", "--help"]).out).toMatch(/^luz-ai lint: /);
    const old = run(["check", "--dir", d]);
    expect(old.code).toBe(2);
    expect(old.err).toMatch(/"check" is not a command/);
    expect(run(["--help"]).out).toMatch(/^ {2}lint\b/m);
    expect(run(["--help"]).out).not.toMatch(/^ {2}check\b/m);
  });

  it("has a table in SKILL.md whose script column is the chat word: new, doctor, lint, facts, agents, skills, list, add, remove, help", () => {
    const table = rows();
    expect(table.map((r) => r.chat.replace(/^\/luz ?/, "").split(" ")[0])).toEqual(["", "new", "magic", "doctor", "lint", "facts", "agents", "skills", "list", "add", "remove", "help"]);
    for (const { chat, script } of table) {
      const word = chat.replace(/^\/luz ?/, "").split(" ")[0];
      if (!word || word === "help") continue;
      expect(script.split(" ")[0], chat).toBe(word);
    }
    expect(table[0].script).toBe("new");
    expect(table.at(-1).script).toBe("--help");
  });

  it("names, for Gemini CLI, the subcommands the table has and no other", () => {
    const d = dir();
    const r = run(["init", "--target", "gemini", "--dir", d, "--dry-run", "--json"]);
    expect(r.code, r.err).toBe(0);
    const toml = JSON.parse(r.out).files.map((f) => f.path).join(" ");
    expect(toml).toContain(".gemini/commands/luz.toml");
    const source = readFileSync(SCRIPT, "utf-8");
    const said = /description = "Start a site with LUZ, or run one subcommand: ([^"]*)"/.exec(source)[1];
    const words = rows().map((r) => r.chat.replace(/^\/luz ?/, "").split(" ")[0]).filter(Boolean);
    expect(said).toBe(`${words.slice(0, -1).join(", ")} or ${words.at(-1)}`);
    expect(said).not.toMatch(/\bcheck\b/);
  });
});
