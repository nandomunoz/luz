#!/usr/bin/env node
/**
 * luz-start: the one executable of the luz-start skill.
 *
 * It reads and reports; it never writes a file, never asks a question, never reaches the network and runs no
 * program. It finds its own data from its own path, so it works from any folder.
 *
 *   luz-start doctor [--dir <folder>] [--json]
 *   luz-start check [path...] [--target portable|claude] [--json]
 *
 * Exit codes: 0 nothing blocks, 1 a problem blocks, 2 the command was used wrongly.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIELDS = JSON.parse(readFileSync(join(HERE, "../assets/fields.json"), "utf-8"));
const FACTS = JSON.parse(readFileSync(join(HERE, "../assets/facts.json"), "utf-8"));
const LIMITS = FIELDS.limits;

// What a host hands the model must be plain text: no control character, zero-width character, bidi control or tag character
const RANGES = [[0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff], [0xe0000, 0xe007f]];
const HIDDEN = { test: (text) => [...text].some((ch) => RANGES.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b)) };
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LINES = 40;

const HELP = `luz-start: checks the skills and subagents of a project, and the project itself. It reads, it never writes.

Usage:
  luz-start <command> [options]

Commands:
  doctor   the project, the assistants it has and whether their skills and agents pass check
  check    the front matter and the body of skills (SKILL.md) and subagents (.md)

Options:
  --json        one JSON object on stdout
  --no-input    accepted and ignored: it never asks a question
  --help        this text, or the text of a command

Exit codes:
  0  nothing blocks
  1  a problem blocks
  2  the command was used wrongly

Example:
  luz-start doctor --json
`;

const HELP_DOCTOR = `luz-start doctor: the project, its assistants, and a check of what it finds.

Usage:
  luz-start doctor [--dir <folder>] [--json]

Reads package.json for the @luz-ds packages, looks for the assistants' folders (.claude, .agents, .codex,
.gemini, .cursor, AGENTS.md, CLAUDE.md), warns when AGENTS.md is over the 32 KiB that Codex reads, and runs
check on the skills and agents it finds. A warning never fails; exit 0 or 1.

Example:
  luz-start doctor --dir ./my-site
`;

const HELP_CHECK = `luz-start check: the front matter and the body of skills and subagents.

Usage:
  luz-start check [path...] [--target portable|claude] [--json]

A path is a skill folder (with SKILL.md), a folder of skills, a folder named agents, or one .md file. With no
path it reads .agents/skills, .claude/skills, .claude/agents and .gemini/agents of the current folder.
--target portable allows only the six fields of the open Agent Skills specification; the default is portable
for a skill outside .claude and Claude Code's fields for one inside it.

Rules, each reported as <rule>: frontmatter/missing, yaml/plain-scalar, yaml/flow, yaml/nested, yaml/block-scalar,
yaml/duplicate, yaml/syntax, field/unknown, name/missing, name/pattern, name/folder, name/file, name/reserved,
description/missing, description/long, compatibility/long, body/long, chars/hidden, reference/missing,
reference/outside, reference/chain.

Example:
  luz-start check .claude --json
`;

// ---- front matter: a strict subset of YAML --------------------------------------------------------------------

/** Splits a file in its front matter and its body; null when it does not start with --- on the first line. */
function split(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return null;
  const lines = text.split(/\r?\n/);
  const end = lines.findIndex((l, i) => i > 0 && l === "---");
  if (end === -1) return null;
  return { front: lines.slice(1, end), body: lines.slice(end + 1), bodyStart: end + 2 };
}

