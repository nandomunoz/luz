/**
 * SECURITY.md tells a maintainer how a package reaches npm, and the 2026-11-27 release taught three things the
 * text must say, so the next release does not learn them again:
 *
 *   - a new package is created with `npx npm@latest stage publish --tag stage --access public` from a folder whose
 *     placeholder is 0.0.1-stage (npm makes the package with its own public 0.0.0-stage placeholder), because npm
 *     now reserves 0.0.0-stage and a direct `npm publish` of it is refused (E403); the trusted publisher is then
 *     set on npmjs.com (owner, repo, publish.yml, the `release` environment, "Allow npm publish"), and a new
 *     configuration must finish its first publish within 2 days or it expires;
 *   - renaming the GitHub account or organisation breaks the trusted publisher of EVERY package (E404 on the PUT
 *     of the first package), so each one is recreated;
 *   - a publish job left "waiting" holds the `release` concurrency group and blocks every later Release run.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(join(root, "SECURITY.md"), "utf-8").replace(/\s+/g, " ");

describe("SECURITY.md: publishing a package", () => {
  it("creates a new package with `npm stage publish` and a 0.0.1-stage placeholder, not by hand at 0.0.0-stage", () => {
    expect(text).toContain("npx npm@latest stage publish --tag stage --access public");
    expect(text).toContain("0.0.1-stage");
    expect(text).not.toMatch(/by hand with a placeholder version that has no code \(`0\.0\.0-stage`\)/);
    expect(text).toMatch(/reserves?[^.]*0\.0\.0-stage/i);
    expect(text).toContain("E403");
    expect(text).toMatch(/npm 11\.15/);
    expect(text).toMatch(/Node 22\.22\.2/);
  });

  it("names every field of the trusted publisher and that a new configuration expires in 2 days", () => {
    expect(text).toContain("publish.yml");
    expect(text).toMatch(/environment `release`|`release` environment/);
    expect(text).toContain("Allow npm publish");
    expect(text).toMatch(/first publish within 2 days/);
  });

  it("says the trusted publishers of every package are recreated if the account or organisation is renamed", () => {
    expect(text).toMatch(/renamed[^.]*trusted publisher of every package[^.]*recreated/i);
    expect(text).toContain("E404");
  });

  it("says a publish job left waiting blocks every later Release run, so it is approved or cancelled the same day", () => {
    expect(text).toMatch(/waiting[^.]*`release` concurrency group[^.]*blocks every later Release run/);
    expect(text).toMatch(/approve or cancel it the same day/);
  });
});
