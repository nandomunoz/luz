/**
 * The sources of the home's fourth level, "Your whole site, from a conversation" (.claude/plans/luz-ai-skill.md,
 * part A, and the owner on 2026-11-24): the terminal of the luz skill, an emulation of a real session in which
 * the visitor answers. The rendered page is tests/home-cli.spec.js; here the template, the generator
 * (scripts/docs-site/cli-demo.js), the script, the stylesheet and the catalogs:
 *
 *  - the home's template says {{cliloop}} and the page of the skill's {{cli}}; the generator writes the terminal: left
 *    to right, named, its screen a polite live region. The page of the skill's has the button that brings the next
 *    line, hidden until the script shows it; the home's is an animation that plays the same session again and
 *    again (owner, 2026-11-24), with a button to pause it (WCAG 2.2.2) and nothing to answer;
 *  - the session is the skill's: init, the assistant, three questions whose answers are buttons (the kind of site,
 *    the stack, what matters, which picks the agents), the plan, go, site new, the check and agent add; every line
 *    the script prints is what `luz.mjs` prints, and the check's is what luz-check says of that page;
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
const SCRIPT = join(repo, "packages/ai/skills/luz/scripts/luz.mjs");
/** The terminal as the generator writes it, in English. */
const written = cliDemo({ say: (key) => catalogs.en[key], root: repo, escapeHtml });
const terminal = written.cli;
/** The same terminal as the home has it: the animation. */
const loop = written.cliloop;
const aiPage = read("apps/landing/levels/ai.html");
const screenOf = (html) => /<div class="landing-cli__screen"[^>]*>([\s\S]*)<\/div>\n<button/.exec(html)?.[1] ?? "";
const unescape = (text) => text.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
/** Every element of the screen with its `data-when` and whether it is `hidden` in the markup. */
const conditioned = [...terminal.matchAll(/<[a-z]+\b[^>]*\sdata-when="([^"]*)"[^>]*>/g)].map((m) => ({ when: m[1], hidden: /\shidden\b/.test(m[0]) }));

