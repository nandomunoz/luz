/**
 * LUZ — the grader of the outcome evals of the `luz-start` skill (`.claude/plans/luz-ai-skill.md`, B.8).
 *
 * A run (a model, with the skill or without it) is given a folder made from a case's `fixture` and the case's
 * prompt. This reads the folder afterwards and says, check by check, whether the result is right. Every check is
 * mechanical: no model grades another. Development tooling: it never ships.
 *
 *   node scripts/ai-eval-grade.js <case id> <folder> [--json]     exit 0 when every check passes, 1 when one fails,
 *                                                                 2 when it is used wrongly
 *
 * The checks (named in `checks` of each case of `packages/ai/skills/luz-start/evals/evals.json`):
 *   luz-check          `luz-check` reports nothing that blocks in the target folder
 *   no-placeholder     no "…" is left in a page: the starter's marks were all filled in
 *   lang               every page has a language (the case's `lang` when it names one)
 *   one-h1             every page has exactly one h1
 *   title              every page has a title that is not empty or a mark
 *   only-target        nothing was written outside the target folder, except the fixture's files
 *   fixture-unchanged  each file of the fixture is exactly as it was
 *   forbidden-absent   none of the case's `forbidden` strings is in any file that is not the fixture's
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EVALS = "packages/ai/skills/luz-start/evals/evals.json";

const walk = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".git" ? [] : walk(full, base);
    return [relative(base, full).split("\\").join("/")];
  });

export function loadCases(root = repo) {
  return JSON.parse(readFileSync(join(root, EVALS), "utf-8")).cases;
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
      const changed = fixture.filter((f) => !files.includes(f) || text(f) !== c.fixture[f]);
      return { ok: changed.length === 0, detail: changed.length ? `changed or removed: ${changed.join(", ")}` : `${fixture.length} files as they were` };
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
    console.error("usage: node scripts/ai-eval-grade.js <case id> <folder> [--json]");
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
