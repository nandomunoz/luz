/**
 * LUZ — the terminal of the luz skill ({{cli}}: the home's fourth level and the hero of /ai/).
 *
 * An emulation of a real session with the skill, in which the visitor answers: install it (`init`), open the
 * assistant, ask for a site, answer the skill's questions (the kind of site, the stack, what matters, which picks
 * the agents), see the plan, say go, and watch it write the starter page, check it and add the agents. What the
 * script prints is the script's own: every output line is read from `luz.mjs --dry-run` when the site is built
 * ("would write" said as "wrote", since the session writes), for every kind of site, stack and agent, never typed.
 *
 * The markup holds every variant of the session. An element with `data-when` belongs to some answers only:
 * `kind=landing`, `stack=astro`, `agent=<name>` (the agent is chosen), several conditions all needed. Without
 * JavaScript the session of the default answers shows, whole and still: the other variants and the buttons of the
 * questions are `hidden`. apps/landing/cli.js plays it line by line and lets the visitor answer.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT = "packages/ai/skills/luz/scripts/luz.mjs";

/** The kinds of site of the first question, the recommended first. */
export const CLI_KINDS = ["landing", "blog", "app", "docs"];
/** The stacks of the second: the two the script writes a page for, and React, which moves the markup of the plain page. */
export const CLI_STACKS = ["vanilla", "astro", "react"];
/** The third question: what matters, each answer the agent of luz-ai that looks after it. */
export const CLI_AGENTS = [
  ["seo", "luz-seo-geo-specialist"],
  ["a11y", "luz-accessibility-auditor"],
  ["speed", "luz-core-web-vitals-optimizer"],
  ["ai", "luz-ai-auditor"],
];
/**
 * The assistants the home's terminal installs the skill for, one round each (owner, 2026-11-25): the --target, the
 * command that opens the assistant, and how the skill is called in it (`luz-ai init --help` says the same).
 */
export const CLI_TARGETS = [
  ["claude", "claude", "/luz"],
  ["codex", "codex", "$luz"],
  ["gemini", "gemini", "/luz"],
  ["cursor", "cursor-agent", "/luz"],
];
/** The answers a session starts with, and the one the page shows without JavaScript. */
export const CLI_DEFAULTS = { kind: "landing", stack: "vanilla", agents: ["luz-seo-geo-specialist", "luz-accessibility-auditor"], target: "claude" };
/** A skill of luz-ai the session adds, for the kinds of site it is made for. */
const CLI_SKILLS = { landing: "luz-landing" };
/** The name of the site in the commands: a name, the same in every language. */
const SITE_NAME = "Vejer Books";

/** The stack the script writes the page for: React gets the plain page, whose markup it moves. */
const written = (stack) => (stack === "react" ? "vanilla" : stack);

const facts = new Map();

/**
 * What the script prints for each step of the session, from its dry runs, all in one Node (memoised by the real path
 * of the script, so a test's copy of the repository, which links packages/, runs them once too).
 * @returns {{ banner: string[], init: string[], inits: Record<string, string[]>, site: Record<string, { lines: string[], next: string, links: number, todo: number }>, agents: Record<string, string[]>, skills: Record<string, string> }}
 */
