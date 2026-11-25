/**
 * LUZ — the page of the luz skill (apps/landing/levels/ai.html, route /ai/).
 *
 * For a developer who does not yet know what `@luz-ds/ai` gives: what the skill does, the agents and skills it can
 * add to a project, the assistants it installs itself for, and what it never does. Everything that is a fact of the
 * package is read from `packages/ai/skills/luz/` and never typed:
 *
 *  - the agents: `assets/agents/*.md`, their `name` and `tools`. An agent with a tool of `acting` (tool-map.json)
 *    changes code; the others only read and propose. An acting tool with no verified name for Gemini CLI leaves the
 *    agent out of Gemini CLI, as `agent add` does;
 *  - the skills: `assets/skills/<name>/SKILL.md`;
 *  - the assistants: `INIT_TARGETS` of the script, with the folder each one reads (read from its text: the script
 *    starts with a shebang, which the bundle of vite.config.js cannot import);
 *  - the hero's numbers: agents, skills, assistants and the dependencies of `packages/ai/package.json`.
 *
 * The words are the landing's catalogs (`level.ai.*`): a key per agent, per skill and per command, so a new agent
 * with no words fails the build, and words for an agent that is gone are a key no template uses.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { commandRows } from "./ai-commands.js";

const SKILL_DIR = "packages/ai/skills/luz";

/** The commands the page explains, in the order a person meets them; each is a command of `luz-ai --help`. */
export const AI_COMMANDS = ["init", "site new", "agent add", "skill add", "doctor", "check"];

/** The assistant each target of `init` is for: names of products, not words to translate (agents-md is the catalog's). */
const ASSISTANTS = { claude: "Claude Code", codex: "Codex", gemini: "Gemini CLI", cursor: "Cursor" };

/** The hosts an agent file is written for by `agent add`, in its order. */
const AGENT_HOSTS = ["Claude Code", "Gemini CLI", "Codex"];

/** The front matter fields of a Markdown file with front matter, as plain strings. */
function frontMatter(text, file) {
  const head = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!head) throw new Error(`${file}: no front matter`);
  const fields = {};
  for (const line of head[1].split("\n")) {
    const m = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return fields;
}

