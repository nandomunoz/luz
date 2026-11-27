/** The cases of a run, in order, each up to three times (2 of 3), the state written after every run, and a round that can pause. */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** A clean first run passes; after a failure two of three decide. */
export function decide(results) {
  const pass = results.filter(Boolean).length;
  const fail = results.length - pass;
  if (results.length === 1 && pass === 1) return { status: "pass", more: false };
  if (pass >= 2) return { status: "pass", more: false };
  if (fail >= 2) return { status: "fail", more: false };
  return { status: "pending", more: true };
}

export const writeState = (out, state) => {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "state.json.tmp"), `${JSON.stringify(state, null, 2)}\n`);
  renameSync(join(out, "state.json.tmp"), join(out, "state.json"));
};

export const readState = (out) => JSON.parse(readFileSync(join(out, "state.json"), "utf-8"));

export async function executeRun({ cases, out, round, runCase, runId, meta = {}, resume = false }) {
  const state = resume && existsSync(join(out, "state.json")) ? readState(out) : { runId, createdAt: new Date().toISOString(), meta, cases: {}, rounds: [] };
  let stopped = null;
  outer: for (const c of cases) {
    const entry = (state.cases[c.id] ??= { status: "pending", runs: [] });
    while (entry.status === "pending") {
      stopped = round.check();
      if (stopped) break outer;
      const run = await runCase(c, entry.runs.length);
      round.record({ rate: run.rate, tokens: run.tokens?.total ?? 0 });
      entry.runs.push(run);
      entry.status = decide(entry.runs.map((r) => r.passed)).status;
      writeState(out, state);
    }
  }
  state.rounds.push(round.summary());
  writeState(out, state);
  return { stopped, state };
}
