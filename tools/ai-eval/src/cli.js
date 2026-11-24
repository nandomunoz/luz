#!/usr/bin/env node
/**
 * ai:eval: the laboratory of the skills of @luz-ds/ai. Development only, never published.
 *
 *   pnpm ai:eval script [--layer smoke|full|release] [--case <id>]... [--dry-run] [--budget 60m] [--max-points 10]
 *                       [--max-tokens <n>] [--out <folder>] [--credentials <file>|none] [--keep]
 *   pnpm ai:eval resume <run folder or id>
 *   pnpm ai:eval open [<run folder or id>]
 *   pnpm ai:eval freeze <run> <case> --example <name> [--to <folder>] [--allow-unscripted] [--attempt <n>] [--turns <n>]   a green conversation, as an example for the docs
 *
 * `script` runs the scripted cases: the case's prompt, a cheap model that only picks the answer of the map, mechanical
 * checks. A round stops at 60 minutes or +10 points of the weekly window, saves its state and asks whether to go on.
 * Exit 0 when every case passed, 1 when one failed, 2 when it is used wrongly.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createRound } from "./budget.js";
import { RULE_OF, checkTranscript } from "./checks.js";
import { makeExample } from "./freeze.js";
import { runConversation, spawnClaude } from "./conversation.js";
import { grade, loadCases } from "./grade.js";
import { caseReport, runReport } from "./report.js";
import { executeRun, readState, writeState } from "./run.js";
import { createSandbox, defaultCredentials, keepFilter } from "./sandbox.js";
import { makeSimulator } from "./simulator.js";
import { buildViewer } from "./viewer.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNS = join(root, ".claude/evals/ai-runs");
const LAYERS = { smoke: "haiku", full: "sonnet", release: "opus" };
const MINUTES_PER_RUN = { haiku: 1.5, sonnet: 3, opus: 5 };
const SETUP = [".claude/skills/", ".agents/skills/"];
const SKILL_MD = join(root, "packages/ai/skills/luz/SKILL.md");
export const EXAMPLES = ["start", "new", "doctor", "check", "facts", "agents", "skills", "add", "help", "unknown", "hostile"];

const fail = (message) => {
  process.stderr.write(`ai-eval: ${message}\n`);
  return 2;
};

function duration(text) {
  const m = /^(\d+)(m|h)$/.exec(text);
  if (!m) throw new Error(`--budget is a number of minutes or hours, like 60m or 2h (${text})`);
  return Number(m[1]) * (m[2] === "h" ? 3600000 : 60000);
}

/** The grading of one run: the folder (grade.js) and the transcript (checks.js) of the case. */
function gradeRun(c, convo, sandbox) {
  const checks = [];
  if (c.checks?.length) for (const k of grade(c.id, sandbox.dir, { root, ignore: SETUP }).checks.filter((x) => c.checks.includes(x.id))) checks.push({ id: k.id, ok: k.ok, detail: k.detail, rule: RULE_OF[k.id] });
  for (const id of c.transcript ?? []) checks.push(checkTranscript(id, convo, c));
  if (convo.ended === "error") checks.push({ id: "conversation", ok: false, detail: convo.error });
  return checks;
}

function makeRunCase({ out, model, credentials, keep, maxTurns }) {
  const skillMd = readFileSync(SKILL_MD, "utf-8");
  return async (c, index) => {
    const started = Date.now();
    const sandbox = createSandbox({ caseDef: c, root, credentials });
    try {
      const simulate = makeSimulator({ claude: spawnClaude, sandbox });
      const convo = await runConversation({ caseDef: c, sandbox, model, simulate, maxTurns });
      const checks = gradeRun(c, convo, sandbox);
      const dir = join(out, c.id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "transcript.json"), `${JSON.stringify({ convo, checks }, null, 2)}\n`);
      writeFileSync(join(dir, `transcript-${index + 1}.json`), `${JSON.stringify({ convo, checks }, null, 2)}\n`);
      writeFileSync(join(dir, "report.md"), caseReport({ caseDef: c, convo, checks, skillMd }));
      if (keep) cpSync(sandbox.dir, join(dir, "folder"), { recursive: true, filter: keepFilter });
      return { passed: checks.every((k) => k.ok), checks: checks.map(({ id, ok, rule, turn }) => ({ id, ok, rule, turn })), ended: convo.ended, unscripted: convo.unscripted.length, tokens: convo.tokens, costUsd: convo.costUsd, rate: convo.rate, ms: Date.now() - started };
    } finally {
      sandbox.cleanup();
    }
  };
}