export function cliFacts(root) {
  const script = realpathSync(resolve(root, SCRIPT));
  if (facts.has(script)) return facts.get(script);
  const runs = [
    ["init", "--target", "claude"],
    ...CLI_KINDS.flatMap((kind) => ["vanilla", "astro"].map((stack) => ["site", "new", "--name", SITE_NAME, "--kind", kind, "--stack", stack, "--target", "."])),
    ...CLI_AGENTS.map(([, name]) => ["agent", "add", name, "--for", "claude"]),
    ...Object.values(CLI_SKILLS).map((name) => ["skill", "add", name]),
    // The other assistants' installs, last, so the runs above keep their places
    ...CLI_TARGETS.slice(1).map(([target]) => ["init", "--target", target]),
  ].map((args) => [...args, "--dry-run"]);
  // One Node for every dry run (each one would cost a start of its own): the script's main(), its stdout caught
  const child = `const { main } = await import(${JSON.stringify(pathToFileURL(script).href)});
const out = [];
const write = process.stdout.write.bind(process.stdout);
for (const args of ${JSON.stringify(runs)}) {
  const chunks = [];
  process.stdout.write = (chunk) => chunks.push(String(chunk)) > 0;
  try { main(args, { tty: false }); } finally { process.stdout.write = write; }
  out.push(chunks.join(""));
}
write(JSON.stringify(out));`;
  const texts = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", child], { cwd: root, encoding: "utf-8" }));
  const said = (line) => line.replace(/\bwould write\b/, "wrote");
  let at = 0;
  const init = texts[at++].split("\n");
  const site = {};
  for (const kind of CLI_KINDS) {
    for (const stack of ["vanilla", "astro"]) {
      const text = texts[at++];
      const lines = text.split("\n");
      const file = lines.find((l) => l.startsWith("--- ")).slice(4);
      site[`${kind}/${stack}`] = {
        lines: [said(lines[0]), `  ${file}`],
        next: lines.find((l) => l.startsWith("next: ")).slice(6),
        links: (text.match(/\/dist\/components\/[a-z0-9-]+\.min\.css/g) ?? []).filter((href, i, all) => all.indexOf(href) === i).length,
        todo: Number(/; (\d+) "…" to fill in/.exec(lines[0])[1]),
        file,
      };
    }
  }
  const agents = {};
  for (const [, name] of CLI_AGENTS) {
    const lines = texts[at++].split("\n");
    agents[name] = [said(lines[0]), lines[1]];
  }
  const skills = {};
  for (const name of Object.values(CLI_SKILLS)) skills[name] = said(texts[at++].split("\n")[0]);
  // What init prints for each assistant: its first line and its "next:", as for Claude Code
  const firstAndNext = (lines) => [said(lines[0]), lines.find((l) => l.startsWith("next: "))];
  const inits = { claude: firstAndNext(init) };
  for (const [target] of CLI_TARGETS.slice(1)) inits[target] = firstAndNext(texts[at++].split("\n"));
  // The title the script prints in a terminal (not to a pipe, so not in the dry runs above): read from its source
  const banner = /^const BANNER = (\[[\s\S]*?\]);$/m.exec(readFileSync(script, "utf-8"));
  if (!banner) throw new Error(`${SCRIPT}: no "const BANNER = [ … ];" to show the title of init`);
  const value = { banner: JSON.parse(banner[1]), init: inits.claude, inits, site, agents, skills };
  facts.set(script, value);
  return value;
}

/** Whether the default answers match a `data-when`, as cli.js reads it. */
export function matchesDefaults(when) {
  return when.split(/\s+/).filter(Boolean).every((cond) => {
    const [key, value] = cond.split("=");
    if (key === "agent") return CLI_DEFAULTS.agents.includes(value);
    return CLI_DEFAULTS[key] === value;
  });
}

