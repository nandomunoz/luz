/**
 * LUZ site header — one behavior for every page of the site (home, docs).
 * Everything here enhances what works without JavaScript: the color mode is
 * a native radio group (:root:has() in the tokens) and the menu
 * drawer is a native popover.
 *
 * - Color mode: <luz-color-mode remember by="clock"> in the footer owns it (it
 *   stores the choice under core's "luz-theme" key and, in Auto, follows
 *   the clock: apps/site/boot.js set the same mode before the first paint);
 *   this module defines the element and turns the radios into core's cycle
 *   button. With scripting on, that button is fixed at the bottom right of
 *   the window (header.css); without it the radios stay in the footer.
 * - Menu drawer: catalog's initSidebar() on #page-nav, so a link closes the
 *   drawer and the current section is marked.
 * - Publishes the sticky header's height as --site-header-h on <html>, so
 *   anchored targets, the docs sidebar and the drawer sit below the header.
 *
 * Lives in apps/site, which the home page and the docs both import.
 * Not part of any published package.
 */

import { initThemeCycle } from "/packages/core/dist/theme.js";
import { initSidebar } from "/packages/catalog/dist/sidebar.js";
// Defines <luz-color-mode>: the footer's switcher on every page, which owns the mode
import "/packages/catalog/dist/color-mode.js";

function publishHeight(header) {
  const publish = () =>
    document.documentElement.style.setProperty("--site-header-h", `${header.offsetHeight}px`);
  publish();
  if (typeof ResizeObserver === "function") new ResizeObserver(publish).observe(header);
}

/* PROTO favicon animation: the loop of the header's prism (header.css), in
   the tab. favicon.svg animates by itself only in Firefox; Chrome draws its
   first frame, so the frames are written here, ten a second, as data: URLs.
   Nothing under reduced motion. */
const FAVICON_LOOP = 4800;
const FAVICON_BANDS = [
  ["M20.8 10.46 7.04 17.66 23.36 14.89Z", 0.25, 0],
  ["M23.36 14.89 7.04 17.66 25.92 19.33Z", 0.45, 300],
  ["M25.92 19.33 7.04 17.66 28.48 23.76Z", 0.65, 600],
];

/** The fill opacity of a band of tone t at a time, as the keyframes of header.css. */
function bandOpacity(ms, t, delay) {
  if (ms < delay) return 1;
  const p = ((ms - delay) % FAVICON_LOOP) / FAVICON_LOOP;
  const ease = (x) => x * x * (3 - 2 * x);
  if (p < 0.12 || p >= 0.78) return 1;
  if (p < 0.32) return 1 + (t - 1) * ease((p - 0.12) / 0.2);
  if (p < 0.58) return t;
  return t + (1 - t) * ease((p - 0.58) / 0.2);
}

function faviconFrame(ms) {
  const bands = FAVICON_BANDS.map(([d, t, delay]) => {
    const o = bandOpacity(ms, t, delay);
    const line = (o - t) / (1 - t);
    return `<path fill="#0066cf" fill-opacity="${o.toFixed(2)}" stroke="#0066cf" stroke-width=".4" stroke-linejoin="round" stroke-opacity="${line.toFixed(2)}" d="${d}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${bands}<path fill="#0066cf" fill-rule="evenodd" d="M20.8 10.46 16 2.14 7.04 17.66ZM32 29.86 28.48 23.76 7.04 17.66 0 29.86Z"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function animateFavicon() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const link = document.querySelector('link[rel~="icon"][type="image/svg+xml"]');
  if (!link) return;
  const start = performance.now();
  setInterval(() => {
    link.href = faviconFrame(performance.now() - start);
  }, 100);
}

/**
 * Wire the drawer and the header's height: what the header does besides the
 * colour-mode button. A page that names that button itself (the docs, which
 * wait for the strings of the page's language) calls this alone.
 */
export function initSiteChrome() {
  animateFavicon();
  const nav = document.getElementById("page-nav");
  if (nav) initSidebar(nav);
  const header = document.querySelector(".site-header");
  if (header) publishHeight(header);
}

/** Wire the header of a page of the site: the cycle button, the drawer and the header's height. */
export function initSiteHeader() {
  // One button that steps through the modes; the radios stay underneath
  initThemeCycle();
  initSiteChrome();
}
