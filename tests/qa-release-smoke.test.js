/**
 * The consumer smoke test is a step of the release QA (owner, 2026-11-27): `pnpm smoke:consumer` packs the tarballs and runs
 * the `luz-ai` bin (and the other bins) from them, so a broken tarball fails `pnpm check:all` before the Version PR, not
 * the publish workflow. It runs after the build (it needs `dist/`) and after the tarball contents check.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");

describe("qa-release runs the consumer smoke test", () => {
  const qa = read("scripts/qa-release.js");
  const at = (needle) => qa.indexOf(needle);

  it("has a step that runs `pnpm smoke:consumer`", () => {
    expect(qa).toMatch(/\[pnpm, "smoke:consumer"\]/);
    expect(JSON.parse(read("package.json")).scripts["smoke:consumer"]).toBe("node scripts/smoke-consumer.js");
  });

  it("runs it after the build and after the tarball contents check", () => {
    expect(at('[pnpm, "smoke:consumer"]')).toBeGreaterThan(at('[pnpm, "pages:build"]'));
    expect(at('[pnpm, "smoke:consumer"]')).toBeGreaterThan(at('[pnpm, "check:pack"]'));
  });

  it("is not a step of the publish workflow", () => {
    expect(read(".github/workflows/publish.yml")).not.toMatch(/smoke:consumer/);
  });
});
