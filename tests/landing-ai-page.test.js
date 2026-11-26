/**
 * The page of the luz skill, /ai/ (owner, 2026-11-23): a page like the catalog's, with a hero whose live part is
 * the home's terminal, how to install and use the skill, and below them what the reader gains, ordered by goal
 * (owner, 2026-11-25): the assistants it works with, how to start a site, the agents that look after what a project
 * needs, how to keep it in shape, and what you decide. The tables of commands are in
 * /docs/ai/. The home's fourth level has a button to it.
 *
 * Every fact of the package is read from packages/ai/skills/luz/ and never typed (scripts/docs-site/ai-page.js):
 * a new agent needs its words in the catalogs, and the page names exactly what the skill carries.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { aiFacts } from "../scripts/docs-site/ai-page.js";
import { commandRows, slugOf } from "../scripts/docs-site/ai-commands.js";
import { levelPagesOf } from "./helpers/level-pages.js";
import { quoted } from "./helpers/quoted-attributes.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const HOME = "apps/landing/index.html";
const SKILL = "packages/ai/skills/luz";
const LANGS = [["en", "/"], ["es", "/es/"], ["ar", "/ar/"]];

const site = scanSite(join(repo, "apps/docs"), repo);
const home = read(HOME);
const built = buildSite(site, { extra: [...landingDocuments(site, HOME, home), ...levelPagesOf(site)] });
const rendered = new Map([...built.rendered].map(([route, page]) => [route, quoted(page)]));
const catalog = (code) => JSON.parse(read(`apps/landing/i18n/${code}.json`));
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A section by its id, from its opening tag to the next section (or the end of the main). */
const sectionOf = (html, id) => {
  const start = html.search(new RegExp(`<section\\b[^>]*\\sid="${id}"`));
  if (start < 0) return "";
  const next = html.indexOf("<section", start + 1);
  return html.slice(start, next < 0 ? html.indexOf("</main>", start) : next);
};
const terminalOf = (html) => /<figure class="landing-cli[ "][\s\S]*?<\/figure>/.exec(html)?.[0] ?? "";
/** The lines of a terminal: the home's loops them, the page of the skill's lets the visitor answer, and both say the same session. */
const screenOf = (html) => /<div class="landing-cli__screen"[^>]*>([\s\S]*)<\/div>\n<(?:button|figcaption)/.exec(terminalOf(html))?.[1] ?? "";

const agents = readdirSync(join(repo, SKILL, "assets/agents")).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)).sort();

