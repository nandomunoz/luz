/**
 * The baseline: what the last good run of a layer cost and did, so the next run is read as a difference: a case that went
 * red, one that grew by a quarter in tokens or took more turns, and the weekly cost of the run. Versioned next to the
 * cases (`cases/baseline.json`); only the owner writes it, with `ai:eval baseline <run>`.
 */
const GROWTH = 0.25;
const lastRun = (c) => c.runs.at(-1) ?? {};

export function makeBaseline(state, { skillVersion, now = new Date() }) {
  const cases = {};
  for (const [id, c] of Object.entries(state.cases)) cases[id] = { status: c.status, tokens: lastRun(c).tokens?.total ?? 0, turns: lastRun(c).turns ?? 0 };
  const points = state.rounds.reduce((n, r) => n + (r.points ?? 0), 0);
  return { layer: state.meta?.layer ?? "?", model: state.meta?.model ?? "?", skillVersion, date: now.toISOString().slice(0, 10), points, cases };
}

export function compareBaseline(state, baseline) {
  const regressions = [];
  const improvements = [];
  const fresh = [];
  for (const [id, c] of Object.entries(state.cases)) {
    const was = baseline.cases?.[id];
    if (!was) {
      fresh.push(id);
      continue;
    }
    const run = lastRun(c);
    if (was.status === "pass" && c.status === "fail") regressions.push({ case: id, kind: "red", detail: "passed in the baseline, fails now" });
    else if (was.status === "fail" && c.status === "pass") improvements.push({ case: id, detail: "failed in the baseline, passes now" });
    const tokens = run.tokens?.total ?? 0;
    if (was.tokens > 0 && tokens > was.tokens * (1 + GROWTH)) regressions.push({ case: id, kind: "tokens", detail: `${was.tokens} → ${tokens} tokens` });
    if (was.turns > 0 && (run.turns ?? 0) > was.turns * (1 + GROWTH)) regressions.push({ case: id, kind: "turns", detail: `${was.turns} → ${run.turns} turns` });
  }
  const points = state.rounds.reduce((n, r) => n + (r.points ?? 0), 0);
  if (baseline.points > 0 && points > baseline.points * (1 + GROWTH)) regressions.push({ case: "run", kind: "points", detail: `${(baseline.points * 100).toFixed(1)} % → ${(points * 100).toFixed(1)} % of the weekly window` });
  return { regressions, improvements, new: fresh };
}

export function baselineLines(r) {
  if (!r.regressions.length && !r.improvements.length && !r.new.length) return ["No regression against the baseline."];
  const out = r.regressions.length ? ["Regressions against the baseline:", ...r.regressions.map((x) => `- \`${x.case}\` ${x.kind}: ${x.detail}`)] : ["No regression against the baseline."];
  if (r.improvements.length) out.push("Better than the baseline:", ...r.improvements.map((x) => `- \`${x.case}\`: ${x.detail}`));
  if (r.new.length) out.push(`Not in the baseline: ${r.new.map((i) => `\`${i}\``).join(", ")}`);
  return out;
}
