/**
 * Writes the pictures of the mock-up to assets/art/.
 *   node proto/sitepro/tools/build-art.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chevrons, dots, field, label, mark, rule, wobble } from "./art.mjs";

const out = fileURLToPath(new URL("../assets/art/", import.meta.url));
mkdirSync(out, { recursive: true });

const near = (v, at, width) => Math.max(0, 1 - Math.abs(v - at) / width);

/* The hero: paper at the top left, where the headline is, colour rising to
   the bottom right. The relief gathers where the two meet. */
const heroEdge = (u, v) => u * 0.95 + v * 0.62 + (wobble(u, v, 3) - 0.5) * 0.16;
const hero = field({
  width: 1600,
  height: 1000,
  side: 116,
  seed: 29,
  align: "xMaxYMax",
  isBlue: (u, v) => heroEdge(u, v) > 1.08,
  density: (u, v) => (u < 0.46 ? 0 : 0.03 + 0.55 * near(heroEdge(u, v), 1.08, 0.24)),
  extra: (P) =>
    [
      label(700, 150, "LUZ / 0.4", P.blue),
      label(905, 150, "TOKENS", P.blue),
      label(1075, 150, "CORE", P.blue),
      label(1215, 150, "CATALOG", P.blue),
      chevrons(1110, 204, P.blue, { count: 6, size: 15 }),
      rule(700, 168, 600, P.blue),
      dots(1040, 868, P.white, { cols: 8, rows: 4, seed: 4 }),
      label(1040, 846, "PLAIN HTML, LIT", P.white),
      mark(870, 574, P.blue, 22),
    ].join(""),
});
writeFileSync(out + "hero.svg", hero);

/* The closing band: colour everywhere, paper breaking through at the right. */
const bandEdge = (u, v) => u * 1.1 - v * 0.35 + (wobble(u, v, 5) - 0.5) * 0.25;
const band = field({
  width: 1600,
  height: 640,
  side: 110,
  seed: 11,
  light: false,
  isBlue: (u, v) => bandEdge(u, v) < 0.78,
  density: (u, v) => (u < 0.6 ? 0 : 0.03 + 0.5 * near(bandEdge(u, v), 0.78, 0.26)),
  extra: (P) =>
    [
      chevrons(1010, 150, P.white, { count: 6, size: 14 }),
      dots(1180, 430, P.blue, { cols: 7, rows: 5, seed: 6 }),
      mark(940, 500, P.white, 22),
    ].join(""),
});
writeFileSync(out + "band.svg", band);

/* The 404: almost nothing left. A few pieces, far apart, on paper. */
const lost = field({
  width: 1440,
  height: 900,
  side: 120,
  seed: 404,
  align: "xMidYMax",
  isBlue: (u, v) => v > 0.86 && wobble(u, v, 2) > 0.45,
  density: (u, v) => (u < 0.62 && v > 0.12 && v < 0.78 ? 0 : 0.035 + 0.3 * near(v, 0.9, 0.2)),
  extra: (P) =>
    [
      label(96, 64, "ERROR / 404", P.blue),
      label(1180, 64, "NO LIGHT HERE", P.blue),
      chevrons(1090, 60, P.blue, { count: 5, size: 13 }),
      mark(720, 150, P.blue, 22),
    ].join(""),
});
writeFileSync(out + "lost.svg", lost);

/* The head of the docs: a quiet strip. */
const stripEdge = (u, v) => u * 1.0 + v * 0.2 + (wobble(u, v, 9) - 0.5) * 0.2;
const strip = field({
  width: 1600,
  height: 420,
  side: 105,
  seed: 51,
  align: "xMaxYMid",
  isBlue: (u, v) => stripEdge(u, v) > 1.08,
  density: (u, v) => (u < 0.78 ? 0 : 0.02 + 0.5 * near(stripEdge(u, v), 1.08, 0.16)),
  extra: (P) =>
    [
      chevrons(1100, 330, P.blue, { count: 6, size: 13 }),
      dots(1400, 290, P.white, { cols: 6, rows: 4, seed: 12 }),
    ].join(""),
});
writeFileSync(out + "strip.svg", strip);

console.log("art: hero, band, lost, strip");