/** One scalar: double quoted (as JSON), single quoted, or plain (no `: ` or ` #`, no indicator at its start). */
function scalar(raw, line, problems) {
  const v = raw.trim();
  if (v.startsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      problems.push({ rule: "yaml/syntax", line, message: "a double-quoted value that is not valid: escape the quotes inside it with a backslash" });
      return "";
    }
  }
  if (v.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(v)) problems.push({ rule: "yaml/syntax", line, message: "a single-quoted value that is not closed (write a quote inside it twice)" });
    return v.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[>|]/.test(v)) problems.push({ rule: "yaml/block-scalar", line, message: "a block scalar (| or >) is outside the subset: write the value on one line, in quotes" });
  else if (/^[[{]/.test(v)) problems.push({ rule: "yaml/flow", line, message: "a flow value ([…] or {…}) is outside the subset: write a plain or quoted string" });
  else if (/^[&*!%@`]/.test(v)) problems.push({ rule: "yaml/plain-scalar", line, message: `a plain value cannot start with "${v[0]}": put it in quotes` });
  else if (/: | #/.test(v) || v.endsWith(":")) problems.push({ rule: "yaml/plain-scalar", line, message: "a plain value with ': ' or ' #' is rejected by a strict YAML parser: put it in quotes" });
  return v;
}

/** The fields of a front matter: { key: string | { key: string } }, with the line of each. */
function parseFront(front, problems) {
  const data = {};
  const lines = {};
  let map = null;
  front.forEach((text, i) => {
    const line = i + 2;
    if (!text.trim() || text.trim().startsWith("#")) return;
    const indented = /^\s+/.test(text);
    const m = text.trim().match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s+(.*))?$/);
    if (!m) {
      problems.push({ rule: "yaml/syntax", line, message: `not a "key: value" line: ${text.trim().slice(0, 60)}` });
      return;
    }
    const [, key, rest = ""] = m;
    if (indented) {
      if (!map) problems.push({ rule: "yaml/nested", line, message: "an indented line with no map above it" });
      else if (/^\s{3,}|^\t/.test(text) || rest === "") problems.push({ rule: "yaml/nested", line, message: "metadata is a map of one level: a key and a string" });
      else map[key] = scalar(rest, line, problems);
      return;
    }
    if (key in data) problems.push({ rule: "yaml/duplicate", line, message: `${key} is written twice` });
    lines[key] = line;
    if (rest.trim() === "") {
      map = {};
      data[key] = map;
    } else {
      map = null;
      data[key] = scalar(rest, line, problems);
    }
  });
  return { data, lines };
}

// ---- check ----------------------------------------------------------------------------------------------------

/** The relative paths a body names, as links and as `references/…`-style code spans. */
function referencesIn(lines) {
  const found = [];
  lines.forEach((text, i) => {
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) found.push([m[1], i]);
    for (const m of text.matchAll(/`((?:references|scripts|assets)\/[^`\s]+)`/g)) found.push([m[1], i]);
  });
  return found
    .map(([target, i]) => [target.replace(/#.*$/, ""), i])
    .filter(([target]) => target && !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("/"));
}

function checkFile(file, kind, target) {
  const problems = [];
  const add = (rule, message, line) => problems.push({ rule, message, ...(line ? { line } : {}) });
  const text = readFileSync(file, "utf-8");
  const lines = text.split(/\r?\n/);
  const hidden = lines.findIndex((l) => HIDDEN.test(l));
  if (hidden !== -1) add("chars/hidden", "a hidden, zero-width or bidi control character: text a reader does not see but a model reads", hidden + 1);

  const parts = split(text);
  if (!parts) {
    add("frontmatter/missing", "the file must start with --- on its first line and close the front matter with ---", 1);
    return problems;
  }
  const own = [];
  const { data, lines: at } = parseFront(parts.front, own);
  problems.push(...own);

  const allowed = kind === "skill" ? FIELDS.skill[target] : FIELDS.agent.claude;
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) add("field/unknown", `${key} is not a field of ${kind === "skill" ? `a ${target} skill` : "a Claude Code subagent"} (${allowed.join(", ")}); the assistant ignores it without a word`, at[key]);
  }

  const name = data.name;
  const stem = kind === "skill" ? basename(dirname(file)) : basename(file, ".md");
  if (typeof name !== "string" || !name) add("name/missing", "name is required", at.name);
  else {
    if (!NAME.test(name) || name.length > LIMITS.name) add("name/pattern", `name "${name}" must be 1 to ${LIMITS.name} characters: lowercase letters, digits and single hyphens`, at.name);
    if (name !== stem) add(kind === "skill" ? "name/folder" : "name/file", `name "${name}" must be the ${kind === "skill" ? "folder" : "file"} name "${stem}"`, at.name);
    if (kind === "skill" && /claude|anthropic/.test(name)) add("name/reserved", `name "${name}" contains claude or anthropic, which the platform reserves`, at.name);
  }

  const description = data.description;
  if (typeof description !== "string" || !description.trim()) add("description/missing", "description is required: it is what decides when the skill or agent is used", at.description);
  else if (kind === "skill" && description.length > LIMITS.description) add("description/long", `description is ${description.length} characters; the limit is ${LIMITS.description}`, at.description);
  if (kind === "skill" && typeof data.compatibility === "string" && data.compatibility.length > LIMITS.compatibility) add("compatibility/long", `compatibility is over ${LIMITS.compatibility} characters`, at.compatibility);

  if (kind === "skill") {
    // The body ends where the file does: a final newline is not a line
    const body = parts.body.at(-1) === "" ? parts.body.slice(0, -1) : parts.body;
    if (body.length > LIMITS.bodyLines) add("body/long", `the body is ${body.length} lines; the limit is ${LIMITS.bodyLines}: move detail to a file of references/`, parts.bodyStart);
    const base = dirname(file);
    for (const [ref, i] of referencesIn(body)) {
      const path = resolve(base, ref);
      const line = parts.bodyStart + i;
      if (path !== base && !path.startsWith(base + sep)) add("reference/outside", `${ref} is outside the skill folder`, line);
      else if (!existsSync(path)) add("reference/missing", `${ref} does not exist`, line);
      else if (statSync(path).isFile() && path.endsWith(".md")) {
        // One level deep: a reference does not send the model on to another reference
        const inner = referencesIn(readFileSync(path, "utf-8").split(/\r?\n/)).filter(([r]) => r.endsWith(".md") && existsSync(resolve(dirname(path), r)));
        if (inner.length) add("reference/chain", `${ref} points on to ${inner[0][0]}: every reference is named from SKILL.md, one level deep`, line);
      }
    }
  }
  return problems;
}

/** What a path means: [{ file, kind }]. */
function discover(path) {
  if (statSync(path).isFile()) return [{ file: path, kind: basename(path) === "SKILL.md" ? "skill" : "agent" }];
  if (existsSync(join(path, "SKILL.md"))) return [{ file: join(path, "SKILL.md"), kind: "skill" }];
  const found = [];
  const walk = (dir, depth) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git" && depth < 4) {
        if (existsSync(join(full, "SKILL.md"))) found.push({ file: join(full, "SKILL.md"), kind: "skill" });
        else walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith(".md") && basename(dir) === "agents") found.push({ file: full, kind: "agent" });
    }
  };
  walk(path, 0);
  return found;
}

