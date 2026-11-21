/**
 * Translation of the mock-up, with no copy of the markup.
 *
 * `units(html)` finds every piece of text a person reads (a paragraph, a
 * heading, a list item, a link, a button…) together with the inline markup
 * inside it, and `translate(html, dict)` swaps each unit for its entry in
 * src/i18n/<code>.json. The key is the unit as written in English, with
 * white space collapsed; the value is the same unit in the other language,
 * with the same inline tags and {{placeholders}}. A unit with no entry is
 * left as it is, and `node tools/i18n.mjs` lists them.
 *
 * Code blocks (<pre>), scripts, styles and drawings are never touched.
 */

const VOID = new Set(["br", "img", "input", "meta", "link", "hr", "col", "wbr", "source", "path", "rect", "circle", "polygon", "stop", "use", "line", "ellipse"]);
const OPAQUE = new Set(["pre", "script", "style", "svg"]);
const INLINE = new Set(["em", "strong", "code", "kbd", "samp", "s", "i", "b", "small", "span", "a", "br", "sup", "sub", "abbr", "mark", "time", "input", "img", "var"]);
const ATTRS = ["aria-label", "placeholder", "title", "alt", "data-toast"];

export const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** A small tree with the offsets of every tag, which is all a swap needs. */
function parse(html) {
  const root = { tag: "#root", children: [], innerStart: 0, innerEnd: html.length, start: 0, end: html.length };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let last = 0;
  let m;
  const text = (from, to) => {
    if (to > from) stack.at(-1).children.push({ tag: "#text", start: from, end: to });
  };
  while ((m = re.exec(html))) {
    text(last, m.index);
    last = re.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    const [, close, name, attrs] = m;
    const tag = name.toLowerCase();
    const top = stack.at(-1);
    if (close) {
      if (top.tag === tag) {
        top.innerEnd = m.index;
        top.end = re.lastIndex;
        stack.pop();
      }
      continue;
    }
    const node = { tag, attrs, children: [], start: m.index, innerStart: re.lastIndex, innerEnd: re.lastIndex, end: re.lastIndex };
    top.children.push(node);
    if (VOID.has(tag) || attrs.trimEnd().endsWith("/")) continue;
    if (OPAQUE.has(tag)) {
      // Everything up to the closing tag is opaque
      const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
      closeRe.lastIndex = re.lastIndex;
      const c = closeRe.exec(html);
      node.innerEnd = c ? c.index : html.length;
      node.end = c ? closeRe.lastIndex : html.length;
      re.lastIndex = node.end;
      last = node.end;
      continue;
    }
    stack.push(node);
  }
  text(last, html.length);
  return root;
}

const isBlock = (n) => n.tag !== "#text" && !INLINE.has(n.tag) && !OPAQUE.has(n.tag);
const hasLetters = (s) => /\p{L}{2,}/u.test(s.replace(/<[^>]+>/g, "").replace(/\{\{[^}]*\}\}/g, ""));
const solePlaceholder = (s) => /^\s*(\{\{[^}]*\}\}\s*)+$/.test(s);

