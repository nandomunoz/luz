// BROADSHEET: the press. Vertical scroll drives a horizontal track.
const root = document.documentElement;
const press = document.getElementById("press");
const viewport = document.getElementById("viewport");
const track = document.getElementById("track");
const bar = document.getElementById("folio-bar");
const spreads = [...track.querySelectorAll(".spread")];
const navLinks = [...document.querySelectorAll(".folio__nav a[data-page]")];
const wide = matchMedia("(min-width: 48rem) and (min-height: 34rem)");
const calm = matchMedia("(prefers-reduced-motion: reduce)");

let horizontal = false;
let W = 0, maxX = 0, pressTop = 0, lefts = [], widths = [];
let ticking = false;
let lastX = -1;
let current = "";

// Fold shades, decorative.
const shades = spreads.map((s) => {
  const d = document.createElement("div");
  d.className = "spread__shade";
  d.setAttribute("aria-hidden", "true");
  s.append(d);
  return d;
});

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function setCurrent(id) {
  if (id === current) return;
  current = id;
  for (const a of navLinks) {
    if (a.dataset.page === id) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  }
  const active = navLinks.find((a) => a.dataset.page === id);
  const nav = active?.closest(".folio__nav");
  if (nav && nav.scrollWidth > nav.clientWidth) {
    const a = active.getBoundingClientRect(), n = nav.getBoundingClientRect();
    if (a.left < n.left) nav.scrollLeft -= n.left - a.left + 8;
    else if (a.right > n.right) nav.scrollLeft += a.right - n.right + 8;
  }
}

/* ---------------- ink ---------------- */
function ink(spread) {
  if (spread.classList.contains("is-inked")) return;
  spread.classList.add("is-inked");
  if (!calm.matches) countUp(spread);
}
function countUp(spread) {
  for (const el of spread.querySelectorAll("[data-count]")) {
    const to = Number(el.dataset.count);
    if (!to) continue;
    const t0 = performance.now();
    const dur = 1100;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

/* ---------------- the horizontal press ---------------- */
function measure() {
  track.style.transform = "none";
  for (const s of spreads) s.style.transform = "";
  W = viewport.clientWidth;
  lefts = spreads.map((s) => s.offsetLeft);
  widths = spreads.map((s) => s.offsetWidth);
  const total = lefts.at(-1) + widths.at(-1);
  maxX = Math.max(0, total - W);
  press.style.height = `${maxX + window.innerHeight}px`;
  pressTop = press.getBoundingClientRect().top + window.scrollY;
  lastX = -1;
}

function frame() {
  ticking = false;
  if (!horizontal) return;
  const x = clamp(window.scrollY - pressTop, 0, maxX);
  if (x === lastX) return;
  lastX = x;
  track.style.transform = `translate3d(${-x}px,0,0)`;
  bar.style.transform = `scaleX(${maxX ? x / maxX : 0})`;

  let cur = spreads[0].id;
  spreads.forEach((s, i) => {
    const left = lefts[i] - x; // on-screen left edge
    const right = left + widths[i];
    // The page turns as it leaves: hinged on its right edge, it folds away.
    const q = clamp((W - right) / W, 0, 1);
    if (q > 0 && right > 0) {
      const e = q * q * (3 - 2 * q);
      s.style.transformOrigin = "100% 50%";
      s.style.transform = `perspective(${Math.round(W * 1.4)}px) rotateY(${(-62 * e).toFixed(2)}deg)`;
      shades[i].style.opacity = (e * 0.95).toFixed(3);
    } else if (s.style.transform) {
      s.style.transform = "";
      shades[i].style.opacity = "0";
    }
    if (left < W * 0.62 && right > 0) ink(s);
    if (left <= W * 0.5) cur = s.id;
  });
  // Parallax of the front-page photograph.
  const photo = document.querySelector(".photo__img");
  if (photo) photo.style.setProperty("--px", `${(x * 0.06).toFixed(1)}px`);
  setCurrent(cur);
}

function onScroll() {
  if (!ticking) { ticking = true; requestAnimationFrame(frame); }
}

function xFor(spread) {
  return clamp(lefts[spreads.indexOf(spread)], 0, maxX);
}

function goTo(spread, smooth) {
  if (!horizontal) {
    spread.scrollIntoView({ behavior: smooth && !calm.matches ? "smooth" : "auto" });
    return;
  }
  window.scrollTo({ top: pressTop + xFor(spread), behavior: smooth ? "smooth" : "auto" });
}

function setup() {
  const want = wide.matches && !calm.matches;
  const anchor = current ? document.getElementById(current) : null;
  horizontal = want;
  root.classList.toggle("is-press", want);
  if (want) {
    measure();
    if (anchor && anchor !== spreads[0]) window.scrollTo(0, pressTop + xFor(anchor));
    frame();
  } else {
    press.style.height = "";
    track.style.transform = "";
    for (const s of spreads) { s.style.transform = ""; }
    for (const d of shades) d.style.opacity = "0";
  }
}

/* Navigation: real links; in the press they turn the pages. */
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.getElementById(a.getAttribute("href").slice(1));
  if (!target || !spreads.includes(target)) return;
  e.preventDefault();
  history.pushState(null, "", `#${target.id}`);
  goTo(target, true);
  skipFocusScroll = true;
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  setTimeout(() => { skipFocusScroll = false; }, 50);
});

