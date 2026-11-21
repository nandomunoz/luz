/**
 * Builds the mock-up: the pictures, then every page of src/pages/ wrapped in
 * its layout. No dependency; the output is static HTML next to assets/, so the
 * site opens from the file system.
 *
 *   node proto/redesign/tools/build.mjs
 *
 * A figure in the copy is never typed (GUIA-SISTEMA-DE-DISENO.md, section 10,
 * point 30): {{n-core}}, {{kb-core}}… come from the packages and budgets.json,
 * and {{cr:ffffff/2b66f0}} is a contrast ratio computed here.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { collapse, translate } from "./i18n.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO = join(ROOT, "../..");
const SRC = join(ROOT, "src");
const GITHUB = "https://github.com/nandovejer/luz";

/* ---- Languages ------------------------------------------------------------
   English is the source. A language is src/i18n/<code>.json (see i18n.mjs):
   its pages are the English ones with every unit of text swapped, and it is
   written under <code>/ next to the English site. */
const LANGS = ["en", "es"];
let LANG = "en";
let DICT = {};
const missing = new Set();
const tr = (html) => (LANG === "en" ? html : translate(html, DICT, (k) => missing.add(k)));
/** One string the build itself writes (a label, a heading), in the language of the page. */
const T = (s) => {
  if (LANG === "en") return s;
  const to = DICT[collapse(s)];
  if (to === undefined) missing.add(collapse(s));
  return to ?? s;
};
/** A link to a page of the site, in the language of the page. */
const LINK = "{{lroot}}";

// The page shell holds the skip link and the placeholders: it is not translated
const partial = (name) => {
  const text = readFileSync(join(SRC, "partials", `${name}.html`), "utf-8");
  return name === "page" ? text : tr(text);
};
const json = (path) => JSON.parse(readFileSync(join(REPO, path), "utf-8"));

/* ---- The figures of the copy, read from the repository ------------------- */

const VERSION = json("packages/core/package.json").version;
const sheets = (pkg) =>
  readdirSync(join(REPO, `packages/${pkg}/src/components`)).filter(
    (f) => f.endsWith(".css") && !f.startsWith("_") && f !== "index.css",
  ).length;
const budget = (name) => {
  const row = json("budgets.json").budgets.find((b) => b.name === name);
  if (!row) throw new Error(`budgets.json has no row "${name}"`);
  return String(Math.round((row.max / 1024) * 10) / 10);
};
const N_CORE = sheets("core");
const N_CATALOG = sheets("catalog");

function luminance(hex) {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, floored to two decimals so it never rounds up past a threshold. */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return `${(Math.floor(((hi + 0.05) / (lo + 0.05)) * 100) / 100).toFixed(2)}:1`;
}

/* ---- The sidebar of the docs ---------------------------------------------
   The sections of the guide (section 8). An entry with `own` is a page of the
   mock-up; the others point at the template of their kind, so no link is dead. */
