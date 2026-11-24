/**
 * The sources of the home's fourth level, "Your whole site, from a conversation" (.claude/plans/luz-ai-skill.md,
 * part A, and the owner on 2026-11-24): the terminal of the luz-start skill, an emulation of a real session in which
 * the visitor answers. The rendered page is tests/home-cli.spec.js; here the template, the generator
 * (scripts/docs-site/cli-demo.js), the script, the stylesheet and the catalogs:
 *
 *  - the template says {{cli}}, and the generator writes the terminal: left to right, named, its screen a polite
 *    live region, the button that brings the next line hidden until the script shows it;
 *  - the session is the skill's: init, the assistant, three questions whose answers are buttons (the kind of site,
 *    the stack, what matters, which picks the agents), the plan, go, site new, the check and agent add; every line
 *    the script prints is what `luz-start.mjs` prints, and the check's is what luz-check says of that page;
 *  - without JavaScript the session of the default answers shows: every other variant and every question's buttons
 *    are `hidden`;
 *  - the home has no prompt left; landing.js starts cli.js; its animation is finite and only when motion is welcome;
 *  - the three catalogs have the same keys for it, and none of the old kinds of site.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLI_AGENTS, CLI_DEFAULTS, CLI_KINDS, CLI_STACKS, cliDemo, matchesDefaults } from "../scripts/docs-site/cli-demo.js";
import { escapeHtml } from "../scripts/docs-site/site.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const LANGS = ["en", "es", "ar"];
const catalogs = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(read(`apps/landing/i18n/${lang}.json`))]));
const home = read("apps/landing/index.html");
const level4 = home.slice(home.indexOf('id="ai"'), home.indexOf("</section>", home.indexOf('id="ai"')));
const css = read("apps/landing/landing.css");
const SCRIPT = join(repo, "packages/ai/skills/luz-start/scripts/luz-start.mjs");
/** The terminal as the generator writes it, in English. */
const terminal = cliDemo({ say: (key) => catalogs.en[key], root: repo, escapeHtml }).cli;
const unescape = (text) => text.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
/** Every element of the screen with its `data-when` and whether it is `hidden` in the markup. */
const conditioned = [...terminal.matchAll(/<[a-z]+\b[^>]*\sdata-when="([^"]*)"[^>]*>/g)].map((m) => ({ when: m[1], hidden: /\shidden\b/.test(m[0]) }));

