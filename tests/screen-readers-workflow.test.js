/**
 * SR-6, automated where a machine can: NVDA + Firefox, NVDA + Chrome, VoiceOver + WebKit and
 * Orca + Firefox are driven from CI by Guidepup against the built site
 * (`.github/workflows/screen-readers.yml`, `tests/screen-readers/`). Orca + Firefox by hand
 * stays the minimum of a release, and VoiceOver + Safari and TalkBack + Chrome stay by hand.
 *
 * The rule says it, and the workflow keeps to it:
 *   - on a schedule, by hand and after a merge to main, never on a pull request (it is a
 *     report, not a required check) and never `pull_request_target`;
 *   - one job per system (Linux, Windows, macOS), over the site that `pnpm pages:build` built;
 *   - the Guidepup packages are pinned to an exact version and locked, in a package of their
 *     own outside the workspace, watched by Dependabot.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const WORKFLOW = ".github/workflows/screen-readers.yml";
const DIR = "tests/screen-readers";

describe(`${WORKFLOW}`, () => {
  const text = () => read(WORKFLOW);

  it("exists", () => {
    expect(existsSync(resolve(root, WORKFLOW))).toBe(true);
  });

  it("runs on a schedule, by hand and after a merge to main, and never on a pull request", () => {
    const on = text().slice(text().indexOf("\non:"), text().indexOf("\npermissions:"));
    expect(on).toMatch(/schedule:/);
    expect(on).toMatch(/workflow_dispatch:/);
    expect(on).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(on).not.toMatch(/pull_request/);
  });

  it("has a read-only token", () => {
    expect(text()).toMatch(/^permissions:\s*\n\s+contents:\s*read\s*$/m);
  });

  it("builds the site once on Linux and reads it on Linux, Windows and macOS", () => {
    expect(text()).toContain("pnpm pages:build");
    for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) expect(text()).toContain(os);
    expect(text()).toMatch(/upload-artifact@/);
    expect(text()).toMatch(/download-artifact@/);
  });

  it("installs the locked packages of the folder with `npm ci`, and the readers with Guidepup's setup", () => {
    expect(text()).toContain("npm ci");
    expect(text()).toContain("@guidepup/setup");
  });

  it("writes the spoken phrases to the summary and keeps them as an artifact", () => {
    expect(text()).toMatch(/upload-artifact@[0-9a-f]{40}[\s\S]*spoken|spoken[\s\S]*upload-artifact@/);
  });
});

describe(`${DIR}/`, () => {
  it("is a package of its own, outside the workspace", () => {
    const pkg = JSON.parse(read(`${DIR}/package.json`));
    expect(pkg.private).toBe(true);
    expect(read("pnpm-workspace.yaml")).not.toContain("tests");
    expect(existsSync(resolve(root, `${DIR}/package-lock.json`))).toBe(true);
  });

  it("pins every dependency to an exact version", () => {
    const pkg = JSON.parse(read(`${DIR}/package.json`));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of ["@guidepup/guidepup", "@guidepup/playwright", "@guidepup/setup", "@playwright/test"]) {
      expect(deps[name], name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("has one project per reader and browser, and a spec that keeps out of the suite's reach", () => {
    const config = read(`${DIR}/sr.config.js`);
    for (const name of ["nvda-firefox", "nvda-chrome", "voiceover-webkit", "orca-firefox"]) expect(config).toContain(name);
    expect(config).toContain('testMatch: "*.sr.js"');
    expect(existsSync(resolve(root, `${DIR}/readers.sr.js`))).toBe(true);
    // the root `playwright test` matches **/*.spec.js, and none of these files does
    for (const f of ["readers.sr.js", "serve.js", "sr.config.js"]) expect(f).not.toMatch(/\.spec\.js$/);
  });

  it("reads the headings and the colour-mode button from the page, and checks the marquee is read once", () => {
    const spec = read(`${DIR}/readers.sr.js`);
    expect(spec).toContain("main h2");
    expect(spec).toContain("luz-theme-mode button");
    expect(spec).toContain("luz-marquee a");
  });
});

describe("Dependabot watches the folder of the screen readers", () => {
  it("has an npm entry for it", () => {
    expect(read(".github/dependabot.yml")).toMatch(/directory:\s*"\/tests\/screen-readers"/);
  });
});

describe("PRINCIPLES.md SR-6", () => {
  const principles = read("PRINCIPLES.md");
  const rule = principles.split("\n").find((l) => l.includes("(`SR-6`)")) ?? "";
  const row = principles.split("\n").find((l) => /^\|\s*SR-6\s*\|/.test(l)) ?? "";

  it("says which pairs a machine drives and which a person tests", () => {
    expect(rule).toContain("NVDA + Firefox");
    expect(rule).toContain("VoiceOver + WebKit");
    expect(rule).toMatch(/automated/i);
    expect(rule).toContain(WORKFLOW);
    expect(rule).toMatch(/by hand/i);
    expect(rule).toContain("Orca + Firefox");
    expect(rule).toContain("VoiceOver + Safari");
    expect(rule).toContain("TalkBack + Chrome");
  });

  it("keeps the rule that the statement lists only what was used, and says which was automated", () => {
    expect(rule).toMatch(/lists only the combinations that were actually used/);
    expect(rule).toMatch(/automated or by hand/);
  });

  it("names the workflow in its row of the table", () => {
    expect(row).toContain("screen-readers.yml");
  });
});
