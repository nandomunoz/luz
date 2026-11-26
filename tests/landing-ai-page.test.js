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
    expect(hero).toMatch(/<a class="luz-btn luz-btn--primary" href="#steps">/);
  });

  it.each(LANGS)("in %s: the hero's numbers are the package's: agents, ways to install and dependencies", (code, prefix) => {
    const facts = aiFacts(repo);
    const numbers = [...sectionOf(rendered.get(`${prefix}ai/`), "hero").matchAll(/<li><strong>([^<]*)<\/strong>/g)].map((m) => m[1]);
    expect(numbers).toEqual([agents.length, facts.targets.length, 0].map(String));
  });

  it("installs and uses the skill in three steps, with commands the skill has", () => {
    const steps = sectionOf(rendered.get("/ai/"), "steps");
    expect(steps.match(/class="landing-path__step landing-path__step--\d"/g)).toHaveLength(3);
    expect(steps).toContain("npx @luz-ds/ai init --target claude");
    const help = execFileSync(process.execPath, [join(repo, SKILL, "scripts/luz.mjs"), "--help"], { encoding: "utf-8" });
    for (const [, command] of steps.matchAll(/npx @luz-ds\/ai ([a-z]+)/g)) expect(help, command).toMatch(new RegExp(`^  ${command}\\b`, "m"));
  });

  // ---- Below the three steps, ordered by what the reader wants (owner, 2026-11-25; .claude/plans/ai-page-redesign.md) ----

  const chatCommands = [...read(`${SKILL}/SKILL.md`).matchAll(/^\| `(\/luz[^`]*)` \|[^|]*\|[^|]*\| ([^|]*) \|$/gm)].map((m) => ({ chat: m[1], writes: /^yes/.test(m[2].trim()) }));
  const help = () => execFileSync(process.execPath, [join(repo, SKILL, "scripts/luz.mjs"), "--help"], { encoding: "utf-8" });
  const cards = (block) => [...block.matchAll(/<article\b[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const titleOf = (card) => /<p class="landing-card__title">([^<]*)<\/p>/.exec(card)?.[1];

  it("has the assistants' strip, then a section for each element of the skill (commands, agents, the skill) and the strip of what you decide, in that order, with no table", () => {
    for (const [, prefix] of LANGS) {
      const html = rendered.get(`${prefix}ai/`);
      expect([...html.matchAll(/<section\b[^>]*\sid="(a-[a-z]+)"/g)].map((m) => m[1])).toEqual(["a-assistants", "a-commands", "a-agents", "a-skill", "a-decide"]);
      // The two tables of commands and the one of assistants are in /docs/ai/ now, not here
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

  it.each(LANGS)("in %s: the strip of assistants names the ones init writes for, from the package, and says where the skill is tested", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-assistants");
    for (const { assistant } of aiFacts(repo).targets.filter((x) => x.assistant)) expect(block, assistant).toContain(`<li><bdi>${assistant}</bdi></li>`);
    expect(block).toContain(escape(catalog(code)["level.ai.assistants.agents-md"]));
    expect(block).toContain(escape(catalog(code)["level.ai.assistants.tested"]));
    expect(block).not.toMatch(/<img\b/);
  });

  it.each(LANGS)("in %s: the section of the skill is the phases of a session, each with what you say or what runs, and every command of it is the skill's", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-skill");
    const words = catalog(code);
    const list = cards(block);
    expect(list.map(titleOf)).toEqual(["ask", "plan", "write", "check"].map((k) => escape(words[`level.ai.skill.${k}.title`])));
    const says = [...block.matchAll(/<p class="landing-ai__ask"><span class="landing-ai__mark" aria-hidden="true">(.)<\/span> <code>([^<]*)<\/code>/g)].map((m) => [m[1], m[2]]);
    expect(says).toEqual([["›", "/luz"], ["›", escape(words["inside.cli.go.button"])], ["$", "luz-ai new --kind landing"], ["$", "npx @luz-ds/check"]]);
    expect(chatCommands.map((c) => c.chat)).toContain("/luz");
    expect(help()).toMatch(/^ {2}new\b/m);
    expect(block).toMatch(/href="[^"]*\/docs\/ai\/"/);
  });

  it.each(LANGS)("in %s: the agents are a card each, a human name over the technical one, what it looks after, whether it changes code, and the sentence that adds it", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-agents");
    const words = catalog(code);
    const list = cards(block);
    expect(list).toHaveLength(agents.length);
    for (const name of agents) {
      const card = list.find((c) => c.includes(`<code>${name}</code>`));
      expect(card, name).toBeDefined();
      expect(card.split(`<code>${name}</code>`).length - 1, name).toBe(1);
      const human = words[`level.ai.agent.${name}.title`];
      expect(human, `${code}: a human name for ${name}`).toBeTruthy();
      expect(human).not.toContain("luz-");
      expect(titleOf(card)).toBe(escape(human));
      expect(card).toContain(escape(words[`level.ai.agent.${name}.text`]));
      const tools = /^tools:\s*(.*)$/m.exec(read(`${SKILL}/assets/agents/${name}.md`))[1];
      expect(card, name).toContain(`landing-ai__card--${/\b(Edit|Write|Bash)\b/.test(tools) ? "acts" : "reads"}`);
      expect(card, name).toContain(`<code>/luz add ${name}</code>`);
      expect(card, name).toMatch(/<svg\b[^>]*aria-hidden="true"/);
    }
    expect(chatCommands.find((c) => c.chat === "/luz add <name>")).toEqual({ chat: "/luz add <name>", writes: true });
    expect(block).toContain('docs/ai/agents/');
  });

  it.each(LANGS)("in %s: an agent that changes code says so in its badge, and the ones that read say they read", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-agents");
    const words = catalog(code);
    const facts = aiFacts(repo).agents;
    expect(facts.filter((a) => a.acts).map((a) => a.name)).toEqual(["luz-agent-optimiza"]);
    for (const a of facts) {
      const card = cards(block).find((c) => c.includes(`<code>${a.name}</code>`));
      const badge = a.acts ? `<span class="luz-badge luz-badge--primary landing-ai__badge">${escape(words["level.ai.agents.acts"])}</span>` : `<span class="luz-badge luz-badge--gray landing-ai__badge">${escape(words["level.ai.agents.reads"])}</span>`;
      expect(card, a.name).toContain(badge);
      expect(card.includes("<bdi>Gemini CLI</bdi>"), a.name).toBe(!a.acts);
    }
  });

  it.each(LANGS)("in %s: below the strip of assistants, a list of links takes the reader to each section of the page", (code, prefix) => {
    const html = rendered.get(`${prefix}ai/`);
    const words = catalog(code);
    const nav = /<nav class="landing-ai-toc" aria-label="([^"]*)">([\s\S]*?)<\/nav>/.exec(html);
    expect(nav, code).not.toBeNull();
    expect(nav[1]).toBe(escape(words["level.ai.toc.label"]));
    const links = [...nav[2].matchAll(/<a href="#(a-[a-z]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      ["a-commands", escape(words["level.ai.commands.title"])],
      ["a-agents", escape(words["level.ai.agents.title"])],
      ["a-skill", escape(words["level.ai.skill.title"])],
      ["a-decide", escape(words["level.ai.limits.title"])],
    ]);
    expect(html.indexOf('class="landing-ai-toc"')).toBeGreaterThan(html.indexOf('id="a-assistants"'));
    expect(html.indexOf('class="landing-ai-toc"')).toBeLessThan(html.indexOf('id="a-commands"'));
  });

  it("does not offer an agent that changes code to Gemini CLI, which agent add does not write it for", () => {
    for (const agent of aiFacts(repo).agents) {
      expect(agent.hosts.includes("Gemini CLI"), agent.name).toBe(!agent.acts);
    }
  });

  /** The command a person types: the chat column without its arguments (`/luz new`, `/luz add`, `/luz check`). */
  const shortOf = (chat) => chat.replace(/ [<[].*$/, "");

  it.each(LANGS)("in %s: the commands are a card each, one for every row of the table of SKILL.md, with the command, what it does and whether it writes", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-commands");
    const words = catalog(code);
    const rows = commandRows(repo);
    const list = cards(block);
    expect(list).toHaveLength(rows.length);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    // Two groups (owner, 2026-11-25: the page again): the commands that write, after your go, then the ones that only read
    const groups = [...block.matchAll(/<div class="landing-ai-group" id="(a-commands-[a-z]+)">\s*<h3 class="landing-ai-group__title" id="\1-title">([^<]*)<\/h3>([\s\S]*?)<\/div>\s*<\/div>/g)];
    expect(groups.map((g) => [g[1], g[2]])).toEqual([["a-commands-writes", escape(words["level.ai.commands.writes"])], ["a-commands-reads", escape(words["level.ai.commands.reads"])]]);
    expect(cards(groups[0][3]).map(titleOf)).toEqual(rows.filter((r) => r.writes).map((r) => escape(shortOf(r.chat))));
    expect(cards(groups[1][3]).map(titleOf)).toEqual(rows.filter((r) => !r.writes).map((r) => escape(shortOf(r.chat))));
    [...rows.filter((r) => r.writes), ...rows.filter((r) => !r.writes)].forEach((row, i) => {
      const card = list[i];
      expect(titleOf(card), row.slug).toBe(escape(shortOf(row.chat)));
      expect(card, row.slug).toContain(escape(words[`level.ai.cmd.${row.slug}`]));
      expect(card, row.slug).toContain(escape(words[row.writes ? "level.ai.cmd.writes" : "level.ai.cmd.reads"]));
      expect(card, row.slug).toMatch(new RegExp(`<p class="landing-ai__ask">[^]*<code>${escape(shortOf(row.chat)).replace(/\//g, "\\/")}[^<]*</code>`));
      expect(card, row.slug).toMatch(/<svg\b[^>]*aria-hidden="true"/);
    });
    expect(block).toContain("docs/ai/commands/");
    // The two that only read and never change a file, said plainly
    for (const slug of ["doctor", "lint", "facts", "agents", "help"]) expect(rows.find((r) => r.slug === slug).writes, slug).toBe(false);
  });

  it("has a sentence for every command in the three languages, and none for a command that is gone", () => {
    const slugs = commandRows(repo).map((r) => r.slug);
    expect(slugs).toContain(slugOf("/luz"));
    for (const [code] of LANGS) {
      const words = catalog(code);
      const keys = Object.keys(words).filter((k) => /^level\.ai\.cmd\.[a-z-]+$/.test(k) && !["level.ai.cmd.writes", "level.ai.cmd.reads"].includes(k));
      expect(keys.sort(), code).toEqual(slugs.map((x) => `level.ai.cmd.${x}`).sort());
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
