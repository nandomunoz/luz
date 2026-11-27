/**
 * The tunnel of the home's hero (`.landing-tunnel`, landing.css): what CSS cannot do alone.
 *
 * The frames fly by CSS (transform and opacity, one animation each), so nothing here advances them. This module
 * only:
 *
 *  - pauses them while the hero is off screen (an IntersectionObserver writes `is-off` on the hero);
 *  - on a desktop with a fine pointer (TILT_QUERY), tilts the tunnel a little towards the pointer: one transform on
 *    the track, written at most once a frame (requestAnimationFrame), and the loop stops when it has arrived. The
 *    hero's box is read once and kept until a resize or a scroll. On a phone or a tablet, and with reduced motion,
 *    no listener is registered; a change of either media query adds or removes them.
 *
 * Writes no HTML and no style sheet: one inline transform, and a class.
 */

/** A desktop with a mouse: the only place the pointer tilts the tunnel. */
export const TILT_QUERY = "(min-width: 64em) and (hover: hover) and (pointer: fine)";

/** How much of the way to the pointer each frame goes, and how close counts as arrived. */
const EASE = 0.05;
const REST = 0.002;

/**
 * @param {HTMLElement | null} hero the `.landing-tunnel` section
 * @param {Window} [win]
 * @returns {() => void} stops everything (for tests)
 */
export function initTunnel(hero, win = window) {
  const track = hero?.querySelector(".landing-tunnel__track");
  if (!hero || !track) return () => {};

  let io = null;
  if ("IntersectionObserver" in win) {
    io = new win.IntersectionObserver(([entry]) => hero.classList.toggle("is-off", !entry.isIntersecting));
    io.observe(hero);
  }
  if (typeof win.matchMedia !== "function") return () => io?.disconnect();

  const tilt = win.matchMedia(TILT_QUERY);
  const still = win.matchMedia("(prefers-reduced-motion: reduce)");
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let box = null;
  let listening = false;

  const step = () => {
    x += (tx - x) * EASE;
    y += (ty - y) * EASE;
    track.style.transform = `rotateY(${(x * 2.5).toFixed(2)}deg) rotateX(${(y * -2).toFixed(2)}deg)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > REST ? win.requestAnimationFrame(step) : 0;
  };
  const go = () => {
    if (!raf) raf = win.requestAnimationFrame(step);
  };
  const move = (event) => {
    box ??= hero.getBoundingClientRect();
    tx = ((event.clientX - box.left) / box.width - 0.5) * 2;
    ty = ((event.clientY - box.top) / box.height - 0.5) * 2;
    go();
  };
  const leave = () => {
    tx = 0;
    ty = 0;
    go();
  };
  const stale = () => {
    box = null;
  };

  const on = () => {
    if (listening) return;
    listening = true;
    track.style.willChange = "transform";
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave, { passive: true });
    win.addEventListener("resize", stale, { passive: true });
    win.addEventListener("scroll", stale, { passive: true });
  };
  const off = () => {
    if (!listening) return;
    listening = false;
    hero.removeEventListener("pointermove", move);
    hero.removeEventListener("pointerleave", leave);
    win.removeEventListener("resize", stale);
    win.removeEventListener("scroll", stale);
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    tx = ty = x = y = 0;
    box = null;
    track.style.transform = "";
    track.style.willChange = "";
  };
  const sync = () => (tilt.matches && !still.matches ? on() : off());

  tilt.addEventListener("change", sync);
  still.addEventListener("change", sync);
  sync();

  return () => {
    tilt.removeEventListener("change", sync);
    still.removeEventListener("change", sync);
    off();
    io?.disconnect();
  };
}
