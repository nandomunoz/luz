/**
 * The motion of the page of the tokens (owner, 2026-11-23: "some animation and the usual transitions"): the hero
 * comes in, the sections rise as they scroll into view, the specimens draw themselves, the cards lift under the
 * pointer and the demo's product answers a new brand.
 *
 * The rules every one of them keeps, read from apps/landing/landing.css (the part of the page of the tokens, from its
 * header comment to the end of the file):
 *
 *  - no animation and no transition outside `@media (prefers-reduced-motion: no-preference)`: with less motion the
 *    page is still, and nothing waits for an animation to be seen;
 *  - a scroll-driven animation (`animation-timeline: view()`) only inside `@supports (animation-timeline: view())`,
 *    so a browser without it shows every section at once;
 *  - every duration and delay is a motion token (`--luz-duration-*`), never a typed number of seconds;
 *  - the curves of the motion block are drawn by their stroke, so their path says pathLength="1";
 *  - each curve is animated with the easing it shows (owner, 2026-11-23): a dot runs along it, across at a steady
 *    pace and up with `var(--ease)`, the curve's own token, so it traces the curve (and the spring overshoots). The
 *    scroll drives it (nothing moves on its own), and the pointer or the focus on its section loops it at the token's
 *    pace, so no motion starts by itself and lasts (WCAG 2.2.2). With less motion there is no dot.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSite, landingDocuments, levelDocuments, scanSite } from "../scripts/docs-site/site.js";
import { quoted } from "./helpers/quoted-attributes.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const all = read("apps/landing/landing.css").replace(/\/\*[\s\S]*?\*\//g, (c) => (c.includes("The page of the tokens (apps/landing/levels/tokens.html") ? "@@TOKENS@@" : ""));
const css = all.slice(all.indexOf("@@TOKENS@@"));

/** The blocks of an at-rule whose prelude matches, by brace counting, and the text with them taken out. */
function blocks(text, prelude) {
  const found = [];
  let rest = "";
  let at = 0;
  for (const m of text.matchAll(prelude)) {
    if (m.index < at) continue;
    const open = text.indexOf("{", m.index);
    let depth = 0;
    let end = open;
    for (; end < text.length; end++) {
      if (text[end] === "{") depth++;
      else if (text[end] === "}" && --depth === 0) break;
    }
    rest += text.slice(at, m.index);
    found.push(text.slice(open + 1, end));
    at = end + 1;
  }
  return { found, rest: rest + text.slice(at) };
}

/** The page of the tokens as the build writes it, built once for the tests that read it. */
let built;
const tokensPage = () => {
  if (!built) {
    const site = scanSite(join(repo, "apps/docs"), repo);
    const home = read("apps/landing/index.html");
    const levels = ["tokens", "core", "components"].map((name) => ({ name, file: `apps/landing/levels/${name}.html`, html: read(`apps/landing/levels/${name}.html`) }));
    built = buildSite(site, { extra: [...landingDocuments(site, "apps/landing/index.html", home), ...levelDocuments(site, { file: "apps/landing/index.html", html: home }, levels)] });
  }
  return quoted(built.rendered.get("/tokens/"));
};

const motion = blocks(css, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/g);
const moving = motion.found.join("\n");

