/**
 * @luz-ds/ai as a package to publish (`.claude/plans/luz-ai-skill.md`, phase 5): what it ships, its bin, its build, its
 * release. Nothing here publishes: `npm pack --dry-run` lists the tarball, and the release itself is `changeset` and CI.
 */
import { describe, it, expect, afterAll } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAi, carried } from "../scripts/build-ai.js";
import { PACKAGES, PUBLISHED, TOOLS } from "../scripts/luz-packages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");
const pkg = JSON.parse(read("packages/ai/package.json"));
const tmp = [];
const scratch = () => {
  const d = mkdtempSync(join(tmpdir(), "luz-ai-pkg-"));
  tmp.push(d);
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("the manifest", () => {
  it("is a published tool, with its own version, out of the fixed group and with no CSS", () => {
    expect(TOOLS).toEqual(["check", "ai"]);
    expect(PUBLISHED).toEqual([...PACKAGES, "check", "ai"]);
    expect(PACKAGES).not.toContain("ai");
    expect(JSON.parse(read(".changeset/config.json")).fixed.flat()).not.toContain("@luz-ds/ai");
    expect(pkg.private).toBeUndefined();
    expect(pkg.name).toBe("@luz-ds/ai");
  });

  it("is MIT, for Node 20, public, from this repository, with no dependency of any kind", () => {
    expect(pkg).toMatchObject({ license: "MIT", type: "module", sideEffects: false, publishConfig: { access: "public" }, engines: { node: ">=20" } });
    expect(pkg.repository.directory).toBe("packages/ai");
    for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies", "scripts"]) expect(pkg, field).not.toHaveProperty(field);
  });

  it("has one bin, luz-ai, which is the script of the skill, so `npx @luz-ds/ai` runs it", () => {
    expect(pkg.bin).toEqual({ "luz-ai": "./dist/skills/luz/scripts/luz.mjs" });
  });

  it("ships dist and the licence, and exports the skill's SKILL.md and its own manifest", () => {
    expect(pkg.files).toEqual(["dist", "LICENSE"]);
    expect(pkg.exports).toEqual({ "./luz/SKILL.md": "./dist/skills/luz/SKILL.md", "./package.json": "./package.json" });
    expect(read("packages/ai/LICENSE")).toBe(read("packages/check/LICENSE"));
  });

  it("is released by a changeset that names only it, as a minor, and says what it does not do", () => {
    const sets = readdirSync(join(root, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => read(`.changeset/${f}`));
    const own = sets.find((s) => /"@luz-ds\/ai": minor/.test(s));
    expect(own).toBeTruthy();
    expect(own.match(/^"@luz-ds\/[a-z]+": \w+$/gm)).toEqual(['"@luz-ds/ai": minor']);
    expect(own).toMatch(/no network request/);
    expect(own).toMatch(/symbolic link/);
  });
});

describe("the build", () => {
  const out = join(root, "packages/ai/dist");
  buildAi({ outdir: out });
  const files = () => readdirSync(join(out, "skills/luz"), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(join(out, "skills/luz").length + 1)).sort();

  it("copies what the skill carries and nothing else: no evals, no hidden file, nothing outside its five entries", () => {
    expect(files()).toEqual(carried(root));
    for (const f of files()) {
      expect(["SKILL.md", "agents", "assets", "references", "scripts"], f).toContain(f.split("/")[0]);
      expect(f.split("/").some((s) => s.startsWith(".")), f).toBe(false);
    }
    expect(existsSync(join(out, "skills/luz/evals"))).toBe(false);
  });

  it("gives the bin its executable bit and the same bytes as the source", () => {
    const bin = join(out, "skills/luz/scripts/luz.mjs");
    expect(statSync(bin).mode & 0o111).not.toBe(0);
    expect(readFileSync(bin, "utf-8")).toBe(read("packages/ai/skills/luz/scripts/luz.mjs"));
    expect(readFileSync(bin, "utf-8").startsWith("#!/usr/bin/env node\n")).toBe(true);
  });

  it("writes the same bytes on every build", () => {
    const a = scratch();
    const b = scratch();
    buildAi({ outdir: a });
    buildAi({ outdir: b });
    const all = (d) => readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => [join(e.parentPath, e.name).slice(d.length), readFileSync(join(e.parentPath, e.name), "utf-8")]).sort();
    expect(all(a)).toEqual(all(b));
  });

  it("runs from the copy, through a symbolic link as npm makes for a bin, from any folder", () => {
    const d = scratch();
    const link = join(d, "luz-ai");
    symlinkSync(join(out, "skills/luz/scripts/luz.mjs"), link);
    const r = spawnSync(process.execPath, [link, "facts", "--json"], { cwd: tmpdir(), encoding: "utf-8" });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout).versions.core).toBe(JSON.parse(read("packages/core/package.json")).version);
    const direct = spawnSync(link, ["--help"], { encoding: "utf-8" });
    expect(direct.status, direct.stderr).toBe(0);
    expect(direct.stdout).toContain("init");
  });

  it("is part of `pnpm build`, after the facts are written", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(scripts.build).toMatch(/pnpm luzcheck:build && pnpm ai:build$/);
    expect(scripts["ai:build"]).toBe("node scripts/build-ai-facts.js && node scripts/build-ai.js");
  });
});

