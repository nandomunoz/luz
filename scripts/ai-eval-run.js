/**
 * LUZ — the runner of the outcome evals of the `luz-start` skill (`.claude/plans/luz-ai-skill.md`, B.8 and B.9, phase 4).
 *
 * For each host (an assistant, with the model it runs), each case of `packages/ai/skills/luz-start/evals/evals.json`
 * and each arm (with the skill, without it), it makes an empty folder from the case's fixture, installs the skill in
 * it for the "with" arm (`skill add luz-start`, the way a person would), runs the host's command with the case's
 * prompt, and grades the folder with `scripts/ai-eval-grade.js`. It names no model: the hosts are a file the owner
 * writes, so which models run and what they cost is the owner's choice. Development tooling: it never ships.
 *
 *   node scripts/ai-eval-run.js --hosts <file> [--case <id>]... [--arm with|without]... [--max-runs <n>]
 *                               [--out <file>] [--keep] [--run]
 *
 * Without --run it prints the plan and runs nothing. With --run it runs the plan, one run after another, and no more
 * than --max-runs of them (12 unless said otherwise): a plan over that stops before the first run.
 *
 * The hosts file:  { "hosts": [ { "id": "claude-sonnet", "command": ["claude", "-p", "{prompt}"], "timeoutSec": 600 } ] }
 *   `{prompt}` is the case's prompt and `{dir}` the folder of the run, in any argument; the command runs in that folder
 *   with the environment of this process, and gets no flag from here: a permission mode, a model or a budget is
 *   the owner's, in the command. A run that exceeds `timeoutSec` (300 by default) is stopped and graded as it is; only
 *   the host's own process is stopped, so a tool it started may go on. The host gets the whole environment of this process.
 *   For the "with" arm the skill's own folders are not graded as something the model wrote, but a change to them is
 *   recorded (`setupTouched`) and shown in the summary.
 *
 * Exit 0 when it ran (or printed the plan), 2 when it is used wrongly. A run that fails its checks is a result, not an error.
 * What it cannot read is whether a question came before the first write: the end of each run's output is kept, and
 * `--keep` leaves the folders for a person to read.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { grade, loadCases } from "./ai-eval-grade.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = "packages/ai/skills/luz-start";
export const ARMS = ["with", "without"];
const SETUP = [".agents/skills/luz-start/", ".claude/skills/luz-start/"];

export function readHosts(file) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf-8"));
  } catch (error) {
    throw new Error(`${file} is not readable JSON: ${error.message}`);
  }
  if (!Array.isArray(data.hosts) || !data.hosts.length) throw new Error(`${file} needs a list "hosts" with at least one host`);
  const seen = new Set();
  for (const h of data.hosts) {
    if (typeof h.id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/i.test(h.id) || seen.has(h.id)) throw new Error(`a host needs its own "id" of letters, digits, dots, hyphens and underscores (${JSON.stringify(h.id)})`);
    seen.add(h.id);
    if (!Array.isArray(h.command) || !h.command.length || h.command.some((a) => typeof a !== "string")) throw new Error(`${h.id}: "command" is a list of strings`);
    if (!h.command.some((a) => a.includes("{prompt}"))) throw new Error(`${h.id}: "command" has no {prompt}: the host would not be given the case`);
    if (h.timeoutSec !== undefined && !(Number.isInteger(h.timeoutSec) && h.timeoutSec > 0 && h.timeoutSec <= 3600)) throw new Error(`${h.id}: "timeoutSec" is a whole number of seconds, 3600 at most`);
  }
  return data.hosts;
}

export function plan({ hosts, cases, arms }) {
  return hosts.flatMap((host) => cases.flatMap((c) => arms.map((arm) => ({ host: host.id, case: c.id, arm }))));
}

/** The files under the places the skill was installed, with their content: to tell afterwards whether the run touched them. */
function installed(dir) {
  const files = new Map();
  for (const place of SETUP) {
    const root = join(dir, place);
    if (!existsSync(root)) continue;
    for (const e of readdirSync(root, { recursive: true, withFileTypes: true }).filter((x) => x.isFile())) files.set(relative(dir, join(e.parentPath, e.name)), readFileSync(join(e.parentPath, e.name), "utf-8"));
  }
  return files;
}

