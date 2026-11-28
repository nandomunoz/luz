/**
 * The Release workflow (`.github/workflows/publish.yml`) runs on every push to main. A merge that leaves no pending
 * changeset used to start `ui-full` (the whole suite, about 20 minutes) and `publish` (which waits for the approval
 * of the `release` environment) although every version was on npm, and the run held the `release` concurrency group
 * until someone cancelled it. The job `gate` asks the registry (`scripts/has-unpublished.js`) and the two jobs run only
 * when a version of a published package is not on npm yet.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflow = readFileSync(join(root, ".github/workflows/publish.yml"), "utf-8");

/** The text of a job: from `  <job>:` to the next two-space key. */
function job(id) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((l) => l === `  ${id}:`);
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && (/^ {2}\S/.test(l) || /^\S/.test(l)));
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}
const needsOf = (text) => {
  const m = /^ {4}needs:\s*(.+)$/m.exec(text)?.[1].trim() ?? "";
  return m.startsWith("[") ? m.slice(1, -1).split(",").map((s) => s.trim()) : [m];
};
/** The permissions a job grants: { scope: level }. */
const permissionsOf = (text) => {
  const block = /^ {4}permissions:\n((?: {6}.*\n?)+)/m.exec(text)?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/^ {6}([\w-]+):\s*(\w+)/gm)].map((m) => [m[1], m[2]]));
};
const SKIP = "needs.version.outputs.hasChangesets == 'false'";
const UNPUBLISHED = "needs.gate.outputs.unpublished == 'true'";

describe("publish.yml: the gate", () => {
  it("has a job `gate` that runs after `version`, only when there are no pending changesets", () => {
    const gate = job("gate");
    expect(gate, "a job `gate`").not.toBe("");
    expect(needsOf(gate)).toEqual(["version"]);
    expect(gate).toContain(`    if: ${SKIP}\n`);
  });

  it("reads the registry with `node scripts/has-unpublished.js` and exposes `unpublished`", () => {
    const gate = job("gate");
    expect(gate).toMatch(/^ {4}runs-on: ubuntu-latest$/m);
    expect(gate).toMatch(/run:\s*node scripts\/has-unpublished\.js\s*$/m);
    expect(gate).toMatch(/^ {4}outputs:\n {6}unpublished: \$\{\{ steps\.\w+\.outputs\.unpublished \}\}/m);
    const id = /unpublished: \$\{\{ steps\.(\w+)\.outputs\.unpublished \}\}/.exec(gate)[1];
    expect(gate).toMatch(new RegExp(`^ {8}id: ${id}$`, "m"));
  });

  it("has a short timeout, `contents: read` and nothing else, and does not keep the credentials", () => {
    const gate = job("gate");
    const minutes = Number(/^ {4}timeout-minutes:\s*(\d+)\s*$/m.exec(gate)?.[1]);
    expect(minutes).toBeGreaterThan(0);
    expect(minutes).toBeLessThanOrEqual(5);
    expect(permissionsOf(gate)).toEqual({ contents: "read" });
    expect(gate).toMatch(/actions\/checkout@[0-9a-f]{40}[^\n]*\n\s+with:\n\s+persist-credentials: false/);
    expect(gate).not.toMatch(/environment:|secrets\.|id-token|pnpm|npm (publish|install)/);
  });

  it("takes its Node from the same pinned actions/setup-node as the other jobs", () => {
    const pins = new Set([...workflow.matchAll(/actions\/setup-node@([0-9a-f]{40})/g)].map((m) => m[1]));
    expect(pins.size).toBe(1);
    expect(job("gate")).toMatch(/actions\/setup-node@[0-9a-f]{40} # v\d+\.\d+\.\d+/);
  });

  for (const id of ["ui-full", "publish"]) {
    it(`makes \`${id}\` wait for the gate and run only when a version is unpublished`, () => {
      const text = job(id);
      expect(needsOf(text)).toContain("gate");
      expect(needsOf(text)).toContain("version");
      const cond = /^ {4}if:\s*(.+)$/m.exec(text)?.[1] ?? "";
      expect(cond).toContain(SKIP);
      expect(cond).toContain(UNPUBLISHED);
      expect(cond).toContain("&&");
    });
  }

  it("keeps publish after ui-full, in the `release` environment, with `id-token: write` as the only extra permission", () => {
    const publish = job("publish");
    expect(needsOf(publish)).toContain("ui-full");
    expect(publish).toMatch(/^ {4}environment: release$/m);
    expect(permissionsOf(publish)).toEqual({ contents: "read", "id-token": "write" });
    expect(publish).toMatch(/^ {4}timeout-minutes:\s*25\s*$/m);
  });

  it("grants `id-token: write` to no other job and no write at the top", () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(workflow.match(/id-token:/g)).toHaveLength(1);
    for (const id of ["ci", "gate", "ui-full"]) expect(job(id)).not.toMatch(/id-token/);
  });

  it("keeps the concurrency group `release` and every `uses:` pinned by a 40-hex SHA with its version", () => {
    expect(workflow).toMatch(/^concurrency:\n {2}group: release\n {2}cancel-in-progress: false$/m);
    const remote = [...workflow.matchAll(/^\s*-?\s*uses:\s*(\S+)(.*)$/gm)].filter((m) => !m[1].startsWith("./"));
    expect(remote.length).toBeGreaterThan(0);
    for (const [, ref, rest] of remote) {
      expect(ref).toMatch(/@[0-9a-f]{40}$/);
      expect(rest, ref).toMatch(/^\s+# v\d+\.\d+\.\d+/);
    }
  });
});