const DEFAULT_PLACES = [".agents/skills", ".claude/skills", ".claude/agents", ".gemini/agents"];

/** `paths` are absolute; with none, the usual places under `base`. */
function runCheck(paths, base, forced) {
  const places = paths.length ? paths : DEFAULT_PLACES.map((p) => join(base, p)).filter(existsSync);
  const seen = new Set();
  const checked = [];
  const problems = [];
  for (const place of places) {
    for (const { file, kind } of discover(place)) {
      if (seen.has(file)) continue;
      seen.add(file);
      const target = forced ?? (file.split(sep).includes(".claude") ? "claude" : "portable");
      const shown = relative(base, file) || file;
      checked.push(shown);
      for (const p of checkFile(file, kind, target)) problems.push({ file: shown, ...p });
    }
  }
  return { checked, problems };
}

// ---- report ---------------------------------------------------------------------------------------------------

/** The summary first: a host shows only the start of a long output. */
function textReport(title, { checked = [], problems = [], warnings = [], notes = [] }) {
  const out = [`${title}: ${problems.length} problem${problems.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}, ${checked.length} file${checked.length === 1 ? "" : "s"} checked`];
  const rows = [
    ...problems.map((p) => `  error  ${p.file}${p.line ? `:${p.line}` : ""}  ${p.rule}: ${p.message}`),
    ...warnings.map((w) => `  warn   ${w}`),
  ];
  out.push(...rows.slice(0, MAX_LINES).map((r) => (r.length > 300 ? `${r.slice(0, 297)}...` : r)));
  if (rows.length > MAX_LINES) out.push(`  … and ${rows.length - MAX_LINES} more (use --json)`);
  out.push(...notes);
  return `${out.join("\n")}\n`;
}

