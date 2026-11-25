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

  it("the legal agent is sold as a review, never as legal advice, and the agents are the five of the package", () => {
    expect(en["level.ai.agent.luz-agent-legal.text"]).toMatch(/not legal advice/);
    expect(en["level.ai.agents.lead"]).not.toMatch(/complian|legal advice/i);
    const agents = new Set(Object.keys(en).filter((k) => /^level\.ai\.agent\.luz-/.test(k)).map((k) => k.split(".")[3]));
    expect([...agents].sort()).toEqual(["luz-agent-accessibility", "luz-agent-legal", "luz-agent-optimiza", "luz-agent-seogeo", "luz-agent-ux"]);
  });

  it("the agents reference does not call the agent a template with fields to fill: it has none", () => {
    const ref = read(`${SKILL}/references/agents.md`);
    expect(ref).not.toMatch(/base template|with fields left to fill/);
    expect(ref).toMatch(/no field is written as it is/);
  });

  it("the limits name the exception: --force overwrites, the check is downloaded with npx", () => {
    expect(en["level.ai.limits.2"]).toMatch(/unless/);
    expect(en["level.ai.limits.3"]).toMatch(/script/);
    expect(en["level.ai.limits.3"]).toMatch(/npx/);
  });

  it("says the accessibility agent has no field to fill: it reads the project's own files", () => {
    for (const k of ["inside.l4.p2.text", "level.ai.steps.result.2", "level.ai.agents.lead", "inside.cli.plan.agent", "inside.cli.adapt"]) expect(en[k], k).not.toMatch(/ADAPT/);
    for (const k of ["inside.l4.p2.text", "level.ai.steps.result.2", "level.ai.agents.lead"]) expect(en[k], k).not.toMatch(/fills/i);
    expect(read("apps/docs/pages/ai/agents.html")).not.toMatch(/fields left to fill|\[ADAPT/);
    expect(read(`${SKILL}/SKILL.md`)).toMatch(/agent with no field is written as it is/);
  });

  it("facts say which stacks get a page written and which are moved by hand, and the script agrees", () => {
    const facts = JSON.parse(read(`${SKILL}/assets/facts.json`));
    for (const st of facts.stacks) expect(typeof st.page, st.id).toBe("boolean");
    expect(facts.stacks.filter((st) => st.page).map((st) => st.id)).toEqual(["vanilla", "astro"]);
    const script = read(`${SKILL}/scripts/luz.mjs`);
    expect(script).toMatch(/GENERATED = FACTS\.stacks\.filter\(\(s\) => s\.page\)/);
    expect(read(`${SKILL}/SKILL.md`)).toMatch(/by hand/);
  });

  it("levels.md says what the starter links, and that the unused stylesheets go when the page is finished", () => {
    const text = read(`${SKILL}/references/levels.md`);
    expect(text).toMatch(/starter page links the stylesheets that fit its kind/);
    expect(text).toMatch(/remove the ones the page does not use/);
  });

  it("no name or model of the past is left", () => {
    expect(read(`${SKILL}/agents/openai.yaml`)).not.toMatch(/LUZ start/);
    expect(read("packages/ai/README.md")).not.toMatch(/prompts of the site/);
    expect(read("AGENTS.md")).not.toMatch(/get-started\/ai\.html/);
  });
});