/** The agents and skills luz carries, and the assistants it installs itself for. */
export function aiFacts(root) {
  const dir = resolve(root, SKILL_DIR);
  const map = JSON.parse(readFileSync(resolve(dir, "assets/tool-map.json"), "utf-8"));
  const agents = readdirSync(resolve(dir, "assets/agents"))
    .filter((n) => n.endsWith(".md"))
    .sort()
    .map((n) => {
      const fields = frontMatter(readFileSync(resolve(dir, "assets/agents", n), "utf-8"), `${SKILL_DIR}/assets/agents/${n}`);
      const tools = (fields.tools ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      const acts = tools.some((t) => map.acting.includes(t));
      const gemini = !tools.some((t) => map.acting.includes(t) && !map.gemini[t]);
      return { name: fields.name, tools, acts, hosts: AGENT_HOSTS.filter((h) => h !== "Gemini CLI" || gemini) };
    });
  const skills = readdirSync(resolve(dir, "assets/skills"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => frontMatter(readFileSync(resolve(dir, "assets/skills", e.name, "SKILL.md"), "utf-8"), `${SKILL_DIR}/assets/skills/${e.name}/SKILL.md`).name)
    .sort();
  const line = /^const INIT_TARGETS = (\{.*\});$/m.exec(readFileSync(resolve(dir, "scripts/luz.mjs"), "utf-8"));
  if (!line) throw new Error(`${SKILL_DIR}/scripts/luz.mjs: no line "const INIT_TARGETS = {…};" to read the assistants of init from`);
  const INIT_TARGETS = JSON.parse(line[1].replace(/([{,]\s*)([a-z]+):/g, '$1"$2":'));
  const targets = Object.entries(INIT_TARGETS).map(([id, folders]) => ({ id, assistant: ASSISTANTS[id] ?? null, folder: folders[0] ?? "AGENTS.md" }));
  const dependencies = Object.keys(JSON.parse(readFileSync(resolve(root, "packages/ai/package.json"), "utf-8")).dependencies ?? {}).length;
  return { agents, skills, targets, dependencies };
}

/**
 * The placeholders of the page: {{aiblocks}} (five blocks in the sides of the home, `block` is levelBlock() of
 * site.js) and the hero's numbers {{naiagents}}, {{naiskills}}, {{naitargets}} and {{ndepsai}}.
 */
export function aiSections({ say, root, block, escapeHtml }) {
  const t = (key) => escapeHtml(say(key));
  const { agents, skills, targets, dependencies } = aiFacts(root);
  const code = (text) => `<code>${escapeHtml(text)}</code>`;
  const docs = [{ href: "/docs/ai/#skill", label: t("level.ai.docs"), count: "" }];

  const chat = [
    `<table class="luz-table landing-ai__table">`,
    `<thead><tr><th scope="col">${t("level.ai.does.command")}</th><th scope="col">${t("level.ai.does.what")}</th><th scope="col">${t("level.ai.commands.writes")}</th></tr></thead>`,
    `<tbody>${commandRows(root).map((r) => `<tr><th scope="row">${code(r.chat)}</th><td>${t(`level.ai.chat.${r.slug}`)}</td><td>${t(r.writes ? "level.ai.commands.yes" : "level.ai.commands.no")}</td></tr>`).join("")}</tbody>`,
    `</table>`,
  ].join("");
  const commandsDocs = [{ href: "/docs/ai/commands/", label: t("level.ai.commands.link"), count: "" }];

  const commands = [
    `<table class="luz-table landing-ai__table">`,
    `<thead><tr><th scope="col">${t("level.ai.does.command")}</th><th scope="col">${t("level.ai.does.what")}</th></tr></thead>`,
    `<tbody>${AI_COMMANDS.map((c) => `<tr><th scope="row">${code(c)}</th><td>${t(`level.ai.command.${c.replace(" ", "-")}`)}</td></tr>`).join("")}</tbody>`,
    `</table>`,
  ].join("");

  const agentCards = agents
    .map(
      (a) =>
        `<article class="landing-card landing-ai__card landing-ai__card--${a.acts ? "acts" : "reads"}">` +
        `<p class="landing-card__title">${code(a.name)}</p>` +
        `<p class="landing-ai__text">${t(`level.ai.agent.${a.name}`)}</p>` +
        `<p class="landing-ai__meta"><span class="luz-badge${a.acts ? " luz-badge--primary" : " luz-badge--gray"}">${t(a.acts ? "level.ai.agents.acts" : "level.ai.agents.reads")}</span> <span>${t("level.ai.agents.for")} ${a.hosts.map((h) => `<bdi>${h}</bdi>`).join(" · ")}</span></p>` +
        `</article>`,
    )
    .join("");

  const skillCards = skills
    .map((s) => `<article class="landing-card landing-ai__card"><p class="landing-card__title">${code(s)}</p><p class="landing-ai__text">${t(`level.ai.skill.${s}`)}</p><p class="landing-ai__meta">${code(`skill add ${s}`)}</p></article>`)
    .join("");

  const assistants = [
    `<table class="luz-table landing-ai__table">`,
    `<thead><tr><th scope="col">--target</th><th scope="col">${t("level.ai.assistants.who")}</th><th scope="col">${t("level.ai.assistants.where")}</th></tr></thead>`,
    `<tbody>${targets.map((x) => `<tr><th scope="row">${code(x.id)}</th><td>${x.assistant ? `<bdi>${x.assistant}</bdi>` : t("level.ai.assistants.agents-md")}</td><td>${code(x.folder)}</td></tr>`).join("")}</tbody>`,
    `</table>`,
  ].join("");

  const limits = `<ul class="landing-ai__limits">${[1, 2, 3, 4, 5].map((n) => `<li>${t(`level.ai.limits.${n}`)}</li>`).join("")}</ul>`;

  const BLOCKS = [
    ["commands", `<div class="landing-ai__scroll" tabindex="0" role="region" aria-label="${t("level.ai.commands.title")}">${chat}</div>`, commandsDocs],
    ["does", `<div class="landing-ai__scroll" tabindex="0" role="region" aria-label="${t("level.ai.does.command")}">${commands}</div>`, docs],
    ["agents", `<div class="landing-cards">${agentCards}</div>`, []],
    ["skills", `<div class="landing-cards">${skillCards}</div>`, []],
    ["assistants", `<div class="landing-ai__scroll" tabindex="0" role="region" aria-label="${t("level.ai.assistants.who")}">${assistants}</div>`, docs],
    ["limits", limits, []],
  ];
  return {
    aiblocks: BLOCKS.map(([id, panel, links], i) => block({ i, id, anchor: "a", wide: true, title: t(`level.ai.${id}.title`), lead: t(`level.ai.${id}.lead`), links, panel })).join("\n"),
    naiagents: String(agents.length),
    naiskills: String(skills.length),
    naitargets: String(targets.length),
    ndepsai: String(dependencies),
  };
}
