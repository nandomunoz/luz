/**
 * .github/dependabot.yml: a group's `dependency-type` is `development` or `production`. `dev` is not a value
 * (Dependabot: "did not match one of: production, development"), and an invalid file stops the updates of
 * the whole repository. Text parsing, no YAML dependency (as open-source.test.js).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(join(root, ".github/dependabot.yml"), "utf-8");
const noComments = text.split("\n").filter((l) => !/^\s*#/.test(l));

describe("dependabot.yml", () => {
  it("uses only values of dependency-type that Dependabot accepts", () => {
    const values = noComments.flatMap((l) => {
      const m = l.match(/^\s*dependency-type:\s*"?([^"\s#]+)"?\s*(?:#.*)?$/);
      return m ? [m[1]] : [];
    });
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) expect(["production", "development"], value).toContain(value);
  });

  it("groups the development and the production dependencies", () => {
    const joined = noComments.join("\n");
    expect(joined).toMatch(/dependency-type:\s*"development"/);
    expect(joined).toMatch(/dependency-type:\s*"production"/);
  });
});
