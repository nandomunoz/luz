/**
 * `scripts/publish.js` publishes each package whose version the registry lacks. A package still at its workspace
 * placeholder (0.0.0: its changeset is missing, or the version step did not run) has no release behind it, so the
 * script stops before it contacts the registry and before it publishes anything. The test runs it on a copy of
 * `scripts/` and the manifests of the published packages, so nothing real is reached.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLISHED } from "../scripts/luz-packages.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = [];
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));

function copy(versions) {
  const d = mkdtempSync(join(tmpdir(), "luz-publish-"));
  tmp.push(d);
  cpSync(join(root, "scripts"), join(d, "scripts"), { recursive: true });
  for (const name of PUBLISHED) {
    mkdirSync(join(d, "packages", name), { recursive: true });
    const manifest = JSON.parse(readFileSync(join(root, "packages", name, "package.json"), "utf-8"));
    writeFileSync(join(d, "packages", name, "package.json"), JSON.stringify({ ...manifest, version: versions[name] ?? manifest.version }));
  }
  return d;
}
// An empty PATH: nothing the script might start (npm, pnpm, tar) can be found, so a run that gets past the guard fails differently
const run = (d) => spawnSync(process.execPath, [join(d, "scripts/publish.js"), "--dry-run"], { cwd: d, encoding: "utf-8", env: { PATH: "" } });

describe("scripts/publish.js", () => {
  it("stops, and says which package, when one is at the placeholder 0.0.0, before it reaches for the registry", () => {
    const r = run(copy({ ai: "0.0.0" }));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("@luz-ds/ai is at 0.0.0");
    expect(r.stderr).toContain("Nothing was published");
    expect(r.stdout).not.toMatch(/published|skipping/);
  });

  it("stops for a pre-release placeholder too, and names every package that has one", () => {
    const r = run(copy({ ai: "0.0.0-stage", check: "0.0.0" }));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("@luz-ds/check, @luz-ds/ai");
  });

  it("does not stop for a real version: it goes on to the registry, which an empty PATH makes it fail to reach", () => {
    const r = run(copy({ ai: "0.1.0" }));
    expect(r.stderr).not.toContain("is at 0.0.0");
    expect(r.status).not.toBe(0);
  });
});