/** {{cli}}: the terminal the visitor answers (the page of the skill); {{cliloop}}: the same session as an animation that plays again and again; {{cliinstall}}: the home's, a person installing the skill. In the language of `say`. */
export function cliDemo({ say, root, escapeHtml }) {
  const t = (key) => escapeHtml(say(key));
  const { banner, init, inits, site, agents, skills } = cliFacts(root);
  const esc = escapeHtml;
  const when = (cond) => (cond ? ` data-when="${cond}"${matchesDefaults(cond) ? "" : " hidden"}` : "");
  const span = (cond, inner) => `<span${when(cond)}>${inner}</span>`;
  const line = (kind, inner, cond = "") => `<p class="landing-cli__line${kind ? ` landing-cli__line--${kind}` : ""}"${when(cond)}>${inner}</p>`;
  const mark = (sign) => `<span class="landing-cli__mark" aria-hidden="true">${sign}</span> `;
  const cmd = (inner, cond = "") => line("cmd", `${mark("$")}<code>${inner}</code>`, cond);
  const out = (text, cond = "") => line("out", `<samp>${esc(text)}</samp>`, cond);
  const skill = (inner, cond = "") => line("", `${mark("●")}<bdi>${inner}</bdi>`, cond);
  const you = (inner, cond = "") => line("you", `${mark("›")}<bdi class="landing-cli__you">${inner}</bdi>`, cond);
  const item = (inner, cond = "") => line("item", inner, cond);
  const per = (list, make) => list.map(make).join("");

  const kindName = (kind) => t(`level.catalog.kind.${kind}`);
  const stackName = (stack) => (stack === "vanilla" ? t("inside.cli.stack.vanilla") : stack === "astro" ? "Astro" : "React");
  const rec = ` <span class="landing-cli__rec">${t("inside.cli.recommended")}</span>`;
  const choice = (ask, value, label, pressed) => `<button class="landing-cli__choice" type="button" data-value="${value}" aria-pressed="${pressed}">${label}</button>`;
  const choices = (ask, label, buttons, multi = false) =>
    `<div class="landing-cli__choices" role="group" aria-label="${label}" data-ask="${ask}"${multi ? " data-multi" : ""} hidden>${buttons}${multi ? `<button class="landing-cli__choice landing-cli__choice--done" type="button" data-done>${t("inside.cli.continue")}</button>` : ""}</div>`;
  const agentWord = (key) => t(`inside.cli.${key}`);

  const lines = [
    // Install the skill, then open the assistant and ask
    cmd("npx @luz-ds/ai init --target claude"),
    // The title init prints in a terminal: the mark and the word in ASCII, read out as the word
    // (a <pre>, whose spaces the page's compaction keeps)
    `<div class="landing-cli__line landing-cli__line--banner"><pre class="landing-cli__art" aria-hidden="true">${esc(banner.join("\n"))}</pre><span class="u-sr-only">LUZ</span></div>`,
    ...init.map((l) => out(l)),
    cmd("claude"),
    you(t("inside.cli.ask")),
    skill(t("inside.cli.read")),
    // First question: the kind of site
    skill(t("inside.cli.kind")),
    choices("kind", t("inside.cli.kind"), CLI_KINDS.map((k, i) => choice("kind", k, `${kindName(k)}${i ? "" : rec}`, k === CLI_DEFAULTS.kind)).join("")),
    per(CLI_KINDS, (k) => you(kindName(k), `kind=${k}`)),
    // Second: the stack
    skill(t("inside.cli.stack")),
    choices("stack", t("inside.cli.stack"), CLI_STACKS.map((s, i) => choice("stack", s, `${stackName(s)}${i ? "" : rec}`, s === CLI_DEFAULTS.stack)).join("")),
    per(CLI_STACKS, (s) => you(stackName(s), `stack=${s}`)),
    // Third: what matters, which picks the agents
    skill(t("inside.cli.agents")),
    choices("agent", t("inside.cli.agents"), CLI_AGENTS.map(([key, name]) => choice("agent", name, agentWord(key), CLI_DEFAULTS.agents.includes(name))).join(""), true),
    you(`${CLI_AGENTS.map(([key, name]) => span(`agent=${name}`, `<span class="landing-cli__pick">${agentWord(key)}</span>`)).join("")}<span data-when-none="agent"${CLI_DEFAULTS.agents.length ? " hidden" : ""}>${t("inside.cli.none")}</span>`),
    // The plan, and nothing written before go
    skill(t("inside.cli.plan")),
    item(`<code>${per(CLI_STACKS, (s) => span(`stack=${s}`, esc(site[`landing/${written(s)}`].file)))}</code> <bdi class="landing-cli__why">${t("inside.cli.plan.page")} ${per(CLI_KINDS, (k) => span(`kind=${k}`, kindName(k)))}</bdi>`),
    item(`<bdi class="landing-cli__why">${t("inside.cli.plan.react")}</bdi>`, "stack=react"),
    per(Object.entries(CLI_SKILLS), ([k, name]) => item(`<code>.claude/skills/${name}/</code> <bdi class="landing-cli__why">${t("inside.cli.plan.skill")}</bdi>`, `kind=${k}`)),
    per(CLI_AGENTS, ([, name]) => item(`<code>.claude/agents/${name}.md</code> <bdi class="landing-cli__why">${t("inside.cli.plan.agent")}</bdi>`, `agent=${name}`)),
    item(`<code>npx @luz-ds/check</code> <bdi class="landing-cli__why">${t("inside.cli.plan.check")}</bdi>`),
    skill(t("inside.cli.go")),
    choices("go", t("inside.cli.go"), choice("go", "go", t("inside.cli.go.button"), true)),
    you(t("inside.cli.go.button")),
    // It writes the page and checks it
    per(CLI_KINDS, (k) => per(CLI_STACKS, (s) => cmd(`luz-ai site new --name "${SITE_NAME}" --kind ${k} --stack ${written(s)}`, `kind=${k} stack=${s}`))),
    per(CLI_KINDS, (k) => per(CLI_STACKS, (s) => site[`${k}/${written(s)}`].lines.map((l) => out(l, `kind=${k} stack=${s}`)).join(""))),
    per(CLI_KINDS, (k) => per(["vanilla", "astro"], (s) => cmd(esc(site[`${k}/${s}`].next), `kind=${k} stack=${s}`))),
    cmd(esc(site["landing/vanilla"].next), "stack=react"),
    out(`✓ 0 blocking and 0 warnings in 1 file`),
    // It adds the skill and the agents
    per(Object.entries(CLI_SKILLS), ([k, name]) => cmd(`luz-ai skill add ${name}`, `kind=${k}`) + out(skills[name], `kind=${k}`)),
    per(CLI_AGENTS, ([, name]) => cmd(`luz-ai agent add ${name} --for claude`, `agent=${name}`) + agents[name].map((l) => out(l, `agent=${name}`)).join("")),
    skill(t("inside.cli.adapt")),
    // Done
    line(
      "end",
      `<span class="landing-cli__done"><bdi>${t("inside.cli.done")}</bdi></span> ${per(CLI_KINDS, (k) =>
        per(CLI_STACKS, (s) => {
          const f = site[`${k}/${written(s)}`];
          return span(`kind=${k} stack=${s}`, `<code>${esc(f.file)}</code> <bdi>${esc(say("inside.cli.build").replace("{links}", String(f.links)).replace("{todo}", String(f.todo)))}</bdi>`);
        }),
      )}<span class="landing-cli__caret" aria-hidden="true"></span>`,
    ),
  ];
  const figure = (loop) =>
    [
      `<figure class="landing-cli" dir="ltr" aria-label="${t("inside.l4.panel")}" ${loop ? 'data-landing-cli="loop"' : "data-landing-cli"}>`,
      `<div class="landing-cli__bar" aria-hidden="true"><span class="landing-cli__dots"><span></span><span></span><span></span></span><code class="landing-cli__title">~/vejer-books</code></div>`,
      `<div class="landing-cli__screen" aria-live="polite">`,
      lines.join("\n"),
      `</div>`,
      loop
        ? // The home's terminal plays the session again and again: a button pauses it (WCAG 2.2.2), nothing is answered
          `<button class="luz-btn luz-btn--ghost luz-btn--sm landing-cli__pause" type="button" hidden><span data-cli-pause>${t("inside.l4.pause")}</span><span data-cli-play hidden>${t("inside.l4.play")}</span></button>`
        : `<button class="luz-btn luz-btn--ghost luz-btn--sm landing-cli__next" type="button" hidden><kbd>Enter</kbd> <span data-cli-next>${t("inside.l4.next")}</span><span data-cli-replay hidden>${t("inside.l4.replay")}</span></button>`,
      `</figure>`,
    ].join("\n");
  // {{cliinstall}}: the home's terminal (owner, 2026-11-25), a person installing the skill, once for each assistant
  // of CLI_TARGETS: the command they type, what init prints for it (its own lines), then the assistant and the
  // request, with the skill called as that assistant calls it. Each assistant's lines carry `data-when="target=…"`;
  // Claude Code's are the ones shown without JavaScript. cli.js plays it as the loop (data-landing-cli="loop"), one
  // round per assistant (data-rounds), a line at a time, the commands typed out, with a button to pause it (WCAG
  // 2.2.2); with reduced motion it stands whole. The command has its copy button, in the title bar, outside the
  // screen the loop takes from a reader; the caption says where the skill is tested
  const per2 = (make) => CLI_TARGETS.map(make).join("\n");
  const request = (trigger) => escapeHtml(say("level.ai.steps.2.ask").replace("/luz", trigger));
  const install = [
    `<figure class="landing-cli landing-cli--install" dir="ltr" aria-label="${t("inside.l4.install.title")}" data-landing-cli="loop" data-rounds="${CLI_TARGETS.map(([target]) => `target=${target}`).join(" ")}">`,
    `<div class="landing-cli__bar"><span class="landing-cli__dots" aria-hidden="true"><span></span><span></span><span></span></span><code class="landing-cli__title">~/vejer-books</code><button class="luz-copy-btn" type="button" data-copy-from="home-ai-init" aria-label="${t("level.ai.copy.init")}" hidden>${t("see.copy")}</button></div>`,
    `<div class="landing-cli__screen" aria-live="polite">`,
    [
      per2(([target]) => line("cmd", `${mark("$")}<code${target === "claude" ? ' id="home-ai-init"' : ""}>npx @luz-ds/ai init --target ${target}</code>`, `target=${target}`)),
      `<div class="landing-cli__line landing-cli__line--banner"><pre class="landing-cli__art" aria-hidden="true">${esc(banner.join("\n"))}</pre><span class="u-sr-only">LUZ</span></div>`,
      per2(([target]) => inits[target].map((l) => out(l, `target=${target}`)).join("\n")),
      per2(([target, open]) => cmd(esc(open), `target=${target}`)),
      per2(([target, , trigger]) => line("you", `${mark("›")}<bdi class="landing-cli__you">${request(trigger)}</bdi>${target === "claude" ? '<span class="landing-cli__caret" aria-hidden="true"></span>' : ""}`, `target=${target}`)),
    ].join("\n"),
    `</div>`,
    `<button class="luz-btn luz-btn--ghost luz-btn--sm landing-cli__pause" type="button" hidden><span data-cli-pause>${t("inside.l4.pause")}</span><span data-cli-play hidden>${t("inside.l4.play")}</span></button>`,
    `<figcaption class="landing-cli__caption">${t("inside.l4.install.tested")}</figcaption>`,
    `</figure>`,
  ].join("\n");
  return { cli: figure(false), cliloop: figure(true), cliinstall: install };
}
