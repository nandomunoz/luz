// Darkroom — LUZ home-page variant 3. Vanilla ES module, no dependency.
// The page is daylight without this script. With it, the room starts dark,
// the pointer is a lamp, and the scroll brings up the sun.

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const fine = matchMedia("(hover: hover) and (pointer: fine)");

/* ---------- Colour: the night-to-day ramp ---------- */

const STOPS = [
  [0.00, "#06070b"],
  [0.12, "#070a16"],
  [0.28, "#0d1838"],
  [0.42, "#251b52"],
  [0.52, "#4f2760"],
  [0.60, "#9a4660"],
  [0.67, "#de7f58"],
  [0.75, "#f2b47a"],
  [0.85, "#f7dcb9"],
  [1.00, "#f8f2e7"],
].map(([at, hex]) => [at, hexRgb(hex)]);

const LIGHT_INK = hexRgb("#f7efe1");
const DARK_INK = hexRgb("#1b140e");
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toCss = (c) => `rgb(${c.map((v) => Math.round(v)).join(" ")})`;
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function rampAt(t) {
  for (let i = 1; i < STOPS.length; i++) {
    const [a0, c0] = STOPS[i - 1], [a1, c1] = STOPS[i];
    if (t <= a1) return mix(c0, c1, (t - a0) / (a1 - a0));
  }
  return STOPS[STOPS.length - 1][1];
}
// The ink that reads on this background: the warm one if it reaches 4.6:1,
// else pure white or black (one of them always reaches 4.58:1).
function inksFor(bg) {
  const cl = contrast(LIGHT_INK, bg), cd = contrast(DARK_INK, bg);
  let ink = cl >= cd ? LIGHT_INK : DARK_INK;
  if (Math.max(cl, cd) < 4.6) ink = contrast(WHITE, bg) >= contrast(BLACK, bg) ? WHITE : BLACK;
  // Secondary ink: pulled toward the background as far as 4.6:1 allows.
  let ink2 = ink;
  for (let k = 0.02; k <= 0.42; k += 0.02) {
    const c = mix(ink, bg, k);
    if (contrast(c, bg) < 4.6) break;
    ink2 = c;
  }
  return { ink, ink2, dark: ink === DARK_INK || ink === BLACK };
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };

/* ---------- The wall: interface sketches, drawn once as a mask ---------- */

