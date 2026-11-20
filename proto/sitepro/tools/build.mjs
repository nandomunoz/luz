/**
 * Builds the mock-up: the pictures, then every page of src/pages/ wrapped in
 * its layout. No dependency; the output is static HTML next to assets/, so the
 * site opens from the file system.
 *
 *   node proto/sitepro/tools/build.mjs
 *
 * A figure in the copy is never typed (GUIA-SISTEMA-DE-DISENO.md, section 10,
 * point 30): {{n-core}}, {{kb-core}}… come from the packages and budgets.json,
 * and {{cr:ffffff/2b66f0}} is a contrast ratio computed here.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import "./build-art.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO = join(ROOT, "../..");
const SRC = join(ROOT, "src");
const GITHUB = "https://github.com/nandovejer/luz";

const partial = (name) => readFileSync(join(SRC, "partials", `${name}.html`), "utf-8");
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
        return `<li><a href="{{root}}${i.href}"${current}>${i.label}</a></li>`;
      })
      .join("");
    const pkg = g.pkg ? `<code>${g.pkg}</code>` : "";
    return `<details${here ? " open" : ""}><summary><span>${g.label}${pkg}</span></summary><ul>${items}</ul></details>`;
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
      ? `<a class="pager__a pager__a--${rel}" rel="${rel}" href="{{root}}${i.href}"><span class="label label--ink">${word}</span><strong>${i.label}</strong><small>${i.group}</small></a>`
      : "<span></span>";
  return `<nav class="pager" aria-label="Previous and next page">${link(OWN[at - 1], "prev", "Previous")}${link(OWN[at + 1], "next", "Next")}</nav>`;
}

function related(list = []) {
  if (!list.length) return "";
  const items = list
    .map(([label, href, note]) => `<li><a href="{{root}}${href}"><strong>${label}</strong><span>${note}</span></a></li>`)
    .join("");
  return `<section class="related" aria-labelledby="related-h"><h2 class="label label--ink" id="related-h">Related pages</h2><ul>${items}</ul></section>`;
}

/** The facts under the title: package, file, JavaScript, and the two actions. */
function facts(meta, page) {
  const rows = [
    meta.pkg && `<div><dt>Package</dt><dd><code>${meta.pkg}</code></dd></div>`,
    meta.file && `<div><dt>File</dt><dd><code>${meta.file}</code></dd></div>`,
    meta.js && `<div><dt>JavaScript</dt><dd>${meta.js}</dd></div>`,
    meta.status && `<div><dt>Status</dt><dd>${meta.status}</dd></div>`,
  ]
    .filter(Boolean)
    .join("");
  const source = `${GITHUB}/edit/main/proto/sitepro/src/pages/${page}`;
  return `<dl class="doc-facts">${rows}</dl>
      <p class="doc-acts"><a href="${source}">Edit on GitHub</a><button type="button" data-copy-md>Copy as Markdown</button></p>`;
}

/** The search gives the sections of this page first, then the pages (guide, section 8). */
function searchIndex(body, isDocs) {
  const here = isDocs
    ? headings(body).map((h) => `<li><a href="#${h.id}"><span>${h.text}</span><small>On this page</small></a></li>`)
    : [];
  const pages = [
    ...NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))),
    { label: "Home", href: "index.html", group: "Site" },
    { label: "Documentation", href: "docs/index.html", group: "Site" },
  ].map((i) => `<li><a href="{{root}}${i.href}"><span>${i.label}</span><small>${i.group}</small></a></li>`);
  return [...here, ...pages].join("");
}

/** {{art:hero}} puts the picture in the page, so CSS and the pointer can move its tiles. */
function inlineArt(text) {
  return text.replace(/\{\{art:([\w-]+)\}\}/g, (all, name) =>
    readFileSync(join(ROOT, "assets/art", `${name}.svg`), "utf-8")
      .trim()
      .replace(/^<svg ([^>]*?) width="\d+" height="\d+"/, `<svg class="art art--${name}" aria-hidden="true" focusable="false" $1`),
  );
}

let count = 0;
for (const file of walk(join(SRC, "pages"))) {
  const page = relative(join(SRC, "pages"), file).replaceAll("\\", "/");
  const parsed = parse(file);
  const meta = parsed.meta;
  const body = inlineArt(parsed.body);
  const root = "../".repeat(page.split("/").length - 1);
  const isDocs = meta.layout === "docs";
  const current = (id) => (meta.nav === id ? ' aria-current="page"' : "");

  const main = isDocs
    ? fill(partial("docs"), {
        sidebar: sidebar(page),
        rail: rail(body),
        pager: pager(page),
        related: related(meta.related),
        crumb: meta.crumb ?? "",
        title: meta.heading ?? meta.title,
        lead: meta.lead ?? "",
        facts: facts(meta, page),
        body,
      })
    : body;

  const html = fill(partial("page"), {
    title: meta.title === "LUZ" ? "LUZ — a design system in plain HTML, CSS and ES modules" : `${meta.title} · LUZ`,
    description: meta.description ?? "",
    class: isDocs ? "is-docs" : `is-${meta.layout ?? "site"}`,
    // Every docs page has a Markdown twin an agent can read (guide, section 6)
    alternate: isDocs
      ? `<link rel="alternate" type="text/markdown" href="${page.split("/").pop().replace(/\.html$/, ".md")}">`
      : "",
    header: partial("header"),
    footer: isDocs ? partial("footer-docs") : partial("footer"),
    search: partial("search"),
    main,
  });

  const vars = {
    root,
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
  const out = join(ROOT, page);
  mkdirSync(dirname(out), { recursive: true });
  // Twice: the partials carry placeholders of their own
  writeFileSync(out, fill(fill(html, vars), vars, true));
  count++;
}

console.log(`pages: ${count}`);
