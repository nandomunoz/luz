// Writes index.html from template.html: the city's markup, measured from the
// packages (palette from tokens.json, building heights from the gzipped size
// of each component stylesheet). Run: node proto/sitepro/variants/2-city/gen.cjs
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const HERE = __dirname;
const ROOT = path.resolve(HERE, "../../../..");
const tpl = fs.readFileSync(path.join(HERE, "template.html"), "utf8");

function sizes(pkg) {
  const d = `${ROOT}/packages/${pkg}/src/components/`;
  return fs.readdirSync(d)
    .filter((f) => f.endsWith(".css") && !f.startsWith("_") && f !== "index.css")
    .map((f) => ({ slug: f.slice(0, -4), gz: zlib.gzipSync(fs.readFileSync(d + f)).length }));
}
const pretty = (s) => ({ "copy-btn": "Copy button", faq: "FAQ", "do-dont": "Do and don’t" }[s] ||
  (s[0].toUpperCase() + s.slice(1)).replace(/-/g, " "));
const kb = (n) => (n / 1024).toFixed(1) + " KB";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const out = [];
const I = (s) => out.push("        " + s);

I(`<div class="ground" aria-hidden="true"></div>`);
I(`<div class="plinth plinth--s" aria-hidden="true"><i></i><i></i><i></i></div>`);
I(`<div class="plinth plinth--w" aria-hidden="true"><i></i><i></i><i></i></div>`);
for (const [n, p, x] of [["Tokens", "@luz-ds/tokens", 60], ["Core", "@luz-ds/core", 650], ["Catalog", "@luz-ds/catalog", 1290]]) {
  I(`<div class="paint" style="--x:${x}" aria-hidden="true"><span class="paint__n">${n}</span><span class="paint__p">${p}</span></div>`);
}
I(`<div class="road" style="--x:598" aria-hidden="true"></div>`);
I(`<div class="road" style="--x:1238" aria-hidden="true"></div>`);

// Tokens: the palette as paving
const tokens = JSON.parse(fs.readFileSync(ROOT + "/packages/tokens/tokens.json", "utf8")).color;
const fams = ["gray", "blue", "teal", "green", "yellow", "red", "purple"];
I(`<div class="district district--tokens" data-district="tokens" aria-hidden="true">`);
let ti = 0;
fams.forEach((fam, r) => {
  I(`  <span class="tile-label" style="--r:${r}">${fam}</span>`);
  for (const step of Object.keys(tokens[fam])) {
    const v = tokens[fam][step];
    const hex = typeof v === "string" ? v : v.value || v.$value;
    const c = Number(step) / 10 - 1;
    I(`  <span class="tile" style="--c:${c};--r:${r};--z:${Number(step)};--i:${ti++};--hex:${hex}"></span>`);
  }
});
I(`</div>`);

function district(pkg, cols, rows, x0, y0, pitch, foot, cls) {
  const items = sizes(pkg).sort((a, b) => b.gz - a.gz);
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ r, c, far: c + (rows - 1 - r) + c * 0.01 });
  [...slots].sort((a, b) => b.far - a.far).forEach((s, i) => { if (items[i]) s.item = items[i]; });
  const label = pkg === "core"
    ? `Core district: ${items.length} components. Arrow keys move between buildings.`
    : `Catalog district: ${items.length} pieces. Arrow keys move between towers.`;
  I(`<div class="district district--${pkg}" data-district="${pkg}" data-cols="${cols}" role="group" aria-label="${label}">`);
  let i = 0;
  for (const s of slots) {
    if (!s.item) continue;
    const it = s.item;
    const h = Math.round(26 + it.gz * 0.075);
    const name = pretty(it.slug);
    const href = pkg === "core" ? (it.slug === "button" ? "../../docs/button.html" : "../../docs/components.html") : "../../docs/catalog.html";
    const x = x0 + s.c * pitch, y = y0 + s.r * pitch;
    const what = pkg === "core" ? "core component" : "catalog piece";
    I(`  <a class="bld ${cls}" href="${href}" tabindex="${i === 0 ? 0 : -1}" data-col="${s.c}" data-row="${s.r}" data-name="${esc(name)}" data-meta="${what} · ${kb(it.gz)} of CSS, gzipped" aria-label="${esc(name)}, ${what}, ${kb(it.gz)} of CSS" style="--x:${x};--y:${y};--w:${foot};--d:${foot};--h:${h};--i:${i}">` +
      `<span class="shadow" aria-hidden="true"></span>` +
      `<span class="box" aria-hidden="true"><span class="f fw"></span><span class="f fs"></span><span class="f ft"><span class="roof">${esc(it.slug).replace(/-/g, "-<wbr>")}</span></span></span></a>`);
    i++;
  }
  I(`</div>`);
}
district("core", 6, 5, 650, 80, 92, 62, "bld--core");
district("catalog", 7, 6, 1290, 60, 82, 54, "bld--tower");

const html = tpl.replace("<!-- CITY -->", out.join("\n").replace(/^ {8}/, ""));
fs.writeFileSync(path.join(HERE, "index.html"), html);
console.log("wrote index.html", html.length);
