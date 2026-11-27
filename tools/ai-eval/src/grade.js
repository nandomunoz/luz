/**
 * LUZ — the grader of the outcome evals of the `luz` skill (`.claude/plans/luz-ai-skill.md`, B.8).
 *
 * A run (a model, with the skill or without it) is given a folder made from a case's `fixture` and the case's
 * prompt. This reads the folder afterwards and says, check by check, whether the result is right. Every check is
 * mechanical: no model grades another. Development tooling: it never ships.
 *
 *   node tools/ai-eval/src/grade.js <case id> <folder> [--json]     exit 0 when every check passes, 1 when one fails,
 *                                                                 2 when it is used wrongly
 *
 * The checks (named in `checks` of each case of `tools/ai-eval/cases/evals.json`):
 *   luz-check          `luz-check` reports nothing that blocks in the target folder
 *   no-placeholder     no "…" is left in a page: the starter's marks were all filled in
 *   lang               every page has a language (the case's `lang` when it names one)
 *   one-h1             every page has exactly one h1
 *   title              every page has a title that is not empty or a mark
 *   only-target        nothing was written outside the target folder, except the fixture's files
 *   fixture-unchanged  each file of the fixture is exactly as it was
 *   forbidden-absent   none of the case's `forbidden` strings is in any file that is not the fixture's
 *   expected-files     each file of the case's `expect` matches every `has` pattern and no `lacks` pattern (regular
 *                      expressions, case-insensitive, multiline); a file with a `has` must exist
 *   only-listed        every file written that is not the fixture's matches a pattern of the case's `writes`
 *   same-markup        the second file of the case's `pair` (a translation) keeps the ids, classes and link targets of the
 *                      first, its headings level by level, and the text of every pre, code, kbd, samp and var
 *
 * `fixture-unchanged` leaves out the fixture files the case names in `edits` (a head the skill is asked to change).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HIDDEN } from "./freeze.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const EVALS = "tools/ai-eval/cases/evals.json";

const walk = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".git" ? [] : walk(full, base);
    return [relative(base, full).split("\\").join("/")];
  });

// A frozen file is words a model wrote, played back as the person: its id is a folder name and its replies are plain text
function frozenCase(c, file) {
  const ok = c && typeof c.id === "string" && /^[a-z0-9-]+$/.test(c.id) && typeof c.prompt !== "number" && Array.isArray(c.script ?? []) && (c.script ?? []).every((t) => typeof t === "string" && t && !t.startsWith("-") && !HIDDEN.test(t) && t.length <= 600);
  if (!ok) throw new Error(`frozen/${file}: the case has an id that is not lower-case letters, digits and dashes, or a reply that is not plain text`);
  return c;
}

export function loadCases(root = repo) {
  const cases = JSON.parse(readFileSync(join(root, EVALS), "utf-8")).cases;
  // Conversations frozen from an automatic run: one file each, `{ "case": {...} }`
  const frozen = join(root, dirname(EVALS), "frozen");
  if (existsSync(frozen)) for (const f of readdirSync(frozen).filter((n) => n.endsWith(".json")).sort()) cases.push(frozenCase(JSON.parse(readFileSync(join(frozen, f), "utf-8")).case, f));
  return cases;
}

const bodyOf = (html) => /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
const values = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

/** What a translation must keep of its source, read from both pages: each list of the source and the difference. */
export function markupDiff(source, translation) {
  const a = bodyOf(source);
  const b = bodyOf(translation);
  const missing = (xs, ys) => {
    const left = [...ys];
    return xs.filter((x) => {
      const i = left.indexOf(x);
      if (i === -1) return true;
      left.splice(i, 1);
      return false;
    });
  };
  const ids = (h) => values(h, /\bid="([^"]*)"/g);
  const classes = (h) => values(h, /\bclass="([^"]*)"/g).flatMap((c) => c.split(/\s+/).filter(Boolean));
  const targets = (h) => values(h, /\b(?:href|src)="([^"]*)"/g);
  const headings = (h) => values(h, /<h([1-6])\b/gi).join(" ");
  const code = (h) => [...h.matchAll(/<(pre|code|kbd|samp|var)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  const out = [];
  const lost = (what, xs) => xs.length && out.push(`${what} of the source missing: ${xs.slice(0, 5).join(", ")}`);
  lost("ids", missing(ids(a), ids(b)));
  lost("classes", missing(classes(a), classes(b)));
  lost("link targets", missing(targets(a), targets(b)));
  lost("code", missing(code(source), code(translation)).map((x) => JSON.stringify(x.slice(0, 60))));
  if (headings(a) !== headings(b)) out.push(`headings by level: ${headings(a)} in the source, ${headings(b)} in the translation`);
  const added = missing(ids(b), ids(a));
  if (added.length) out.push(`ids the source does not have: ${added.slice(0, 5).join(", ")}`);
  return out;
}

/** Grades the folder of a run: { case, passed, checks: [{ id, ok, detail }] }. */
export function grade(id, folder, { root = repo, ignore = [] } = {}) {
  const c = loadCases(root).find((x) => x.id === id);
  if (!c) throw new Error(`${id} is not a case (${loadCases(root).map((x) => x.id).join(", ")})`);
  const dir = resolve(folder);
  // `ignore`: paths of the run's own setup (the skill installed for the run), which are not what the model wrote
  const files = (existsSync(dir) ? walk(dir) : []).filter((f) => !ignore.some((prefix) => f.startsWith(prefix)));
  const fixture = Object.keys(c.fixture ?? {});
  const targetFiles = files.filter((f) => f.startsWith(`${c.target}/`));
  const pages = targetFiles.filter((f) => /\.(html|astro)$/.test(f));
  const text = (f) => readFileSync(join(dir, f), "utf-8");
  const each = (test, what) => {
    if (!pages.length) return { ok: false, detail: `there is no page in ${c.target}/` };
    const bad = pages.filter((f) => !test(text(f)));
    return { ok: bad.length === 0, detail: bad.length ? `${what}: ${bad.join(", ")}` : `${pages.length} page${pages.length === 1 ? "" : "s"}` };
  };

  const checks = {
    "luz-check": () => {
      const bin = join(root, "packages/check/dist/luz-check.js");
      if (!existsSync(bin)) return { ok: false, detail: "packages/check/dist/luz-check.js is not built: run pnpm build" };
      if (!pages.length) return { ok: false, detail: `there is no page in ${c.target}/` };
      const r = spawnSync(process.execPath, [bin, join(dir, c.target), ...(c.ext ? ["--ext", c.ext] : [])], { encoding: "utf-8" });
      return { ok: r.status === 0, detail: r.status === 0 ? "nothing blocks" : (r.stdout || r.stderr).split("\n").find((l) => l.trim()) ?? `exit ${r.status}` };
    },
    "no-placeholder": () => each((t) => !t.includes("…"), 'a "…" is left'),
    lang: () => each((t) => (c.lang ? new RegExp(`<html[^>]*\\blang="${c.lang}"`).test(t) : /<html[^>]*\blang="[a-z]{2,3}[^"]*"/.test(t)), c.lang ? `lang is not ${c.lang}` : "no lang"),
    "one-h1": () => each((t) => (t.match(/<h1[\s>]/g) ?? []).length === 1, "not one h1"),
    title: () => each((t) => /<title>[^<{…]+<\/title>/.test(t), "no title"),
    "only-target": () => {
      const outside = files.filter((f) => !f.startsWith(`${c.target}/`) && !fixture.includes(f));
      return { ok: outside.length === 0, detail: outside.length ? `written outside ${c.target}/: ${outside.join(", ")}` : `${targetFiles.length} file${targetFiles.length === 1 ? "" : "s"} in ${c.target}/` };
    },
    "fixture-unchanged": () => {
      const kept = fixture.filter((f) => !(c.edits ?? []).includes(f));
      const changed = kept.filter((f) => !files.includes(f) || text(f) !== c.fixture[f]);
      return { ok: changed.length === 0, detail: changed.length ? `changed or removed: ${changed.join(", ")}` : `${kept.length} files as they were` };
    },
    "expected-files": () => {
      const bad = Object.entries(c.expect ?? {}).flatMap(([f, { has = [], lacks = [] }]) => {
        if (!files.includes(f)) return has.length ? [`${f} was not written`] : [];
        const t = text(f);
        return [...has.filter((re) => !new RegExp(re, "im").test(t)).map((re) => `${f} lacks /${re}/`), ...lacks.filter((re) => new RegExp(re, "im").test(t)).map((re) => `${f} has /${re}/`)];
      });
      return { ok: bad.length === 0, detail: bad.length ? bad.join("; ") : `${Object.keys(c.expect ?? {}).length} files as expected` };
    },
    "only-listed": () => {
      const stray = files.filter((f) => !fixture.includes(f) && !(c.writes ?? []).some((re) => new RegExp(re).test(f)));
      return { ok: stray.length === 0, detail: stray.length ? `written and not listed: ${stray.join(", ")}` : "only the files the case lists" };
    },
    "same-markup": () => {
      const [from, to] = c.pair ?? [];
      if (!from || !files.includes(from) || !files.includes(to)) return { ok: false, detail: `${to ?? "the translation"} or ${from ?? "its source"} is missing` };
      const diff = markupDiff(text(from), text(to));
      return { ok: diff.length === 0, detail: diff.length ? diff.join("; ") : "the markup of the source, kept" };
    },
    "forbidden-absent": () => {
      const hit = files.filter((f) => !fixture.includes(f) && (c.forbidden ?? []).some((s) => text(f).includes(s)));
      return { ok: hit.length === 0, detail: hit.length ? `found in ${hit.join(", ")}` : "none found" };
    },
  };
  const results = c.checks.map((name) => {
    if (!checks[name]) throw new Error(`${id}: ${name} is not a check`);
    return { id: name, ...checks[name]() };
  });
  return { case: id, passed: results.every((r) => r.ok), checks: results, transcript: c.transcript ?? [] };
}

function main(argv) {
  const json = argv.includes("--json");
  const args = argv.filter((a) => a !== "--json");
  if (args.length !== 2) {
    console.error("usage: node tools/ai-eval/src/grade.js <case id> <folder> [--json]");
    return 2;
  }
  let report;
  try {
    if (!existsSync(args[1]) || !statSync(args[1]).isDirectory()) throw new Error(`${args[1]} is not a folder`);
    report = grade(args[0], args[1]);
  } catch (error) {
    console.error(`ai-eval-grade: ${error.message}`);
    return 2;
  }
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${report.case}: ${report.passed ? "passed" : "failed"} (${report.checks.filter((c) => c.ok).length}/${report.checks.length})`);
    for (const c of report.checks) console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.id}: ${c.detail}`);
    if (report.transcript.length) console.log(`  to read in the transcript: ${report.transcript.join(", ")}`);
  }
  return report.passed ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
