/**
 * Reads the output of `claude -p --output-format stream-json --verbose`: the text the assistant said, the tools it
 * used, the session to resume, the cost, the tokens and the two usage windows of the subscription (`rate_limit_event`).
 */
export function parseStream(text) {
  const out = { sessionId: null, text: "", toolUses: [], costUsd: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, rate: null, error: false, subtype: null };
  const said = [];
  for (const raw of String(text).split("\n")) {
    let o;
    try {
      o = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!o || typeof o !== "object") continue;
    if (o.type === "system" && o.session_id) out.sessionId = o.session_id;
    else if (o.type === "assistant") {
      for (const block of o.message?.content ?? []) {
        if (block.type === "text" && block.text) said.push(block.text);
        else if (block.type === "tool_use") out.toolUses.push({ name: block.name, input: block.input ?? {} });
      }
    } else if (o.type === "rate_limit_event") {
      const info = o.rate_limit_info ?? {};
      const w = info.unifiedWindows ?? {};
      out.rate = { fiveHour: w.five_hour?.utilization ?? null, sevenDay: w.seven_day?.utilization ?? null, status: info.status ?? null };
    } else if (o.type === "result") {
      if (o.session_id) out.sessionId = o.session_id;
      out.costUsd = o.total_cost_usd ?? 0;
      out.error = Boolean(o.is_error);
      out.subtype = o.subtype ?? null;
      const u = o.usage ?? {};
      out.tokens = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, total: 0 };
      out.tokens.total = out.tokens.input + out.tokens.output + out.tokens.cacheRead + out.tokens.cacheWrite;
    }
  }
  out.text = said.join("\n\n");
  return out;
}
