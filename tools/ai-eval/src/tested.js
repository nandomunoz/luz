/**
 * "Tested in": what a green pass of the release layer says about the skill: the host, the model, the versions and the cases.
 * It is written to `packages/ai/tested.json` by `ai:eval tested <run>` and read by the release gate (scripts/check-ai-tested.js).
 */
export function makeTested(state, { skillVersion, packageVersion, cli, now = new Date() }) {
  if (state.meta?.layer !== "release") throw new Error(`only a pass of the release layer is written (this run is ${state.meta?.layer})`);
  if (state.meta?.mode !== "script") throw new Error(`only a script run is written (this run is ${state.meta?.mode}): it is the one that is the same every time`);
  const bad = Object.entries(state.cases).filter(([, c]) => c.status !== "pass").map(([id]) => id);
  if (bad.length || !Object.keys(state.cases).length) throw new Error(`a pass is every case green: ${bad.join(", ") || "the run has no case"} did not pass`);
  return { host: "claude-code", cli, model: state.meta.model, skillVersion, packageVersion, date: now.toISOString().slice(0, 10), cases: Object.keys(state.cases) };
}
