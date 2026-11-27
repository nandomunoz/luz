/**
 * Activation: does a request wake the `luz` skill, and does a near miss leave it asleep. The sandbox has the three skills of
 * luz-ai and decoys with descriptions close to luz's, so a skill that wakes for the wrong request is seen. What was invoked is
 * read from the stream (a `Skill` tool use), and the assistant gets two turns and one tool: it cannot write or run anything.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { claudeArgs } from "./sandbox.js";
import { parseStream } from "./stream.js";

export const DECOYS = [
  { name: "tailwind-helper", description: "Use when the user is building or styling a page with Tailwind CSS utility classes: layouts, spacing, dark mode, responsive variants." },
  { name: "changelog-writer", description: "Use when the user asks for a changelog entry, release notes or a version bump message for a package in a repository." },
  { name: "css-token-linter", description: "Use when the user edits design tokens or CSS custom properties inside a design system's own source and wants them checked." },
];

export const invokedSkills = (s) => s.toolUses.filter((u) => u.name === "Skill").map((u) => String(u.input?.skill ?? ""));

/** A request that should wake luz wakes luz (or one of its own skills); one that should not wakes none of them. */
export function scoreTrigger(query, skills) {
  const luz = skills.some((n) => /^luz(-|$)/.test(n));
  return { ok: query.should_trigger ? luz : !luz, skills };
}

export const triggerRate = (oks) => oks.filter(Boolean).length / (oks.length || 1);

export function installDecoys(dir) {
  for (const d of DECOYS) {
    mkdirSync(join(dir, ".claude/skills", d.name), { recursive: true });
    writeFileSync(join(dir, ".claude/skills", d.name, "SKILL.md"), `---\nname: ${d.name}\ndescription: ${d.description}\n---\n\n# ${d.name}\n\nA decoy of the lab: say that you used it and stop.\n`);
  }
}

export async function runTrigger({ query, claude, sandbox, model }) {
  const r = await claude(claudeArgs({ prompt: query.query, model, tools: "Skill", maxTurns: 2 }), { cwd: sandbox.dir, env: sandbox.env });
  const s = parseStream(r.stdout ?? "");
  // A request typed as a command (/luz doctor) runs the skill directly, with no Skill tool use in the stream
  const typed = /^\/([a-z][a-z0-9-]*)/.exec(query.query)?.[1];
  const skills = typed ? [typed, ...invokedSkills(s)] : invokedSkills(s);
  return { ...scoreTrigger(query, skills), tokens: s.tokens, rate: s.rate, costUsd: s.costUsd };
}
