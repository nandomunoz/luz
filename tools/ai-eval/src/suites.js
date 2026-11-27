/**
 * The two suites that are not conversations: the triggers (does a request wake the skill) and the agents (what each one finds
 * in a page with faults seeded in it). Each item is one or more runs of `claude` in a sandbox of its own, the cap of the round
 * is looked at between runs, and the results are returned with what the run cost. `claude` and `makeSandbox` are injected.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { claudeArgs } from "./sandbox.js";
import { parseStream } from "./stream.js";
import { AGENT_CASES, agentTools, scoreAgent } from "./agents.js";
import { installDecoys, runTrigger, triggerRate } from "./triggers.js";

/** A pass is a rate of at least half of the runs. */
export const THRESHOLD = 0.5;

export async function runTriggers({ queries, runs = 3, model, claude, makeSandbox, round }) {
  const results = [];
  let stopped = null;
  outer: for (const query of queries) {
    const oks = [];
    const skills = [];
    for (let i = 0; i < runs; i += 1) {
      stopped = round.check();
      if (stopped) break outer;
      const sandbox = makeSandbox({ id: "trigger", fixture: {} });
      try {
        installDecoys(sandbox.dir);
        const r = await runTrigger({ query, claude, sandbox, model });
        round.record({ rate: r.rate, tokens: r.tokens?.total ?? 0 });
        oks.push(r.ok);
        skills.push(r.skills);
      } finally {
        sandbox.cleanup();
      }
    }
    const rate = triggerRate(oks);
    results.push({ query: query.query, should_trigger: query.should_trigger, rate, ok: rate >= THRESHOLD, skills });
  }
  return { results, stopped };
}

export async function runAgents({ cases = AGENT_CASES, root, model, claude, makeSandbox, round }) {
  const results = [];
  let stopped = null;
  for (const c of cases) {
    stopped = round.check();
    if (stopped) break;
    const file = join(root, "packages/ai/skills/luz/assets/agents", `${c.agent}.md`);
    const tools = agentTools(readFileSync(file, "utf-8"));
    const sandbox = makeSandbox({ id: c.agent, fixture: c.fixture });
    try {
      mkdirSync(join(sandbox.dir, ".claude/agents"), { recursive: true });
      copyFileSync(file, join(sandbox.dir, ".claude/agents", `${c.agent}.md`));
      const prompt = `Use the ${c.agent} agent to audit the files in the folder site and report its findings, each with the file and a fix. Project context: ${c.brief} Do not change any file.`;
      const r = await claude(claudeArgs({ prompt, model, tools: "Read,Glob,Grep,Agent", maxTurns: 10 }), { cwd: sandbox.dir, env: sandbox.env });
      const s = parseStream(r.stdout ?? "");
      round.record({ rate: s.rate, tokens: s.tokens.total });
      results.push({ agent: c.agent, ...scoreAgent({ ...c, tools }, s), tokens: s.tokens, costUsd: s.costUsd });
    } finally {
      sandbox.cleanup();
    }
  }
  return { results, stopped };
}

export function suiteReport(title, rows, header, line) {
  return [`# ${title}`, "", header, "", ...rows.map(line), ""].join("\n");
}
