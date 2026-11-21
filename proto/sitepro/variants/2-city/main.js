// LUZ City: the scroll flies a camera over a CSS 3D city.
const root = document.documentElement;
const stage = document.getElementById("stage");
const world = document.getElementById("world");
const tip = document.getElementById("tip");
const status = document.getElementById("status");
const chapters = [...document.querySelectorAll(".ch[data-cam]")];
const mapLinks = [...document.querySelectorAll(".map a")];
const districts = Object.fromEntries([...document.querySelectorAll(".district")].map((d) => [d.dataset.district, d]));
const reduced = root.classList.contains("rm");

/* ---------- Camera ---------- */
// rx/rz in degrees, z = zoom over the fit, cx/cy = world point at the centre,
// ox/oy = screen offset as a fraction of the viewport.
const WIDE = [
  { rx: 56, rz: -36, z: 0.8, cx: 1060, cy: 360, ox: 0.25, oy: 0.04 },
  { rx: 40, rz: -22, z: 1.9, cx: 330, cy: 250, ox: 0.25, oy: 0.04 },
  { rx: 56, rz: -46, z: 1.55, cx: 900, cy: 300, ox: 0.26, oy: 0.12 },
  { rx: 64, rz: -30, z: 1.4, cx: 1560, cy: 290, ox: 0.2, oy: 0.2 },
  { rx: 50, rz: -56, z: 0.8, cx: 1000, cy: 330, ox: 0.25, oy: 0.14 },
  { rx: 62, rz: -28, z: 0.78, cx: 1100, cy: 350, ox: 0.2, oy: 0.06 },
];
const NARROW = [
  { rx: 56, rz: -36, z: 0.95, cx: 1000, cy: 340, ox: 0, oy: 0.3 },
  { rx: 42, rz: -22, z: 2.0, cx: 330, cy: 250, ox: 0, oy: -0.19 },
  { rx: 56, rz: -46, z: 1.7, cx: 900, cy: 300, ox: 0, oy: -0.16 },
  { rx: 64, rz: -30, z: 1.3, cx: 1560, cy: 290, ox: 0, oy: -0.1 },
  { rx: 52, rz: -62, z: 1.0, cx: 960, cy: 330, ox: 0, oy: -0.22 },
  { rx: 60, rz: -40, z: 1.0, cx: 960, cy: 330, ox: 0, oy: -0.25 },
];
const STILL = { rx: 56, rz: -36, z: 0.92, cx: 960, cy: 340, ox: 0, oy: 0.13 };
const KEYS = ["rx", "rz", "z", "cx", "cy", "ox", "oy"];

let vw = 0, vh = 0, fit = 1, narrow = false;
function measure() {
  vw = stage.clientWidth;
  vh = stage.clientHeight;
  narrow = window.innerWidth <= 760;
  fit = reduced ? Math.min(vw / 1950, vh / 900) : narrow ? Math.min(vw / 1150, vh / 1500) : Math.min(vw / 2150, vh / 1060);
}

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

function target() {
  if (reduced) return STILL;
  const frames = narrow ? NARROW : WIDE;
  const mid = window.scrollY + window.innerHeight * 0.5;
  const centres = chapters.map((c) => c.offsetTop + c.offsetHeight * 0.5);
  if (mid <= centres[0]) return frames[0];
  for (let i = 0; i < centres.length - 1; i++) {
    if (mid < centres[i + 1]) {
      const t = smooth((mid - centres[i]) / (centres[i + 1] - centres[i]));
      const a = frames[i], b = frames[i + 1], o = {};
      for (const k of KEYS) o[k] = lerp(a[k], b[k], t);
      return o;
    }
  }
  return frames[frames.length - 1];
}

function apply(c) {
  const s = fit * c.z;
  world.style.transform =
    `translate3d(${(c.ox * vw).toFixed(1)}px, ${(c.oy * vh).toFixed(1)}px, 0) scale(${s.toFixed(4)}) ` +
    `rotateX(${c.rx.toFixed(2)}deg) rotateZ(${c.rz.toFixed(2)}deg) translate3d(${(-c.cx).toFixed(1)}px, ${(-c.cy).toFixed(1)}px, 0)`;
}

