// LUZ home, variant 4: SOURCE. Vanilla, no dependencies.
// Scroll progress per pinned chapter (0..1) drives the morph from markup to page.

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);
const outBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const live = document.getElementById("live");

let morph = root.classList.contains("morph");
let viewSource = false;

/* ---------- chapters ---------- */
const chapters = [...document.querySelectorAll("[data-ch]")].map((sec) => {
  const lines = [...sec.querySelectorAll(".src .ln")];
  const start = parseInt(sec.querySelector(".src").style.counterReset.split(" ")[1] || "0", 10);
  return {
    sec, kind: sec.dataset.ch, lines, start,
    outs: [...sec.querySelectorAll("[data-from]")],
    fades: [...sec.querySelectorAll("[data-fade]")],
    win: sec.querySelector(".win"),
    pct: sec.querySelector(".pill__pct"),
    plabel: sec.querySelector(".pill__label"),
    hint: sec.querySelector(".hint"),
    flips: new Map(),
    p: 0, last: -1,
    // build only
    layers: [...sec.querySelectorAll(".layer")],
    steps: [...sec.querySelectorAll(".steps li")],
    pipe: [...sec.querySelectorAll(".pipe b")],
    pipeBar: sec.querySelector(".pipe__bar span"),
    stepLines: lines.filter((l) => l.dataset.step),
  };
});
const PH = [[0.06, 0.28], [0.36, 0.58], [0.66, 0.88]];

function unionRect(els) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const e of els) { const q = e.getBoundingClientRect(); if (!q.width) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
  return l === Infinity ? null : { left: l, top: t, width: r - l, height: b - t };
}

function measure() {
  if (!morph) return;
  for (const ch of chapters) {
    if (!ch.outs.length) continue;
    ch.sec.classList.add("measuring");
    for (const o of ch.outs) {
      const key = o.dataset.from;
      const lines = ch.lines.filter((l) => l.dataset.k === key);
      const tx = lines.flatMap((l) => [...l.querySelectorAll(".tx")]);
      const src = unionRect(tx.length ? tx : lines.map((l) => l.querySelector(".lc")));
      const dst = o.getBoundingClientRect();
      if (!src || !dst.width) { ch.flips.set(o, { dx: 0, dy: 0, s: 1 }); continue; }
      let s = tx.length && key !== "tbl" && key !== "dlg" ? src.height / dst.height : Math.min(src.width / dst.width, src.height / dst.height);
      if (tx.length && lines.length === 1) s = Math.min(src.height / dst.height, (src.width * 1.15) / dst.width) || s;
      s = clamp(s, 0.08, 3);
      ch.flips.set(o, { dx: src.left - dst.left, dy: src.top - dst.top, s });
    }
    ch.sec.classList.remove("measuring");
    ch.last = -1;
  }
}

function progress(sec) {
  const r = sec.getBoundingClientRect();
  const span = r.height - innerHeight;
  return span > 0 ? clamp(-r.top / span) : 1;
}

function renderMorph(ch, pe) {
  const n = ch.lines.length;
  ch.lines.forEach((l, i) => {
    const tt = ease(clamp((pe - 0.03 - 0.16 * (i / n)) / 0.18));
    const xt = ease(clamp((pe - 0.3 - 0.14 * (i / n)) / 0.22));
    l.style.setProperty("--tt", tt.toFixed(3));
    l.style.setProperty("--xt", xt.toFixed(3));
  });
  ch.win.style.setProperty("--bg", smooth(clamp((pe - 0.2) / 0.24)).toFixed(3));
  const m = ch.outs.length;
  ch.outs.forEach((o, j) => {
    const f = ch.flips.get(o) || { dx: 0, dy: 0, s: 1 };
    const late = o.dataset.from === "dlg";
    const d = late ? 0.62 : 0.3 + 0.2 * (j / m);
    const t = clamp((pe - d) / (late ? 0.22 : 0.3));
    const e = ease(t);
    const k = 1 - e;
    o.style.transform = `translate(${(f.dx * k).toFixed(1)}px, ${(f.dy * k).toFixed(1)}px) scale(${(f.s + (1 - f.s) * e).toFixed(4)})`;
    o.style.opacity = smooth(clamp(t * 1.7)).toFixed(3);
  });
  for (const f of ch.fades) f.style.opacity = smooth(clamp((pe - 0.6) / 0.2)).toFixed(3);
  if (ch.hint) ch.hint.style.setProperty("--hint", (1 - clamp(pe / 0.06)).toFixed(3));
  // the dialog reopens if it was closed and the reader scrolls back
  if (ch.kind === "el" && pe < 0.5) { const d = ch.sec.querySelector("dialog"); if (d && !d.open) d.show(); }
}

