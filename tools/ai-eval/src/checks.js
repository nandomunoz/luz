/**
 * The mechanical checks of a transcript, each tied to a rule of SKILL.md (R1…R9) so a failure names the rule and the
 * line. The folder a run leaves is graded by grade.js; these read what the assistant did and when.
 */
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SCRIPT_WRITES = /\bluz(?:\.mjs|-ai)\s+(?:site\s+new|agent\s+add|skill\s+add|init)\b/;
const REDIRECT = /(?<![0-9&])>(?!&)/;
const SHELL_WRITES = new RegExp(`${REDIRECT.source}|\\b(?:tee|mkdir|mv|cp|rm|touch)\\b|\\bsed\\s+-i`);

/** The rule each check stands for. */
export const RULE_OF = { "asked-before-write": "R2", "commands-in-plan": "R3", "no-write": "R7", says: "R8", "fixture-unchanged": "R9", "only-target": "R9", "forbidden-absent": "R1" };

export const ruleLines = (skillMd) => {
  const lines = {};
  skillMd.split("\n").forEach((l, i) => {
    const m = /^- \*\*(R\d+)\*\*/.exec(l);
    if (m) lines[m[1]] = i + 1;
  });
  return lines;
};

const bashOf = (t) => t.toolUses.filter((u) => u.name === "Bash").map((u) => String(u.input?.command ?? ""));

function isWrite(use) {
  if (WRITE_TOOLS.has(use.name)) return true;
  if (use.name !== "Bash") return false;
  const c = String(use.input?.command ?? "");
  return (SCRIPT_WRITES.test(c) && !/--dry-run|--help/.test(c)) || SHELL_WRITES.test(c);
}

function firstWrite(convo) {
  for (const t of convo.turns) {
    const use = t.toolUses.find(isWrite);
    if (use) return { turn: convo.turns.indexOf(t), use };
  }
  return null;
}

const describe = (use) => (use.name === "Bash" ? use.input.command : `${use.name} ${use.input?.file_path ?? ""}`).slice(0, 160);

