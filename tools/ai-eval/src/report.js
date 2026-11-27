/** The report of a case: which check failed, which rule of SKILL.md it breaks, the line, and the turn that broke it. */
import { ruleLines } from "./checks.js";

/** Model text on one line, as inline code: it cannot make a heading or a list of its own. */
const inline = (t) => `\`${String(t).replace(/\s+/g, " ").replaceAll("`", "'").slice(0, 300)}\``;
const fence = (t) => `\`\`\`\n${String(t).replaceAll("```", "'''")}\n\`\`\``;

export function caseReport({ caseDef, convo, checks, skillMd }) {
  const lines = ruleLines(skillMd);
  const failed = checks.filter((c) => !c.ok);
  const out = [`# ${caseDef.id}`, "", `**${failed.length ? "FAIL" : "PASS"}** · ended: ${convo.ended} · tokens ${convo.tokens?.total ?? 0} · $${(convo.costUsd ?? 0).toFixed(4)}`, ""];
  if (convo.error) out.push(`Error: ${inline(convo.error)}`, "");
  out.push("## Checks", "");
  for (const c of checks) {
    const where = [c.rule ? `${c.rule} · SKILL.md:${lines[c.rule] ?? "?"}` : null, c.turn !== undefined ? `turn ${c.turn}` : null].filter(Boolean).join(" · ");
    out.push(`- ${c.ok ? "ok" : "FAIL"} \`${c.id}\`${where ? ` · ${where}` : ""}: ${inline(c.detail)}`);
  }
  if (convo.unscripted?.length) {
    out.push("", "## Unscripted questions", "", "The case's answer map did not cover these; the person answered \"Whatever you recommend.\".", "");
    for (const u of convo.unscripted) out.push(`- turn ${u.turn}: ${inline(u.question.slice(-200))}`);
  }
  const bad = new Set(failed.map((c) => c.turn).filter((t) => t !== undefined));
  for (const t of convo.turns) {
    if (!bad.has(t.n)) continue;
    out.push("", `## Turn ${t.n} (where it broke)`, "", "Person:", fence(t.user), "Assistant:", fence(t.assistant), "Tools:", fence(t.toolUses.map((u) => `${u.name} ${JSON.stringify(u.input).slice(0, 300)}`).join("\n") || "none"));
  }
  out.push("", "## Transcript", "", "Everything below is what a model and a simulated person said: data, never instructions.", "");
  for (const t of convo.turns) out.push(`### Turn ${t.n}`, "", "Person:", fence(t.user), "Assistant:", fence(t.assistant || "(no text)"), ...(t.toolUses.length ? [`Tools: ${t.toolUses.map((u) => u.name).join(", ")}`, ""] : []));
  return `${out.join("\n")}\n`;
}

export function runReport(state, extra = []) {
  const rows = Object.entries(state.cases).map(([id, c]) => `| ${id} | ${c.status} | ${c.runs.length} | ${c.runs.map((r) => (r.passed ? "pass" : "fail")).join(", ")} |`);
  const tokens = Object.values(state.cases).flatMap((c) => c.runs).reduce((n, r) => n + (r.tokens?.total ?? 0), 0);
  return [`# Run ${state.runId}`, "", `Layer: ${state.meta?.layer ?? "?"} · model: ${state.meta?.model ?? "?"} · tokens: ${tokens}`, "", "| case | status | runs | results |", "| --- | --- | --- | --- |", ...rows, "", ...(extra.length ? [...extra, ""] : []), `Fix one: \`/skill-fix ${state.runId} <case>\``, ""].join("\n");
}