/* Tabbing into an off-screen spread brings it into view. */
let skipFocusScroll = false;
document.addEventListener("focusin", (e) => {
  if (!horizontal || skipFocusScroll) return;
  const spread = e.target.closest?.(".spread");
  if (!spread || e.target === spread) return;
  const fix = () => {
    const r = e.target.getBoundingClientRect();
    if (r.left >= 0 && r.right <= W) return false;
    const x = clamp(window.scrollY - pressTop, 0, maxX);
    const i = spreads.indexOf(spread);
    // Element position inside the track, from layout, not from the folded view.
    let el = e.target, offset = 0;
    const sr = spread.getBoundingClientRect();
    offset = r.left - sr.left; // spread is unfolded when focused element is reached forwards
    if (spread.style.transform) offset = clamp(offset, 0, widths[i]);
    const target = clamp(lefts[i] + offset - W * 0.3, 0, maxX);
    window.scrollTo({ top: pressTop + target, behavior: "auto" });
    frame();
    return true;
  };
  if (fix()) requestAnimationFrame(() => { lastX = -1; frame(); fix(); });
});

window.addEventListener("popstate", () => {
  const t = document.getElementById(location.hash.slice(1));
  if (t && spreads.includes(t)) goTo(t, false);
});

/* Vertical: print in with an observer (skipped with reduced motion). */
let io;
function observeInk() {
  if (calm.matches) { spreads.forEach((s) => s.classList.add("is-inked")); return; }
  io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting && !horizontal) ink(en.target);
  }, { threshold: 0.08 });
  spreads.forEach((s) => io.observe(s));
}

/* ---------------- ticker ---------------- */
function setupTicker() {
  const ticker = document.querySelector(".ticker");
  const belt = document.getElementById("ticker-belt");
  const list = belt.querySelector(".ticker__list");
  const btn = document.getElementById("ticker-toggle");
  const text = btn.querySelector(".ticker__text");
  const copy = list.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  copy.querySelectorAll("li").forEach((li) => li.setAttribute("aria-hidden", "true"));
  const apply = () => {
    if (calm.matches) {
      copy.remove();
      root.classList.remove("ticker-on");
      btn.hidden = true;
      document.getElementById("ticker-window").tabIndex = 0;
      return;
    }
    if (!copy.isConnected) belt.append(copy);
    document.getElementById("ticker-window").removeAttribute("tabindex");
    btn.hidden = false;
    root.classList.add("ticker-on");
    // ~70 px per second, whatever the length.
    belt.style.setProperty("--belt-dur", `${Math.round(list.scrollWidth / 70)}s`);
  };
  btn.addEventListener("click", () => {
    const paused = ticker.classList.toggle("is-paused");
    text.textContent = paused ? "Play" : "Pause";
  });
  calm.addEventListener("change", apply);
  apply();
}

