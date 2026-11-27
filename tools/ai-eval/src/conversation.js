/**
 * One conversation of a scripted case: the case's prompt, then the assistant's answer, then the simulator's reply, resumed in
 * the same session, until the simulator says the assistant has nothing left to ask, the turns run out, or `claude` fails.
 * `claude(args, { cwd, env })` and `simulate({ assistantText, caseDef })` are injected, so a test needs no model.
 */
import { spawn } from "node:child_process";
import { parseStream } from "./stream.js";
import { claudeArgs } from "./sandbox.js";

const add = (a, b) => ({ input: a.input + (b?.input ?? 0), output: a.output + (b?.output ?? 0), cacheRead: a.cacheRead + (b?.cacheRead ?? 0), cacheWrite: a.cacheWrite + (b?.cacheWrite ?? 0), total: a.total + (b?.total ?? 0) });

/** The real `claude`: a child process with a closed stdin, async so the cap can be looked at between runs. */
export function spawnClaude(args, { cwd, env, timeoutMs = 15 * 60000 } = {}) {
  const bin = process.env.AI_EVAL_CLAUDE || "claude";
  return new Promise((resolveRun) => {
    const child = spawn(bin, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => resolveRun({ status: 127, stdout, stderr: e.message }));
    child.on("close", (status) => {
      clearTimeout(timer);
      resolveRun({ status, stdout, stderr });
    });
  });
}

export async function runConversation({ caseDef, sandbox, model, claude = spawnClaude, simulate, maxTurns = 12 }) {
  const convo = { turns: [], tokens: add({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }), costUsd: 0, rate: null, unscripted: [], ended: null, sessionId: null };
  let user = caseDef.prompt;
  for (let n = 0; n < maxTurns; n += 1) {
    const r = await claude(claudeArgs({ prompt: user, model, resume: convo.sessionId }), { cwd: sandbox.dir, env: sandbox.env });
    const s = parseStream(r.stdout ?? "");
    if (r.status !== 0 && !s.text && !s.toolUses.length) {
      convo.ended = "error";
      convo.error = `claude exited ${r.status}: ${(r.stderr || r.stdout || "").slice(-500)}`;
      return convo;
    }
    convo.sessionId = s.sessionId ?? convo.sessionId;
    convo.turns.push({ n, user, assistant: s.text, toolUses: s.toolUses, tokens: s.tokens, costUsd: s.costUsd });
    convo.tokens = add(convo.tokens, s.tokens);
    convo.costUsd += s.costUsd;
    convo.rate = s.rate ?? convo.rate;
    if (s.error) {
      convo.ended = "error";
      convo.error = `claude reported ${s.subtype ?? "an error"}`;
      return convo;
    }
    if (n === maxTurns - 1) {
      convo.ended = "max-turns";
      return convo;
    }
    const sim = await simulate({ assistantText: s.text, caseDef, turn: n, user });
    convo.tokens = add(convo.tokens, sim.tokens);
    convo.rate = sim.rate ?? convo.rate;
    if (sim.done) {
      convo.ended = "done";
      return convo;
    }
    if (sim.unscripted) convo.unscripted.push({ turn: n + 1, question: s.text.slice(-400) });
    user = sim.reply;
  }
  return convo;
}
