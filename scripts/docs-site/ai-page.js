/**
 * LUZ — the page of the luz skill (apps/landing/levels/ai.html, route /ai/).
 *
 * For a developer who is deciding whether `@luz-ds/ai` is for their project (owner, 2026-11-25): below the hero and the
 * three steps the page is ordered by what the reader wants, not by the parts of the tool: the assistants it works
 * with (a strip), how to start a site, the agents that look after what every project needs, the skills for the
 * details, how to keep the project in shape, and what you decide (a strip). The tables of commands and of targets
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
  promise: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12l2.5 2.5 4.5-5",
};

/**
 * The placeholders of the page: {{aiblocks}} (the assistants' strip, four goals with cards and the strip of what you
 * decide) and the hero's numbers {{naiagents}}, {{naitargets}} and {{ndepsai}}.
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
  const goal = (id, links, cards) =>
    [
      `<section class="landing-ai-goal" id="a-${id}" aria-labelledby="a-${id}-title">`,
      `  <div class="landing-ai-goal__head">`,
      `    <h2 class="landing-inside__title" id="a-${id}-title">${t(`level.ai.${id}.title`)}</h2>`,
      `    <p class="landing-inside__lead">${t(`level.ai.${id}.lead`)}</p>`,
      links.length ? `    <ul class="landing-block__groups">${links.map((l) => `<li><a class="landing-block__link" href="${l.href}">${l.label}</a></li>`).join("")}</ul>` : "",
      `  </div>`,
      `  <div class="landing-cards landing-ai__cards">${cards}</div>`,
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
  const start = [
    card("ask", t("level.ai.start.ask.title"), t("level.ai.start.ask.text"), "", ask("›", code("/luz"))),
    card("plan", t("level.ai.start.plan.title"), t("level.ai.start.plan.text"), "", ask("›", code(say("inside.cli.go.button")))),
    card("write", t("level.ai.start.write.title"), t("level.ai.start.write.text"), "", ask("$", code("luz-ai site new --kind landing"))),
    card("check", t("level.ai.start.check.title"), t("level.ai.start.check.text"), "", ask("$", code("npx @luz-ds/check"))),
  ].join("");

  // No agent of the package changes code now: a card for one that does needs its own badge words (and the key level.ai.agents.acts)
  const acting = agents.find((a) => a.acts);
  if (acting) throw new Error(`${acting.name} changes code: add its badge to the card of the agents (scripts/docs-site/ai-page.js) and the key level.ai.agents.acts to the catalogs`);
  const agentCards = agents
    .map((a) =>
      card(
        a.name,
        t(`level.ai.agent.${a.name}.title`),
        t(`level.ai.agent.${a.name}.text`),
        `<p class="landing-ai__id">${code(a.name)}</p>`,
        `<p class="landing-ai__meta"><span class="luz-badge luz-badge--gray">${t("level.ai.agents.reads")}</span> <span>${t("level.ai.agents.for")} ${a.hosts.map((h) => `<bdi>${h}</bdi>`).join(" · ")}</span></p>${ask("›", code(`/luz add ${a.name}`))}`,
        ` landing-ai__card--reads`,
      ),
    )
    .join("");

  // The two commands of the chat that only read, so they never change the project
  const keep = [
    card("doctor", t("level.ai.keep.doctor.title"), t("level.ai.keep.doctor.text"), "", ask("›", code("/luz doctor"))),
    card("validate", t("level.ai.keep.check.title"), t("level.ai.keep.check.text"), "", ask("›", code("/luz check"))),
  ].join("");

  // What you decide: the guarantees of the skill, in a row of five
  const decide = [
    `<section class="landing-ai-decide" id="a-decide" aria-labelledby="a-decide-title">`,
    `  <h2 class="landing-inside__title" id="a-decide-title">${t("level.ai.limits.title")}</h2>`,
    `  <p class="landing-inside__lead">${t("level.ai.limits.lead")}</p>`,
    `  <ul class="landing-ai-decide__list">${[1, 2, 3, 4, 5].map((n) => `<li>${icon("promise")}<span>${t(`level.ai.limits.${n}`)}</span></li>`).join("")}</ul>`,
    `</section>`,
  ].join("\n");

  const commandsDocs = [{ href: "/docs/ai/commands/", label: t("level.ai.commands.link") }];
  const agentsDocs = [{ href: "/docs/ai/agents/", label: t("level.ai.agents.link") }];
  return {
    aiblocks: [works, goal("start", commandsDocs, start), goal("agents", agentsDocs, agentCards), goal("keep", commandsDocs, keep), decide].join("\n"),
    naiagents: String(agents.length),
    naitargets: String(targets.length),
    ndepsai: String(dependencies),
  };
}
