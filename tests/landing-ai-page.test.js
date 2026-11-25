/**
 * The page of the luz skill, /ai/ (owner, 2026-11-23): a page like the catalog's, with a hero whose live part is
 * the home's terminal, how to install and use the skill, and blocks that say what it does, the agents and skills it
 * adds, the assistants it works with and what it never does. The home's fourth level has a button to it.
 *
 * Every fact of the package is read from packages/ai/skills/luz/ and never typed (scripts/docs-site/ai-page.js):
 * a new agent or skill needs its words in the catalogs, and the page names exactly what the skill carries.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, scanSite } from "../scripts/docs-site/site.js";
import { AI_COMMANDS, aiFacts } from "../scripts/docs-site/ai-page.js";
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
const skills = readdirSync(join(repo, SKILL, "assets/skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

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

  it.each(LANGS)("in %s: the hero's numbers are the package's: agents, skills, ways to install and dependencies", (code, prefix) => {
    const facts = aiFacts(repo);
    const numbers = [...sectionOf(rendered.get(`${prefix}ai/`), "hero").matchAll(/<li><strong>([^<]*)<\/strong>/g)].map((m) => m[1]);
    expect(numbers).toEqual([agents.length, skills.length, facts.targets.length, 0].map(String));
  });

  it("installs and uses the skill in three steps, with commands the skill has", () => {
    const steps = sectionOf(rendered.get("/ai/"), "steps");
    expect(steps.match(/class="landing-path__step landing-path__step--\d"/g)).toHaveLength(3);
    expect(steps).toContain("npx @luz-ds/ai init --target claude");
    const help = execFileSync(process.execPath, [join(repo, SKILL, "scripts/luz.mjs"), "--help"], { encoding: "utf-8" });
    for (const [, command] of steps.matchAll(/npx @luz-ds\/ai ([a-z]+)/g)) expect(help, command).toMatch(new RegExp(`^  ${command}\\b`, "m"));
    for (const command of AI_COMMANDS) expect(help, command).toMatch(new RegExp(`^  ${command.split(" ")[0]}\\b`, "m"));
  });

  it("has the blocks the commands of the chat, what it does, agents, skills, assistants and limits, in that order", () => {
    const html = rendered.get("/ai/");
    const ids = [...html.matchAll(/<section\b[^>]*\sid="(a-[a-z]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["a-commands", "a-does", "a-agents", "a-skills", "a-assistants", "a-limits"]);
  });

  it.each(LANGS)("in %s: lists every command of /luz, from the Subcommands table of SKILL.md, in the language, with its page", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-commands");
    const skillMd = read(`${SKILL}/SKILL.md`);
    const chat = [...skillMd.matchAll(/^\| `(\/luz[^`]*)` \|/gm)].map((m) => m[1]);
    expect(chat).toHaveLength(9);
    for (const c of chat) expect(block, c).toContain(`<code>${escape(c)}</code>`);
    expect(block.match(/<tr>/g)).toHaveLength(chat.length + 1);
    for (const key of ["level.ai.chat.start", "level.ai.chat.doctor", "level.ai.chat.help"]) expect(block, key).toContain(escape(catalog(code)[key]));
    expect(block).toContain("docs/ai/commands/");
  });

  it.each(LANGS)("in %s: names every agent the skill carries, once, with what it does in the language and whether it changes code", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-agents");
    const words = catalog(code);
    for (const name of agents) {
      expect(block.split(`<code>${name}</code>`).length - 1, name).toBe(1);
      expect(block).toContain(escape(words[`level.ai.agent.${name}`]));
      const tools = /^tools:\s*(.*)$/m.exec(read(`${SKILL}/assets/agents/${name}.md`))[1];
      const acts = /\b(Edit|Write|Bash)\b/.test(tools);
      const card = new RegExp(`landing-ai__card--${acts ? "acts" : "reads"}"><p class="landing-card__title"><code>${name}</code>`);
      expect(block, name).toMatch(card);
    }
    expect(block.match(/<article\b/g)).toHaveLength(agents.length);
  });

  it("does not offer an agent that changes code to Gemini CLI, which agent add does not write it for", () => {
    for (const agent of aiFacts(repo).agents) {
      expect(agent.hosts.includes("Gemini CLI"), agent.name).toBe(!agent.acts);
    }
  });

  it.each(LANGS)("in %s: names every skill the skill carries, once, with what it does in the language", (code, prefix) => {
    const block = sectionOf(rendered.get(`${prefix}ai/`), "a-skills");
    for (const name of skills) {
      expect(block.split(`<code>${name}</code>`).length - 1, name).toBe(1);
      expect(block).toContain(escape(catalog(code)[`level.ai.skill.${name}`]));
    }
    expect(block.match(/<article\b/g)).toHaveLength(skills.length);
  });

  it("lists every target of init with the folder it writes, as init --help says", () => {
    const block = sectionOf(rendered.get("/ai/"), "a-assistants");
    const help = execFileSync(process.execPath, [join(repo, SKILL, "scripts/luz.mjs"), "init", "--help"], { encoding: "utf-8" });
    const rows = [...block.matchAll(/<tr><th scope="row"><code>([a-z-]+)<\/code><\/th><td>[\s\S]*?<\/td><td><code>([^<]+)<\/code><\/td><\/tr>/g)].map((m) => [m[1], m[2]]);
    expect(rows.map(([id]) => id)).toEqual(["claude", "codex", "gemini", "cursor", "agents-md"]);
    for (const [id, folder] of rows) {
      expect(help, id).toContain(id);
      expect(help, folder).toContain(folder);
    }
  });

  it.each(LANGS)("in %s: the home's fourth level has a button to the page, in the language of the home", (code, prefix) => {
    const section = sectionOf(rendered.get(prefix), "ai");
    expect(section).toMatch(new RegExp(`<a class="luz-btn[^"]*" href="${prefix}ai/">`));
  });
});
