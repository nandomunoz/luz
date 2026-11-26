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
 *  - the small skills: the folders of `assets/skills/` (a card each, with the sentence that adds it);
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
  const skills = readdirSync(resolve(dir, "assets/skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const line = /^const INIT_TARGETS = (\{.*\});$/m.exec(readFileSync(resolve(dir, "scripts/luz.mjs"), "utf-8"));
  if (!line) throw new Error(`${SKILL_DIR}/scripts/luz.mjs: no line "const INIT_TARGETS = {…};" to read the assistants of init from`);
  const INIT_TARGETS = JSON.parse(line[1].replace(/([{,]\s*)([a-z]+):/g, '$1"$2":'));
  const targets = Object.entries(INIT_TARGETS).map(([id, folders]) => ({ id, assistant: ASSISTANTS[id] ?? null, folder: folders[0] ?? "AGENTS.md" }));
  const dependencies = Object.keys(JSON.parse(readFileSync(resolve(root, "packages/ai/package.json"), "utf-8")).dependencies ?? {}).length;
  return { agents, skills, targets, dependencies };
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
  "luz-readme": "M6 3.5h9l3 3V20.5H6ZM9 11h6M9 14.5h6M9 7.5h3",
  "luz-theme": "M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.4-1.2-1.6-1.2-2.8 0-.9.7-1.4 1.6-1.4H17a3.5 3.5 0 0 0 3.5-3.5C20.5 6.7 16.7 3.5 12 3.5ZM7.5 11.5h.01M10 7.8h.01M14.5 7.8h.01",
  "luz-migrate": "M4 8h11M12 4.5 15.5 8 12 11.5M20 16H9M12 12.5 8.5 16l3.5 3.5",
  "luz-translate": "M4 5.5h9M8.5 4v1.5M6 5.5c.6 3.6 3.2 6.2 6.5 7.5M11 5.5c-.6 3.6-3.2 6.2-6.5 7.5M12.5 20l3.5-9 3.5 9M13.6 17.5h4.8",
  "luz-meta": "M4.5 8 8 12l-3.5 4M10.5 17h5M13 4.5l-2 15M19.5 8 16 12l3.5 4",
  "luz-license": "M12 3.5l7 2.8v5.4c0 4.4-2.8 7.4-7 8.8-4.2-1.4-7-4.4-7-8.8V6.3ZM9 12l2.2 2.2L15.2 10",
  skills: "M12 3.5l2.2 5 5.3.5-4 3.6 1.2 5.3L12 15l-4.7 2.9 1.2-5.3-4-3.6 5.3-.5Z",
  agents: "M8.5 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3.5 19c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5M16 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM15 13.6c3 0 5.5 2.2 5.5 5.4",
  add: "M12 5v14M5 12h14",
  help: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
  promise: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12l2.5 2.5 4.5-5",
  // What a card does, the small grey icon beside the blue one: it reads (an eye), or it writes (a pencil)
  reads: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  writes: "M4.5 19.5h4l10-10-4-4-10 10ZM13 7l4 4",
};

/**
 * The placeholders of the page: {{aiblocks}} (the assistants' strip, a section for each element of the skill, its commands, its
 * agents and the skill itself, with cards, and the strip of what you decide) and the hero's numbers {{naiagents}}, {{naitargets}} and {{ndepsai}}.
 */
export function aiSections({ say, root, escapeHtml }) {
  const t = (key) => escapeHtml(say(key));
  const { agents, skills, targets, dependencies } = aiFacts(root);
  const icon = (id) => {
    if (!ICONS[id]) throw new Error(`scripts/docs-site/ai-page.js: no icon for "${id}": add its path to ICONS`);
    return `<svg class="landing-ai__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[id]}"/></svg>`;
  };
  // A line you copy: what you type, nothing else (the section says where you type it, once). The hint after the name ("on my
  // page", "<what you want>") is shown, dimmed, but never copied (owner, 2026-11-26): a click copies `copy` alone
  const ask = (text, copy = text) => {
    if (!text.startsWith(copy)) throw new Error(`scripts/docs-site/ai-page.js: "${copy}" is not the start of "${text}"`);
    const hint = text.slice(copy.length);
    return `<p class="landing-ai__ask" data-copy="${escapeHtml(copy)}"><code>${escapeHtml(copy)}${hint ? `<span class="landing-ai__hint">${escapeHtml(hint)}</span>` : ""}</code></p>`;
  };
  // The part of a sentence that is copied: up to the name in it, or a command up to its first <argument>
  const upTo = (sentence, name) => sentence.slice(0, sentence.indexOf("{name}")) + name;
  const badge = (key) => `<span class="luz-badge luz-badge--gray landing-ai__badge">${t(key)}</span>`;
  const head = (id, links = [], note = "") =>
    [
      `  <div class="landing-ai-goal__head">`,
      `    <h2 class="landing-inside__title" id="a-${id}-title">${t(`level.ai.${id}.title`)}</h2>`,
      say(`level.ai.${id}.lead`) ? `    <p class="landing-inside__lead">${t(`level.ai.${id}.lead`)}</p>` : "",
      note ? `    <p class="landing-ai-goal__note">${note}</p>` : "",
      links.length ? `    <ul class="landing-block__groups">${links.map((l) => `<li><a class="landing-block__link" href="${l.href}">${l.label}</a></li>`).join("")}</ul>` : "",
      `  </div>`,
    ].filter(Boolean);

  // Where it works (owner, 2026-11-26): no assistant by name, since not every one is tested; it is written in open formats, for
  // any harness
  const works = [
    `<section class="landing-ai-works" id="a-assistants" aria-labelledby="a-assistants-title">`,
    `  <h2 class="landing-ai-works__title" id="a-assistants-title">${t("level.ai.assistants.title")}</h2>`,
    `  <p class="landing-ai-works__note">${t("level.ai.assistants.note")}</p>`,
    `</section>`,
  ].join("\n");

  // ---- Install it (owner, 2026-11-26, .claude/plans/ai-page-v3.md): three choices side by side, everything recommended and first,
  // one command each, with the copy button of the page; the lead says once that it is the terminal
  // A command is a line like the ones of the cards (owner, 2026-11-26): a small label, the code, and the copy icon on hover
  const block = (label, command) => `<div class="landing-ai-option__cmd"><p class="landing-ai__label">${label}</p>${ask(command)}</div>`;
  // A table of plans (owner, 2026-11-26, the visual pass): the recommended one in the middle, taller, with its flag; the same three
  // rows in each say what it brings (the skill, the agents, the skills) and what it leaves for later
  const option = (key, rows, body, recommended = false) =>
    [
      `<article class="landing-card landing-ai-option${recommended ? " landing-ai-option--recommended" : ""}" id="a-install-${key}">`,
      recommended ? `<p class="landing-ai-option__flag">${t("level.ai.install.recommended")}</p>` : "",
      `<h3 class="landing-ai-option__title">${t(`level.ai.install.${key}.title`)}</h3>`,
      `<p class="landing-ai__text">${t(`level.ai.install.${key}.text`)}</p>`,
      `<ul class="landing-ai-option__gets">${rows.join("")}</ul>`,
      body,
      `</article>`,
    ].join("");
  const terminal = t("level.ai.install.terminal");
  const count = (key, n) => escapeHtml(say(key).replace("{n}", n));
  const get = (text, { no = false, href = "" } = {}) =>
    `<li class="landing-ai-option__get${no ? " landing-ai-option__get--no" : ""}">${no ? `<span class="u-sr-only">${t("level.ai.install.gets.no")} </span>` : ""}${href ? `<a href="${href}">${text}</a>` : text}</li>`;
  const luzRow = get(t("level.ai.install.gets.luz"));
  const agentsRow = count("level.ai.install.gets.agents", agents.length);
  const skillsRow = count("level.ai.install.gets.skills", skills.length);
  const install = [
    `<section class="landing-ai-goal" id="a-install" aria-labelledby="a-install-title">`,
    ...head("install"),
    `  <div class="landing-ai-options">`,
    option("min", [luzRow, get(agentsRow, { no: true }), get(skillsRow, { no: true })], block(terminal, "npx @luz-ds/ai init --target claude")),
    option("all", [luzRow, get(agentsRow), get(skillsRow)], block(terminal, "npx @luz-ds/ai init --target claude --all"), true),
    option(
      "pick",
      [luzRow, get(t("level.ai.install.gets.agents.pick"), { href: "#a-agents" }), get(t("level.ai.install.gets.skills.pick"), { href: "#a-skills" })],
      block(terminal, "npx @luz-ds/ai init --target claude") + block(t("level.ai.install.pick.then"), "/luz add luz-agent-ux"),
    ),
    `  </div>`,
    `  <p class="landing-ai-options__note">${t("level.ai.install.note")}</p>`,
    `</section>`,
  ].join("\n");

  // ---- Use it: the commands of the chat in three tabs by what the reader wants to do (core tabs: without JS the panels stack,
  // each under its heading). A row is the command, what it does and whether it writes; the terminal is the docs' page
  const TABS = { create: ["start", "new", "magic"], check: ["doctor", "lint", "facts", "help"], manage: ["list", "agents", "skills", "add", "remove"] };
  const TYPED = { start: "/luz", new: "/luz new landing", add: "/luz add luz-agent-ux", remove: "/luz remove luz-agent-optimiza" };
  const rows = commandRows(root);
  const missing = rows.filter((r) => !Object.values(TABS).flat().includes(r.slug));
  if (missing.length) throw new Error(`scripts/docs-site/ai-page.js: the command ${missing.map((r) => r.slug).join(", ")} of SKILL.md has no tab in TABS`);
  const row = (slug) => {
    const r = rows.find((x) => x.slug === slug);
    if (!r) throw new Error(`scripts/docs-site/ai-page.js: TABS names "${slug}", which is not a command of SKILL.md`);
    const typed = TYPED[slug] ?? r.chat.replace(/ \[.*$/, "");
    return `<li class="landing-ai-cmd">${ask(typed, typed.replace(/ <.*$/, ""))}<p class="landing-ai-cmd__text">${t(`level.ai.cmd.${slug}`)}</p>${badge(r.writes ? "level.ai.cmd.writes" : "level.ai.cmd.reads")}</li>`;
  };
  // How a session goes, under the commands that create a site
  const phases = `<ol class="landing-ai-phases">${["ask", "plan", "write", "check"].map((k, i) => `<li><span class="landing-ai-phases__n" aria-hidden="true">${i + 1}</span><strong>${t(`level.ai.skill.${k}.title`)}</strong><span>${t(`level.ai.skill.${k}.text`)}</span></li>`).join("")}</ol>`;
  const use = [
    `<section class="landing-ai-goal" id="a-use" aria-labelledby="a-use-title">`,
    ...head("use", [{ href: "/docs/ai/commands/", label: t("level.ai.use.terminal") }]),
    `  <div class="landing-ai-use">`,
    `    <nav class="luz-tabs landing-ai-use__tabs" aria-label="${t("level.ai.use.tabs")}">${Object.keys(TABS).map((k) => `<a class="luz-tab" href="#a-use-${k}">${t(`level.ai.use.${k}`)}</a>`).join("")}</nav>`,
    ...Object.entries(TABS).map(([k, slugs]) => `    <div class="luz-tabpanel landing-ai-use__pane" id="a-use-${k}"><h3 class="landing-ai-use__title">${t(`level.ai.use.${k}`)}</h3><ul class="landing-ai-cmds">${slugs.map(row).join("")}</ul>${k === "create" ? phases : ""}</div>`),
    `  </div>`,
    `</section>`,
  ].join("\n");

  // ---- Agents and small skills: what each does and how to ask for it; installing it is a closed details, since everything
  // installs it already
  // What a card does, as a small grey icon beside its blue one (owner, 2026-11-26: no badge): its words are the title, shown on
  // hover, and a hidden text for a screen reader
  const kind = (key) =>
    `<span class="landing-ai__kind" title="${t(key)}"><svg class="landing-ai__kind-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[key === "level.ai.agents.reads" ? "reads" : "writes"]}"/></svg><span class="u-sr-only">${t(key)}</span></span>`;
  const card = (id, title, name, badgeKey, text, asked, copy, mod) =>
    [
      `<article class="landing-card landing-ai__card${mod}">`,
      `<div class="landing-ai__top">${icon(id)}${kind(badgeKey)}</div>`,
      `<p class="landing-card__title">${title}</p>`,
      `<code class="landing-ai__name">${escapeHtml(name)}</code>`,
      `<p class="landing-ai__text">${text}</p>`,
      `<p class="landing-ai__label">${t("level.ai.ask")}</p>${ask(asked, copy)}`,
      `</article>`,
    ].join("");
  const agentCards = agents
    .map((a) => card(a.name, t(`level.ai.agent.${a.name}.title`), a.name, a.acts ? "level.ai.agents.acts" : "level.ai.agents.reads", t(`level.ai.agent.${a.name}.text`), say("level.ai.agents.use").replace("{name}", a.name), upTo(say("level.ai.agents.use"), a.name), a.acts ? " landing-ai__card--acts" : " landing-ai__card--reads"))
    .join("");
  const skillCards = skills.map((name) => card(name, t(`level.ai.skills.${name}.title`), name, "level.ai.skills.badge", t(`level.ai.skills.${name}.text`), say("level.ai.skills.use").replace("{name}", name), upTo(say("level.ai.skills.use"), name), " landing-ai__card--acts")).join("");
  const goal = (id, links, cards) => [`<section class="landing-ai-goal" id="a-${id}" aria-labelledby="a-${id}-title">`, ...head(id, links, t(`level.ai.${id}.missing`)), `  <div class="landing-cards landing-ai__cards">${cards}</div>`, `</section>`].join("\n");

  // What you decide: the guarantees of the skill, in a row of five
  const decide = [
    `<section class="landing-ai-decide" id="a-decide" aria-labelledby="a-decide-title">`,
    `  <h2 class="landing-inside__title" id="a-decide-title">${t("level.ai.limits.title")}</h2>`,
    `  <p class="landing-inside__lead">${t("level.ai.limits.lead")}</p>`,
    `  <ul class="landing-ai-decide__list">${[1, 2, 3, 4, 5].map((n) => `<li>${icon("promise")}<span>${t(`level.ai.limits.${n}`)}</span></li>`).join("")}</ul>`,
    `</section>`,
  ].join("\n");

  // The sections of the page, under the hero: a list of links, titled by the sections themselves
  const toc = [
    `<nav class="landing-ai-toc" aria-label="${t("level.ai.toc.label")}">`,
    `  <ul class="landing-ai-toc__list">${[["a-install", "level.ai.install.title"], ["a-use", "level.ai.use.title"], ["a-agents", "level.ai.agents.title"], ["a-skills", "level.ai.skills.title"], ["a-decide", "level.ai.limits.title"]].map(([id, key]) => `<li><a href="#${id}">${t(key)}</a></li>`).join("")}</ul>`,
    `</nav>`,
  ].join("\n");

  return {
    aiblocks: [works, toc, install, use, goal("agents", [{ href: "/docs/ai/agents/", label: t("level.ai.agents.link") }], agentCards), goal("skills", [{ href: "/docs/ai/agents/#skills", label: t("level.ai.skills.link") }], skillCards), decide].join("\n"),
    naiagents: String(agents.length),
    naitargets: String(targets.length),
    ndepsai: String(dependencies),
  };
}