function wallSvg() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const j = (n = 1.6) => (rnd() - 0.5) * n;
  const out = [];
  // Every shape is drawn twice, a hair apart, like a pencil going over it.
  const rect = (x, y, w, h, r = 6) => {
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`);
    out.push(`<rect x="${x + j()}" y="${y + j()}" width="${w + j()}" height="${h + j()}" rx="${r}" opacity=".45"/>`);
  };
  const line = (x1, y1, x2, y2) => {
    out.push(`<path d="M${x1} ${y1}L${x2} ${y2}"/>`);
    out.push(`<path d="M${x1 + j()} ${y1 + j()}L${x2 + j()} ${y2 + j()}" opacity=".4"/>`);
  };
  const bar = (x, y, w, h = 7) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" class="f"/>`);
  const circle = (cx, cy, r) => out.push(`<circle cx="${cx}" cy="${cy}" r="${r}"/>`, `<circle cx="${cx + j()}" cy="${cy + j()}" r="${r + j()}" opacity=".45"/>`);
  const note = (x, y, s) => out.push(`<text x="${x}" y="${y}">${s}</text>`);
  const arrow = (x1, y1, x2, y2) => { out.push(`<path d="M${x1} ${y1}Q${(x1 + x2) / 2 + 24} ${(y1 + y2) / 2 - 20} ${x2} ${y2}" stroke-dasharray="4 5"/>`); };

  const navbar = (x, y, w) => {
    rect(x, y, w, 58, 10); circle(x + 30, y + 29, 11);
    [0, 1, 2, 3].forEach((i) => bar(x + 70 + i * 74, y + 26, 50));
    rect(x + w - 118, y + 14, 98, 30, 15);
    note(x, y - 12, "&lt;nav&gt;  .luz-navbar");
  };
  const card = (x, y) => {
    rect(x, y, 260, 330, 14); rect(x + 16, y + 16, 228, 140, 8);
    line(x + 16, y + 16, x + 244, y + 156); line(x + 244, y + 16, x + 16, y + 156);
    bar(x + 16, y + 180, 160, 12); bar(x + 16, y + 206, 220); bar(x + 16, y + 222, 190); bar(x + 16, y + 238, 120);
    rect(x + 16, y + 272, 110, 38, 10);
    note(x, y - 12, "&lt;article&gt;  card");
  };
  const form = (x, y) => {
    note(x, y - 12, "label + input");
    bar(x, y + 6, 70); rect(x, y + 22, 260, 42, 8);
    bar(x, y + 88, 96); rect(x, y + 104, 260, 42, 8);
    rect(x, y + 168, 18, 18, 4); bar(x + 30, y + 174, 140);
    rect(x, y + 206, 18, 18, 9); bar(x + 30, y + 212, 110);
    rect(x, y + 250, 150, 44, 10);
    note(x + 164, y + 278, "type=submit");
  };
  const table = (x, y, w) => {
    rect(x, y, w, 250, 8);
    for (let r = 1; r < 6; r++) line(x, y + r * 42, x + w, y + r * 42);
    [0.3, 0.62, 0.82].forEach((c) => line(x + w * c, y, x + w * c, y + 250));
    for (let r = 0; r < 6; r++) [0, 0.3, 0.62, 0.82].forEach((c) => bar(x + w * c + 12, y + r * 42 + 18, r === 0 ? 50 : 30 + ((r * 37 + c * 100) % 60)));
    note(x, y - 12, "&lt;table&gt;  scope=col");
  };
  const chart = (x, y) => {
    line(x, y, x, y + 200); line(x, y + 200, x + 320, y + 200);
    [90, 140, 60, 170, 120, 185, 75].forEach((h, i) => rect(x + 18 + i * 42, y + 200 - h, 26, h, 3));
    note(x, y - 12, "&lt;meter&gt;  column chart");
  };
  const modal = (x, y) => {
    rect(x, y, 300, 200, 14); bar(x + 20, y + 26, 140, 12);
    line(x + 268, y + 20, x + 282, y + 34); line(x + 282, y + 20, x + 268, y + 34);
    bar(x + 20, y + 64, 250); bar(x + 20, y + 80, 220); bar(x + 20, y + 96, 180);
    rect(x + 112, y + 140, 80, 36, 10); rect(x + 202, y + 140, 80, 36, 10);
    note(x, y - 12, "&lt;dialog&gt;");
  };
  const tabs = (x, y) => {
    [0, 1, 2].forEach((i) => { rect(x + i * 104, y, 96, 36, 8); bar(x + i * 104 + 20, y + 15, 56); });
    line(x, y + 44, x + 312, y + 44); line(x, y + 46, x + 96, y + 46);
    rect(x, y + 60, 312, 110, 8);
    note(x, y - 12, "aria-selected");
  };
  const heroBlock = (x, y) => {
    bar(x, y, 420, 30); bar(x, y + 46, 360, 30); bar(x, y + 104, 300); bar(x, y + 120, 260);
    rect(x, y + 150, 130, 46, 23); rect(x + 144, y + 150, 130, 46, 23);
    note(x, y - 16, "h1  --luz-text-4xl");
  };
  const swatches = (x, y) => {
    [0, 1, 2, 3, 4, 5].forEach((i) => circle(x + 22 + i * 52, y + 22, 20));
    note(x, y + 66, "--luz-color-* x 3 modes");
  };
  const grid = (x, y) => {
    [0, 1, 2].forEach((c) => [0, 1].forEach((r) => rect(x + c * 96, y + r * 76, 84, 64, 6)));
    note(x, y - 12, ".o-grid  --luz-space-4");
    arrow(x + 300, y + 30, x + 360, y - 40);
  };
  const toggle = (x, y) => {
    rect(x, y, 64, 34, 17); circle(x + 47, y + 17, 12); note(x + 78, y + 22, "aria-pressed");
  };

  navbar(80, 70, 640);      card(820, 50);           form(1150, 90);
  table(80, 250, 600);      chart(760, 470);          modal(1120, 470);
  tabs(80, 620);            heroBlock(470, 760);      swatches(1060, 760);
  grid(90, 1000);           toggle(470, 1050);        card(800, 980);
  form(1140, 1000);         navbar(80, 1360, 560);    table(720, 1380, 640);
  tabs(80, 1500);           modal(480, 1560);

  const W = 1440, H = 1800;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><style>.f{fill:#000;stroke:none;opacity:.55}text{fill:#000;stroke:none;font:13px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em}</style>${out.join("")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ---------- State ---------- */

let vw = innerWidth, vh = innerHeight, maxScroll = 1;
const lamp = { x: vw * 0.5, y: vh * 0.42 };
const target = { x: lamp.x, y: lamp.y };
let pointerSeen = false;
let focusTarget = null;
let last = {};
let lastTime = performance.now();
let lastScroll = -1;

function measure() {
  vw = innerWidth; vh = innerHeight;
  maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  root.style.setProperty("--tile-w", vw < 640 ? "900px" : vw < 1100 ? "1200px" : "1440px");
}

function set(name, value) {
  if (last[name] !== value) { root.style.setProperty(name, value); last[name] = value; }
}

const clockEl = document.querySelector("[data-clock]");
const phaseEl = document.querySelector("[data-phase]");
const hint = document.querySelector("[data-hint]");
const wordmark = document.querySelector(".wordmark");

function paintScroll() {
  const y = scrollY;
  const t = clamp(y / maxScroll);
  const bg = rampAt(t);
  const { ink, ink2, dark } = inksFor(bg);

  set("--t", t.toFixed(4));
  set("--scroll", String(Math.round(y)));
  set("--bg", toCss(bg));
  set("--ink", toCss(ink));
  set("--ink-2", toCss(ink2));

  const base = vw < 640 ? 150 : 230;
  const r = base + smooth(0.5, 0.92, t) * Math.max(vw, vh) * 1.7;
  set("--r", `${Math.round(r)}px`);
  set("--ga", (0.15 * (1 - smooth(0.25, 0.6, t))).toFixed(3));
  set("--wall-a", (0.6 - 0.52 * smooth(0.5, 0.9, t)).toFixed(3));
  set("--sa", dark ? (0.85 * smooth(0.62, 0.86, t)).toFixed(3) : "0");

  const minutes = Math.round(120 + t * 330);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const time = `${hh}:${mm}`;
  if (clockEl.textContent !== time) clockEl.textContent = time;
  const phase = t < 0.3 ? "night" : t < 0.5 ? "blue hour" : t < 0.68 ? "dawn" : t < 0.86 ? "sunrise" : "daylight";
  if (phaseEl.textContent !== phase) phaseEl.textContent = phase;

  if (y > 60) hint.classList.add("is-gone");
  autoSwitches();
}

function frame(now) {
  const dt = Math.min(64, now - lastTime);
  lastTime = now;

  if (scrollY !== lastScroll) { lastScroll = scrollY; paintScroll(); }

  // Where the lamp wants to be.
  if (focusTarget) {
    const rc = focusTarget.getBoundingClientRect();
    target.x = rc.left + rc.width / 2; target.y = rc.top + rc.height / 2;
  } else if (!pointerSeen || !fine.matches) {
    // No pointer that hovers: the lamp drifts, and the scroll leads it.
    const s = scrollY * 0.0016;
    if (reduce.matches) {
      target.x = vw * (0.5 + 0.3 * Math.sin(s * 2));
      target.y = vh * 0.4;
    } else {
      const k = now * 0.00032;
      target.x = vw * (0.5 + 0.3 * Math.sin(k + s * 2) + 0.06 * Math.sin(k * 2.3));
      target.y = vh * (0.42 + 0.16 * Math.sin(k * 1.37 + 1 + s));
    }
  }

  if (reduce.matches) {
    lamp.x = target.x; lamp.y = target.y;
  } else {
    const ease = 1 - Math.pow(1 - 0.14, dt / 16.67);
    lamp.x += (target.x - lamp.x) * ease;
    lamp.y += (target.y - lamp.y) * ease;
  }
  if (scrollY < vh * 1.3) {
    const w = wordmark.getBoundingClientRect();
    set("--wx", `${(lamp.x - w.left).toFixed(1)}px`);
    set("--wy", `${(lamp.y - w.top).toFixed(1)}px`);
  }
  set("--lx", `${lamp.x.toFixed(1)}px`);
  set("--ly", `${lamp.y.toFixed(1)}px`);

  requestAnimationFrame(frame);
}

addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  pointerSeen = true;
  focusTarget = null;
  target.x = e.clientX; target.y = e.clientY;
  if (!hint.dataset.timer) hint.dataset.timer = String(setTimeout(() => hint.classList.add("is-gone"), 2600));
}, { passive: true });

addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch") return;
  target.x = e.clientX; target.y = e.clientY;
}, { passive: true });

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (el instanceof Element && el.matches(":focus-visible")) focusTarget = el;
});
document.addEventListener("focusout", () => { focusTarget = null; });

addEventListener("resize", () => { measure(); lastScroll = -1; }, { passive: true });

/* ---------- The three switches ---------- */

const stage = document.getElementById("stage");
const status = document.querySelector("[data-stage-status]");
const section = document.getElementById("switches");
const buttons = [...document.querySelectorAll("[data-switch]")];
const LAYERS = ["tokens", "core", "catalog"];
const state = { tokens: false, core: false, catalog: false };
let touched = false;

function describe() {
  const on = LAYERS.filter((l) => state[l]);
  if (!on.length) return "Nothing on: a sketch in chalk.";
  if (on.length === 3) return "All three layers on: a page.";
  return `On: ${on.join(" + ")}.`;
}

// Animate the pieces of the mock from where they were (FLIP), so the page
// assembles instead of jumping.
function flip(change) {
  const pieces = [...stage.querySelectorAll(".m-nav, .m-hero, .m-card, .m-form")];
  const before = reduce.matches ? null : pieces.map((p) => p.getBoundingClientRect());
  change();
  if (!before) return;
  pieces.forEach((p, i) => {
    const a = before[i], b = p.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const dx = a.left - b.left, dy = a.top - b.top;
    const sx = a.width / b.width, sy = a.height / b.height;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
    p.animate(
      [{ transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: "0 0", transform: "none" }],
      { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", delay: i * 30, fill: "backwards" },
    );
  });
}

function setLayer(layer, on) {
  if (state[layer] === on) return;
  state[layer] = on;
  const btn = buttons.find((b) => b.dataset.switch === layer);
  btn.setAttribute("aria-pressed", String(on));
  btn.closest(".sw").classList.toggle("is-on", on);
  flip(() => { stage.dataset[layer] = on ? "on" : "off"; });
  if (on && !reduce.matches) {
    stage.classList.remove("is-flicker");
    void stage.offsetWidth;
    stage.classList.add("is-flicker");
  }
  status.textContent = describe();
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    touched = true;
    setLayer(btn.dataset.switch, !state[btn.dataset.switch]);
  });
});

