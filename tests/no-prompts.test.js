/**
 * The prompts for AI are gone (owner, 2026-11-25): the way in for an AI assistant is the luz skill and its documentation,
 * `/docs/ai/`. Nothing builds, serves, lists, checks or links a prompt any more.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderLlmsTxt, aiArtifacts } from "../scripts/docs-site/ai.js";
import { scanSite } from "../scripts/docs-site/site.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");

describe("no prompt for AI is left", () => {
  it("has no generator, no check, no sources and no script for them", () => {
    for (const file of ["scripts/docs-site/prompts.js", "scripts/check-prompts.js", "apps/site/prompts/body.md"]) expect(existsSync(join(root, file)), file).toBe(false);
    expect(JSON.parse(read("package.json")).scripts["check:prompts"]).toBeUndefined();
    expect(read("scripts/qa-release.js")).not.toMatch(/check:prompts/);
    expect(read(".github/workflows/ci.yml")).not.toMatch(/check:prompts/);
    expect(JSON.parse(read("budgets.json")).budgets?.some?.((b) => /prompts/.test(b.name)) ?? /prompts \(each/.test(read("budgets.json"))).toBe(false);
  });

  it("lists none in llms.txt, and none among the AI files of the site", () => {
    const site = scanSite(join(root, "apps/docs"));
    expect(renderLlmsTxt(site, { siteUrl: "https://luzds.com/" })).not.toMatch(/## Prompts|\/prompts\//);
    expect(aiArtifacts(site, { siteUrl: "https://luzds.com/" }).map((r) => r.file).filter((f) => f.startsWith("prompts/"))).toEqual([]);
  });

  it("has no case of the sentinel for an assembled prompt", () => {
    expect(JSON.parse(read(".claude/evals/prompt-injection/cases.json")).cases.filter((c) => c.assemble !== undefined)).toEqual([]);
  });
});