describe("the tarball", () => {
  const list = () => {
    const [{ files }] = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: join(root, "packages/ai"), encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }));
    return files.map((f) => f.path).sort();
  };

  it("is exactly packages/ai/pack-files.txt", () => {
    expect(read("packages/ai/pack-files.txt").split("\n").filter(Boolean)).toEqual(list());
  });

  it("holds the licence, the README, the manifest and the skill, and no source, evals, map or hidden file", () => {
    const paths = list();
    for (const f of ["LICENSE", "README.md", "package.json", "dist/skills/luz/SKILL.md", "dist/skills/luz/scripts/luz.mjs", "dist/skills/luz/agents/openai.yaml"]) expect(paths, f).toContain(f);
    for (const p of paths) {
      expect(p.startsWith("skills/") || p.startsWith("src/"), p).toBe(false);
      expect(p.includes("evals"), p).toBe(false);
      expect(p.endsWith(".map"), p).toBe(false);
      expect(p.split("/").some((s) => s.startsWith(".")), p).toBe(false);
    }
  });
});

describe("the README", () => {
  const readme = read("packages/ai/README.md");

  it("says how to install the skill for each assistant, and where each one reads it", () => {
    expect(readme).toContain("npx @luz-ds/ai init --target claude");
    for (const row of ["`claude` | `.claude/skills/luz`", "`codex` | `.agents/skills/luz`", "`gemini` | `.agents/skills/luz`", "`cursor` | `.agents/skills/luz`"]) expect(readme, row).toContain(row);
  });

  it("leads with /luz: the commands of the chat, one row for each subcommand of SKILL.md, and the page that shows them", () => {
    const skillMd = read("packages/ai/skills/luz/SKILL.md");
    const chat = [...skillMd.matchAll(/^\| `(\/luz[^`]*)` \|/gm)].map((m) => m[1]);
    expect(chat.length).toBe(8);
    expect(readme.indexOf("## The commands")).toBeGreaterThan(0);
    expect(readme.indexOf("## The commands")).toBeLessThan(readme.indexOf("## The script"));
    for (const c of chat) expect(readme, c).toContain(`| \`${c}\` |`);
    expect(readme).toContain("/docs/ai/commands/");
    expect(readme).toMatch(/Type `\/luz`/);
  });

  it("names every command of the script, and its exit codes", () => {
    const help = spawnSync(process.execPath, [join(root, "packages/ai/skills/luz/scripts/luz.mjs"), "--help"], { encoding: "utf-8" }).stdout;
    for (const c of ["init", "site new", "agent", "skill", "doctor", "check"]) expect(help, c).toContain(c);
    for (const c of ["`init`", "`site new`", "`agent list`, `agent add`", "`doctor`", "`check`"]) expect(readme, c).toContain(c);
    for (const code of ["| 0 |", "| 1 |", "| 2 |"]) expect(readme, code).toContain(code);
  });

  it("says what it does not do: no network, no program, and what a person still checks", () => {
    expect(readme).toMatch(/no network request/);
    expect(readme).toMatch(/runs no program/);
    expect(readme).toMatch(/alt text or contrast/);
    expect(readme).toMatch(/Codex cannot limit the tools/);
  });

  it("has the block for AI agents, which says the tool at its own version", () => {
    expect(readme).toContain("<!-- luz:ai-agents:start -->");
    expect(readme).toContain(`npx @luz-ds/ai@${pkg.version} --help`);
  });
});
