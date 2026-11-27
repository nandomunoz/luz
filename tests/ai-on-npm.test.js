/**
 * @luz-ds/ai is on npm (0.1.0, 2026-11-27): no page says it is not, or that it is coming, and the command of the
 * docs page that installs the skill names the version of the package, which `pnpm release:version` keeps
 * (scripts/release-sync.js writes it, a version is never typed by hand at a release).
 *
 *   apps/docs/pages/ai/index.html and its Spanish translation: no "not on npm yet", and the install command
 *     is `npx @luz-ds/ai@<version of packages/ai> init --target claude`
 *   apps/landing/levels/ai.html and the catalogs of the home (en, es, ar): no "coming soon" and no
 *     "until it is on npm" (the page of the skill has no badge and no section of prompts to use until then)
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { releaseDrift } from "../scripts/release-sync.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");
const version = JSON.parse(read("packages/ai/package.json")).version;

const PAGES = ["apps/docs/pages/ai/index.html", "apps/docs/i18n/es/pages/ai/index.html"];
const NOT_ON_NPM = /not on npm|no está en npm|on npm yet|until it is on npm|coming soon|pronto en npm|próximamente|قريبًا/i;

describe("@luz-ds/ai is on npm", () => {
  it("is released (the page pins a real version, not the placeholder)", () => {
    expect(version).not.toBe("0.0.0");
  });

  for (const page of PAGES) {
    it(`${page} does not say the package is not on npm`, () => {
      expect(read(page)).not.toMatch(NOT_ON_NPM);
    });

    it(`${page} installs the skill with the version of the package, as release-sync writes it`, () => {
      expect(read(page)).toContain(`<code id="code-skill-init">npx @luz-ds/ai@${version} init --target claude</code>`);
    });
  }

  it("has no version in those pages that release-sync would change", () => {
    expect(releaseDrift(root).filter((line) => PAGES.some((page) => line.startsWith(`${page}:`)))).toEqual([]);
  });

  it("has no wording of 'coming soon' or 'until it is on npm' in the page of the skill on the home, in any language", () => {
    const sources = ["apps/landing/levels/ai.html", ...readdirSync(join(root, "apps/landing/i18n")).filter((f) => f.endsWith(".json")).map((f) => `apps/landing/i18n/${f}`)];
    for (const file of sources) expect(read(file), file).not.toMatch(NOT_ON_NPM);
  });
});
