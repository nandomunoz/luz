/**
 * "Tested in": what a green pass of the release layer says about the skill: the host, the model, the versions and the cases.
 * It is written to `packages/ai/tested.json` by `ai:eval tested <run>` and read by scripts/check-ai-tested.js, which warns and never blocks.
 */
export function makeTested(state, { skillVersion, packageVersion, cli, now = new Date() }) {
  if (state.meta?.layer !== "release") throw new Error(`only a pass of the release layer is written (this run is ${state.meta?.layer})`);
  if (state.meta?.mode !== "script") throw new Error(`only a script run is written (this run is ${state.meta?.mode}): it is the one that is the same every time`);
  const ids = Object.keys(state.cases);
  const bad = Object.entries(state.cases).filter(([, c]) => c.status !== "pass").map(([id]) => id);
  // A model is not the same every time: a pass is nine cases in ten green (a case already has its retries), and it says which were not
  if (!ids.length || bad.length > Math.floor(ids.length / 10)) throw new Error(`a pass is at least nine cases in ten green: ${bad.join(", ") || "the run has no case"} did not pass`);
  return { host: "claude-code", cli, model: state.meta.model, skillVersion, packageVersion, date: now.toISOString().slice(0, 10), cases: ids, failed: bad };
}
