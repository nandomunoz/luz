/**
 * The triangle field: a tessellation of equilateral triangles, some of them
 * raised off the page, lit from the top left. One generator, seeded, so every
 * picture of the site is the same system with different numbers.
 *
 * No dependency. `field(options)` returns an SVG string.
 */

const SQRT3_2 = Math.sqrt(3) / 2;

export const PALETTE = {
  paper: "#f4f3ef",
  paperLo: "#e6e5df",
  white: "#ffffff",
  blue: "#2b66f0",
  blueHi: "#6f9bff",
  blueLo: "#1f4fd0",
  deep: "#12338f",
  ink: "#0b1730",
};

/** mulberry32: small, seeded, good enough to place triangles. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => Math.round(v * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");

/** The three corners of the cell (row r, half-column k) of a grid of side s. */
function cell(r, k, s, ox = 0, oy = 0) {
  const h = s * SQRT3_2;
  const cx = (k * s) / 2 + ox;
  const top = r * h + oy;
  const bottom = top + h;
  const up = (k + r) % 2 === 0;
  const corners = up
    ? [[cx - s / 2, bottom], [cx + s / 2, bottom], [cx, top]]
    : [[cx - s / 2, top], [cx + s / 2, top], [cx, bottom]];
  return { corners, up, cx, cy: up ? top + (h * 2) / 3 : top + h / 3 };
}

/** Pull a triangle toward its centre by `d` px, so a tile has a joint around it. */
function inset(corners, d) {
  const cx = (corners[0][0] + corners[1][0] + corners[2][0]) / 3;
  const cy = (corners[0][1] + corners[1][1] + corners[2][1]) / 3;
  return corners.map(([x, y]) => {
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * d * 2, y + (dy / len) * d * 2];
  });
}

/** A triangle a third of the size, sitting in one corner of its cell. */
function chip(corners, corner, scale) {
  const [ax, ay] = corners[corner];
  return corners.map(([x, y]) => [ax + (x - ax) * scale, ay + (y - ay) * scale]);
}

/**
 * @param {object} o
 * @param {number} o.width   viewBox width
 * @param {number} o.height  viewBox height
 * @param {number} o.side    side of a triangle
 * @param {number} o.seed
 * @param {(x:number,y:number,rand:()=>number)=>boolean} o.isBlue  the ground under a point (0..1, 0..1)
 * @param {(x:number,y:number)=>number} o.density  chance (0..1) that a cell is raised
 * @param {string} [o.extra]  SVG drawn on top: the annotations
 * @param {boolean} [o.grid]  draw the hairlines of the grid
 * @param {string} [o.align] the preserveAspectRatio alignment, xMidYMid by default
 * @param {boolean} [o.light] false leaves out the wash of light from the top left
 * @param {string} [o.ground] "paper" paints paper under everything, "none" leaves it clear
 */