/** One run: the folder, the host, the grade. */
export function runOne(host, c, arm, { root = repo, keep = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "luz-eval-run-"));
  for (const [path, text] of Object.entries(c.fixture ?? {})) {
    if (!resolve(dir, path).startsWith(dir + sep)) throw new Error(`${c.id}: the fixture path ${path} is outside the folder of the run`);
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  if (arm === "with") {
    const r = spawnSync(process.execPath, [join(root, SKILL, "scripts/luz-start.mjs"), "skill", "add", "luz-start", "--dir", dir], { encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`the skill could not be installed for the run: ${r.stderr}`);
  }
  const before = installed(dir);
  const args = host.command.slice(1).map((a) => a.replaceAll("{prompt}", c.prompt).replaceAll("{dir}", dir));
  const started = Date.now();
  const r = spawnSync(host.command[0], args, { cwd: dir, encoding: "utf-8", timeout: (host.timeoutSec ?? 300) * 1000, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const after = installed(dir);
  const setupTouched = [...new Set([...before.keys(), ...after.keys()])].filter((k) => before.get(k) !== after.get(k)).sort();
  const result = {
    host: host.id,
    case: c.id,
    arm,
    status: r.status,
    timedOut: r.error?.code === "ETIMEDOUT",
    error: r.error && r.error.code !== "ETIMEDOUT" ? r.error.message : undefined,
    ms: Date.now() - started,
    stdoutBytes: Buffer.byteLength(r.stdout ?? ""),
    stdoutTail: (r.stdout ?? "").slice(-2000),
    stderrTail: (r.stderr ?? "").slice(-500),
    setupTouched,
    grade: grade(c.id, dir, { root, ignore: arm === "with" ? SETUP : [] }),
    ...(keep ? { dir } : {}),
  };
  if (!keep) rmSync(dir, { recursive: true, force: true });
  return result;
}

/** Passes per host, case and arm, for a person to read. */
export function summary(results) {
  const rows = new Map();
  for (const r of results) {
    const key = `${r.host} / ${r.case}`;
    rows.set(key, { ...rows.get(key), [r.arm]: `${r.grade.checks.filter((c) => c.ok).length}/${r.grade.checks.length}${r.timedOut ? " (timed out)" : ""}${r.setupTouched?.length ? " (skill folder touched)" : ""}` });
  }
  return [...rows].map(([key, arms]) => `${key}: with the skill ${arms.with ?? "-"}, without ${arms.without ?? "-"}`);
}

function main(argv) {
  let args;
  try {
    args = parseArgs({ args: argv, options: { hosts: { type: "string" }, case: { type: "string", multiple: true }, arm: { type: "string", multiple: true }, "max-runs": { type: "string" }, out: { type: "string" }, keep: { type: "boolean" }, run: { type: "boolean" } } }).values;
  } catch (error) {
    console.error(`ai-eval-run: ${error.message}`);
    return 2;
  }
  try {
    if (!args.hosts) throw new Error("--hosts <file> is missing. Example: node scripts/ai-eval-run.js --hosts hosts.json");
    if (!existsSync(args.hosts)) throw new Error(`${args.hosts} was not found`);
    const hosts = readHosts(args.hosts);
    const all = loadCases(repo);
    const wanted = args.case ?? all.map((c) => c.id);
    const cases = wanted.map((id) => all.find((c) => c.id === id) ?? (() => { throw new Error(`${id} is not a case (${all.map((c) => c.id).join(", ")})`); })());
    const arms = args.arm ?? ARMS;
    const bad = arms.find((a) => !ARMS.includes(a));
    if (bad) throw new Error(`--arm "${bad}" is not one of ${ARMS.join(", ")}`);
    const max = args["max-runs"] === undefined ? 12 : Number(args["max-runs"]);
    if (!Number.isInteger(max) || max < 1) throw new Error("--max-runs is a whole number of 1 or more");
    const runs = plan({ hosts, cases, arms });
    if (!args.run) {
      console.log(`plan: ${runs.length} run${runs.length === 1 ? "" : "s"}, nothing was run (add --run)`);
      for (const r of runs) console.log(`  ${r.host} / ${r.case} / ${r.arm}`);
      return 0;
    }
    if (runs.length > max) throw new Error(`the plan is ${runs.length} runs and --max-runs is ${max}: raise it on purpose, or choose fewer hosts, cases or arms`);
    const results = runs.map((r) => runOne(hosts.find((h) => h.id === r.host), cases.find((c) => c.id === r.case), r.arm, { keep: args.keep }));
    if (args.out) writeFileSync(args.out, `${JSON.stringify({ results }, null, 2)}\n`);
    console.log(summary(results).join("\n"));
    if (args.keep) for (const r of results) console.log(`kept ${r.host} / ${r.case} / ${r.arm}: ${r.dir}`);
    return 0;
  } catch (error) {
    console.error(`ai-eval-run: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