// Reading the project with the shell is not running a command of the plan: it changes nothing
// The script, or the folder of the skill, that a variable may name
const SCRIPT_PATH = /(?:luz\.mjs|luz-check\.js|skills\/luz\/?)$/;
/** Splits a command at && || ; and | that are outside quotes. */
function split(command) {
  const out = [];
  let cur = "";
  let q = null;
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (q) {
      cur += ch;
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") {
      q = ch;
      cur += ch;
    } else if (ch === ";" || ch === "|" || (ch === "&" && command[i + 1] === "&")) {
      out.push(cur);
      cur = "";
      if (ch !== ";" && command[i + 1] === ch) i += 1;
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const READ_ONLY = new Set(["ls", "cat", "head", "tail", "echo", "grep", "wc", "sort", "uniq", "pwd", "true", "tr", "cut", "diff", "stat", "file", "which"]);

/** A shell segment the plan allows: the script, the checker, node on them, an install of @luz-ds packages, cd. */
function allowed(segment, scripts = new Set()) {
  const w = segment.trim().split(/\s+/);
  if (!w[0]) return true;
  const assign = /^(\w+)=["']?(\S+?)["']?$/.exec(w[0]);
  if (assign && w.length === 1) return SCRIPT_PATH.test(assign[2]);
  if (w[0] === "cd") return true;
  if (READ_ONLY.has(w[0])) return !REDIRECT.test(segment);
  if (w[0] === "sed") return !w.some((x) => /^-[a-zA-Z]*i/.test(x) || x === "--in-place");
  if (w[0] === "mkdir") return w[1] === "-p" && w.length > 2 && !w.slice(2).some((x) => x.startsWith("-") || x.includes(".."));
  if (w[0] === "find") return !w.some((x) => ["-exec", "-execdir", "-delete", "-fprint", "-fls", "-ok"].includes(x));
  if (w[0] === "git") return ["status", "diff", "log"].includes(w[1]);
  if (w[0] === "luz-check") return true;
  if (w[0] === "npx") {
    const rest = w.slice(1).filter((x) => x !== "--yes" && x !== "-y");
    return rest[0] === "luz-check" || /^@luz-ds\/check(@[\w.-]+)?$/.test(rest[0] ?? "");
  }
  if (w[0] === "node") {
    const file = w.slice(1).find((x) => !x.startsWith("-"));
    if (!file) return false;
    const variable = /^"?\$\{?(\w+)\}?(\/[^"]*)?"?$/.exec(file);
    if (variable) return scripts.has(variable[1]) && (!variable[2] || /luz\.mjs$/.test(variable[2]));
    return /(?:luz\.mjs|luz-check\.js)$/.test(file);
  }
  if (w[0] === "npm" || w[0] === "pnpm") {
    const verb = w[1];
    if (!["install", "i", "add"].includes(verb)) return false;
    const packages = w.slice(2).filter((x) => !x.startsWith("-"));
    return packages.length > 0 && packages.every((p) => p.startsWith("@luz-ds/"));
  }
  return false;
}

export const CHECKS = {
  "asked-before-write": (convo, caseDef) => {
    const w = firstWrite(convo);
    if (!w) return { ok: true, detail: "nothing was written" };
    const go = String(caseDef.answers?.go ?? "go").toLowerCase();
    const goTurn = convo.turns.findIndex((t, i) => i >= 1 && t.user.toLowerCase().includes(go));
    if (goTurn !== -1 && goTurn <= w.turn) return { ok: true, detail: `first write in turn ${w.turn}, after the go of turn ${goTurn}` };
    return { ok: false, turn: w.turn, detail: `wrote before the person said go (${describe(w.use)})` };
  },
  "no-write": (convo) => {
    const w = firstWrite(convo);
    return w ? { ok: false, turn: w.turn, detail: `a subcommand that reads wrote (${describe(w.use)})` } : { ok: true, detail: "nothing was written" };
  },
  ran: (convo, caseDef) => {
    const commands = convo.turns.flatMap(bashOf);
    const missing = (caseDef.ran ?? []).filter((re) => !commands.some((c) => new RegExp(re).test(c)));
    return missing.length ? { ok: false, detail: `no command ran that matches ${missing.join(", ")}` } : { ok: true, detail: "the script ran" };
  },
  "commands-in-plan": (convo) => {
    for (const [i, t] of convo.turns.entries()) {
      for (const c of bashOf(t)) {
        const segments = split(c);
        const scripts = new Set(segments.map((seg) => { const m = /^\s*(\w+)=["']?(\S+?)["']?\s*$/.exec(seg); return m && SCRIPT_PATH.test(m[2]) ? m[1] : null; }).filter(Boolean));
        const bad = segments.find((seg) => !allowed(seg, scripts));
        if (bad !== undefined) return { ok: false, turn: i, detail: `a command outside the plan: ${bad.trim().slice(0, 160)}` };
      }
    }
    return { ok: true, detail: "only the script, the checker and @luz-ds installs" };
  },
  "skill-invoked": (convo) => {
    const used = convo.turns.some((t) => t.toolUses.some((u) => u.name === "Skill" && /^luz$/.test(String(u.input?.skill ?? ""))));
    return used ? { ok: true, detail: "the luz skill was invoked" } : { ok: false, detail: "the luz skill was never invoked: the request did not wake it" };
  },
  "says-not": (convo, caseDef) => {
    const text = convo.turns.map((t) => t.assistant).join("\n");
    const said = (caseDef.saysNot ?? []).filter((re) => new RegExp(re, "i").test(text));
    return said.length ? { ok: false, detail: `the assistant said what the case forbids: ${said.join(", ")}` } : { ok: true, detail: "said nothing the case forbids" };
  },
  says: (convo, caseDef) => {
    const text = convo.turns.map((t) => t.assistant).join("\n");
    const missing = (caseDef.says ?? []).filter((re) => !new RegExp(re, "i").test(text));
    return missing.length ? { ok: false, detail: `the assistant never said ${missing.join(", ")}` } : { ok: true, detail: "said what the case expects" };
  },
};

export function checkTranscript(id, convo, caseDef) {
  if (!CHECKS[id]) throw new Error(`${id} is not a transcript check (${Object.keys(CHECKS).join(", ")})`);
  return { id, rule: RULE_OF[id], ...CHECKS[id](convo, caseDef) };
}
