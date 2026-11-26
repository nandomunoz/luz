/**
 * LUZ — the page of the luz skill (apps/landing/levels/ai.html, route /ai/).
 *
 * For a developer who is deciding whether `@luz-ds/ai` is for their project (owner, 2026-11-25): below the hero and the
 * three steps the page is ordered by what the reader wants, not by the parts of the tool: the assistants it works
 * with (a strip) and a list of links to the sections, then a section for each element of the skill, in this order (owner,
 * 2026-11-25): its commands (in two groups: the ones that write, after your go, and the ones that only read), its agents
 * (an agent that changes code says so in its badge) and the skill itself (what it does in a session), and last what you
 * decide (a strip). The tables of commands and of targets
 * are in /docs/ai/. Everything that is a fact of the package is read from `packages/ai/skills/luz/` and never typed:
 *
 *  - the agents: `assets/agents/*.md`, their `name` and `tools`. An agent with a tool of `acting` (tool-map.json)
 *    changes code; the others only read and propose. An acting tool with no verified name for Gemini CLI leaves the
 *    agent out of Gemini CLI, as `agent add` does;
 *  - the assistants: `INIT_TARGETS` of the script, with the folder each one reads (read from its text: the script
 *    starts with a shebang, which the bundle of vite.config.js cannot import);
 *  - the hero's numbers: agents, assistants and the dependencies of `packages/ai/package.json`.
 *
 * The words are the landing's catalogs (`level.ai.*`): a title and a text per agent and per skill, so a new agent
 * with no words fails the build, and words for an agent that is gone are a key no template uses.
 */
import { readFileSync, readdirSync } from "node:fs";
import { commandRows } from "./ai-commands.js";
import { resolve } from "node:path";

const SKILL_DIR = "packages/ai/skills/luz";

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
  const line = /^const INIT_TARGETS = (\{.*\});$/m.exec(readFileSync(resolve(dir, "scripts/luz.mjs"), "utf-8"));
  if (!line) throw new Error(`${SKILL_DIR}/scripts/luz.mjs: no line "const INIT_TARGETS = {…};" to read the assistants of init from`);
  const INIT_TARGETS = JSON.parse(line[1].replace(/([{,]\s*)([a-z]+):/g, '$1"$2":'));
  const targets = Object.entries(INIT_TARGETS).map(([id, folders]) => ({ id, assistant: ASSISTANTS[id] ?? null, folder: folders[0] ?? "AGENTS.md" }));
  const dependencies = Object.keys(JSON.parse(readFileSync(resolve(root, "packages/ai/package.json"), "utf-8")).dependencies ?? {}).length;
  return { agents, targets, dependencies };
}

/** Stroke icons of the cards (24 x 24, drawn like the home's): a path for each piece of the page. */
const ICONS = {
  ask: "M4.5 5h15v10.5H10L6 19v-3.5H4.5Z",
  plan: "M5 6h14M5 12h14M5 18h9",
  write: "M7 3.5h7l4 4V20.5H7ZM14 3.5v4h4",
  check: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12l2.5 2.5 4.5-5",
  doctor: "M3 12h4l2.5-6 4 12 2.5-6H21",
  validate: "M5 5h14v14H5ZM9 12l2.5 2.5L15.5 9.5",
  "luz-agent-accessibility": "M12 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5 9h14M12 9v5m0 0-3 6m3-6 3 6",
  "luz-agent-legal": "M12 4v16M8 20h8M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0ZM19 7l-2.5 6a2.5 2.5 0 0 0 5 0Z",
  "luz-agent-optimiza": "M13 3 5 13.5h6L10 21l8-10.5h-6Z",
  "luz-agent-seogeo": "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20",
  "luz-agent-ux": "M4 5h16v14H4ZM4 10h16M10 10v9",
  agents: "M8.5 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3.5 19c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5M16 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM15 13.6c3 0 5.5 2.2 5.5 5.4",
  add: "M12 5v14M5 12h14",
  help: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
  promise: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12l2.5 2.5 4.5-5",
};

