/**
 * LUZ docs site: the page of the agents of the luz skill (`ai/agents`, `generate: ai-agents`). Development tooling,
 * nothing here ships. Nothing on the page is typed: each marker `<!-- luz:agents needs|agents -->` is a table read from
 * the files of the package (`packages/ai/skills/luz/assets`), the agents by their own front matter, and the choice by
 * what matters to the person from `BY_NEED` of `scripts/build-ai-facts.js`. The descriptions are the files' own, in English, so
 * their cells say `lang="en"`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BY_NEED } from "../build-ai-facts.js";
import { escText, tOf, tableOf } from "./ai.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ASSETS = "packages/ai/skills/luz/assets";

/** name, description and tools of a file's front matter (a value in quotes is JSON). */
function frontOf(text, file) {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (block === undefined) throw new Error(`${file}: no front matter`);
  const field = (key) => {
    const v = block.match(new RegExp(`^${key}:[ ]*(.*)$`, "m"))?.[1]?.trim() ?? "";
    return v.startsWith('"') ? JSON.parse(v) : v;
  };
  return { name: field("name"), description: field("description"), tools: field("tools") };
}

/** The agents of the package, by name. */
export function agentRows(root = REPO) {
  const dir = join(root, ASSETS, "agents");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => frontOf(readFileSync(join(dir, f), "utf-8"), `${ASSETS}/agents/${f}`));
}

const english = (text) => `<span lang="en">${escText(text)}</span>`;
const code = (text) => `<code>${escText(text)}</code>`;

const TABLES = {
  needs: (t) =>
    tableOf(t("ai.agents.needs-label"), [t("ai.agents.col-need"), t("ai.agents.col-agent")].map(escText), BY_NEED.map(([, name]) => [escText(t(`ai.agents.need.${name}`)), code(name)])),
  agents: (t, root) =>
    tableOf(t("ai.agents.agents-label"), [t("ai.agents.col-agent"), t("ai.agents.col-reviews"), t("ai.agents.col-tools")].map(escText), agentRows(root).map((a) => [code(a.name), english(a.description), escText(a.tools)])),
};

/** Each `<!-- luz:agents needs|agents -->` on a line of its own becomes its table; each one is there once. */
export function fillAgentMarkers(html, site, { file = "<page>", root = REPO } = {}) {
  const t = tOf(site);
  const seen = new Set();
  const out = html.replace(/^([ \t]*)<!-- luz:agents ([a-z]+) -->[ \t]*$/gm, (_, indent, kind) => {
    if (!Object.hasOwn(TABLES, kind)) throw new Error(`${file}: <!-- luz:agents ${kind} --> is not a table of the page; use "needs" or "agents"`);
    if (seen.has(kind)) throw new Error(`${file}: <!-- luz:agents ${kind} --> is there twice`);
    seen.add(kind);
    return TABLES[kind](t, root).replace(/^/gm, indent).replace(/^[ \t]+$/gm, "");
  });
  for (const kind of Object.keys(TABLES)) if (!seen.has(kind)) throw new Error(`${file}: generate is "ai-agents" and the page has no <!-- luz:agents ${kind} --> line on its own`);
  return out;
}