describe("the template of level 4 and the terminal the generator writes", () => {
  it("the template leaves the terminal to the generator: {{cli}}, once", () => {
    expect(level4.match(/\{\{cli\}\}/g)).toHaveLength(1);
    expect(level4).not.toContain("landing-cli__line");
  });

  it("is a terminal, left to right, named, with its screen a polite live region", () => {
    expect(terminal).toMatch(new RegExp(`^<figure class="landing-cli" dir="ltr" aria-label="${escapeHtml(catalogs.en["inside.l4.panel"])}" data-landing-cli>`));
    expect(terminal).toMatch(/<div class="landing-cli__screen" aria-live="polite">/);
    expect(terminal).toMatch(/<div class="landing-cli__bar" aria-hidden="true">/);
  });

  it("has the button that brings the next line, hidden until the script shows it, with the key that presses it", () => {
    expect(terminal).toContain(`<button class="luz-btn luz-btn--ghost luz-btn--sm landing-cli__next" type="button" hidden><kbd>Enter</kbd> <span data-cli-next>${catalogs.en["inside.l4.next"]}</span><span data-cli-replay hidden>${catalogs.en["inside.l4.replay"]}</span></button>`);
  });

  it("asks three questions and waits for go, each a group of buttons hidden until the script shows it, the default answers pressed", () => {
    const groups = [...terminal.matchAll(/<div class="landing-cli__choices" role="group" aria-label="[^"]+" data-ask="([a-z]+)"( data-multi)? hidden>([\s\S]*?)<\/div>/g)];
    expect(groups.map((m) => m[1])).toEqual(["kind", "stack", "agent", "go"]);
    const values = (body) => [...body.matchAll(/data-value="([^"]+)" aria-pressed="(true|false)"/g)].map((m) => [m[1], m[2] === "true"]);
    expect(values(groups[0][3])).toEqual(CLI_KINDS.map((k) => [k, k === CLI_DEFAULTS.kind]));
    expect(values(groups[1][3])).toEqual(CLI_STACKS.map((s) => [s, s === CLI_DEFAULTS.stack]));
    expect(groups[2][2], "what matters takes any number of answers").toBe(" data-multi");
    expect(values(groups[2][3])).toEqual(CLI_AGENTS.map(([, name]) => [name, CLI_DEFAULTS.agents.includes(name)]));
    expect(groups[2][3]).toContain(`data-done>${catalogs.en["inside.cli.continue"]}</button>`);
    // the recommended answer says so in words, not by its place alone
    expect(groups[0][3]).toContain(`data-value="landing" aria-pressed="true">${catalogs.en["level.catalog.kind.landing"]} <span class="landing-cli__rec">${escapeHtml(catalogs.en["inside.cli.recommended"])}</span>`);
  });

  it("without JavaScript shows the session of the default answers: every other variant is hidden, every one of them is not", () => {
    expect(conditioned.length).toBeGreaterThan(20);
    for (const { when, hidden } of conditioned) expect(hidden, when).toBe(!matchesDefaults(when));
    expect(conditioned.some(({ when }) => when.includes("kind=blog"))).toBe(true);
    expect(conditioned.some(({ when }) => when.includes("stack=astro"))).toBe(true);
    expect(conditioned.some(({ when }) => when === "agent=luz-ai-auditor")).toBe(true);
  });

  it("prints what the script prints: each output line is a line of its dry run, said as written", () => {
    const run = (...args) => execFileSync(process.execPath, [SCRIPT, ...args, "--dry-run"], { cwd: repo, encoding: "utf-8" }).replace(/\bwould write\b/g, "wrote");
    const real = [
      run("init", "--target", "claude"),
      ...CLI_KINDS.flatMap((k) => ["vanilla", "astro"].map((s) => run("site", "new", "--name", "Vejer Books", "--kind", k, "--stack", s, "--target", ".").replace(/^--- /m, "  "))),
      ...CLI_AGENTS.map(([, name]) => run("agent", "add", name, "--for", "claude")),
      run("skill", "add", "luz-create-landing"),
    ].join("\n");
    const outs = [...terminal.matchAll(/<p class="landing-cli__line landing-cli__line--out"[^>]*><samp>([^<]*)<\/samp><\/p>/g)].map((m) => unescape(m[1]));
    expect(outs.length).toBeGreaterThan(20);
    for (const line of outs.filter((l) => !l.startsWith("✓"))) expect(real.split("\n"), line).toContain(line);
  });

  it("runs only the commands the skill has: init, the assistant, luz-start's own and the check it prints", () => {
    const help = execFileSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf-8" });
    const cmds = [...terminal.matchAll(/<span class="landing-cli__mark" aria-hidden="true">\$<\/span> <code>([^<]*)<\/code>/g)].map((m) => unescape(m[1]));
    expect(cmds[0]).toBe("npx @luz-ds/ai init --target claude");
    expect(cmds[1]).toBe("claude");
    for (const cmd of cmds.slice(2)) {
      if (cmd.startsWith("luz-start ")) expect(help, cmd).toMatch(new RegExp(`^  ${cmd.split(" ")[1]}\\b`, "m"));
      else expect(cmd).toMatch(/^npx @luz-ds\/check@\d+\.\d+\.\d+ \.( --ext \.astro)?$/);
    }
  });

  it("says of the starter page what luz-check says of it", () => {
    const dir = mkdtempSync(join(tmpdir(), "luz-cli-"));
    try {
      execFileSync(process.execPath, [SCRIPT, "site", "new", "--name", "Vejer Books", "--kind", CLI_DEFAULTS.kind, "--stack", CLI_DEFAULTS.stack, "--target", dir], { encoding: "utf-8" });
      const said = execFileSync(process.execPath, [join(repo, "packages/check/dist/luz-check.js"), dir], { encoding: "utf-8" });
      const line = /<samp>(✓[^<]*)<\/samp>/.exec(terminal)[1];
      expect(said.startsWith(line), said).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("shows, after init, the title the script prints in a terminal: its own lines, the word read out as LUZ", () => {
    const banner = JSON.parse(/^const BANNER = (\[[\s\S]*?\]);$/m.exec(read("packages/ai/skills/luz-start/scripts/luz-start.mjs"))[1]);
    const art = /<div class="landing-cli__line landing-cli__line--banner"><pre class="landing-cli__art" aria-hidden="true">([\s\S]*?)<\/pre><span class="u-sr-only">LUZ<\/span><\/div>/.exec(terminal);
    expect(art, "the title, hidden from a screen reader, with the word for it").not.toBeNull();
    expect(unescape(art[1])).toBe(banner.join("\n"));
    expect(terminal.indexOf("landing-cli__line--banner")).toBeGreaterThan(terminal.indexOf("npx @luz-ds/ai init --target claude"));
    expect(terminal.indexOf("landing-cli__line--banner")).toBeLessThan(terminal.indexOf("init: wrote"));
  });

  it("says the skill is not published yet, with the way to the prompts until it is", () => {
    expect(level4).toMatch(/<span class="luz-badge luz-badge--primary">\{\{t:inside\.l4\.soon\}\}<\/span> <a href="\/docs\/kinds\/">\{\{t:inside\.l4\.meanwhile\}\}<\/a>/);
  });

  it("has no prompt left on the home: no opener, no dialog, no stylesheet of it, no card of a kind of site", () => {
    expect(home).not.toMatch(/data-prompt-open|luz:include prompt-dialog|prompt-dialog\.css|\/prompts\/[a-z]+\.txt/);
    expect(home).not.toMatch(/landing-kind|landing-scratch|inside\.kind\.|inside\.start\./);
    expect(css).not.toMatch(/landing-kind|landing-scratch|inside__kinds/);
  });

  it("keeps the footer's link to the level, under its new words", () => {
    const footer = home.slice(home.indexOf("<footer"), home.indexOf("</footer>"));
    expect(footer).toContain('<a href="#ai">{{t:footer.ai}}</a>');
    expect(home).not.toContain("footer.prompts");
  });
});

describe("apps/landing/landing.js and cli.js", () => {
  const js = read("apps/landing/landing.js");
  // Read only when it is there, so a missing module fails its tests one by one, not the file
  const cli = existsSync(join(repo, "apps/landing/cli.js")) ? read("apps/landing/cli.js") : "";

  it("starts the terminal and no prompt dialog", () => {
    expect(js).toMatch(/import \{ initCli \} from "\/apps\/landing\/cli\.js";/);
    expect(js).toMatch(/^initCli\(\);/m);
    expect(js).not.toContain("initPromptDialogs");
  });

  it("brings one line at a time, on its button or a click in the terminal, waits on a question, hides the rest with `hidden`, and plays again from the start", () => {
    expect(cli).toMatch(/item\.hidden = /);
    expect(cli).toMatch(/next\.addEventListener\("click", step\)/);
    expect(cli).toMatch(/cli\.addEventListener\("click"/);
    expect(cli).toMatch(/aria-pressed/);
    expect(cli).toMatch(/const restart = /);
  });

  it("keeps one height and scrolls to the last line, so the page never moves", () => {
    expect(cli).toMatch(/screen\.scrollTop = screen\.scrollHeight/);
    expect(css).toMatch(/\.landing-cli\[data-cli="step"\] \.landing-cli__screen \{[^}]*block-size:[^}]*overflow-y: auto/);
  });

  it("animates a new line only when motion is welcome, a finite number of times", () => {
    const motion = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference) {\n  .landing-cli__line.is-new"));
    expect(motion).toMatch(/^@media \(prefers-reduced-motion: no-preference\) \{\n {2}\.landing-cli__line\.is-new \{\n {4}animation: luz-fade-in/);
    const caret = motion.match(/animation: landing-cli-caret var\(--luz-duration-lazy\) steps\(1, end\) var\(--luz-duration-slow\) (\d+);/);
    expect(caret, "the caret blinks a few times").not.toBeNull();
    // 0.8 s a blink: the caret stops before five seconds (WCAG 2.2.2)
    expect(Number(caret[1]) * 0.8).toBeLessThan(5);
  });
});

describe("the catalogs, in en, es and ar", () => {
  const level = (lang) => Object.keys(catalogs[lang]).filter((key) => /^inside\.(cli|l4)\./.test(key)).sort();

  it("have the same keys for level 4", () => {
    expect(level("es")).toEqual(level("en"));
    expect(level("ar")).toEqual(level("en"));
    expect(level("en")).toEqual(expect.arrayContaining(["inside.l4.next", "inside.l4.replay", "inside.l4.soon", "inside.l4.meanwhile", "inside.cli.ask", "inside.cli.kind", "inside.cli.stack", "inside.cli.agents", "inside.cli.go", "inside.cli.build"]));
  });

  it("have no key of the old prompts of the home", () => {
    for (const lang of LANGS) {
      const keys = Object.keys(catalogs[lang]);
      expect(keys.filter((key) => /^inside\.(kind|start)\./.test(key)), lang).toEqual([]);
      expect(keys, lang).not.toContain("footer.prompts");
      expect(keys, lang).toContain("footer.ai");
    }
  });

  it("name no layer in the eyebrow (the skill picks tokens, core or the catalog), and the title is a conversation", () => {
    for (const lang of LANGS) expect(catalogs[lang]["inside.l4.eyebrow"], lang).not.toMatch(/\+/);
    expect(catalogs.en["inside.l4.title"].replace(/<[^>]*>/g, "")).toBe("Your whole site, from a conversation");
  });
});