/* ---------- Districts rise and sink with the story ---------- */
let active = -1, forced = null;
function setActive(i) {
  if (i === active) return;
  active = i;
  forced = null;
  for (let k = 0; k < 6; k++) stage.classList.toggle("cam-" + k, k === i);
  mapLinks.forEach((a, k) => (k === i ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current")));
  raise();
}
let introDone = reduced, tilesOn = reduced;
function raise() {
  const i = Math.max(active, 0);
  const up = reduced
    ? { tokens: true, core: true, catalog: true }
    : { tokens: tilesOn, core: introDone && i !== 1, catalog: introDone && (i === 0 || i >= 3) };
  if (forced) up[forced] = true;
  for (const [name, el] of Object.entries(districts)) el.classList.toggle("up", !!up[name]);
}
function nearest() {
  const mid = window.innerHeight * 0.5;
  let best = 0, dist = Infinity;
  chapters.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    const d = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}

/* ---------- Loop ---------- */
let cur = reduced ? { ...STILL } : { rx: 18, rz: -96, z: 0.5, cx: 960, cy: 330, ox: 0.2, oy: 0.1 };
let last = performance.now(), running = false, hot = null;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = target();
  const k = 1 - Math.exp(-dt * 4.2);
  let moving = false;
  for (const key of KEYS) {
    const d = t[key] - cur[key];
    const eps = key === "z" || key === "ox" || key === "oy" ? 0.0004 : 0.02;
    if (Math.abs(d) > eps) { cur[key] += d * k; moving = true; } else cur[key] = t[key];
  }
  apply(cur);
  if (hot) placeTip();
  if (moving || hot || tipFading) requestAnimationFrame(frame);
  else running = false;
}
function wake() {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

/* ---------- Tooltip ---------- */
let tipFading = false, fadeTimer = 0;
function placeTip() {
  const r = hot.querySelector(".ft").getBoundingClientRect();
  tip.style.setProperty("--tx", `${Math.round(r.left + r.width / 2)}px`);
  tip.style.setProperty("--ty", `${Math.round(r.top)}px`);
}
function showTip(el) {
  if (hot && hot !== el) hot.classList.remove("is-hot");
  hot = el;
  el.classList.add("is-hot");
  tip.querySelector(".tip__name").textContent = el.dataset.name;
  tip.querySelector(".tip__meta").textContent = el.dataset.meta;
  placeTip();
  tip.classList.add("is-on");
  tipFading = true;
  clearTimeout(fadeTimer);
  wake();
}
function hideTip(el) {
  if (hot !== el) return;
  el.classList.remove("is-hot");
  hot = null;
  tip.classList.remove("is-on");
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => (tipFading = false), 500);
}

const buildings = [...document.querySelectorAll(".bld")];
for (const b of buildings) {
  b.addEventListener("pointerenter", () => showTip(b));
  b.addEventListener("pointerleave", () => hideTip(b));
  b.addEventListener("focus", () => {
    const d = b.closest(".district");
    if (!d.classList.contains("up")) { forced = d.dataset.district; raise(); }
    showTip(b);
  });
  b.addEventListener("blur", () => hideTip(b));
}

/* Roving focus: one tab stop per district, arrow keys inside */
for (const d of [districts.core, districts.catalog]) {
  const items = [...d.querySelectorAll(".bld")];
  d.addEventListener("keydown", (e) => {
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const me = items[i];
    const col = +me.dataset.col, row = +me.dataset.row;
    let next = null;
    const find = (c, r) => items.find((x) => +x.dataset.col === c && +x.dataset.row === r);
    switch (e.key) {
      case "ArrowRight": next = items[i + 1]; break;
      case "ArrowLeft": next = items[i - 1]; break;
      case "ArrowDown": next = find(col, row + 1) || find(col - 1, row + 1); break;
      case "ArrowUp": next = find(col, row - 1); break;
      case "Home": next = items[0]; break;
      case "End": next = items[items.length - 1]; break;
      default: return;
    }
    e.preventDefault();
    if (!next) return;
    me.tabIndex = -1;
    next.tabIndex = 0;
    next.focus({ preventScroll: true });
  });
}

/* ---------- Colour modes ---------- */
const modeButtons = [...document.querySelectorAll("button[data-mode]")];
function syncMode() {
  const m = root.getAttribute("data-mode");
  modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
}
function setMode(m) {
  if (m === root.getAttribute("data-mode")) return;
  const go = () => {
    root.setAttribute("data-mode", m);
    syncMode();
  };
  try { localStorage.setItem("luz-city-mode", m); } catch (e) { /* storage may be blocked */ }
  if (document.startViewTransition && !reduced) document.startViewTransition(go);
  else go();
  const names = { light: "Day: light mode", dark: "Night: dark mode", contrast: "High contrast mode" };
  status.textContent = names[m] + " on.";
}
modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
syncMode();

/* ---------- Copy buttons ---------- */
for (const b of document.querySelectorAll("[data-copy]")) {
  b.addEventListener("click", async () => {
    const text = document.getElementById(b.dataset.copy).textContent;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
    status.textContent = ok ? `Copied: ${text}` : "Copy failed. Select the command and copy it.";
    const label = b.firstChild;
    label.textContent = ok ? "Copied" : "Copy";
    setTimeout(() => (label.textContent = "Copy"), 1600);
  });
}

/* ---------- Cards slide in ---------- */
if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) en.target.classList.toggle("is-in", en.isIntersecting);
  }, { rootMargin: "-22% 0px -22% 0px" });
  chapters.forEach((c) => io.observe(c));
} else chapters.forEach((c) => c.classList.add("is-in"));

/* ---------- Start ---------- */
measure();
apply(cur);
setActive(nearest());
addEventListener("scroll", () => { setActive(nearest()); wake(); }, { passive: true });
addEventListener("resize", () => { measure(); apply(cur); wake(); });
if (!reduced) {
  // the tiles fall into place, then the buildings rise
  requestAnimationFrame(() => {
    tilesOn = true;
    raise();
    wake();
    setTimeout(() => { introDone = true; raise(); }, 650);
  });
}