describe("the motion of the page of the tokens", () => {
  it("has its part of landing.css, with motion in it", () => {
    expect(css.length).toBeGreaterThan(1000);
    expect(moving).toMatch(/\banimation\s*:/);
    expect(moving).toMatch(/\btransition\s*:/);
  });

  it("animates and transitions nothing outside prefers-reduced-motion: no-preference", () => {
    expect(motion.rest).not.toMatch(/(^|[;{\s])(animation|animation-name|transition)\s*:/);
  });

  it("has the hero come in, the sections rise, the specimens draw, the devices appear and the cards lift", () => {
    for (const name of ["landing-rise", "landing-mark-sweep", "landing-grow-y", "landing-device-in", "landing-draw"]) expect(css, name).toMatch(new RegExp(`@keyframes ${name}\\b`));
    expect(moving).toMatch(/\.landing-tokens__head > \*[^{]*\{[^}]*animation/);
    expect(moving).toMatch(/\.landing-tokens__step:hover/);
    expect(moving).toMatch(/\.landing-tokens__group-link:hover::after/);
  });

  it("drives the scroll animations only where the browser has view(): elsewhere every section is simply there", () => {
    const scroll = blocks(moving, /@supports\s*\(animation-timeline:\s*view\(\)\)/g);
    expect(scroll.found.join("")).toMatch(/animation-timeline:\s*view\(\)/);
    expect(scroll.rest).not.toMatch(/animation-timeline/);
    expect(motion.rest).not.toMatch(/animation-timeline/);
  });

  it("times everything with the motion tokens, never a typed number of seconds", () => {
    const times = [...moving.matchAll(/(?:animation|transition)(?:-duration|-delay)?\s*:([^;]*);/g)].map((m) => m[1]);
    expect(times.length).toBeGreaterThan(0);
    for (const value of times) expect(value, value).not.toMatch(/(^|[\s,(])\d*\.?\d+m?s\b/);
  });

  it("draws the easing curves by their stroke: each path has pathLength=1", () => {
    const page = tokensPage();
    const curves = page.match(/<svg class="landing-tokens__curve"[\s\S]*?<\/svg>/g) ?? [];
    expect(curves.length).toBe(4);
    for (const svg of curves) expect(svg).toMatch(/<path pathLength="1" d="M0\.0,44\.0 C/);
  });

  it("animates each curve with the easing it shows: a dot that runs across steadily and up with var(--ease), the curve's token", () => {
    const page = tokensPage();
    const plots = [...page.matchAll(/<span class="landing-tokens__plot">([\s\S]*?)<\/span><code class="landing-tokens__label">([a-z]+)<\/code>/g)];
    expect(plots.map((m) => m[2])).toEqual(["standard", "enter", "exit", "spring"]);
    for (const [, plot, name] of plots) {
      expect(plot, name).toContain('<svg class="landing-tokens__curve"');
      expect(plot, name).toContain(`<span class="landing-tokens__dot" style="--ease:var(--luz-easing-${name})" aria-hidden="true"><span></span></span>`);
    }
  });

  it("moves the dots only when motion is welcome: driven by the scroll where view() exists, looped by the pointer or the focus, hidden otherwise", () => {
    // no dot with less motion
    expect(motion.rest).toMatch(/\.landing-tokens__dot\s*\{[^}]*display:\s*none/);
    expect(moving).toMatch(/\.landing-tokens__dot\s*\{[^}]*display:\s*block/);
    const scroll = blocks(moving, /@supports\s*\(animation-timeline:\s*view\(\)\)/g).found.join("");
    expect(scroll).toMatch(/\.landing-tokens__dot\s*\{[^}]*animation:\s*landing-dot-x\b[^}]*animation-timeline:\s*view\(\)/);
    expect(scroll).toMatch(/\.landing-tokens__dot > span\s*\{[^}]*animation:\s*landing-dot-y var\(--ease\)[^}]*animation-timeline:\s*view\(\)/);
    // the loop: only while the card has the pointer or the focus
    expect(moving).toMatch(/\.landing-tokens__block--motion:is\(:hover, :focus-within\) \.landing-tokens__dot\s*\{[^}]*infinite/);
    expect(moving).toMatch(/\.landing-tokens__block--motion:is\(:hover, :focus-within\) \.landing-tokens__dot > span\s*\{[^}]*var\(--ease\)[^}]*infinite/);
    for (const name of ["landing-dot-x", "landing-dot-y"]) expect(css, name).toMatch(new RegExp(`@keyframes ${name}\\b`));
  });
});