const NAV = [
  {
    label: "Get started",
    items: [
      { label: "Set it up", href: "docs/get-started.html", own: true },
      { label: "Make it yours", href: "docs/get-started.html" },
      { label: "Migrate a project", href: "docs/get-started.html" },
    ],
  },
  {
    label: "Work with AI",
    items: [
      { label: "Use Luz with an AI", href: "docs/ai.html", own: true },
      { label: "Every flag", href: "docs/ai.html" },
      { label: "No terminal?", href: "docs/ai.html" },
    ],
  },
  {
    label: "Tokens",
    pkg: "@luz-ds/tokens",
    items: [
      { label: "Color", href: "docs/color.html", own: true },
      { label: "Color modes", href: "docs/color.html" },
      { label: "Typography", href: "docs/color.html" },
      { label: "Spacing", href: "docs/color.html" },
      { label: "Motion", href: "docs/color.html" },
    ],
  },
  {
    label: "HTML elements",
    pkg: "@luz-ds/core",
    items: [
      { label: "Elements A–Z", href: "docs/components.html" },
      { label: "Forms", href: "docs/components.html" },
      { label: "Text", href: "docs/components.html" },
    ],
  },
  {
    label: "Components",
    pkg: "@luz-ds/core",
    items: [
      { label: "All components", href: "docs/components.html", own: true },
      { label: "Button", href: "docs/button.html", own: true },
      { label: "Card", href: "docs/button.html" },
      { label: "Form inputs", href: "docs/button.html" },
      { label: "Modal", href: "docs/button.html" },
      { label: "Table", href: "docs/button.html" },
      { label: "Tabs", href: "docs/button.html" },
    ],
  },
  {
    label: "Catalog",
    pkg: "@luz-ds/catalog",
    items: [
      { label: "All patterns", href: "docs/catalog.html", own: true },
      { label: "Kinds of site", href: "docs/catalog.html" },
      { label: "Hero", href: "docs/catalog.html" },
      { label: "Search", href: "docs/catalog.html" },
      { label: "Charts", href: "docs/catalog.html" },
    ],
  },
  {
    label: "Accessibility",
    items: [
      { label: "Statement", href: "docs/accessibility.html", own: true },
      { label: "Status by component", href: "docs/accessibility.html" },
    ],
  },
  {
    label: "How it is built",
    items: [
      { label: "Layers", href: "docs/get-started.html" },
      { label: "Principles", href: "docs/get-started.html" },
    ],
  },
  {
    label: "What's new",
    items: [
      { label: "Changelog", href: "docs/get-started.html" },
      { label: "Roadmap", href: "docs/get-started.html" },
      { label: "Contribute", href: "docs/get-started.html" },
    ],
  },
];

const OWN = NAV.flatMap((g) => g.items.filter((i) => i.own).map((i) => ({ ...i, group: g.label })));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".html") ? [path] : [];
  });
}

/** `<!--meta {…} -->` on the first line of a page. */
function parse(file) {
  const text = readFileSync(file, "utf-8");
  const m = /^<!--meta\s+([\s\S]*?)\s*-->\n?/.exec(text);
  if (!m) throw new Error(`${file}: the page needs a <!--meta {…} --> first line`);
  return { meta: JSON.parse(m[1]), body: text.slice(m[0].length) };
}

/** `strict` is the last pass: by then every placeholder must have a value. */
function fill(text, vars, strict = false) {
  return text
    .replace(/\{\{cr:([0-9a-f]{6})\/([0-9a-f]{6})\}\}/g, (all, a, b) => contrast(a, b))
    .replace(/\{\{([\w-]+)\}\}/g, (all, key) => {
      if (key in vars) return vars[key];
      if (strict) throw new Error(`unknown placeholder {{${key}}}`);
      return all;
    });
}

/** Grouped, and only the area of the page is open (guide, section 8). */
function sidebar(page) {
  return NAV.map((g) => {
    const here = g.items.some((i) => i.own && i.href === page);
    const items = g.items
      .map((i) => {
        const current = i.own && i.href === page ? ' aria-current="page"' : "";
        return `<li><a href="${LINK}${i.href}"${current}>${T(i.label)}</a></li>`;
      })
      .join("");
    const pkg = g.pkg ? `<code>${g.pkg}</code>` : "";
    return `<details${here ? " open" : ""}><summary><span>${T(g.label)}${pkg}</span></summary><ul>${items}</ul></details>`;
  }).join("\n");
}