function loadDetails(out, state) {
  const details = {};
  for (const id of Object.keys(state.cases)) {
    const f = join(out, id, "transcript.json");
    if (existsSync(f)) details[id] = JSON.parse(readFileSync(f, "utf-8"));
  }
  return details;
}

function finish(out, state) {
  writeFileSync(join(out, "report.md"), runReport(state));
  buildViewer({ out, state, root, details: loadDetails(out, state) });
}

async function ask(question) {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} `);
  rl.close();
  return /^(s|si|sí|y|yes)$/i.test(answer.trim());
}

async function drive({ cases, out, runId, meta, resume, budget, maxPoints, maxTokens, runCase }) {
  let round = 0;
  let result;
  let again = resume;
  do {
    round += 1;
    result = await executeRun({ cases, out, round: createRound({ maxMs: budget, maxPoints, maxTokens }), runCase, runId, meta, resume: again });
    again = true;
    finish(out, result.state);
    if (!result.stopped) break;
    const done = Object.values(result.state.cases).filter((c) => c.status !== "pending").length;
    const s = result.state.rounds.at(-1);
    process.stdout.write(`round stopped: ${result.stopped.reason}\n`);
    if (!process.stdin.isTTY) {
      process.stdout.write(`Ronda ${round}: parada (${result.stopped.reason}), ${done}/${cases.length} casos. Sigue con: pnpm ai:eval resume ${out}\n`);
      return result;
    }
    const go = await ask(`Ronda ${round}: ${Math.round(s.ms / 60000)} min, ${s.startSeven === null ? `${s.tokens} tokens` : `+${(s.points * 100).toFixed(1)} % semanal (${s.startSeven}→${s.lastSeven})`}, ${done}/${cases.length} casos. ¿Otra ronda? [n/s]`);
    if (!go) {
      process.stdout.write(`Para seguir: pnpm ai:eval resume ${out}\n`);
      return result;
    }
  } while (result.stopped);
  return result;
}

const summaryLines = (state) => Object.entries(state.cases).map(([id, c]) => `${id}: ${c.status} (${c.runs.length} run${c.runs.length === 1 ? "" : "s"})`);

export async function main(argv) {
  const [command, ...rest] = argv;
  if (!["script", "resume", "open", "freeze"].includes(command ?? "")) return fail("a command is missing (script, resume, open or freeze). Example: pnpm ai:eval script --layer smoke --dry-run");
  let args;
  try {
    args = parseArgs({ args: rest, allowPositionals: true, options: { layer: { type: "string" }, case: { type: "string", multiple: true }, "dry-run": { type: "boolean" }, budget: { type: "string" }, "max-points": { type: "string" }, "max-tokens": { type: "string" }, out: { type: "string" }, credentials: { type: "string" }, keep: { type: "boolean" }, "max-turns": { type: "string" }, example: { type: "string" }, to: { type: "string" }, "allow-unscripted": { type: "boolean" }, attempt: { type: "string" }, turns: { type: "string" } } });
  } catch (error) {
    return fail(error.message);
  }
  const { values, positionals } = args;
  try {
    const target = (p) => (existsSync(join(p ?? "", "state.json")) ? resolve(p) : join(RUNS, p ?? ""));
    if (command === "freeze") {
      const [run, caseId] = positionals;
      if (!run || !caseId || !values.example) return fail("freeze needs a run, a case and --example <name>. Example: pnpm ai:eval freeze <run> doctor --example doctor");
      if (!EXAMPLES.includes(values.example)) return fail(`--example "${values.example}" is not one of ${EXAMPLES.join(", ")}`);
      const dir = target(run);
      if (!existsSync(join(dir, "state.json"))) return fail(`${dir}/state.json was not found`);
      const attempt = values.attempt === undefined ? "" : `-${Number(values.attempt)}`;
      const file = join(dir, caseId, `transcript${attempt}.json`);
      if (!existsSync(file)) return fail(`${file} was not found: ${caseId} is not a case of that run`);
      const skillVersion = /^\s*version: "([^"]+)"/m.exec(readFileSync(SKILL_MD, "utf-8"))?.[1] ?? "unknown";
      const example = makeExample({ example: values.example, caseId, state: readState(dir), transcript: JSON.parse(readFileSync(file, "utf-8")), skillVersion, allowUnscripted: values["allow-unscripted"] });
      if (values.turns !== undefined) {
        const n = Number(values.turns);
        if (!Number.isInteger(n) || n < 1) return fail("--turns is a whole number of 1 or more");
        example.turns = example.turns.slice(0, n);
      }
      const to = values.to ? resolve(values.to) : join(root, "tools/ai-eval/cases/examples");
      mkdirSync(to, { recursive: true });
      writeFileSync(join(to, `${values.example}.json`), `${JSON.stringify(example, null, 2)}\n`);
      process.stdout.write(`froze ${caseId} as ${join(to, `${values.example}.json`)}\n`);
      return 0;
    }
    if (command === "open") {
      const dir = positionals[0] ? target(positionals[0]) : join(RUNS, readdirSync(RUNS).sort().at(-1) ?? "");
      const page = join(dir, "index.html");
      if (!existsSync(page)) return fail(`${page} was not found`);
      process.stdout.write(`${page}\n`);
      spawn(process.platform === "darwin" ? "open" : "xdg-open", [page], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
      return 0;
    }
    const credentials = values.credentials === "none" ? null : (values.credentials ?? defaultCredentials());
    const budget = duration(values.budget ?? "60m");
    const maxPoints = Number(values["max-points"] ?? 10) / 100;
    const maxTokens = Number(values["max-tokens"] ?? 0);
    const maxTurns = Number(values["max-turns"] ?? 12);
    if (!(maxPoints > 0) || !(maxTokens >= 0) || !(maxTurns >= 1)) return fail("--max-points, --max-tokens and --max-turns are positive numbers");
    const all = loadCases(root);
    let layer;
    let wanted;
    let out;
    let resume = false;
    let meta;
    if (command === "resume") {
      if (!positionals[0]) return fail("resume needs a run folder or id");
      out = target(positionals[0]);
      if (!existsSync(join(out, "state.json"))) return fail(`${out}/state.json was not found`);
      const state = readState(out);
      layer = state.meta.layer;
      wanted = state.meta.caseIds;
      meta = state.meta;
      resume = true;
    } else {
      layer = values.layer ?? "smoke";
      if (!LAYERS[layer]) return fail(`--layer "${layer}" is not one of ${Object.keys(LAYERS).join(", ")}`);
      wanted = values.case ?? all.map((c) => c.id);
    }
    const cases = wanted.map((id) => all.find((c) => c.id === id) ?? (() => { throw new Error(`${id} is not a case (${all.map((c) => c.id).join(", ")})`); })());
    const model = LAYERS[layer];
    meta ??= { layer, model, caseIds: wanted };
    if (values["dry-run"]) {
      const minutes = Math.round(cases.length * MINUTES_PER_RUN[model]);
      process.stdout.write(`plan: ${cases.length} case${cases.length === 1 ? "" : "s"}, model ${model}, one run each and up to three after a failure (about ${minutes} minutes for the first runs; the weekly cost is read from the first run)\n${cases.map((c) => `  ${c.id}`).join("\n")}\nnothing was run (drop --dry-run)\n`);
      return 0;
    }
    const runId = resume ? readState(out).runId : `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${layer}`;
    out ??= values.out ? resolve(values.out) : join(RUNS, runId);
    mkdirSync(out, { recursive: true });
    if (!resume) writeState(out, { runId, createdAt: new Date().toISOString(), meta, cases: {}, rounds: [] });
    const runCase = makeRunCase({ out, model, credentials, keep: values.keep, maxTurns });
    const { state } = await drive({ cases, out, runId, meta, resume: true, budget, maxPoints, maxTokens, runCase });
    process.stdout.write(`${summaryLines(state).join("\n")}\nreport: ${join(out, "report.md")}\nviewer: pnpm ai:eval open ${runId}\n`);
    return Object.values(state.cases).some((c) => c.status === "fail") ? 1 : 0;
  } catch (error) {
    return fail(error.message);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