/** Every [start, end, text] of a unit of text in `html`. */
export function find(html) {
  const out = [];
  const root = parse(html);
  const push = (start, end) => {
    const raw = html.slice(start, end);
    if (!hasLetters(raw) || solePlaceholder(raw)) return;
    // Names, flags and file names are code: they stay as they are
    if (/^\s*<code>[^<]*<\/code>\s*$/.test(raw)) return;
    const plain = raw.replace(/<[^>]+>/g, "").trim();
    if (/^\d*\s*#[0-9a-f]{3,8}$/i.test(plain) || /^\S+@\S+$/.test(plain)) return;
    out.push({ start, end, key: collapse(raw) });
  };
  const textOf = (k) => html.slice(k.start, k.end);
  // The content of `n`, as units: a wrapper of wrappers is split, so a card
  // becomes its title, its text and its tags, not one long string.
  const inner = (n) => {
    const kids = n.children;
    const elems = kids.filter((k) => k.tag !== "#text");
    const directText = kids.some((k) => k.tag === "#text" && textOf(k).trim());
    const blockKid = elems.some(isBlock);
    if (blockKid) return mixed(n);
    if (!directText && elems.length && elems.every((e) => INLINE.has(e.tag) && !VOID.has(e.tag) && !["code", "kbd"].includes(e.tag))) {
      for (const e of elems) inner(e);
      return;
    }
    push(n.innerStart, n.innerEnd);
  };
  const mixed = (n) => {
    let run = [];
    const flush = () => {
      if (run.length) {
        const elems = run.filter((k) => k.tag !== "#text");
        const directText = run.some((k) => k.tag === "#text" && textOf(k).trim());
        if (!directText && elems.every((e) => INLINE.has(e.tag) && !VOID.has(e.tag))) for (const e of elems) inner(e);
        else push(run[0].start, run.at(-1).end);
      }
      run = [];
    };
    for (const k of n.children) {
      if (isBlock(k) || OPAQUE.has(k.tag)) {
        flush();
        visit(k);
      } else if (k.tag === "#text" ? textOf(k).trim() || run.length : true) {
        run.push(k);
      }
    }
    flush();
  };
  const visit = (n) => {
    if (n.tag === "#text" || OPAQUE.has(n.tag) || ["code", "kbd", "samp"].includes(n.tag)) return;
    if (n.tag === "#root") return mixed(n);
    inner(n);
  };
  visit(root);
  // Attributes a person reads
  const reAttr = new RegExp(`\\b(${ATTRS.join("|")})="([^"]*)"`, "g");
  let m;
  while ((m = reAttr.exec(html))) {
    const start = m.index + m[0].indexOf('"') + 1;
    const end = start + m[2].length;
    if (hasLetters(m[2]) && !solePlaceholder(m[2])) out.push({ start, end, key: collapse(m[2]), attr: true });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Swaps every unit that has an entry; calls `miss(key)` for the ones that have not. */
export function translate(html, dict, miss = () => {}) {
  const units = find(html);
  let out = "";
  let at = 0;
  for (const u of units) {
    if (u.start < at) continue;
    out += html.slice(at, u.start);
    const raw = html.slice(u.start, u.end);
    const to = dict[u.key];
    if (to === undefined) {
      miss(u.key);
      out += raw;
    } else {
      // Keep the white space around the unit
      const lead = raw.match(/^\s*/)[0];
      const trail = raw.match(/\s*$/)[0];
      out += lead + to + trail;
    }
    at = u.end;
  }
  return out + html.slice(at);
}

/* ---- The dump: node tools/i18n.mjs [--missing es] ------------------------- */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const SRC = join(fileURLToPath(new URL("..", import.meta.url)), "src");
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith(".html") ? [join(d, n)] : []));
  const keys = new Map();
  for (const file of [...walk(join(SRC, "pages")), ...walk(join(SRC, "partials"))]) {
    let text = readFileSync(file, "utf-8");
    const meta = /^<!--meta\s+([\s\S]*?)\s*-->\n?/.exec(text);
    if (meta) {
      text = text.slice(meta[0].length);
      const m = JSON.parse(meta[1]);
      for (const k of ["title", "heading", "lead", "crumb", "status", "description", "js"]) if (m[k] && hasLetters(m[k])) keys.set(collapse(m[k]), file);
      for (const r of m.related ?? []) {
        keys.set(collapse(r[0]), file);
        keys.set(collapse(r[2]), file);
      }
    }
    for (const u of find(text)) keys.set(u.key, file);
  }
  const lang = process.argv[2];
  const have = lang ? JSON.parse(readFileSync(join(SRC, "i18n", `${lang}.json`), "utf-8")) : {};
  const todo = [...keys.keys()].filter((k) => !(k in have));
  if (process.argv[3] === "--write") {
    writeFileSync(join(SRC, "i18n", "todo.json"), JSON.stringify(Object.fromEntries(todo.map((k) => [k, ""])), null, 1));
  }
  console.log(`${keys.size} units, ${todo.length} without ${lang ?? "a translation"}`);
  if (!process.argv[3]) for (const k of todo) console.log(" ", k.length > 110 ? `${k.slice(0, 110)}…` : k);
}