export function field(o) {
  const { width: W, height: H, side: s, seed } = o;
  const rand = prng(seed);
  const h = s * SQRT3_2;
  const rows = Math.ceil(H / h) + 1;
  const cols = Math.ceil((W / s) * 2) + 3;
  const P = PALETTE;

  const ground = [];
  const lines = [];
  const levels = [[], [], []];

  for (let r = -1; r < rows; r++) {
    for (let k = -1; k < cols; k++) {
      const c = cell(r, k, s);
      const u = c.cx / W;
      const v = c.cy / H;
      const blue = o.isBlue(u, v, rand);
      if (blue) ground.push(`<polygon points="${pts(c.corners)}"/>`);

      const chance = o.density(u, v);
      const roll = rand();
      if (roll < chance) {
        // Mostly the opposite of the ground, as paper on colour reads as relief
        const flip = rand() < 0.74;
        const fill = blue === flip ? "white" : "blue";
        const level = rand() < 0.5 ? 0 : rand() < 0.65 ? 1 : 2;
        levels[level].push({ corners: inset(c.corners, 1.2), fill });
        // A chip at a corner, one level down: the small pieces of the poster
        if (rand() < 0.42) {
          const near = cell(r + (rand() < 0.5 ? 1 : 0), k + (rand() < 0.5 ? -1 : 1), s);
          levels[0].push({
            corners: chip(inset(near.corners, 1.2), Math.floor(rand() * 3), 0.34),
            fill: rand() < 0.7 ? fill : fill === "white" ? "blue" : "white",
            small: true,
          });
        }
      } else if (roll > 1 - chance * 0.16) {
        levels[0].push({
          corners: chip(inset(c.corners, 1.2), Math.floor(rand() * 3), 0.34),
          fill: blue ? "white" : "blue",
          small: true,
        });
      }
    }
  }

  if (o.grid !== false) {
    // Three families of parallel lines draw every edge of the tessellation once
    for (let r = 0; r <= rows; r++) lines.push(`M0 ${n(r * h)}H${W}`);
    const span = H / Math.tan(Math.PI / 3);
    for (let x = -span - s; x < W + span + s; x += s) {
      lines.push(`M${n(x)} 0L${n(x + span)} ${H}`);
      lines.push(`M${n(x)} 0L${n(x - span)} ${H}`);
    }
  }

  // Light from the top left: the shadow falls down and to the right
  const SHADOW = [
    { dx: 7, dy: 10, blur: 6, alpha: 0.26 },
    { dx: 15, dy: 22, blur: 12, alpha: 0.24 },
    { dx: 26, dy: 38, blur: 20, alpha: 0.22 },
  ];
  const k = s / 120;
  const id = `f${seed}`;

  // One group per tile, so the page can animate each: --d is its distance from
  // the bottom-right corner (0..1), where the relief gathers; .t0-.t2 its height.
  const diag = Math.hypot(W, H);
  const relief = levels
    .map((tiles, i) => {
      const sh = SHADOW[i];
      return tiles
        .map((t) => {
          const f = t.small ? 0.55 : 1;
          const cx = (t.corners[0][0] + t.corners[1][0] + t.corners[2][0]) / 3;
          const cy = (t.corners[0][1] + t.corners[1][1] + t.corners[2][1]) / 3;
          const d = Math.round((Math.hypot(W - cx, H - cy) / diag) * 100) / 100;
          return (
            `<g class="t t${i}" style="--d:${d}">` +
            `<polygon points="${pts(t.corners)}" transform="translate(${n(sh.dx * k * f)} ${n(sh.dy * k * f)})" filter="url(#${id}-s${i})" fill="${P.ink}" fill-opacity="${sh.alpha}"/>` +
            `<polygon points="${pts(t.corners)}" fill="url(#${id}-${t.fill})" stroke="url(#${id}-${t.fill})" stroke-width="${n(3 * k)}" stroke-linejoin="round"/>` +
            `</g>`
          );
        })
        .join("");
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="${o.align ?? "xMidYMid"} slice">
<defs>
<linearGradient id="${id}-white" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.white}"/><stop offset="1" stop-color="#e9ebf1"/></linearGradient>
<linearGradient id="${id}-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.blueHi}"/><stop offset="1" stop-color="${P.blue}"/></linearGradient>
<linearGradient id="${id}-ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a74f7"/><stop offset="1" stop-color="${P.blueLo}"/></linearGradient>
<radialGradient id="${id}-light" cx="0.18" cy="0.05" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></radialGradient>
${SHADOW.map((sh, i) => `<filter id="${id}-s${i}" x="-20%" y="-20%" width="150%" height="150%"><feGaussianBlur stdDeviation="${n(sh.blur * k)}"/></filter>`).join("\n")}
</defs>
${o.ground === "none" ? "" : `<rect width="${W}" height="${H}" fill="${P.paper}"/>`}
<g class="g" fill="url(#${id}-ground)" stroke="url(#${id}-ground)" stroke-width="1">${ground.join("")}</g>
${o.light === false ? "" : `<rect class="lt" width="${W}" height="${H}" fill="url(#${id}-light)"/>`}
${lines.length ? `<path class="l" pathLength="1" d="${lines.join("")}" fill="none" stroke="${P.ink}" stroke-opacity="0.11" stroke-width="1"/>` : ""}
${relief}
${o.extra ? `<g class="x">${o.extra(P)}</g>` : ""}
</svg>
`;
}

/* ---- The small furniture of the poster: labels, chevrons, dot fields ---- */

const FONT = `font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-weight="500"`;

export function label(x, y, text, color, size = 13) {
  return `<text x="${x}" y="${y}" ${FONT} font-size="${size}" letter-spacing="1.6" fill="${color}">${text}</text>`;
}

/** A row of small triangles that fades in, pointing right or down. */
export function chevrons(x, y, color, { count = 5, size = 13, down = false } = {}) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const o = n(0.2 + (0.8 * i) / (count - 1));
    const p = down
      ? pts([[x - size * 0.6, y + i * size], [x + size * 0.6, y + i * size], [x, y + i * size + size * 0.8]])
      : pts([[x + i * size, y - size * 0.6], [x + i * size, y + size * 0.6], [x + i * size + size * 0.8, y]]);
    out += `<polygon points="${p}" fill="${color}" fill-opacity="${o}"/>`;
  }
  return out;
}

/** A field of tiny triangles, some missing: the data the system "reads". */
export function dots(x, y, color, { cols = 6, rows = 5, gap = 22, size = 9, seed = 1, fill = 0.55 } = {}) {
  const rand = prng(seed);
  let out = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() > fill) continue;
      const px = x + c * gap + (r % 2 ? gap / 2 : 0);
      const py = y + r * gap * SQRT3_2;
      const up = (r + c) % 2 === 0;
      const p = up
        ? pts([[px - size / 2, py + size * 0.43], [px + size / 2, py + size * 0.43], [px, py - size * 0.43]])
        : pts([[px - size / 2, py - size * 0.43], [px + size / 2, py - size * 0.43], [px, py + size * 0.43]]);
      out += `<polygon points="${p}" fill="${color}"/>`;
    }
  }
  return out;
}

/** The registration mark of the poster: a triangle in a triangle. */
export function mark(x, y, color, size = 18) {
  const outer = pts([[x - size / 2, y + size * 0.43], [x + size / 2, y + size * 0.43], [x, y - size * 0.43]]);
  return `<polygon points="${outer}" fill="none" stroke="${color}" stroke-width="1.2"/><circle cx="${x}" cy="${n(y + size * 0.14)}" r="1.6" fill="${color}"/>`;
}

export function rule(x, y, w, color) {
  return `<path d="M${x} ${y}h${w}" stroke="${color}" stroke-width="1"/>`;
}

/** Deterministic value noise in 0..1, to make the edge of the colour wander. */
export function wobble(u, v, seed = 1) {
  const s = Math.sin(u * 12.9898 * seed + v * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