const headings = (body) =>
  [...body.matchAll(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(([, id, html]) => ({
    id,
    text: html.replace(/<[^>]+>/g, ""),
  }));

/** "On this page": every h2 with an id, in order. */
function rail(body) {
  const items = headings(body)
    .map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`)
    .join("");
  return items ? `<ul data-spy>${items}</ul>` : "";
}

function pager(page) {
  const at = OWN.findIndex((i) => i.href === page);
  if (at < 0) return "";
  const link = (i, rel, word) =>
    i
      ? `<a class="pager__a pager__a--${rel}" rel="${rel}" href="${LINK}${i.href}"><span class="label label--ink">${T(word)}</span><strong>${T(i.label)}</strong><small>${T(i.group)}</small></a>`
      : "<span></span>";
  return `<nav class="pager" aria-label="${T("Previous and next page")}">${link(OWN[at - 1], "prev", "Previous")}${link(OWN[at + 1], "next", "Next")}</nav>`;
}

function related(list = []) {
  if (!list.length) return "";
  const items = list
    .map(([label, href, note]) => `<li><a href="${LINK}${href}"><strong>${T(label)}</strong><span>${T(note)}</span></a></li>`)
    .join("");
  return `<section class="related" aria-labelledby="related-h"><h2 class="label label--ink" id="related-h">${T("Related pages")}</h2><ul>${items}</ul></section>`;
}

/** The facts under the title: package, file, JavaScript, and the two actions. */
function facts(meta, page) {
  const rows = [
    meta.pkg && `<div><dt>${T("Package")}</dt><dd><code>${meta.pkg}</code></dd></div>`,
    meta.file && `<div><dt>${T("File")}</dt><dd><code>${meta.file}</code></dd></div>`,
    meta.js && `<div><dt>${T("JavaScript")}</dt><dd>${meta.js}</dd></div>`,
    meta.status && `<div><dt>${T("Status")}</dt><dd>${meta.status}</dd></div>`,
  ]
    .filter(Boolean)
    .join("");
  const source = `${GITHUB}/edit/main/proto/redesign/src/pages/${page}`;
  return `<dl class="doc-facts">${rows}</dl>
      <p class="doc-acts"><a href="${source}">${T("Edit on GitHub")}</a><button type="button" data-copy-md>${T("Copy as Markdown")}</button></p>`;
}

/** The search gives the sections of this page first, then the pages (guide, section 8). */
function searchIndex(body, isDocs) {
  const here = isDocs
    ? headings(body).map((h) => `<li><a href="#${h.id}"><span>${h.text}</span><small>${T("On this page")}</small></a></li>`)
    : [];
  const pages = [
    ...NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))),
    { label: "Home", href: "index.html", group: "Site" },
    { label: "Documentation", href: "docs/index.html", group: "Site" },
  ].map((i) => `<li><a href="${LINK}${i.href}"><span>${T(i.label)}</span><small>${T(i.group)}</small></a></li>`);
  return [...here, ...pages].join("");
}

/* ---- The art: the type scale of LUZ, drawn as columns --------------------
   {{scale}}, {{scale:low}}, {{scale:lost}}, {{scale:dark}}. Each column is a
   step of the scale in tokens.json, as tall as its size; the body step is
   the one in colour. Nothing is drawn by hand: change the scale and the
   picture follows. */
const SCALE = Object.entries(json("packages/tokens/tokens.json").typography)
  .filter(([k, v]) => k.startsWith("text-") && v.value)
  .map(([k, v]) => ({ name: k, rem: parseFloat(v.value) }));
const ORDER = ["text-sm", "text-lg", "text-2xl", "text-4xl", "text-3xl", "text-xl", "text-base", "text-md", "text-xs"];

function scaleArt(variant = "") {
  const max = Math.max(...SCALE.map((s) => s.rem));
  const cols = ORDER.map((name, i) => {
    const step = SCALE.find((s) => s.name === name);
    if (!step) throw new Error(`tokens.json has no ${name}`);
    const h = Math.round((step.rem / max) * 1000) / 10;
    const px = Math.round(step.rem * 16);
    const lost = variant === "lost" && name === "text-4xl";
    const cls = ["col", name === "text-base" ? "col--body" : "", lost ? "col--lost" : ""].filter(Boolean).join(" ");
    const label = lost ? T("404<br>not found") : `${name.replace("text-", "")}<br>${px}px`;
    return `<div class="${cls}" style="--h:${h}%;--i:${i}"><span>${label}</span></div>`;
  }).join("");
  return `<div class="cols${variant ? ` cols--${variant}` : ""}" aria-hidden="true">${cols}</div>`;
}

function inlineArt(text) {
  return text.replace(/\{\{scale(?::([\w-]+))?\}\}/g, (all, variant) => scaleArt(variant));
}

let count = 0;
for (LANG of LANGS) {
  DICT = LANG === "en" ? {} : JSON.parse(readFileSync(join(SRC, "i18n", `${LANG}.json`), "utf-8"));
  for (const file of walk(join(SRC, "pages"))) {
    const page = relative(join(SRC, "pages"), file).replaceAll("\\", "/");
    const parsed = parse(file);
    const meta = { ...parsed.meta };
    for (const k of ["title", "heading", "lead", "crumb", "status", "description", "js"]) if (meta[k]) meta[k] = T(meta[k]);
    if (meta.related) meta.related = meta.related.map(([a, b, c]) => [a, b, c]);
    const body = inlineArt(tr(parsed.body));
    const outPage = LANG === "en" ? page : `${LANG}/${page}`;
    const root = "../".repeat(outPage.split("/").length - 1);
    const lroot = LANG === "en" ? root : `${root}${LANG}/`;
    const isDocs = meta.layout === "docs";
    const current = (id) => (meta.nav === id ? ' aria-current="page"' : "");

    const main = isDocs
      ? fill(partial("docs"), {
          sidebar: sidebar(page),
          rail: rail(body),
          pager: pager(page),
          related: related(parsed.meta.related),
          crumb: meta.crumb ?? "",
          title: meta.heading ?? meta.title,
          lead: meta.lead ?? "",
          facts: facts(parsed.meta.pkg || parsed.meta.file || parsed.meta.js || parsed.meta.status ? meta : meta, page),
          body,
        })
      : body;

    const title = parsed.meta.title === "LUZ" ? T("LUZ — a design system in plain HTML, CSS and ES modules") : `${meta.title} · LUZ`;
    const html = fill(partial("page"), {
      title,
      description: meta.description ?? "",
      lang: LANG,
      class: isDocs ? "is-docs" : `is-${meta.layout ?? "site"}`,
      // Every docs page has a Markdown twin an agent can read (guide, section 6)
      alternate: isDocs
        ? `<link rel="alternate" type="text/markdown" href="${page.split("/").pop().replace(/\.html$/, ".md")}">`
        : "",
      header: partial("header"),
      footer: isDocs ? partial("footer-docs") : partial("footer"),
      search: partial("search"),
      skip: T("Skip to the content"),
      main,
    });

    const langswitch = `<nav class="lang" aria-label="${T("Language")}">${LANGS.map((code) => {
      const href = `${root}${code === "en" ? "" : `${code}/`}${page}`;
      return `<a href="${href}" lang="${code}" hreflang="${code}"${code === LANG ? ' aria-current="true"' : ""}>${code.toUpperCase()}</a>`;
    }).join("")}</nav>`;

    const vars = {
      root,
      lroot,
      lang: LANG,
      langswitch,
      version: VERSION,
      year: "2026",
      github: GITHUB,
      "n-core": String(N_CORE),
      "n-catalog": String(N_CATALOG),
      "n-total": String(N_CORE + N_CATALOG),
      "kb-core": budget("core CSS"),
      "kb-tokens": budget("tokens CSS"),
      "kb-js": budget("core JS (entry, lazy chunks excluded)"),
      "cur-docs": current("docs"),
      "cur-components": current("components"),
      "cur-catalog": current("catalog"),
      "cur-tokens": current("tokens"),
      "cur-a11y": current("a11y"),
      "search-index": searchIndex(body, isDocs),
    };
    const out = join(ROOT, outPage);
    mkdirSync(dirname(out), { recursive: true });
    // Links to a page of the site stay in the language of the page
    const linked = html.replace(/\{\{root\}\}(docs\/|index\.html|404\.html)/g, "{{lroot}}$1");
    // Twice: the partials carry placeholders of their own
    writeFileSync(out, fill(fill(linked, vars), vars, true));
    count++;
  }
}

console.log(`pages: ${count}`);
if (missing.size) {
  console.log(`not translated (${missing.size}), left as written:`);
  for (const k of missing) console.log("  ", k.length > 100 ? `${k.slice(0, 100)}…` : k);
}