// ---- doctor ---------------------------------------------------------------------------------------------------

function runDoctor(dir) {
  const warnings = [];
  const major = Number(process.versions.node.split(".")[0]);
  const node = { version: process.versions.node, ok: major >= 20 };
  const problems = [];
  if (!node.ok) problems.push({ file: "node", rule: "node/old", message: `Node ${node.version} is too old; LUZ tools need 20 or later` });

  let luz = {};
  const pkgFile = join(dir, "package.json");
  if (existsSync(pkgFile)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, "utf-8"));
      luz = Object.fromEntries(Object.entries({ ...pkg.devDependencies, ...pkg.dependencies }).filter(([n]) => n.startsWith("@luz-ds/")));
    } catch {
      warnings.push("package.json is not valid JSON: the @luz-ds packages were not read");
    }
  }
  const assistants = [".claude", ".agents", ".codex", ".gemini", ".cursor", "AGENTS.md", "CLAUDE.md"].filter((n) => existsSync(join(dir, n)));
  const agentsMd = join(dir, "AGENTS.md");
  if (existsSync(agentsMd)) {
    const size = statSync(agentsMd).size;
    if (size > LIMITS.agentsMdBytes) warnings.push(`AGENTS.md is ${size} bytes; Codex reads at most ${LIMITS.agentsMdBytes} by default, so the end of it may not be read`);
  }
  const { checked, problems: found } = runCheck([], dir);
  problems.push(...found);
  return { ok: problems.length === 0, node, luz, assistants, facts: FACTS.versions, warnings, checked, problems };
}

// ---- main -----------------------------------------------------------------------------------------------------

function usage(message) {
  process.stderr.write(`luz-start: ${message}\n\n${HELP}`);
  return 2;
}

function show(text) {
  process.stdout.write(text);
  return 0;
}

export function main(argv) {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h") return show(HELP);
  if (!command) return usage("a command is missing (doctor or check)");
  if (!["doctor", "check"].includes(command)) return usage(`"${command}" is not a command (doctor, check)`);
  let args;
  try {
    args = parseArgs({
      args: rest,
      allowPositionals: true,
      options: { json: { type: "boolean" }, "no-input": { type: "boolean" }, help: { type: "boolean", short: "h" }, dir: { type: "string" }, target: { type: "string" } },
    });
  } catch (error) {
    return usage(error.message);
  }
  const { values, positionals } = args;
  if (values.help) return show(command === "doctor" ? HELP_DOCTOR : HELP_CHECK);
  if (values.target && !["portable", "claude"].includes(values.target)) return usage(`--target is portable or claude, not "${values.target}"`);
  if (command === "doctor" && positionals.length) return usage("doctor takes no path: use --dir <folder>");

  const base = resolve(values.dir ?? ".");
  const paths = positionals.map((p) => resolve(p));
  try {
    const missing = [base, ...paths].find((p) => !existsSync(p));
    if (missing) return usage(`${missing} was not found`);
    const result = command === "doctor" ? runDoctor(base) : { ...runCheck(paths, base, values.target), warnings: [] };
    const report = { ok: result.problems.length === 0, ...result };
    process.stdout.write(values.json ? `${JSON.stringify(report, null, 2)}\n` : textReport(command, report));
    return report.ok ? 0 : 1;
  } catch (error) {
    return usage(error.message);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
