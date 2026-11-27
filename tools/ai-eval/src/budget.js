/**
 * The cap of a round: it stops at the first of the clock (60 minutes), +10 points of the weekly window over where the
 * round began (or the next run, by the average, would pass it), a five-hour window that is not allowed, and --max-tokens.
 * It is looked at between runs: a run in progress is never killed. Without a reading of the windows (another host, an API
 * key) only the clock and the tokens count, and the summary says so.
 */
export function createRound({ maxMs = 3600000, maxPoints = 0.1, maxTokens = 0, now = Date.now } = {}) {
  const started = now();
  let firstSeven = null;
  let lastSeven = null;
  let readings = 0;
  let limited = false;
  let tokens = 0;
  let runs = 0;
  let noRate = false;

  const points = () => (firstSeven === null ? 0 : lastSeven - firstSeven);

  return {
    record({ rate, tokens: t = 0 }) {
      runs += 1;
      tokens += t;
      if (!rate) {
        noRate = true;
        return;
      }
      if (rate.status && rate.status !== "allowed") limited = true;
      if (typeof rate.sevenDay === "number") {
        if (firstSeven === null) firstSeven = rate.sevenDay;
        lastSeven = rate.sevenDay;
        readings += 1;
      }
    },
    check() {
      if (now() - started >= maxMs) return { stop: true, reason: "time" };
      if (limited) return { stop: true, reason: "limit" };
      if (maxTokens && tokens >= maxTokens) return { stop: true, reason: "tokens" };
      if (firstSeven !== null) {
        if (points() >= maxPoints) return { stop: true, reason: "weekly" };
        if (readings >= 3 && points() + points() / (readings - 1) > maxPoints) return { stop: true, reason: "weekly-predicted" };
      }
      return null;
    },
    summary() {
      return { ms: now() - started, points: points(), startSeven: firstSeven, lastSeven, noRate: noRate && firstSeven === null, tokens, runs };
    },
    question({ n, done, total }) {
      const s = this.summary();
      const minutes = Math.round(s.ms / 60000);
      const weekly = s.startSeven === null ? `${s.tokens} tokens` : `+${(s.points * 100).toFixed(1)} % semanal (${s.startSeven}→${s.lastSeven})`;
      return `Ronda ${n}: ${minutes} min, ${weekly}, ${done}/${total} casos. ¿Otra ronda? [n/s]`;
    },
  };
}
