#!/usr/bin/env node
/**
 * ai:eval: the laboratory of the skills of @luz-ds/ai. Development only, never published.
 *
 *   pnpm ai:eval script [--layer smoke|full|release] [--case <id>]... [--dry-run] [--budget 60m] [--max-points 10]
 *                       [--max-tokens <n>] [--out <folder>] [--credentials <file>|none] [--keep]
 *   pnpm ai:eval resume <run folder or id>
 *   pnpm ai:eval open [<run folder or id>]
 *   pnpm ai:eval auto [--layer smoke|full|release] [--persona <id>]... [--goal <id>]... [--full] [--no-judge] [--dry-run]   a person played by a model with a persona, graded by the checks and by a judge
 *   pnpm ai:eval play --case <id> [--no-judge]            you are the person, in the sandbox; when you leave, grade + judge + viewer
 *   pnpm ai:eval triggers [--layer ...] [--runs 3] [--match <text>] [--dry-run]   does a request wake the skill, with decoys installed
 *   pnpm ai:eval agents [--agent <name>]... [--layer ...] [--dry-run]   the agents on a page with seeded faults: recall, false positives, tools
 *   pnpm ai:eval baseline <run>                           the green run becomes the baseline the next run is compared with
 *   pnpm ai:eval tested <run>                             a green script run of the release layer is written to packages/ai/tested.json (the release gate reads it)
 *   pnpm ai:eval freeze-case <run> <case> --id <name>    a green automatic conversation, as a scripted case that replays with no model
 *   pnpm ai:eval freeze <run> <case> --example <name> [--to <folder>] [--allow-unscripted] [--attempt <n>] [--turns <n>]   a green conversation, as an example for the docs
 *
 * `script` runs the scripted cases: the case's prompt, a cheap model that only picks the answer of the map, mechanical
 * checks. A round stops at 60 minutes or +10 points of the weekly window, saves its state and asks whether to go on.
 * Every command that spends tokens has the cap of a round. Exit 0 when every case passed, 1 when one failed, 2 when it is used wrongly.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { autoCase, pairs } from "./auto.js";
import { compareBaseline, baselineLines, makeBaseline } from "./baseline.js";
import { createRound } from "./budget.js";
import { RULE_OF, checkTranscript } from "./checks.js";
import { freezeCase, makeExample } from "./freeze.js";
import { makeJudge } from "./judge.js";
import { makeTested } from "./tested.js";
import { spawnSync } from "node:child_process";
import { makePersonaSimulator } from "./persona.js";
import { AGENT_CASES } from "./agents.js";
import { runAgents, runTriggers } from "./suites.js";
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
export const EXAMPLES = ["start", "new", "doctor", "lint", "facts", "agents", "skills", "list", "add", "remove", "magic", "help", "unknown", "hostile"];

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
  if (c.checks?.length) for (const k of grade(c.gradeId ?? c.id, sandbox.dir, { root, ignore: SETUP }).checks.filter((x) => c.checks.includes(x.id))) checks.push({ id: k.id, ok: k.ok, detail: k.detail, rule: RULE_OF[k.id] });
  for (const id of c.transcript ?? []) checks.push(checkTranscript(id, convo, c));
  if (convo.ended === "error") checks.push({ id: "conversation", ok: false, detail: convo.error });
  return checks;
}

const PERSONAS = () => JSON.parse(readFileSync(join(root, "tools/ai-eval/cases/personas.json"), "utf-8"));
const sumTokens = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b?.[k] ?? 0)]));

/** The person at the keyboard (`play`): the assistant's text is printed, a line is the reply, an empty line leaves. */
function ownerSimulator() {
  return async ({ assistantText }) => {
    process.stdout.write(`\n${assistantText}\n\n`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const line = (await rl.question("you (empty line to leave) > ")).trim();
    rl.close();
    return line && !line.startsWith("-") ? { reply: line, topic: null, unscripted: false } : { done: true };
  };
}

/** mode: script (a scripted person), auto (a persona, then the judge) or play (you). */
function makeRunCase({ out, model, credentials, keep, maxTurns, mode = "script", judge: useJudge = false }) {
  const skillMd = readFileSync(SKILL_MD, "utf-8");
  return async (c0, index) => {
    const started = Date.now();
    const sandbox = createSandbox({ caseDef: c0, root, credentials });
    try {
      let c = c0;
      let simulate;
      let extra = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
      let rate = null;
      if (mode === "auto") {
        const data = PERSONAS();
        simulate = makePersonaSimulator({ claude: spawnClaude, sandbox, persona: data.personas.find((p) => p.id === c0.persona), goal: data.goals.find((g) => g.id === c0.goal) });
        const opening = await simulate({ assistantText: null });
        extra = sumTokens(extra, opening.tokens);
        rate = opening.rate;
        c = { ...c0, prompt: opening.reply };
      } else if (mode === "play") {
        simulate = ownerSimulator();
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        c = { ...c0, prompt: (await rl.question("you > ")).trim() };
        rl.close();
      } else {
        simulate = makeSimulator({ claude: spawnClaude, sandbox });
      }
      const convo = await runConversation({ caseDef: c, sandbox, model, simulate, maxTurns });
      convo.tokens = sumTokens(convo.tokens, extra);
      convo.rate ??= rate;
      const checks = gradeRun(c, convo, sandbox);
      if (useJudge) {
        const verdict = await makeJudge({ claude: spawnClaude, sandbox, skillMd })({ convo });
        checks.push(...verdict.checks);
        convo.tokens = sumTokens(convo.tokens, verdict.tokens);
        convo.rate = verdict.rate ?? convo.rate;
      }
      const dir = join(out, c.id);
      mkdirSync(dir, { recursive: true });
      const body = `${JSON.stringify({ caseDef: c, convo, checks }, null, 2)}\n`;
      writeFileSync(join(dir, "transcript.json"), body);
      writeFileSync(join(dir, `transcript-${index + 1}.json`), body);
      writeFileSync(join(dir, "report.md"), caseReport({ caseDef: c, convo, checks, skillMd }));
      if (keep) cpSync(sandbox.dir, join(dir, "folder"), { recursive: true, filter: keepFilter });
      return { passed: checks.every((k) => k.ok), checks: checks.map(({ id, ok, rule, turn }) => ({ id, ok, rule, turn })), ended: convo.ended, unscripted: convo.unscripted.length, turns: convo.turns.length, tokens: convo.tokens, costUsd: convo.costUsd, rate: convo.rate, ms: Date.now() - started };
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

const BASELINE = join(root, "tools/ai-eval/cases/baseline.json");
const baselineKey = (meta) => `${meta?.mode ?? "script"}-${meta?.layer ?? "smoke"}`;
const readBaselines = () => (existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf-8")) : {});

function finish(out, state) {
  const was = readBaselines()[baselineKey(state.meta)];
  const lines = was ? baselineLines(compareBaseline(state, was)) : [];
  writeFileSync(join(out, "report.md"), runReport(state, lines));
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

const skillVersion = () => /^\s*version: "([^"]+)"/m.exec(readFileSync(SKILL_MD, "utf-8"))?.[1] ?? "unknown";
const summaryLines = (state) => Object.entries(state.cases).map(([id, c]) => `${id}: ${c.status} (${c.runs.length} run${c.runs.length === 1 ? "" : "s"})`);

const COMMANDS = ["script", "resume", "open", "freeze", "auto", "play", "triggers", "agents", "baseline", "freeze-case", "tested"];
const OPTIONS = { layer: { type: "string" }, case: { type: "string", multiple: true }, "dry-run": { type: "boolean" }, budget: { type: "string" }, "max-points": { type: "string" }, "max-tokens": { type: "string" }, out: { type: "string" }, credentials: { type: "string" }, keep: { type: "boolean" }, "max-turns": { type: "string" }, example: { type: "string" }, to: { type: "string" }, "allow-unscripted": { type: "boolean" }, attempt: { type: "string" }, turns: { type: "string" }, persona: { type: "string", multiple: true }, goal: { type: "string", multiple: true }, full: { type: "boolean" }, "no-judge": { type: "boolean" }, runs: { type: "string" }, match: { type: "string" }, agent: { type: "string", multiple: true }, id: { type: "string" } };
const pick = (list, wanted, what) => (wanted ? wanted.map((id) => list.find((x) => x.id === id) ?? (() => { throw new Error(`${id} is not a ${what} (${list.map((x) => x.id).join(", ")})`); })()) : list);

export async function main(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command ?? "")) return fail(`a command is missing (${COMMANDS.join(", ")}). Example: pnpm ai:eval script --layer smoke --dry-run`);
  let args;
  try {
    args = parseArgs({ args: rest, allowPositionals: true, options: OPTIONS });
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
      const example = makeExample({ example: values.example, caseId, state: readState(dir), transcript: JSON.parse(readFileSync(file, "utf-8")), skillVersion: skillVersion(), allowUnscripted: values["allow-unscripted"] });
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
    if (command === "freeze-case") {
      const [run, caseId] = positionals;
      if (!run || !caseId || !values.id) return fail("freeze-case needs a run, a case and --id <name>. Example: pnpm ai:eval freeze-case <run> landing--hostile --id landing-hostile");
      if (!/^[a-z0-9-]+$/.test(values.id)) return fail("--id is lower-case letters, digits and dashes");
      if (!/^[a-z0-9-]+(--[a-z0-9-]+)?$/.test(caseId)) return fail(`${caseId} is not a case id`);
      const dir = target(run);
      if (!existsSync(join(dir, "state.json"))) return fail(`${dir}/state.json was not found`);
      const attempt = values.attempt === undefined ? "" : `-${Number(values.attempt)}`;
      const file = join(dir, caseId, `transcript${attempt}.json`);
      if (!existsSync(file)) return fail(`${file} was not found: ${caseId} is not a case of that run`);
      const transcript = JSON.parse(readFileSync(file, "utf-8"));
      if (!transcript.caseDef?.persona) return fail(`${caseId} is not a case of an automatic run: a scripted case needs no freezing`);
      const frozen = freezeCase({ id: values.id, autoCase: transcript.caseDef, state: readState(dir), transcript });
      const to = join(root, "tools/ai-eval/cases/frozen");
      mkdirSync(to, { recursive: true });
      writeFileSync(join(to, `${values.id}.json`), `${JSON.stringify({ $comment: "Words a model wrote, played back as the person. The SAFE verdict of prompt-injection-auditor is needed before this file is committed.", case: frozen }, null, 2)}\n`);
      process.stdout.write(`froze ${caseId} as ${join(to, `${values.id}.json`)}: pnpm ai:eval script --case ${values.id}\n`);
      return 0;
    }
    if (command === "baseline") {
      const dir = target(positionals[0]);
      if (!positionals[0] || !existsSync(join(dir, "state.json"))) return fail("baseline needs a run folder or id");
      const state = readState(dir);
      const bad = Object.entries(state.cases).filter(([, c]) => c.status !== "pass").map(([id]) => id);
      if (bad.length) return fail(`a baseline is a green run: ${bad.join(", ")} did not pass`);
      const all = readBaselines();
      all[baselineKey(state.meta)] = makeBaseline(state, { skillVersion: skillVersion() });
      writeFileSync(BASELINE, `${JSON.stringify(all, null, 2)}\n`);
      process.stdout.write(`baseline ${baselineKey(state.meta)} written to ${BASELINE}\n`);
      return 0;
    }
    if (command === "tested") {
      const dir = target(positionals[0]);
      if (!positionals[0] || !existsSync(join(dir, "state.json"))) return fail("tested needs a run folder or id");
      const cli = /(\d+\.\d+\.\d+)/.exec(spawnSync(process.env.AI_EVAL_CLAUDE || "claude", ["--version"], { encoding: "utf-8" }).stdout ?? "")?.[1] ?? "unknown";
      const tested = makeTested(readState(dir), { skillVersion: skillVersion(), packageVersion: JSON.parse(readFileSync(join(root, "packages/ai/package.json"), "utf-8")).version, cli });
      writeFileSync(join(root, "packages/ai/tested.json"), `${JSON.stringify(tested, null, 2)}\n`);
      process.stdout.write(`wrote packages/ai/tested.json (${tested.host}, ${tested.model}, skill ${tested.skillVersion}, package ${tested.packageVersion})\n`);
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
    const maxTurns = Number(values["max-turns"] ?? (command === "play" ? 60 : 12));
    if (!(maxPoints > 0) || !(maxTokens >= 0) || !(maxTurns >= 1)) return fail("--max-points, --max-tokens and --max-turns are positive numbers");
    const all = loadCases(root);
    let layer;
    let wanted;
    let out;
    let resume = false;
    let meta;
    const mode = command === "resume" ? undefined : command === "auto" || command === "play" ? command : "script";
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
    const model = LAYERS[layer];
    const runMode = meta?.mode ?? mode;
    const runId = () => `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${command === "triggers" || command === "agents" ? command : runMode}-${layer}`;
    const bases = all;

    if (command === "triggers" || command === "agents") {
      const queries = JSON.parse(readFileSync(join(root, "tools/ai-eval/cases/triggers.json"), "utf-8")).queries.filter((q) => !values.match || q.query.includes(values.match));
      const runs = Number(values.runs ?? 3);
      const agentCases = pick(AGENT_CASES.map((c) => ({ ...c, id: c.agent })), values.agent, "agent");
      if (values["dry-run"]) {
        process.stdout.write(command === "triggers" ? `plan: ${queries.length} queries, ${runs} run${runs === 1 ? "" : "s"} each, model ${model}, three luz skills and ${3} decoys installed, two turns and one tool\nnothing was run (drop --dry-run)\n` : `plan: ${agentCases.length} agents, one run each, model ${model}\n${agentCases.map((c) => `  ${c.agent}`).join("\n")}\nnothing was run (drop --dry-run)\n`);
        return 0;
      }
      const id = runId();
      out = values.out ? resolve(values.out) : join(RUNS, id);
      mkdirSync(out, { recursive: true });
      const round = createRound({ maxMs: budget, maxPoints, maxTokens });
      const makeSandbox = (caseDef) => createSandbox({ caseDef, root, credentials });
      const r = command === "triggers" ? await runTriggers({ queries, runs, model, claude: spawnClaude, makeSandbox, round }) : await runAgents({ cases: agentCases, root, model, claude: spawnClaude, makeSandbox, round });
      const rows = r.results.map((x) => (command === "triggers" ? `| ${x.ok ? "ok" : "FAIL"} | ${x.should_trigger ? "wakes" : "sleeps"} | ${(x.rate * 100).toFixed(0)} % | \`${x.query.replace(/[`|\n]/g, " ").slice(0, 90)}\` |` : `| ${x.ok ? "ok" : "FAIL"} | \`${x.agent}\` | recall ${(x.recall * 100).toFixed(0)} % (missed: ${x.missed.join(", ") || "none"}) | false positives: ${x.falsePositives.join(", ") || "none"} · tools: ${x.respectsTools ? "respected" : `used ${x.outside.join(", ")}`} |`));
      const head = command === "triggers" ? ["| result | expected | rate | query |", "| --- | --- | --- | --- |"] : ["| result | agent | recall | other |", "| --- | --- | --- | --- |"];
      writeFileSync(join(out, `${command}.json`), `${JSON.stringify(r.results, null, 2)}\n`);
      writeFileSync(join(out, "report.md"), `# ${command} ${id}\n\nModel: ${model}${r.stopped ? ` · stopped: ${r.stopped.reason}` : ""}\n\n${[...head, ...rows].join("\n")}\n`);
      process.stdout.write(`${[...head, ...rows].join("\n")}\nreport: ${join(out, "report.md")}\n`);
      return r.results.some((x) => !x.ok) || r.stopped ? 1 : 0;
    }

    let cases;
    if (command === "auto" || meta?.mode === "auto") {
      const data = PERSONAS();
      const all2 = pairs({ personas: pick(data.personas, values.persona, "persona"), goals: pick(data.goals, values.goal, "goal") }, { full: values.full || Boolean(values.persona || values.goal) });
      const stubs = all2.map((p) => autoCase(p, bases, ""));
      cases = command === "resume" ? wanted.map((id) => autoCase(pairs(data, { full: true }).find((p) => `${p.goal.id}--${p.persona.id}` === id), bases, "")) : stubs;
      wanted = cases.map((c) => c.id);
    } else {
      cases = wanted.map((id) => bases.find((c) => c.id === id) ?? (() => { throw new Error(`${id} is not a case (${bases.map((c) => c.id).join(", ")})`); })());
    }
    meta ??= { layer, model, caseIds: wanted, mode: runMode };
    if (values["dry-run"]) {
      const minutes = Math.round(cases.length * MINUTES_PER_RUN[model] * (runMode === "auto" ? 1.6 : 1));
      process.stdout.write(`plan: ${cases.length} case${cases.length === 1 ? "" : "s"}, model ${model}${runMode === "auto" ? `, persona on haiku${values["no-judge"] ? ", no judge" : ", judge on sonnet"}` : ""}, one run each and up to three after a failure (about ${minutes} minutes for the first runs; the weekly cost is read from the first run)\n${cases.map((c) => `  ${c.id}`).join("\n")}\nnothing was run (drop --dry-run)\n`);
      return 0;
    }
    const id = resume ? readState(out).runId : runId();
    out ??= values.out ? resolve(values.out) : join(RUNS, id);
    mkdirSync(out, { recursive: true });
    if (!resume) writeState(out, { runId: id, createdAt: new Date().toISOString(), meta, cases: {}, rounds: [] });
    const runCase = makeRunCase({ out, model, credentials, keep: values.keep, maxTurns, mode: runMode, judge: runMode !== "script" && !values["no-judge"] });
    if (command === "play") {
      if (!process.stdin.isTTY) return fail("play needs a terminal: you are the person");
      if (cases.length !== 1) return fail("play needs one case: --case <id>");
      const run = await runCase(cases[0], 0);
      const state = readState(out);
      state.cases[cases[0].id] = { status: run.passed ? "pass" : "fail", runs: [run] };
      writeState(out, state);
      finish(out, state);
      process.stdout.write(`\n${run.passed ? "pass" : "FAIL"}: ${join(out, cases[0].id, "report.md")}\nviewer: pnpm ai:eval open ${id}\n`);
      return run.passed ? 0 : 1;
    }
    const { state } = await drive({ cases, out, runId: id, meta, resume: true, budget, maxPoints, maxTokens, runCase });
    process.stdout.write(`${summaryLines(state).join("\n")}\nreport: ${join(out, "report.md")}\nviewer: pnpm ai:eval open ${id}\n`);
    return Object.values(state.cases).some((c) => c.status === "fail") ? 1 : 0;
  } catch (error) {
    return fail(error.message);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