// Until the reader flips one, the scroll flips them, in order, both ways.
function autoSwitches() {
  if (touched) return;
  const rc = section.getBoundingClientRect();
  const p = (vh * 0.6 - rc.top) / rc.height;
  setLayer("tokens", p > 0.3);
  setLayer("core", p > 0.5);
  setLayer("catalog", p > 0.7);
}

/* ---------- Real components ---------- */

let lit = 0;
const counter = document.querySelector("[data-counter]");
const counterOut = document.querySelector("[data-counter-out]");
counter.addEventListener("click", () => {
  lit += 1;
  counterOut.textContent = lit === 1 ? "Lit once." : `Lit ${lit} times.`;
});

const form = document.querySelector("[data-demo-form]");
const formOut = document.querySelector("[data-form-out]");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = form.elements.room.value.trim() || "Studio";
  formOut.textContent = `${name} is lit. Nothing left this page.`;
});

const copyStatus = document.querySelector("[data-copy-status]");
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    const code = document.getElementById(btn.dataset.copy);
    const text = code.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = `Copied: ${text}`;
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      copyStatus.textContent = "Selected. Press Ctrl+C to copy.";
    }
  });
});

/* ---------- Reveal ---------- */

const reveals = document.querySelectorAll(".reveal");
if (reduce.matches || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  reveals.forEach((el) => io.observe(el));
}

/* ---------- Start ---------- */

// The room starts dark: every switch off.
LAYERS.forEach((l) => {
  stage.dataset[l] = "off";
  const btn = buttons.find((b) => b.dataset.switch === l);
  btn.setAttribute("aria-pressed", "false");
  btn.closest(".sw").classList.remove("is-on");
});
status.textContent = describe();

root.style.setProperty("--wall-svg", wallSvg());
measure();
addEventListener("load", measure);
requestAnimationFrame(frame);