function renderBuild(ch, pe) {
  ch.stepLines.forEach((l) => {
    const k = +l.dataset.step - 1;
    const t = ease(clamp((pe - PH[k][0]) / 0.08));
    l.style.setProperty("--a", t.toFixed(3));
    l.style.setProperty("--hl", (Math.sin(Math.PI * clamp((pe - PH[k][0]) / 0.2)) * 0.9).toFixed(3));
  });
  const ts = PH.map(([a, b]) => clamp((pe - a) / (b - a)));
  ch.layers.forEach((layer, i) => {
    if (i === 0) return;
    const t = ts[i - 1];
    const op = i === 1 ? clamp(t / 0.12) : i === 2 ? smooth(clamp(t / 0.45)) : smooth(clamp(t / 0.3));
    layer.style.opacity = op.toFixed(3);
    layer.style.visibility = op > 0.001 ? "visible" : "hidden";
    const anim = [...layer.querySelectorAll("[data-a]")];
    anim.forEach((el, j) => {
      const d = (i === 1 ? 0.08 : 0.1) + j * (i === 1 ? 0.1 : 0.12);
      const lt = clamp((t - d) / 0.42);
      const a = el.dataset.a;
      let tr = "", o = 1;
      if (a === "drop") { const e = outBack(lt); tr = `translateY(${((1 - e) * -260).toFixed(1)}%)`; o = clamp(lt * 4); }
      else if (a === "pop") { const e = ease(lt); tr = `translateY(${((1 - e) * 14).toFixed(1)}px) scale(${(0.94 + 0.06 * e).toFixed(4)})`; o = clamp(lt * 2); }
      else if (a === "down") { const e = ease(lt); tr = `translateY(${((1 - e) * -110).toFixed(1)}%)`; }
      else if (a === "up") { const e = ease(lt); tr = `translateY(${((1 - e) * 60).toFixed(1)}px)`; o = clamp(lt * 2); }
      el.style.transform = tr; el.style.opacity = o.toFixed(3);
    });
    const scan = layer.querySelector(".scanline");
    if (scan) { scan.style.transform = `translateY(${(t * 100).toFixed(2)}cqh)`; scan.style.opacity = (Math.sin(Math.PI * t) * (t > 0 && t < 1 ? 1 : 0)).toFixed(3); }
  });
  const stepNow = ts.filter((t) => t > 0).length;
  const active = Math.max(0, stepNow - 1);
  ch.steps.forEach((li, i) => { li.dataset.state = i < active ? "done" : i === active ? "active" : "todo"; if (i === active) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
  ch.pipe.forEach((b, i) => b.classList.toggle("on", ts[i] >= 0.5));
  if (ch.pipeBar) ch.pipeBar.style.transform = `scaleX(${clamp((pe - PH[0][0]) / (PH[2][1] - PH[0][0])).toFixed(3)})`;
}

const RENDERED = (ch, pe) => (ch.kind === "build" ? clamp((pe - PH[0][0]) / (PH[2][1] - PH[0][0])) : clamp((pe - 0.3) / 0.55));

function renderChapter(ch, force) {
  const pe = viewSource ? 0 : ch.p;
  if (!force && Math.abs(pe - ch.last) < 0.0005) return;
  ch.last = pe;
  if (ch.kind === "build") renderBuild(ch, pe); else renderMorph(ch, pe);
  const r = Math.round(RENDERED(ch, pe) * 100);
  if (ch.pct) ch.pct.textContent = r + "%";
  if (ch.plabel) ch.plabel.textContent = r >= 100 ? "rendered" : r > 0 ? "rendering" : "source";
}

/* ---------- status bar + minimap ---------- */
const status = {
  file: document.querySelector('[data-s="file"]'), ln: document.querySelector('[data-s="ln"]'),
  mode: document.querySelector('[data-s="mode"]'), pct: document.querySelector('[data-s="pct"]'),
};
const sections = [...document.querySelectorAll("main > section, body > footer")];
const top = document.querySelector(".top");
const mini = document.querySelector(".mini");
const miniDoc = mini.querySelector(".mini__doc");
const miniView = mini.querySelector(".mini__view");

function buildMini() {
  miniDoc.textContent = "";
  const H = document.documentElement.scrollHeight;
  const h = mini.clientHeight || 1;
  for (const s of sections) {
    const box = document.createElement("div");
    box.className = "mini__sec";
    box.style.top = (s.offsetTop / H) * h + "px";
    box.style.height = Math.max(6, (s.offsetHeight / H) * h - 3) + "px";
    const lines = [...s.querySelectorAll(".src .lc")];
    const src = lines.length ? lines.map((l) => [l.textContent.length, !!l.querySelector(".tn")]) : [...s.querySelectorAll("h2, p, dt, dd, code, a")].map((e) => [Math.min(60, e.textContent.length), e.tagName === "H2"]);
    const fit = Math.floor((parseFloat(box.style.height) + 2) / 4);
    for (const [len, tag] of src.slice(0, fit)) {
      const i = document.createElement("i");
      i.style.width = Math.max(8, Math.min(100, (len / 50) * 100)) + "%";
      if (tag) i.className = "t";
      box.append(i);
    }
    miniDoc.append(box);
  }
}
mini.addEventListener("click", (e) => {
  const r = mini.getBoundingClientRect();
  const H = document.documentElement.scrollHeight;
  scrollTo({ top: ((e.clientY - r.top) / r.height) * H - innerHeight / 2, behavior: "smooth" });
});

function updateChrome() {
  top.classList.toggle("solid", scrollY > 8);
  if (!morph) return;
  const H = document.documentElement.scrollHeight;
  const h = mini.clientHeight;
  if (h) { miniView.style.height = (innerHeight / H) * h + "px"; miniView.style.transform = `translateY(${(scrollY / H) * h}px)`; }
  const mid = innerHeight / 2;
  const sec = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || sections[0];
  const ch = chapters.find((c) => c.sec === sec);
  status.file.textContent = sec.dataset.file || (sec.id ? "index.html#" + sec.id : "index.html");
  if (ch) {
    status.ln.textContent = `Ln ${ch.start + 1}–${ch.start + ch.lines.length}`;
    const r = Math.round(RENDERED(ch, viewSource ? 0 : ch.p) * 100);
    status.pct.textContent = r + "%";
  } else {
    status.ln.textContent = "Ln —";
    status.pct.textContent = viewSource ? "0%" : "100%";
  }
  status.mode.textContent = viewSource ? "view: source" : "render";
}

/* ---------- loop ---------- */
let ticking = false;
function frame(force) {
  ticking = false;
  if (morph) for (const ch of chapters) {
    const r = ch.sec.getBoundingClientRect();
    ch.p = progress(ch.sec);
    if (force || (r.bottom > -50 && r.top < innerHeight + 50)) renderChapter(ch, force === true);
  }
  updateChrome();
}
const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => frame(false)); } };
addEventListener("scroll", req, { passive: true });

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { measure(); buildMini(); frame(true); }, 120); });

