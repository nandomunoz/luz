// What the skill and its pages say matches what the script does: no brand typed into a starter,
// no law cited without a lawyer, no promise the script does not keep.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");
const en = JSON.parse(read("apps/landing/i18n/en.json"));
const SKILL = "packages/ai/skills/luz";

describe("the skill says what it does", () => {
  it("no starter page types a brand of its own: the person's words are marks to fill in", () => {
    for (const f of readdirSync(new URL(`../${SKILL}/assets/templates`, import.meta.url))) {
      expect(read(`${SKILL}/assets/templates/${f}`), f).not.toMatch(/Acme/);
    }
    expect(read("packages/ai/src/kinds/landing.md")).not.toMatch(/Acme|Start free trial/);
  });

  it("the review lists cite no article of a law: the person asks a lawyer", () => {
    expect(read(`${SKILL}/references/reviewers.md`)).not.toMatch(/LSSI|GDPR|\bart\. \d/);
  });

  it("the landing promises a first page, not a whole site", () => {
    for (const k of ["inside.l4.title", "inside.l4.lead", "level.ai.meta.description"]) {
      expect(en[k], k).not.toMatch(/whole site|builds the site/i);
    }
  });

  it("no agent is sold as legal, and only the accessibility agent is left", () => {
    expect(en["level.ai.agents.lead"]).not.toMatch(/\blaw\b|legal/i);
    const agents = new Set(Object.keys(en).filter((k) => /^level\.ai\.agent\.luz-/.test(k)).map((k) => k.split(".")[3]));
    expect([...agents]).toEqual(["luz-agent-accessibility"]);
  });

  it("the limits name the exception: --force overwrites, the check is downloaded with npx", () => {
    expect(en["level.ai.limits.2"]).toMatch(/unless/);
    expect(en["level.ai.limits.3"]).toMatch(/script/);
    expect(en["level.ai.limits.3"]).toMatch(/npx/);
  });

  it("agent fields are filled from what the repo shows, and the rest is asked", () => {
    for (const k of ["inside.l4.p2.text", "level.ai.steps.result.2", "level.ai.agents.lead"]) {
      expect(en[k], k).toMatch(/ask|answer/i);
    }
  });

  it("no name or model of the past is left", () => {
    expect(read(`${SKILL}/agents/openai.yaml`)).not.toMatch(/LUZ start/);
    expect(read("packages/ai/README.md")).not.toMatch(/prompts of the site/);
    expect(read("AGENTS.md")).not.toMatch(/get-started\/ai\.html/);
  });
});
