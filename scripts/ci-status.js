/**
 * LUZ Design System — How did a CI run go?
 * Says how a GitHub Actions run went without an agent reading its logs (AGENTS.md section 8, a script
 * before an agent): a table of its jobs (result and minutes), then, for each failed job, only the lines that
 * say why: a failed test, an `Error:`, `Expected` and `Received`, an `##[error]`, the count of failures.
 * Timestamps, retries and repeats are dropped, and a job keeps at most `--max` lines (default 12).
 *
 * Usage (Node 20 or later, no dependency; needs `gh`, logged in):
 *   node scripts/ci-status.js <run-id>
 *   node scripts/ci-status.js --pr <number> [--workflow <name>]
 *   node scripts/ci-status.js --branch <name> [--workflow <name>]
 *   add --wait to wait until the run is complete (polls every 30 s), --max <n> for more lines per job
 * Exits 1 when the run failed, 0 otherwise.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WHY = [/^✘/, /^x\s+\d/, /^\d+ (failed|flaky)\b/, /^FAIL\b/, /^\w*Error\b/, /^Error:/, /^Expected\b/, /^Received\b/, /^##\[error\]/];
const RETRY = /\(retry #\d+\)/;
const NOISE = /^Error Context:/;
const STAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/;

/** The lines of a `gh run view --log` (job \t step \t text) that say why each job failed: Map<job, lines>. */
export function failureLines(log, { max = 12 } = {}) {
  const byJob = new Map();
  for (const raw of log.split("\n")) {
    const [job, , ...rest] = raw.split("\t");
    if (!rest.length) continue;
    const text = rest.join("\t").replace(STAMP, "").trim();
    if (!text || RETRY.test(text) || NOISE.test(text) || !WHY.some((re) => re.test(text))) continue;
    const lines = byJob.get(job) ?? [];
    if (!lines.includes(text) && lines.length < max) lines.push(text);
    byJob.set(job, lines);
  }
  return byJob;
}

const minutes = (job) =>
  job.startedAt && job.completedAt ? ((Date.parse(job.completedAt) - Date.parse(job.startedAt)) / 60000).toFixed(1) : "";

/** The report of a run: a heading, a table of its jobs and the reasons of the failed ones (markdown). */
export function summarize(run, log, options) {
  const state = run.status === "completed" ? run.conclusion : run.status;
  const out = [`## ${run.workflowName} #${run.databaseId} (${run.headBranch}): ${state}`, "", run.url, ""];
  if (run.jobs?.length) {
    out.push("| Job | Result | Minutes |", "|---|---|---|");
    for (const job of run.jobs) out.push(`| ${job.name} | ${job.conclusion || job.status} | ${minutes(job)} |`);
    out.push("");
  }
  const failed = new Set((run.jobs ?? []).filter((j) => ["failure", "timed_out", "cancelled"].includes(j.conclusion)).map((j) => j.name));
  for (const [job, lines] of failureLines(log, options)) {
    if (!failed.has(job)) continue;
    out.push(`### ${job}`, "", "```", ...lines, "```", "");
  }
  return out.join("\n");
}

/** Reads the arguments: { run } | { pr } | { branch }, with optional workflow, max and wait. */
export function parseArgs(argv) {
  const options = { wait: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--wait") options.wait = true;
    else if (arg === "--pr") options.pr = argv[++i];
    else if (arg === "--branch") options.branch = argv[++i];
    else if (arg === "--workflow") options.workflow = argv[++i];
    else if (arg === "--max") options.max = Number(argv[++i]);
    else if (/^\d+$/.test(arg)) options.run = arg;
    else throw new Error(`ci-status: unknown argument ${arg}`);
  }
  return options;
}

const ghCli = (args) => execFileSync("gh", args, { encoding: "utf-8", maxBuffer: 256 * 1024 * 1024 });

/** The id of the run asked for: the one given, or the latest of a branch or of a pull request's branch. */
export function findRun({ run, pr, branch, workflow }, gh = ghCli) {
  if (run) return run;
  if (pr) branch = JSON.parse(gh(["pr", "view", pr, "--json", "headRefName"])).headRefName;
  const args = ["run", "list", "--branch", branch, "--limit", "1", "--json", "databaseId"];
  if (workflow) args.push("--workflow", workflow);
  const [latest] = JSON.parse(gh(args));
  if (!latest) throw new Error(`ci-status: no run found for ${branch}${workflow ? ` (${workflow})` : ""}`);
  return String(latest.databaseId);
}

const FIELDS = "databaseId,status,conclusion,url,workflowName,headBranch,jobs";

export async function main(argv = process.argv.slice(2), { gh = ghCli, log = console.log, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const options = parseArgs(argv);
  const id = findRun(options, gh);
  let run = JSON.parse(gh(["run", "view", id, "--json", FIELDS]));
  while (options.wait && run.status !== "completed") {
    await sleep(30_000);
    run = JSON.parse(gh(["run", "view", id, "--json", FIELDS]));
  }
  const failed = run.status === "completed" && run.conclusion === "failure";
  const text = failed ? gh(["run", "view", id, "--log-failed"]) : "";
  log(summarize(run, text, { max: options.max }));
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
