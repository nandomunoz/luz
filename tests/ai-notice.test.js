/**
 * Two owner-approved rules of the luz skill (release plan, task 1a, 2026-11-27):
 *
 *   F-6  the README that luz-readme writes says, in one line at its foot, that an AI drafted it;
 *   F-2  every file the skill writes into a person's project carries the MIT notice of LUZ: a LICENSE inside the folder of
 *        a skill (the skill itself and the six small ones), a header comment in an agent (HTML comment in the Markdown
 *        of Claude Code and Gemini CLI, `#` lines in the TOML of Codex) and in the starter page `site new` writes.
 *        The text is read from the LICENSE the skill carries, which is the one of @luz-ds/ai, never typed twice.
 *   R-06 (legal audit 2026-11-27) the header of an agent is `SPDX-License-Identifier: MIT`, the copyright and a pointer
 *        to the LICENSE of @luz-ds/ai; the starter page has its own, shorter notice, which says that what the person adds
 *        is theirs, so the page is not read as all of it being the copyright holder's.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { carried } from "../scripts/build-ai.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(root, "packages/ai/skills/luz");
const SCRIPT = join(SKILL, "scripts/luz.mjs");
const read = (p) => readFileSync(join(root, p), "utf-8");
const run = (args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const json = (args) => JSON.parse(run([...args, "--json"]).out);
const tmp = [];
const dir = () => {
  const d = mkdtempSync(join(tmpdir(), "luz-notice-"));
  tmp.push(d);
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

const LICENSE = read("packages/ai/LICENSE");
const COPYRIGHT = LICENSE.split("\n").find((l) => l.startsWith("Copyright (c)"));
const SKILLS = json(["skills"]).map((s) => s.name);
const AGENTS = json(["agents"]).map((a) => a.name);
const contentOf = (report, path) => report.files.find((f) => f.path.endsWith(path))?.content;

describe("F-6: the README says an AI drafted it", () => {
  const text = read("packages/ai/skills/luz/assets/skills/luz-readme/SKILL.md");
  const anatomy = read("packages/ai/skills/luz/assets/skills/luz-readme/references/anatomy.md");
  const audit = read("packages/ai/skills/luz/assets/skills/luz-readme/references/audit.md");

  it("is a part of every README, the last line after License, in the README's language", () => {
    expect(text).toMatch(/\| AI notice \|/);
    expect(anatomy).toMatch(/^## 5\. Fixed sections/m);
    expect(anatomy).toMatch(/### AI notice/);
    expect(anatomy).toContain("This README was drafted by an AI assistant (luz-readme).");
    expect(anatomy).toMatch(/last line of the file/i);
    expect(anatomy).toMatch(/README's language/);
  });

  it("is checked by the audit and said in the report", () => {
    expect(audit).toMatch(/AI notice/);
    expect(text).toMatch(/drafted by an AI/);
  });
});

describe("F-2: the MIT notice travels with what the skill writes", () => {
  it("is a LICENSE in the skill, equal to the one of @luz-ds/ai, and carried by the package build", () => {
    expect(read("packages/ai/skills/luz/LICENSE")).toBe(LICENSE);
    expect(carried()).toContain("LICENSE");
  });

  it("puts a LICENSE in the folder of the skill itself (init)", () => {
    const d = dir();
    const report = json(["init", "--target", "claude", "--dir", d, "--dry-run"]);
    expect(contentOf(report, ".claude/skills/luz/LICENSE")).toBe(LICENSE);
  });

  it("puts a LICENSE in the folder of every small skill, in both places", () => {
    for (const name of SKILLS) {
      const report = json(["add", name, "--dir", dir(), "--dry-run"]);
      for (const place of [".agents/skills", ".claude/skills"]) expect(contentOf(report, `${place}/${name}/LICENSE`), `${place}/${name}`).toBe(LICENSE);
    }
  }, 60000);

  it("puts a header comment in every agent, for each assistant, with the front matter still first", () => {
    for (const name of AGENTS) {
      for (const target of ["claude", "gemini", "codex"]) {
        const r = run(["agent", "add", name, "--for", target, "--dir", dir(), "--dry-run", "--json"]);
        if (r.code !== 0) continue; // luz-agent-optimiza has no Gemini file
        const [file] = JSON.parse(r.out).files;
        const lines = file.content.split("\n");
        const head = lines.slice(0, 30).join("\n");
        expect(head, `${name} ${target}`).toContain("SPDX-License-Identifier: MIT");
        expect(head, `${name} ${target}`).toContain(COPYRIGHT);
        expect(head, `${name} ${target}`).toContain("luz-ai");
        expect(head, `${name} ${target}`).toContain("LICENSE of @luz-ds/ai");
        expect(head, `${name} ${target}`).toContain("packages/ai/LICENSE");
        if (target === "codex") expect(lines[0], name).toMatch(/^# /);
        else {
          expect(lines[0], name).toBe("---");
          expect(file.content, name).toMatch(/\n---\n\n<!-- [^>]*SPDX-License-Identifier: MIT[^>]*-->\n\n# /);
        }
      }
    }
  }, 60000);

  it("keeps an agent with its notice unchanged for list and removable by remove", () => {
    const d = dir();
    json(["init", "--target", "claude", "--all", "--dir", d]);
    for (const n of ["luz-agent-ux", ...SKILLS]) {
      const list = json(["list", "--dir", d]);
      expect(list.pieces.find((p) => p.name === n).changed, n).toBe(false);
    }
    run(["remove", "luz-agent-ux", "--dir", d]);
    run(["remove", "luz-readme", "--dir", d]);
    const left = readdirSync(d, { recursive: true }).map(String).filter((f) => /^\.(claude|agents)\/(agents|skills)\/(luz-readme|luz-agent-ux)/.test(f));
    expect(left).toEqual([]);
  }, 60000);

  it("puts a comment after the doctype of the starter page, for plain HTML and Astro, that says the template is MIT and the content the person's", () => {
    for (const stack of ["vanilla", "astro"]) {
      const report = json(["site", "new", "--name", "Acme", "--kind", "landing", "--stack", stack, "--target", dir(), "--dry-run"]);
      const page = report.files[0].content;
      expect(page, stack).toContain(`<!doctype html>\n<!-- Starter template from luz-ai, MIT (${COPYRIGHT}). The content you add is yours. -->\n<html`);
      // the page is not the agents' notice: no SPDX line, no claim over what the person adds
      expect(page, stack).not.toContain("SPDX-License-Identifier");
      expect(page, stack).not.toContain("MIT License");
    }
  });
});