/* ---------- mode (morph or static) ---------- */
const flips = [...document.querySelectorAll("[data-flip]")];
function clearInline() {
  for (const ch of chapters) {
    for (const l of ch.lines) l.removeAttribute("style");
    for (const o of [...ch.outs, ...ch.fades, ...ch.layers, ...ch.sec.querySelectorAll("[data-a], .scanline")]) o.removeAttribute("style");
    if (ch.win) ch.win.removeAttribute("style");
  }
}
function setMode(m) {
  morph = m;
  root.classList.toggle("morph", m);
  root.classList.toggle("static", !m);
  flips.forEach((b) => (b.hidden = !m));
  if (!m) { if (viewSource) toggleSource(true); clearInline(); }
  else { measure(); buildMini(); }
  frame(true);
}
reduce.addEventListener("change", () => setMode(!reduce.matches));

/* ---------- View source / View page ---------- */
function toggleSource(instant) {
  const go = () => {
    viewSource = !viewSource;
    root.classList.toggle("vs", viewSource);
    flips.forEach((b) => { b.querySelector(".flip__label").textContent = viewSource ? "View page" : "View source"; });
    frame(true);
  };
  if (!instant && morph && document.startViewTransition) {
    const scan = document.querySelector(".scan");
    scan.classList.add("on");
    const vt = document.startViewTransition(go);
    vt.finished.finally(() => scan.classList.remove("on"));
  } else go();
  live.textContent = viewSource ? "Showing the source of the page." : "Showing the rendered page.";
}
flips.forEach((b) => b.addEventListener("click", () => toggleSource(false)));

/* keyboard: a focused control in a pinned chapter is always shown rendered */
document.addEventListener("focusin", (e) => {
  if (!morph) return;
  const sec = e.target.closest("[data-ch]");
  if (!sec || !e.target.closest(".out")) return;
  if (viewSource) toggleSource(true);
  const ch = chapters.find((c) => c.sec === sec);
  if (ch && ch.p < 0.9) {
    const y = sec.getBoundingClientRect().top + scrollY + (sec.offsetHeight - innerHeight) * 0.92;
    scrollTo({ top: y, behavior: "instant" });
    frame(true);
  }
});

/* ---------- demo form ---------- */
document.querySelectorAll("[data-demo]").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); live.textContent = "Demo form: nothing was sent."; }));

/* ---------- copy ---------- */
document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
  const text = document.getElementById(b.dataset.copy).textContent.trim();
  try { await navigator.clipboard.writeText(text); } catch { const r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); getSelection().removeAllRanges(); getSelection().addRange(r); }
  b.textContent = "Copied"; b.classList.add("ok"); live.textContent = "Copied: " + text;
  setTimeout(() => { b.textContent = "Copy"; b.classList.remove("ok"); }, 1800);
}));

/* ---------- reveals and the typed commands ---------- */
let d = 0;
document.querySelectorAll(".term__cmd").forEach((c) => {
  const text = c.textContent;
  c.textContent = "";
  for (const ch of text) { const s = document.createElement("span"); s.className = "c"; s.style.setProperty("--d", d++); s.textContent = ch; c.append(s); }
  d += 14;
});
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  en.target.classList.add("in");
  en.target.querySelector(".term")?.classList.add("typed");
  io.unobserve(en.target);
}), { threshold: 0.2 });
document.querySelectorAll(".views, .facts, .setup").forEach((s) => io.observe(s));

/* ---------- start ---------- */
if (reduce.matches) setMode(false);
else setMode(true);
document.fonts?.ready.then(() => { measure(); buildMini(); frame(true); });
addEventListener("load", () => { measure(); buildMini(); frame(true); });