describe("the page of the luz skill, /ai/", () => {
  it("is a route of the site in every language, with no broken link and no catalog key left over", () => {
    for (const [, prefix] of LANGS) expect(rendered.has(`${prefix}ai/`), `${prefix}ai/`).toBe(true);
    expect(built.problems).toEqual([]);
  });

  it.each(LANGS)("in %s: one h1, its own title, no template syntax", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toMatch(/\{\{|\}\}|\{n:/);
    expect(/<title>([^<]*)<\/title>/.exec(html)[1]).toBe(escape(catalog(code)["level.ai.meta.title"]));
  });

  it.each(LANGS)("in %s: the hero's live part is the terminal of the whole session, the visitor answering it, once per assistant (Claude, Codex, Cursor: owner, 2026-11-25); the home's is the install, a loop", (code, prefix) => {
    const hero = sectionOf(rendered.get(`${prefix}ai/`), "hero");
    expect(hero).toMatch(/^<section class="landing-intro\b/);
    const cli = terminalOf(hero);
    expect(cli).not.toBe("");
    expect(screenOf(hero)).not.toBe("");
    // The home's terminal is another one since 2026-11-25 (owner): a person installing the skill, played by itself
    expect(screenOf(hero)).not.toBe(screenOf(rendered.get(prefix)));
    expect(terminalOf(rendered.get(prefix))).toMatch(/landing-cli--install/);
    expect(cli).toMatch(/data-landing-cli>/);
    expect(cli).toContain("landing-cli__next");
    expect(terminalOf(rendered.get(prefix))).toMatch(/data-landing-cli="loop"/);
    expect(rendered.get(`${prefix}ai/`).match(/data-landing-cli/g)).toHaveLength(3);
    expect(hero).toMatch(/<a class="luz-btn luz-btn--primary" href="#a-install">/);
  });

  it.each(LANGS)("in %s: the hero's numbers are the package's: agents, ways to install and dependencies", (code, prefix) => {
    const facts = aiFacts(repo);
    const numbers = [...sectionOf(rendered.get(`${prefix}ai/`), "hero").matchAll(/<li><strong>([^<]*)<\/strong>/g)].map((m) => m[1]);
    expect(numbers).toEqual([agents.length, facts.targets.length, 0].map(String));
  });

  // ---- Install it (owner, 2026-11-26: the third pass, .claude/plans/ai-page-v3.md): three choices side by side, the whole
  // package recommended first, each with one command; the steps of before are gone, this section is how to start ----

  const help = () => execFileSync(process.execPath, [join(repo, SKILL, "scripts/luz.mjs"), "--help"], { encoding: "utf-8" });
  const optionsOf = (block) => [...block.matchAll(/<article class="landing-card landing-ai-option[^"]*" id="([^"]*)">([\s\S]*?)<\/article>/g)].map((m) => ({ id: m[1], html: m[2], recommended: m[0].includes("landing-ai-option--recommended") }));
  const commandsOf = (html) => [...html.matchAll(/<p class="landing-ai__ask" data-copy="([^"]*)"><code>\1<\/code><\/p>/g)].map((m) => m[1]);

  it.each(LANGS)("in %s: Install it offers three choices, everything (recommended, first), the minimum and piece by piece, one command each, and says once that it is the terminal", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    const block = sectionOf(html, "a-install");
    const words = catalog(code);
    const facts = aiFacts(repo);
    expect(html).not.toContain('id="steps"');
    expect(block).toContain(escape(words["level.ai.install.title"]));
    expect(block).toContain(escape(words["level.ai.install.lead"]));
    const options = optionsOf(block);
    // As a table of plans (owner, 2026-11-26, the visual pass): the recommended one in the middle, with its flag
    expect(options.map((o) => o.id)).toEqual(["a-install-min", "a-install-all", "a-install-pick"]);
    expect(options.map((o) => o.recommended)).toEqual([false, true, false]);
    expect(options[1].html).toContain(`<p class="landing-ai-option__flag">${escape(words["level.ai.install.recommended"])}</p>`);
    const getsOf = (o) => [...o.html.matchAll(/<li class="landing-ai-option__get( landing-ai-option__get--no)?">(?:<span class="u-sr-only">([^<]*)<\/span>)?(?:<a href="(#[^"]*)">)?([^<]*)(?:<\/a>)?<\/li>/g)].map((m) => ({ no: Boolean(m[1]), sr: m[2] ?? null, href: m[3] ?? null, text: m[4] }));
    const n = (key, count) => escape(words[key].replace("{n}", count));
    // The same three rows in each: what it brings and what it leaves for later
    expect(getsOf(options[1])).toEqual([
      { no: false, sr: null, href: null, text: escape(words["level.ai.install.gets.luz"]) },
      { no: false, sr: null, href: null, text: n("level.ai.install.gets.agents", facts.agents.length) },
      { no: false, sr: null, href: null, text: n("level.ai.install.gets.skills", facts.skills.length) },
    ]);
    expect(getsOf(options[0])).toEqual([
      { no: false, sr: null, href: null, text: escape(words["level.ai.install.gets.luz"]) },
      { no: true, sr: `${escape(words["level.ai.install.gets.no"])} `, href: null, text: n("level.ai.install.gets.agents", facts.agents.length) },
      { no: true, sr: `${escape(words["level.ai.install.gets.no"])} `, href: null, text: n("level.ai.install.gets.skills", facts.skills.length) },
    ]);
    expect(getsOf(options[2])).toEqual([
      { no: false, sr: null, href: null, text: escape(words["level.ai.install.gets.luz"]) },
      { no: false, sr: null, href: "#a-agents", text: escape(words["level.ai.install.gets.agents.pick"]) },
      { no: false, sr: null, href: "#a-skills", text: escape(words["level.ai.install.gets.skills.pick"]) },
    ]);
    for (const [o, key] of [[options[1], "all"], [options[0], "min"], [options[2], "pick"]]) {
      expect(o.html).toMatch(new RegExp(`<h3 class="landing-ai-option__title">${escape(words[`level.ai.install.${key}.title`])}</h3>`));
      expect(o.html).toContain(escape(words[`level.ai.install.${key}.text`]));
    }
    expect(commandsOf(options[1].html)).toEqual(["npx @luz-ds/ai init --target claude --all"]);
    expect(commandsOf(options[0].html)).toEqual(["npx @luz-ds/ai init --target claude"]);
    // Piece by piece: the minimum in the terminal, then a piece in the chat, and the way to the agents and the skills
    expect(commandsOf(options[2].html)).toEqual(["npx @luz-ds/ai init --target claude", "/luz add luz-agent-ux"]);
    expect(options[2].html).toContain('href="#a-agents"');
    expect(options[2].html).toContain('href="#a-skills"');
    for (const [, command] of block.matchAll(/npx @luz-ds\/ai ([a-z]+)/g)) expect(help(), command).toMatch(new RegExp(`^  ${command}\\b`, "m"));
    // Every command is a line that copies itself, as on the cards (owner, 2026-11-26), under a label; no bar with a copy button
    expect(block.match(/<div class="landing-ai-option__cmd"><p class="landing-ai__label">[^<]+<\/p><p class="landing-ai__ask" data-copy=/g)).toHaveLength(4);
    expect(block).not.toContain("luz-copy-btn");
    expect(block).toContain(escape(words["level.ai.install.note"]));
    // No label on every line: the lead says where to type
    expect(block).not.toContain("landing-ai__where");
  });

  // ---- Below the three steps, ordered by what the reader wants (owner, 2026-11-25; .claude/plans/ai-page-redesign.md) ----

  const chatCommands = [...read(`${SKILL}/SKILL.md`).matchAll(/^\| `(\/luz[^`]*)` \|[^|]*\|[^|]*\| ([^|]*) \|$/gm)].map((m) => ({ chat: m[1], writes: /^yes/.test(m[2].trim()) }));
  const cards = (block) => [...block.matchAll(/<article\b[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const titleOf = (card) => /<p class="landing-card__title">([^<]*)<\/p>/.exec(card)?.[1];

  it("has the strip of where it works, then install it, use it, the agents, the small skills and the strip of what you decide, in that order, with no table", () => {
    for (const [, prefix] of LANGS) {
      const html = rendered.get(`${prefix}ai/`);
      // The strip of where it works sits above the links (owner, 2026-11-26)
      expect([...html.matchAll(/<section\b[^>]*\sid="(a-[a-z]+)"/g)].map((m) => m[1])).toEqual(["a-assistants", "a-install", "a-use", "a-agents", "a-skills", "a-decide"]);
      expect(html, prefix).not.toMatch(/<table\b/);
      expect(html, prefix).not.toContain("--target</th>");
    }
  });

  it.each(LANGS)("in %s: the sessions of Codex and Cursor say they follow the documentation of the assistant and that the skill is tested only in Claude Code; Claude's does not", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    const pane = (id) => new RegExp(`<div class="luz-tabpanel landing-clitabs__pane" id="${id}">([\\s\\S]*?)</figure>`).exec(html)?.[1] ?? "";
    const note = `<p class="landing-clitabs__note">${escape(catalog(code)["level.ai.tab.untested"])}</p>`;
    expect(pane("hero-codex")).toContain(note);
    expect(pane("hero-cursor")).toContain(note);
    expect(pane("hero-claude")).not.toContain("landing-clitabs__note");
  });

  it.each(LANGS)("in %s: the strip of where it works names no assistant (owner, 2026-11-26: not every one is tested), only that it works in any harness, in open formats", (code, prefix) => {
    const strip = sectionOf(rendered.get(`${prefix}ai/`), "a-assistants");
    const block = strip.slice(0, strip.indexOf("</section>"));
    const words = catalog(code);
    expect(block).toContain(escape(words["level.ai.assistants.title"]));
    expect(block).toContain(escape(words["level.ai.assistants.note"]));
    expect(words["level.ai.assistants.title"]).toMatch(/harness/i);
    for (const { assistant } of aiFacts(repo).targets.filter((x) => x.assistant)) expect(block, assistant).not.toContain(assistant);
    expect(block).not.toMatch(/<ul\b|<bdi>|<img\b/);
    for (const gone of ["level.ai.assistants.agents-md", "level.ai.assistants.tested"]) expect(words[gone], gone).toBeUndefined();
  });

  /** The label and the sentence to ask for a piece, and what a click copies: the sentence up to the name, never the hint after it. */
  const askOf = (card) => {
    const m = /<p class="landing-ai__label">([^<]*)<\/p><p class="landing-ai__ask" data-copy="([^"]*)"><code>([^<]*)<span class="landing-ai__hint">([^<]*)<\/span><\/code><\/p>/.exec(card);
    if (!m) return undefined;
    expect(m[2]).toBe(m[3]);
    return [m[1], m[3] + m[4]];
  };
  const copyOf = (card) => /<p class="landing-ai__ask" data-copy="([^"]*)">/.exec(card)?.[1];

  it.each(LANGS)("in %s: the agents are a card each, led by what it looks after and how to ask for it; how to add one is said once, under the title of the section", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-agents");
    const words = catalog(code);
    const list = cards(block);
    expect(list).toHaveLength(agents.length);
    for (const name of agents) {
      const card = list.find((c) => c.includes(`<code class="landing-ai__name">${name}</code>`));
      expect(card, name).toBeDefined();
      const at = (needle) => card.indexOf(needle);
      expect(at("landing-card__title")).toBeLessThan(at("landing-ai__name"));
      expect(at("landing-ai__name")).toBeLessThan(at("landing-ai__badge"));
      expect(at("landing-ai__badge")).toBeLessThan(at("landing-ai__text"));
      expect(at("landing-ai__text")).toBeLessThan(at("landing-ai__label"));
      const human = words[`level.ai.agent.${name}.title`];
      expect(human).not.toContain("luz-");
      expect(titleOf(card)).toBe(escape(human));
      expect(card).toContain(escape(words[`level.ai.agent.${name}.text`]));
      expect(askOf(card), name).toEqual([escape(words["level.ai.ask"]), escape(words["level.ai.agents.use"].replace("{name}", name))]);
      // A click copies the sentence up to the agent's name, not "on my page" (owner, 2026-11-26)
      expect(copyOf(card), name).toBe(escape(words["level.ai.agents.use"].slice(0, words["level.ai.agents.use"].indexOf("{name}"))+ name));
      // No fold repeated on every card (owner, 2026-11-26): the section says once how to add one
      expect(card).not.toContain("<details");
      const tools = /^tools:\s*(.*)$/m.exec(read(`${SKILL}/assets/agents/${name}.md`))[1];
      expect(card, name).toContain(`landing-ai__card--${/\b(Edit|Write|Bash)\b/.test(tools) ? "acts" : "reads"}`);
      expect(card, name).toMatch(/<svg\b[^>]*aria-hidden="true"/);
      expect(card, name).not.toContain("landing-ai__where");
    }
    expect(block).toContain(`<p class="landing-ai-goal__note">${escape(words["level.ai.agents.missing"])}</p>`);
    expect(chatCommands.find((c) => c.chat === "/luz add <name>")).toEqual({ chat: "/luz add <name>", writes: true });
    expect(block).toContain("docs/ai/agents/");
  });

  it.each(LANGS)("in %s: the small skills are a card each, what it does and how to ask for it by its own name, how to add one said once under the title, after the agents", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    const block = sectionOf(html, "a-skills");
    const words = catalog(code);
    const names = readdirSync(join(repo, SKILL, "assets/skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect(names).toEqual(["luz-license", "luz-meta", "luz-migrate", "luz-readme", "luz-theme", "luz-translate"]);
    const list = cards(block);
    expect(list).toHaveLength(names.length);
    for (const name of names) {
      const card = list.find((c) => c.includes(`<code class="landing-ai__name">${name}</code>`));
      expect(card, name).toBeDefined();
      expect(titleOf(card), name).toBe(escape(words[`level.ai.skills.${name}.title`]));
      expect(card).toContain(escape(words[`level.ai.skills.${name}.text`]));
      expect(card).toContain(`<span class="luz-badge luz-badge--gray landing-ai__badge">${escape(words["level.ai.skills.badge"])}</span>`);
      expect(askOf(card), name).toEqual([escape(words["level.ai.ask"]), escape(words["level.ai.skills.use"].replace("{name}", name))]);
      // A click copies the command of the skill, not "<what you want>" (owner, 2026-11-26)
      expect(copyOf(card), name).toBe(`/${name}`);
      expect(card).not.toContain("<details");
      expect(card).toMatch(/<svg\b[^>]*aria-hidden="true"/);
    }
    expect(block).toContain(escape(words["level.ai.skills.title"]));
    expect(block).toContain(`<p class="landing-ai-goal__note">${escape(words["level.ai.skills.missing"])}</p>`);
    expect(block).toContain("docs/ai/agents/#skills");
    expect(html.indexOf('id="a-agents"')).toBeLessThan(html.indexOf('id="a-skills"'));
  });

  it("has the words of every small skill in the three languages, and none for one that is gone", () => {
    for (const [code] of LANGS) {
      const words = catalog(code);
      const keys = Object.keys(words).filter((k) => /^level\.ai\.skills\.luz-[a-z]+\.(title|text)$/.test(k)).sort();
      expect(keys, code).toEqual(["luz-license", "luz-meta", "luz-migrate", "luz-readme", "luz-theme", "luz-translate"].flatMap((n) => [`level.ai.skills.${n}.text`, `level.ai.skills.${n}.title`]).sort());
      for (const k of ["title", "lead", "link", "badge"]) expect(words[`level.ai.skills.${k}`], `${code} ${k}`).toBeTruthy();
    }
  });

  it.each(LANGS)("in %s: an agent that changes code says so in its badge, and the ones that read say they read", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-agents");
    const words = catalog(code);
    const facts = aiFacts(repo).agents;
    expect(facts.filter((a) => a.acts).map((a) => a.name)).toEqual(["luz-agent-optimiza"]);
    for (const a of facts) {
      const card = cards(block).find((c) => c.includes(`<code class="landing-ai__name">${a.name}</code>`));
      // Every badge of the page is the grey one (owner, 2026-11-26): the words tell what a card does, not a colour
      const badge = `<span class="luz-badge luz-badge--gray landing-ai__badge">${escape(words[a.acts ? "level.ai.agents.acts" : "level.ai.agents.reads"])}</span>`;
      expect(card, a.name).toContain(badge);
      // No line says which assistants it is written for (owner, 2026-11-26): `agent add` says it, and refuses one it cannot write
      expect(card, a.name).not.toMatch(/<bdi>|landing-ai__meta/);
    }
  });

  it.each(LANGS)("in %s: before install, a list of links takes the reader to each section of the page", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    const words = catalog(code);
    const nav = /<nav class="landing-ai-toc" aria-label="([^"]*)">([\s\S]*?)<\/nav>/.exec(html);
    expect(nav, code).not.toBeNull();
    expect(nav[1]).toBe(escape(words["level.ai.toc.label"]));
    const links = [...nav[2].matchAll(/<a href="#(a-[a-z]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ["a-install", escape(words["level.ai.install.title"])],
      ["a-use", escape(words["level.ai.use.title"])],
      ["a-agents", escape(words["level.ai.agents.title"])],
      ["a-skills", escape(words["level.ai.skills.title"])],
      ["a-decide", escape(words["level.ai.limits.title"])],
    ]);
    expect(html.indexOf('class="landing-ai-toc"')).toBeLessThan(html.indexOf('id="a-install"'));
  });

  it.each(LANGS)("in %s: the closing block has one button to the docs of the skill, not two that go to the same place", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    const block = /<section class="landing-level__next" id="next"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
    const links = [...block.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toHaveLength(1);
    expect(links[0][0]).toMatch(/\/docs\/ai\/$/);
    expect(links[0][1]).toBe(escape(catalog(code)["level.ai.next.docs"]));
    expect(new Set(links.map((l) => l[0])).size).toBe(links.length);
  });

  it("does not offer an agent that changes code to Gemini CLI, which agent add does not write it for", () => {
    for (const agent of aiFacts(repo).agents) {
      expect(agent.hosts.includes("Gemini CLI"), agent.name).toBe(!agent.acts);
    }
  });

  /** The command a person types: the chat column without its arguments (`/luz new`, `/luz add`, `/luz check`). */
  const shortOf = (chat) => chat.replace(/ [<[].*$/, "");

  // Use it: the commands of the chat, in three tabs by what the reader wants to do (core tabs: without JS the panels stack)
  const TABS = { create: ["start", "new", "magic"], check: ["doctor", "lint", "facts", "help"], manage: ["list", "agents", "skills", "add", "remove"] };
  const rowsOf = (pane) => [...pane.matchAll(/<li class="landing-ai-cmd"><p class="landing-ai__ask" data-copy="[^"]*"><code>([^<]*(?:<span class="landing-ai__hint">[^<]*<\/span>)?)<\/code><\/p><p class="landing-ai-cmd__text">([^<]*)<\/p><span class="luz-badge luz-badge--gray landing-ai__badge">([^<]*)<\/span><\/li>/g)].map((m) => ({ typed: m[1], text: m[2], badge: m[3] }));

  it("puts every command of the table of SKILL.md in one tab, and only once", () => {
    const slugs = commandRows(repo).map((r) => r.slug);
    expect(Object.values(TABS).flat().sort()).toEqual([...slugs].sort());
  });

  it.each(LANGS)("in %s: Use it is three tabs, create a site, check your project, add and remove, each a list of rows: the command, what it does, whether it writes", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-use");
    const words = catalog(code);
    const rows = commandRows(repo);
    expect(block).toContain(escape(words["level.ai.use.title"]));
    expect(block).toContain(escape(words["level.ai.use.lead"]));
    const nav = /<nav class="luz-tabs landing-ai-use__tabs" aria-label="([^"]*)">([\s\S]*?)<\/nav>/.exec(block);
    expect(nav).not.toBeNull();
    expect(nav[1]).toBe(escape(words["level.ai.use.tabs"]));
    expect([...nav[2].matchAll(/<a class="luz-tab" href="#a-use-([a-z]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]])).toEqual(Object.keys(TABS).map((k) => [k, escape(words[`level.ai.use.${k}`])]));
    for (const [tab, slugs] of Object.entries(TABS)) {
      const pane = new RegExp(`<div class="luz-tabpanel landing-ai-use__pane" id="a-use-${tab}">([\\s\\S]*?)</div>`).exec(block)?.[1] ?? "";
      expect(pane, tab).toMatch(new RegExp(`<h3 class="landing-ai-use__title">${escape(words[`level.ai.use.${tab}`])}</h3>`));
      const list = rowsOf(pane);
      expect(list.map((r) => r.text), tab).toEqual(slugs.map((slug) => escape(words[`level.ai.cmd.${slug}`])));
      slugs.forEach((slug, i) => {
        const row = rows.find((r) => r.slug === slug);
        expect(list[i].typed, slug).toMatch(new RegExp(`^${escape(shortOf(row.chat)).replace(/\//g, "\\/")}`));
        expect(list[i].badge, slug).toBe(escape(words[row.writes ? "level.ai.cmd.writes" : "level.ai.cmd.reads"]));
      });
    }
    // How a session goes, in the tab that creates a site: the four phases, in order
    const create = /<div class="luz-tabpanel landing-ai-use__pane" id="a-use-create">([\s\S]*?)<\/div>/.exec(block)[1];
    const phases = [...create.matchAll(/<li><span class="landing-ai-phases__n" aria-hidden="true">\d<\/span><strong>([^<]*)<\/strong><span>([^<]*)<\/span><\/li>/g)].map((m) => m[1]);
    expect(phases).toEqual(["ask", "plan", "write", "check"].map((k) => escape(words[`level.ai.skill.${k}.title`])));
    // The terminal is the docs' page, one link: no terminal line here
    expect(block).toMatch(/href="[^"]*\/docs\/ai\/commands\/"/);
    expect(block).toContain(escape(words["level.ai.use.terminal"]));
    expect(block).not.toMatch(/npx @luz-ds\/ai/);
    for (const slug of ["doctor", "lint", "facts", "agents", "skills", "list", "help"]) expect(rows.find((r) => r.slug === slug).writes, slug).toBe(false);
    for (const slug of ["add", "remove", "magic"]) expect(rows.find((r) => r.slug === slug).writes, slug).toBe(true);
  });

  it("has a sentence for every command in the three languages, and none for a command that is gone", () => {
    const slugs = commandRows(repo).map((r) => r.slug);
    expect(slugs).toContain(slugOf("/luz"));
    for (const [code] of LANGS) {
      const words = catalog(code);
      const keys = Object.keys(words).filter((k) => /^level\.ai\.cmd\.[a-z-]+$/.test(k) && !["level.ai.cmd.writes", "level.ai.cmd.reads"].includes(k));
      expect(keys.sort(), code).toEqual(slugs.map((x) => `level.ai.cmd.${x}`).sort());
      for (const k of ["install.title", "install.lead", "install.recommended", "install.note", "install.all.title", "install.all.text", "install.gets.luz", "install.gets.agents", "install.gets.skills", "install.gets.agents.pick", "install.gets.skills.pick", "install.gets.no", "agents.missing", "skills.missing", "install.min.title", "install.min.text", "install.pick.title", "install.pick.text", "use.title", "use.lead", "use.tabs", "use.create", "use.check", "use.manage", "use.terminal", "ask", "agents.use", "skills.use", "hero.install"]) expect(words[`level.ai.${k}`], `${code} ${k}`).toBeTruthy();
      for (const k of ["where.chat", "where.terminal", "line.install", "line.use", "install.init", "install.all", "commands.title", "commands.lead", "steps.title", "steps.1.title", "notinstalled", "install.all.gets", "install.min.gets"]) expect(words[`level.ai.${k}`], `${code} ${k} is gone`).toBeUndefined();
      expect(words["level.ai.commands.writes"], code).toBeUndefined();
      expect(words["level.ai.cmd.writes"], code).toBeTruthy();
      expect(words["level.ai.cmd.reads"], code).toBeTruthy();
    }
  });

  it.each(LANGS)("in %s: the last strip is what you decide, five promises of the skill", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-decide");
    const words = catalog(code);
    expect(block.match(/<li\b/g)).toHaveLength(5);
    for (const n of [1, 2, 3, 4, 5]) expect(block).toContain(escape(words[`level.ai.limits.${n}`]));
    expect(block).toContain(escape(words["level.ai.limits.title"]));
  });

  it("has the words of every agent in the three languages, and none for one that is gone", () => {
    for (const [code] of LANGS) {
      const words = catalog(code);
      const keys = Object.keys(words).filter((k) => /^level\.ai\.agent\.[a-z-]+\.(title|text)$/.test(k));
      const expected = agents.map((n) => `level.ai.agent.${n}`).flatMap((k) => [`${k}.title`, `${k}.text`]);
      expect(keys.sort(), code).toEqual(expected.sort());
    }
  });

  it.each(LANGS)("in %s: the home's fourth level has a button to the page, in the language of the home", (code, prefix) => {
    const section = sectionOf(rendered.get(prefix), "ai");
    expect(section).toMatch(new RegExp(`<a class="luz-btn[^"]*" href="${prefix}ai/">`));
  });
});