/* ---------------- demos and coupons ---------------- */
const status = document.getElementById("copied");
async function copyText(value) {
  try { await navigator.clipboard.writeText(value); return true; } catch { return false; }
}
function say(msg) {
  status.textContent = "";
  setTimeout(() => { status.textContent = msg; }, 30);
}

document.querySelectorAll("[data-copy-from]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const code = document.getElementById(btn.dataset.copyFrom);
    const value = code.textContent.trim();
    const ok = await copyText(value);
    const coupon = btn.closest("[data-coupon]");
    coupon.style.setProperty("--cut-x", `${coupon.clientWidth - 48}px`);
    coupon.classList.remove("is-cut");
    void coupon.offsetWidth;
    coupon.classList.add("is-cut");
    say(ok ? `Cut out and copied: ${value}` : `Copy did not work here. Select the command: ${value}`);
    if (!ok) {
      const range = document.createRange();
      range.selectNodeContents(code);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
  });
});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  const label = btn.textContent;
  btn.addEventListener("click", async () => {
    const ok = await copyText(btn.dataset.copy);
    btn.textContent = ok ? "Copied" : "Could not copy";
    setTimeout(() => { btn.textContent = label; }, 1600);
  });
});

document.querySelector('[data-demo="press"]')?.addEventListener("click", (e) => {
  const b = e.currentTarget;
  b.textContent = b.textContent === "Press me" ? "Pressed. Thank you." : "Press me";
});
document.querySelector('[data-demo="modal"]')?.addEventListener("click", () => {
  document.getElementById("ad-dialog").showModal();
});
document.querySelector('[data-demo="mode"]')?.addEventListener("click", (e) => {
  const b = e.currentTarget;
  const ad = b.closest(".ad");
  const modes = ["light", "dark", "high contrast"];
  const next = modes[(modes.indexOf(b.textContent.replace("Mode: ", "")) + 1) % modes.length];
  ad.classList.toggle("is-dark", next === "dark");
  ad.classList.toggle("is-hc", next === "high contrast");
  b.textContent = `Mode: ${next}`;
});
document.querySelector('[data-demo="toast"]')?.addEventListener("click", (e) => {
  const out = e.currentTarget.parentElement.querySelector("[data-toast]");
  out.textContent = "";
  clearTimeout(out._t);
  setTimeout(() => { out.textContent = "Toast is served. It leaves in a moment."; }, 30);
  out._t = setTimeout(() => { out.textContent = ""; }, 3300);
});

/* ---------------- start ---------------- */
if (!calm.matches) root.classList.add("ink-on");
setupTicker();
observeInk();
setup();

const hashTarget = document.getElementById(location.hash.slice(1));
if (hashTarget && spreads.includes(hashTarget)) {
  setCurrent(hashTarget.id);
  requestAnimationFrame(() => goTo(hashTarget, false));
} else {
  setCurrent("a1");
  ink(spreads[0]);
}

window.addEventListener("scroll", onScroll, { passive: true });
let rz;
window.addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    if (horizontal !== (wide.matches && !calm.matches)) setup();
    else if (horizontal) { measure(); frame(); }
  }, 120);
});
wide.addEventListener("change", setup);
calm.addEventListener("change", () => {
  root.classList.toggle("ink-on", !calm.matches);
  if (calm.matches) spreads.forEach((s) => s.classList.add("is-inked"));
  setup();
});
if (document.fonts?.ready) document.fonts.ready.then(() => { if (horizontal) { measure(); frame(); } });

/* Vertical mode: current page from the observer. */
const pageIO = new IntersectionObserver((entries) => {
  if (horizontal) return;
  for (const en of entries) if (en.isIntersecting) setCurrent(en.target.id);
}, { rootMargin: "-45% 0px -50% 0px" });
spreads.forEach((s) => pageIO.observe(s));
