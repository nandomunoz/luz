/**
 * The tunnel of the home's hero (owner, 2026-11-26): thirteen frames of the logo's triangle behind the copy.
 * CSS (apps/landing/landing.css) and JS (apps/landing/tunnel.js) guarantees the owner asked for.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { TILT_QUERY, initTunnel } from "../apps/landing/tunnel.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf-8");
const css = read("apps/landing/landing.css").replace(/\/\*[\s\S]*?\*\//g, "");

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
const rule = (text, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...text.matchAll(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]).join(";");
};
const value = (decls, prop) => decls.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+);`))?.[1].trim();

const motion = blocks(css, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/g);
const moving = motion.found.join("\n");
const keyframes = blocks(css, /@keyframes\s+landing-tunnel-fly\b/g).found;
const phone = blocks(css, /@media\s*\(max-width:\s*768px\)/g).found.join("\n");
const forced = blocks(css, /@media\s*\(forced-colors:\s*active\)/g).found.join("\n");

describe("the tunnel's CSS", () => {
  it("one @keyframes that animates transform and opacity only, no custom property", () => {
    expect(keyframes).toHaveLength(1);
    expect(new Set([...keyframes[0].matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]))).toEqual(new Set(["transform", "opacity"]));
    expect(keyframes[0]).not.toMatch(/--/);
    expect(keyframes[0]).toMatch(/0%\s*\{[^}]*translateZ\(-2300px\) rotate\(0deg\)/);
    expect(keyframes[0]).toMatch(/100%\s*\{[^}]*translateZ\(495px\) rotate\(26deg\)/);
    expect(css).not.toMatch(/@property\s+--landing-tunnel/);
  });
  it("animates only inside no-preference, with a negative delay of i x cycle / 13, paused by is-off", () => {
    const frame = rule(moving, ".landing-tunnel__frame");
    expect(value(frame, "animation")).toBe("landing-tunnel-fly var(--landing-tunnel-cycle) linear infinite");
    expect(value(frame, "animation-delay")).toBe("calc(var(--i) * var(--landing-tunnel-cycle) / -13)");
    const outside = [...motion.rest.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((m) => /landing-tunnel/.test(m[1]));
    for (const [, selector, decls] of outside) expect(decls, selector).not.toMatch(/(^|[;\s])(animation|transition)[a-z-]*\s*:/);
    expect(value(rule(moving, ".landing-tunnel.is-off .landing-tunnel__frame"), "animation-play-state")).toBe("paused");
  });
  it("91 s cycle from a motion token (7 s frame to frame)", () => {
    const cycle = value(rule(css, ".landing-tunnel"), "--landing-tunnel-cycle");
    const [, token, times] = cycle.match(/^calc\(var\((--luz-duration-[a-z]+)\) \* (\d+)\)$/) ?? [];
    const seconds = parseFloat(read("packages/tokens/dist/luz-tokens.css").match(new RegExp(`${token}:\\s*([\\d.]+)s`))[1]);
    expect(seconds * Number(times)).toBeCloseTo(91, 6);
  });
  it("13 frames placed by nth-child, 2deg apart", () => {
    for (let i = 0; i < 13; i++) expect(value(rule(css, `.landing-tunnel__frame:nth-child(${i + 1})`), "--i")).toBe(String(i));
    expect(value(rule(css, ".landing-tunnel__frame"), "transform")).toBe("translateZ(calc(var(--i) * 215px - 2300px)) rotate(calc(var(--i) * 2deg))");
  });
  it("background: contain strict, pointer-events none, opacity .5, perspective 700px from 50% var(--landing-tunnel-cy) = 54%", () => {
    const back = rule(css, ".landing-tunnel__back");
    expect(value(back, "contain")).toBe("strict");
    expect(value(back, "pointer-events")).toBe("none");
    expect(value(back, "opacity")).toBe("0.5");
    expect(value(back, "perspective")).toBe("700px");
    expect(value(back, "perspective-origin")).toBe("50% var(--landing-tunnel-cy)");
    expect(value(rule(css, ".landing-tunnel"), "--landing-tunnel-cy")).toBe("54%");
  });
  it("strokes .3/.55/.9 by 3n+1/3n+2/3n, the third filled 5 %; CanvasText in forced colours; none in high contrast", () => {
    expect(value(rule(css, ".landing-tunnel__frame:nth-child(3n + 1) svg"), "stroke-opacity")).toBe("0.3");
    expect(value(rule(css, ".landing-tunnel__frame:nth-child(3n + 2) svg"), "stroke-opacity")).toBe("0.55");
    expect(value(rule(css, ".landing-tunnel__frame:nth-child(3n) svg"), "stroke-opacity")).toBe("0.9");
    expect(value(rule(css, ".landing-tunnel__frame:nth-child(3n) svg"), "fill")).toBe("color-mix(in oklab, var(--luz-brand-primary) 5%, transparent)");
    expect(value(rule(forced, ".landing-tunnel__frame svg"), "stroke")).toBe("CanvasText");
    expect(value(rule(css, ':root[data-theme="high-contrast"] .landing-tunnel__back'), "display")).toBe("none");
  });
  it("phone (max-width 768px): 120vmin, -52vmin/-60vmin, perspective 420px, stroke 1.25, cy 50%, stacked buttons", () => {
    expect(value(rule(phone, ".landing-tunnel"), "--landing-tunnel-cy")).toBe("50%");
    expect(value(rule(phone, ".landing-tunnel__back"), "perspective")).toBe("420px");
    expect(value(rule(phone, ".landing-tunnel__frame"), "inline-size")).toBe("120vmin");
    expect(value(rule(phone, ".landing-tunnel__frame svg"), "stroke-width")).toBe("1.25");
    expect(value(rule(phone, ".landing-tunnel .o-actions"), "flex-direction")).toBe("column");
    // The title has one clamp for every width (2.75rem on a phone to 4.5rem), not one for phones
    expect(value(rule(css, ".landing-tunnel .luz-hero__title"), "font-size")).toBe("clamp(2.75rem, 1.25rem + 5vw, 4.5rem)");
    expect(value(rule(phone, ".landing-tunnel .luz-hero__title"), "font-size")).toBeUndefined();
  });
});

function target(extra = {}) {
  const listeners = new Map();
  return {
    listeners,
    addEventListener: vi.fn((type, fn, options) => listeners.set(type, { fn, options })),
    removeEventListener: vi.fn((type, fn) => {
      if (listeners.get(type)?.fn === fn) listeners.delete(type);
    }),
    ...extra,
  };
}
function setup({ tilt = true, reduce = false, io = true, rect = { left: 0, top: 0, width: 1000, height: 800 } } = {}) {
  const track = { style: { transform: "", willChange: "" } };
  const classes = new Set();
  const hero = target({
    querySelector: vi.fn((s) => (s === ".landing-tunnel__track" ? track : null)),
    getBoundingClientRect: vi.fn(() => rect),
    classList: { toggle: (n, on) => (on ? classes.add(n) : classes.delete(n)) },
  });
  const queries = { [TILT_QUERY]: target({ matches: tilt }), "(prefers-reduced-motion: reduce)": target({ matches: reduce }) };
  const frames = [];
  let next = 0;
  const observer = { callback: null, observed: [] };
  const win = target({
    matchMedia: vi.fn((q) => queries[q] ?? target({ matches: false })),
    requestAnimationFrame: vi.fn((fn) => (frames.push(fn), ++next)),
    cancelAnimationFrame: vi.fn(),
  });
  if (io) win.IntersectionObserver = class { constructor(cb) { observer.callback = cb; } observe(el) { observer.observed.push(el); } disconnect() {} };
  const paint = () => { const now = frames.splice(0); for (const fn of now) fn(); return now.length; };
  return { hero, track, classes, queries, win, observer, frames, paint };
}
const move = (t, clientX, clientY) => t.hero.listeners.get("pointermove").fn({ clientX, clientY });

describe("apps/landing/tunnel.js", () => {
  it("the query is exactly the owner's", () => expect(TILT_QUERY).toBe("(min-width: 64em) and (hover: hover) and (pointer: fine)"));
  it("desktop: pointer listeners on the hero and resize/scroll on the window, passive", () => {
    const t = setup(); initTunnel(t.hero, t.win);
    expect([...t.hero.listeners.keys()].sort()).toEqual(["pointerleave", "pointermove"]);
    expect([...t.win.listeners.keys()].sort()).toEqual(["resize", "scroll"]);
  });
  it("no listener when the query does not match, nor with reduced motion", () => {
    for (const opts of [{ tilt: false }, { reduce: true }]) {
      const t = setup(opts); initTunnel(t.hero, t.win);
      expect(t.hero.addEventListener).not.toHaveBeenCalled();
      expect(t.win.addEventListener).not.toHaveBeenCalled();
    }
  });
  it("one frame per paint, and the loop stops when it arrives", () => {
    const t = setup(); initTunnel(t.hero, t.win);
    move(t, 1000, 0); move(t, 900, 100);
    expect(t.frames).toHaveLength(1);
    let painted = 0; while (t.paint()) painted += 1;
    expect(painted).toBeGreaterThan(10); expect(painted).toBeLessThan(400);
  });
  it("the box is read once, again after resize or scroll", () => {
    const t = setup(); initTunnel(t.hero, t.win);
    move(t, 10, 10); move(t, 20, 20);
    expect(t.hero.getBoundingClientRect).toHaveBeenCalledTimes(1);
    t.win.listeners.get("scroll").fn(); move(t, 30, 30);
    expect(t.hero.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });
  it("listeners and transform removed when the query stops matching", () => {
    const t = setup(); initTunnel(t.hero, t.win);
    move(t, 900, 100); t.paint();
    const tilt = t.queries[TILT_QUERY]; tilt.matches = false; tilt.listeners.get("change").fn();
    expect(t.hero.listeners.size).toBe(0); expect(t.win.listeners.size).toBe(0);
    expect(t.track.style.transform).toBe("");
  });
  it("IntersectionObserver toggles is-off", () => {
    const t = setup({ tilt: false }); initTunnel(t.hero, t.win);
    t.observer.callback([{ isIntersecting: false }]); expect(t.classes.has("is-off")).toBe(true);
    t.observer.callback([{ isIntersecting: true }]); expect(t.classes.has("is-off")).toBe(false);
  });
});