describe("the template of level 4 and the terminal the generator writes", () => {
  it("the skill's page has the terminal of a whole session ({{cli}}); the home, a person installing the skill ({{cliinstall}}), once each (owner, 2026-11-25)", () => {
    expect(aiPage.match(/\{\{cli\}\}/g)).toHaveLength(1);
    expect(level4.match(/\{\{cliinstall\}\}/g)).toHaveLength(1);
    expect(level4).not.toMatch(/\{\{cli(loop)?\}\}/);
    expect(level4).not.toContain("landing-cli__line");
  });

  it("the home's terminal installs the skill for each assistant, one round each: the command, what init prints, then the assistant and the request", () => {
    const install = written.cliinstall;
    expect(install).toMatch(/^<figure class="landing-cli landing-cli--install" dir="ltr" aria-label="[^"]+" data-landing-cli="loop" data-rounds="target=claude target=codex target=gemini target=cursor">/);
    const lineOf = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const linesFor = (target) =>
      [...install.matchAll(/<p class="landing-cli__line[^"]*"( data-when="([^"]*)")?( hidden)?>([\s\S]*?)<\/p>/g)]
        .filter((m) => !m[2] || m[2] === `target=${target}`)
        .map((m) => ({ text: lineOf(m[4]), hidden: Boolean(m[3]) }));
    const opens = { claude: "claude", codex: "codex", gemini: "gemini", cursor: "cursor-agent" };
    const calls = { claude: "/luz", codex: "$luz", gemini: "/luz", cursor: "/luz" };
    for (const target of Object.keys(opens)) {
      const lines = linesFor(target);
      expect(lines[0].text, target).toBe(`$ npx @luz-ds/ai init --target ${target}`);
      expect(lines.at(-2).text, target).toBe(`$ ${opens[target]}`);
      expect(lines.at(-1).text, target).toBe(`› ${catalogs.en["level.ai.steps.2.ask"].replace("/luz", calls[target])}`);
      // What init prints for it, from its own dry run: the first line and the "next:"
      const real = execFileSync(process.execPath, [SCRIPT, "init", "--target", target, "--dry-run"], { cwd: tmpdir(), encoding: "utf-8" }).split("\n");
      expect(lines.slice(1, -2).map((l) => l.text), target).toEqual([real[0].replace("would write", "wrote"), real.find((l) => l.startsWith("next: "))]);
      // Claude Code's round is the one shown without JavaScript; the others are hidden
      for (const line of lines) expect(line.hidden, `${target}: ${line.text}`).toBe(target !== "claude");
    }
    expect(install).toMatch(/<code id="home-ai-init">npx @luz-ds\/ai init --target claude<\/code>/);
    expect(install).toMatch(/<button class="luz-copy-btn" type="button" data-copy-from="home-ai-init" aria-label="[^"]+" hidden>/);
    // A loop: a button pauses it (WCAG 2.2.2), hidden until the script shows it; nothing to answer
    expect(install).toMatch(/<button class="luz-btn luz-btn--ghost luz-btn--sm landing-cli__pause" type="button" hidden>/);
    expect(install).not.toMatch(/landing-cli__(next|choices)/);
    expect(install).toContain(`<figcaption class="landing-cli__caption">${escapeHtml(catalogs.en["inside.l4.install.tested"])}</figcaption>`);
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
      run("skill", "add", "luz-landing"),
    ].join("\n");
    const outs = [...terminal.matchAll(/<p class="landing-cli__line landing-cli__line--out"[^>]*><samp>([^<]*)<\/samp><\/p>/g)].map((m) => unescape(m[1]));
    expect(outs.length).toBeGreaterThan(20);
    for (const line of outs.filter((l) => !l.startsWith("✓"))) expect(real.split("\n"), line).toContain(line);
  });

  it("runs only the commands the skill has: init, the assistant, luz-ai's own and the check it prints", () => {
    const help = execFileSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf-8" });
    const cmds = [...terminal.matchAll(/<span class="landing-cli__mark" aria-hidden="true">\$<\/span> <code>([^<]*)<\/code>/g)].map((m) => unescape(m[1]));
    expect(cmds[0]).toBe("npx @luz-ds/ai init --target claude");
    expect(cmds[1]).toBe("claude");
    for (const cmd of cmds.slice(2)) {
      if (cmd.startsWith("luz-ai ")) expect(help, cmd).toMatch(new RegExp(`^  ${cmd.split(" ")[1]}\\b`, "m"));
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
    const banner = JSON.parse(/^const BANNER = (\[[\s\S]*?\]);$/m.exec(read("packages/ai/skills/luz/scripts/luz.mjs"))[1]);
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

describe("the terminal of the home: an animation that plays the session again and again, with nothing to answer", () => {
  it("is the same terminal, marked as a loop, with the same screen line by line", () => {
    expect(loop).toMatch(new RegExp(`^<figure class="landing-cli" dir="ltr" aria-label="${escapeHtml(catalogs.en["inside.l4.panel"])}" data-landing-cli="loop">`));
    expect(screenOf(loop)).not.toBe("");
    expect(screenOf(loop)).toBe(screenOf(terminal));
  });

  it("has no Enter and no key to press, and a button to pause it, hidden until the script shows it (WCAG 2.2.2)", () => {
    expect(loop).not.toContain("landing-cli__next");
    expect(loop).not.toContain("<kbd>");
    expect(loop).toContain(`<button class="luz-btn luz-btn--ghost luz-btn--sm landing-cli__pause" type="button" hidden><span data-cli-pause>${catalogs.en["inside.l4.pause"]}</span><span data-cli-play hidden>${catalogs.en["inside.l4.play"]}</span></button>`);
    expect(loop.match(/<button\b[^>]*landing-cli__pause/g)).toHaveLength(1);
  });

  it("leaves the interactive terminal as it was: Enter, no pause", () => {
    expect(terminal).toMatch(/^<figure class="landing-cli" dir="ltr" [^>]*data-landing-cli>/);
    expect(terminal).toContain("landing-cli__next");
    expect(terminal).not.toContain("landing-cli__pause");
  });

  it("is written in every language with the words of its button", () => {
    for (const lang of LANGS) {
      const said = cliDemo({ say: (key) => catalogs[lang][key], root: repo, escapeHtml }).cliloop;
      expect(said, lang).toContain(`<span data-cli-pause>${escapeHtml(catalogs[lang]["inside.l4.pause"])}</span><span data-cli-play hidden>${escapeHtml(catalogs[lang]["inside.l4.play"])}</span>`);
    }
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

  it("plays the loop only when motion is welcome, in view and not paused, and takes it out of the reach of the keyboard and of a reader", () => {
    expect(cli).toMatch(/prefers-reduced-motion: reduce/);
    expect(cli).toMatch(/IntersectionObserver/);
    expect(cli).toMatch(/inert = true/);
    expect(cli).toMatch(/setAttribute\("aria-hidden", "true"\)/);
    expect(cli).toMatch(/landing-cli__pause/);
    expect(cli).toMatch(/clearTimeout/);
  });

  it("keeps the loop at one height too, so the page never moves", () => {
    expect(css).toMatch(/\.landing-cli\[data-cli="loop"\] \.landing-cli__screen/);
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
    expect(level("en")).toEqual(expect.arrayContaining(["inside.l4.next", "inside.l4.replay", "inside.l4.pause", "inside.l4.play", "inside.l4.soon", "inside.l4.meanwhile", "inside.cli.ask", "inside.cli.kind", "inside.cli.stack", "inside.cli.agents", "inside.cli.go", "inside.cli.build"]));
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