/**
 * The placeholders of the page: {{aiblocks}} (the assistants' strip, a section for each element of the skill, its commands, its
 * agents and the skill itself, with cards, and the strip of what you decide) and the hero's numbers {{naiagents}}, {{naitargets}} and {{ndepsai}}.
 */
export function aiSections({ say, root, escapeHtml }) {
  const t = (key) => escapeHtml(say(key));
  const { agents, targets, dependencies } = aiFacts(root);
  const code = (text) => `<code>${escapeHtml(text)}</code>`;
  const icon = (id) => {
    if (!ICONS[id]) throw new Error(`scripts/docs-site/ai-page.js: no icon for "${id}": add its path to ICONS`);
    return `<svg class="landing-ai__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[id]}"/></svg>`;
  };
  // What you say to the assistant (›) or what the skill runs ($), under the card's text: the sentence or the command, not a word to translate
  const ask = (sign, inner) => `<p class="landing-ai__ask"><span class="landing-ai__mark" aria-hidden="true">${sign}</span> ${inner}</p>`;
  const card = (id, title, text, extra, foot, mod = "") =>
    `<article class="landing-card landing-ai__card${mod}">${icon(id)}<p class="landing-card__title">${title}</p>${extra}<p class="landing-ai__text">${text}</p>${foot}</article>`;
  const goal = (id, links, cards, raw = false) =>
    [
      `<section class="landing-ai-goal" id="a-${id}" aria-labelledby="a-${id}-title">`,
      `  <div class="landing-ai-goal__head">`,
      `    <h2 class="landing-inside__title" id="a-${id}-title">${t(`level.ai.${id}.title`)}</h2>`,
      `    <p class="landing-inside__lead">${t(`level.ai.${id}.lead`)}</p>`,
      links.length ? `    <ul class="landing-block__groups">${links.map((l) => `<li><a class="landing-block__link" href="${l.href}">${l.label}</a></li>`).join("")}</ul>` : "",
      `  </div>`,
      raw ? cards : `  <div class="landing-cards landing-ai__cards">${cards}</div>`,
      `</section>`,
    ]
      .filter(Boolean)
      .join("\n");

  // The assistants it installs itself for, by name (no logos: they are not ours, nor MIT), and where it is tested
  const works = [
    `<section class="landing-ai-works" id="a-assistants" aria-labelledby="a-assistants-title">`,
    `  <h2 class="landing-ai-works__title" id="a-assistants-title">${t("level.ai.assistants.title")}</h2>`,
    `  <ul class="landing-ai-works__list">${targets.map((x) => `<li>${x.assistant ? `<bdi>${x.assistant}</bdi>` : t("level.ai.assistants.agents-md")}</li>`).join("")}</ul>`,
    `  <p class="landing-ai-works__note">${t("level.ai.assistants.tested")}</p>`,
    `</section>`,
  ].join("\n");

  // How a session goes, a card for each phase; the last two are run by the skill itself
  const phases = [
    card("ask", t("level.ai.skill.ask.title"), t("level.ai.skill.ask.text"), "", ask("›", code("/luz"))),
    card("plan", t("level.ai.skill.plan.title"), t("level.ai.skill.plan.text"), "", ask("›", code(say("inside.cli.go.button")))),
    card("write", t("level.ai.skill.write.title"), t("level.ai.skill.write.text"), "", ask("$", code("luz-ai new --kind landing"))),
    card("check", t("level.ai.skill.check.title"), t("level.ai.skill.check.text"), "", ask("$", code("npx @luz-ds/check"))),
  ].join("");

  // An agent that changes code (a tool of `acting`) says so in its badge, filled like the commands that write
  const agentCards = agents
    .map((a) =>
      card(
        a.name,
        t(`level.ai.agent.${a.name}.title`),
        t(`level.ai.agent.${a.name}.text`),
        `<code class="landing-ai__name">${escapeHtml(a.name)}</code><span class="luz-badge luz-badge--gray landing-ai__badge">${t(a.acts ? "level.ai.agents.acts" : "level.ai.agents.reads")}</span>`,
        ask("›", code(`/luz add ${a.name}`)),
        a.acts ? " landing-ai__card--acts" : " landing-ai__card--reads",
      ),
    )
    .join("");

  // The commands of the chat, a card for each row of the table of SKILL.md: what to type, what it does, and whether it writes
  const TYPED = { start: "/luz", new: "/luz new landing", add: "/luz add luz-agent-accessibility" };
  const ICON_OF = { start: "write", new: "write", doctor: "doctor", lint: "validate", facts: "plan", agents: "agents", add: "add", help: "help" };
  const commandCard = (row) => {
      const typed = row.chat.replace(/ [<[].*$/, "");
      const badge = `<span class="luz-badge luz-badge--gray landing-ai__badge">${t(row.writes ? "level.ai.cmd.writes" : "level.ai.cmd.reads")}</span>`;
      if (!ICON_OF[row.slug]) throw new Error(`scripts/docs-site/ai-page.js: no icon for the command "${row.slug}": add it to ICON_OF`);
      return card(ICON_OF[row.slug], escapeHtml(typed), t(`level.ai.cmd.${row.slug}`), badge, ask("›", code(TYPED[row.slug] ?? typed)), row.writes ? " landing-ai__card--acts" : " landing-ai__card--reads");
  };
  // Two groups: the commands that write, after your go, then the ones that only read, each in the order of SKILL.md
  const rows = commandRows(root);
  const group = (id, list) =>
    [
      `<div class="landing-ai-group" id="a-commands-${id}">`,
      `  <h3 class="landing-ai-group__title" id="a-commands-${id}-title">${t(`level.ai.commands.${id}`)}</h3>`,
      `  <div class="landing-cards landing-ai__cards">${list.map(commandCard).join("")}</div>`,
      `</div>`,
    ].join("\n");
  const commandGroups = [group("writes", rows.filter((r) => r.writes)), group("reads", rows.filter((r) => !r.writes))].join("\n");

  // What you decide: the guarantees of the skill, in a row of five
  const decide = [
    `<section class="landing-ai-decide" id="a-decide" aria-labelledby="a-decide-title">`,
    `  <h2 class="landing-inside__title" id="a-decide-title">${t("level.ai.limits.title")}</h2>`,
    `  <p class="landing-inside__lead">${t("level.ai.limits.lead")}</p>`,
    `  <ul class="landing-ai-decide__list">${[1, 2, 3, 4, 5].map((n) => `<li>${icon("promise")}<span>${t(`level.ai.limits.${n}`)}</span></li>`).join("")}</ul>`,
    `</section>`,
  ].join("\n");

  // The sections of the page, under the strip of assistants: a list of links, titled by the sections themselves
  const toc = [
    `<nav class="landing-ai-toc" aria-label="${t("level.ai.toc.label")}">`,
    `  <ul class="landing-ai-toc__list">${[["a-commands", "level.ai.commands.title"], ["a-agents", "level.ai.agents.title"], ["a-skill", "level.ai.skill.title"], ["a-decide", "level.ai.limits.title"]].map(([id, key]) => `<li><a href="#${id}">${t(key)}</a></li>`).join("")}</ul>`,
    `</nav>`,
  ].join("\n");

  const commandsDocs = [{ href: "/docs/ai/commands/", label: t("level.ai.commands.link") }];
  const skillDocs = [{ href: "/docs/ai/", label: t("level.ai.next.docs") }];
  const agentsDocs = [{ href: "/docs/ai/agents/", label: t("level.ai.agents.link") }];
  return {
    aiblocks: [works, toc, goal("commands", commandsDocs, commandGroups, true), goal("agents", agentsDocs, agentCards), goal("skill", skillDocs, phases), decide].join("\n"),
    naiagents: String(agents.length),
    naitargets: String(targets.length),
    ndepsai: String(dependencies),
  };
}
