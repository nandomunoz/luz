/**
 * The sources of the home's fourth level, "Your whole site, from a conversation" (.claude/plans/luz-ai-skill.md,
 * part A): a fake terminal that plays the conversation of the LUZ skill to come (@luz-ds/ai). The rendered page is
 * tests/home-cli.spec.js; here the template, the script, the stylesheet and the catalogs:
 *
 *  - the template has the terminal with the whole conversation in it, left to right, each translated phrase a <bdi>,
 *    the button that brings the next line hidden until the script shows it, and the screen a polite live region;
 *  - the home has no prompt left: no opener, no dialog, no prompt-dialog stylesheet, no initPromptDialogs; the
 *    prompts themselves (/prompts/*.txt) and /docs/kinds/ stay, and the words say the skill is not published yet,
 *    with the way to the prompts until it is;
 *  - landing.js starts cli.js; its animation is finite and only when motion is welcome;
 *  - the three catalogs have the same keys for it, and none of the old kinds of site.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(repo, path), "utf-8");
const LANGS = ["en", "es", "ar"];
const catalogs = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(read(`apps/landing/i18n/${lang}.json`))]));
const home = read("apps/landing/index.html");
const level4 = home.slice(home.indexOf('id="inside-4"'), home.indexOf("</section>", home.indexOf('id="inside-4"')));
const css = read("apps/landing/landing.css");

/** The agents of luz-ai the terminal suggests, and its skills, by their names. */
const AGENTS = ["luz-seo-geo-specialist", "luz-accessibility-auditor", "luz-core-web-vitals-optimizer", "luz-ai-auditor"];
const SKILLS = ["luz-create-landing", "luz-readme"];

describe("the template of level 4", () => {
  it("is a terminal, left to right, named, with its screen a polite live region", () => {
    expect(level4).toMatch(/<figure class="landing-cli" dir="ltr" aria-label="\{\{t:inside\.l4\.panel\}\}" data-landing-cli>/);
    expect(level4).toMatch(/<div class="landing-cli__screen" aria-live="polite">/);
    expect(level4).toMatch(/<div class="landing-cli__bar" aria-hidden="true">/);
  });

  it("has the whole conversation in its markup: the command, the questions, the agents and skills, the build", () => {
    const lines = level4.match(/<p class="landing-cli__line[^"]*">/g) ?? [];
    expect(lines.length).toBeGreaterThanOrEqual(12);
    expect(level4).toContain("<code>npx @luz-ds/ai</code>");
    for (const name of [...AGENTS, ...SKILLS]) expect(level4, name).toContain(`<code>${name}</code>`);
    for (const key of ["ask", "answer", "kind", "stack", "agents", "seo", "a11y", "speed", "noai", "skills", "adapt", "done", "build"]) {
      expect(level4, key).toMatch(new RegExp(`<bdi[^>]*>\\{\\{t:inside\\.cli\\.${key}\\}\\}</bdi>`));
    }
    // The agent it does not suggest is told by its box and its colour, not by its colour alone
    expect(level4).toMatch(/landing-cli__line--off"><span class="landing-cli__box">\[ \]<\/span> <code>luz-ai-auditor<\/code>/);
  });

  it("has the button that brings the next line, hidden until the script shows it, with the key that presses it", () => {
    expect(level4).toMatch(/<button class="[^"]*\blanding-cli__next\b[^"]*" type="button" hidden><kbd>Enter<\/kbd> <span data-cli-next>\{\{t:inside\.l4\.next\}\}<\/span><span data-cli-replay hidden>\{\{t:inside\.l4\.replay\}\}<\/span><\/button>/);
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
    expect(footer).toContain('<a href="#inside-4">{{t:footer.ai}}</a>');
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

  it("brings one line at a time, on its button or a click in the terminal, hides the rest with `hidden`, and plays again from the start", () => {
    expect(cli).toMatch(/line\.hidden = index >= count/);
    expect(cli).toMatch(/next\.addEventListener\("click", step\)/);
    expect(cli).toMatch(/cli\.addEventListener\("click"/);
    expect(cli).toMatch(/shown === lines\.length \? 1 : shown \+ 1/);
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
    expect(level("en")).toEqual(expect.arrayContaining(["inside.l4.next", "inside.l4.replay", "inside.l4.soon", "inside.l4.meanwhile", "inside.cli.ask", "inside.cli.build"]));
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
