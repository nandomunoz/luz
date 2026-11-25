/**
 * LUZ docs site: the page of the commands of the luz skill (`ai/commands`, `generate: ai-commands`). Development
 * tooling, nothing here ships. Nothing on the page is typed: its marker `<!-- luz:commands -->` becomes
 *   - the table of the commands, read from the Subcommands table of `packages/ai/skills/luz/SKILL.md`;
 *   - one section for each of them (and for an unknown subcommand and a file that gives orders), with what it does and whether
 *     it writes (the words are the page's language's), what the script prints in a terminal (the script is run, when the site is
 *     built, on an empty folder), and a conversation frozen from a green run of `pnpm ai:eval`
 *     (`tools/ai-eval/cases/examples/<name>.json`).
 * A command with no frozen example fails the build with its name: a command that is not shown working is not documented.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escAttr, escText, tOf, tableOf } from "./ai.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SKILL = "packages/ai/skills/luz";
const MAX_LINES = 24;

/** The extra sections after the commands: what happens with a word that is not a subcommand and with a file that gives orders. */
export const EXTRA = ["unknown", "hostile"];

/** The terminal command each subcommand stands for, run in an empty folder, and the line a person types. */
const TERMINAL = {
  start: ["new", "--name", "Acme", "--kind", "landing", "--stack", "vanilla", "--target", "./acme", "--dry-run"],
  new: ["new", "--name", "Acme", "--kind", "blog", "--stack", "vanilla", "--target", "./acme", "--dry-run"],
  doctor: ["doctor", "--dir", "."],
  lint: ["lint", "."],
  facts: ["facts"],
  agents: ["agents"],
  add: ["add", "luz-agent-accessibility", "--for", "claude", "--dir", ".", "--dry-run"],
  help: ["--help"],
};

export const slugOf = (chat) => chat.replace(/^\/luz\s*/, "").split(/\s+/)[0] || "start";

/** The rows of the Subcommands table of SKILL.md: { slug, chat, what, script, writes }. */
export function commandRows(root = REPO) {
  const text = readFileSync(join(root, SKILL, "SKILL.md"), "utf-8");
  const rows = [...text.matchAll(/^\| `([^`]*)` \| ([^|]*) \| ([^|]*) \| ((?:yes|no)[^|]*)\|$/gm)].map((m) => ({ slug: slugOf(m[1]), chat: m[1], what: m[2].trim(), script: m[3].trim(), writes: m[4].trim().startsWith("yes") }));
  for (const r of rows) if (!/^[a-z-]+$/.test(r.slug)) throw new Error(`${SKILL}/SKILL.md: "${r.chat}" has a subcommand that is not letters and hyphens`);
  if (!rows.length) throw new Error(`${SKILL}/SKILL.md has no Subcommands table to write the commands page from`);
  return rows;
}

export function loadExample(slug, root = REPO) {
  const file = join(root, "tools/ai-eval/cases/examples", `${slug}.json`);
  if (!existsSync(file)) throw new Error(`the commands page has no frozen example for "${slug}": run pnpm ai:eval script --layer full --case <its case>, then pnpm ai:eval freeze <run> <case> --example ${slug} (${file})`);
  return JSON.parse(readFileSync(file, "utf-8"));
}

/** What the script prints for a subcommand, run in an empty folder; the folder is never in the text. */
export function terminalOutput(slug, root = REPO) {
  const args = TERMINAL[slug];
  if (!args) return null;
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), "luz-commands-")));
  try {
    const r = spawnSync(process.execPath, [join(root, SKILL, "scripts/luz.mjs"), ...args], { cwd, encoding: "utf-8", timeout: 20000 });
    if (r.status !== 0 && r.status !== 1) throw new Error(`luz.mjs ${args.join(" ")} exited ${r.status}: ${r.stderr}`);
    const lines = (r.stdout || r.stderr).split(cwd).join(".").replace(/\n+$/, "").split("\n");
    return { command: `luz-ai ${args.join(" ")}`, text: (lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES), "…"] : lines).join("\n") };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const pre = (label, text, lang = "text") => `<pre class="luz-code-block" data-lang="${lang}" tabindex="0" role="region" aria-label="${escAttr(label)}"><code>${escText(text)}</code></pre>`;

function conversation(example, t) {
  const text = example.turns.map((turn) => `${t("ai.cmd.person")}: ${turn.user}\n\n${t("ai.cmd.assistant")}: ${turn.assistant}`).join("\n\n---\n\n");
  const meta = t("ai.cmd.example-meta", { model: example.model, date: example.date, version: example.skillVersion });
  return [
    "<div data-docs-specimen>",
    `<details><summary>${escText(t("ai.cmd.conversation", { n: example.turns.length }))}</summary>`,
    `<p>${escText(meta)}</p>`,
    pre(t("ai.cmd.conversation", { n: example.turns.length }), text),
    "</details>",
    "</div>",
  ].join("\n");
}

function section(row, t, root) {
  const { slug } = row;
  const title = row.chat ? `<code>${escText(row.chat)}</code>` : escText(t(`ai.cmd.title.${slug}`));
  const terminal = terminalOutput(slug, root);
  return [
    `<section class="docs-block" aria-labelledby="cmd-${slug}">`,
    `  <h2 class="docs-chapter__title" id="cmd-${slug}">${title}</h2>`,
    `  <p class="docs-lead">${escText(t(`ai.cmd.what.${slug}`))}</p>`,
    ...(row.chat ? [`  <p>${escText(t("ai.cmd.writes-label"))}: <strong>${escText(t(row.writes ? "ai.cmd.writes-go" : "ai.cmd.writes-no"))}</strong>.</p>`] : []),
    ...(terminal ? [`  <h3 class="docs-subhead" id="cmd-${slug}-terminal">${escText(t("ai.cmd.terminal"))}</h3>`, `  <p><code>${escText(terminal.command)}</code></p>`, `  <div data-docs-specimen>${pre(terminal.command, terminal.text)}</div>`] : []),
    `  <h3 class="docs-subhead" id="cmd-${slug}-chat">${escText(t("ai.cmd.chat"))}</h3>`,
    `  ${conversation(loadExample(slug, root), t).replace(/\n/g, "\n  ")}`,
    "</section>",
  ].join("\n");
}

/** `<!-- luz:commands -->` on a line of its own: the table, then the sections. */
export function fillCommandMarkers(html, site, { file = "<page>", root = REPO } = {}) {
  const marker = /^([ \t]*)<!-- luz:commands -->[ \t]*$/gm;
  const found = html.match(marker);
  if (!found || found.length !== 1) throw new Error(`${file}: generate is "ai-commands" and the page needs one <!-- luz:commands --> line on its own`);
  const t = tOf(site);
  return html.replace(marker, (_, indent) => {
    const rows = commandRows(root);
    const table = tableOf(
      t("ai.cmd.table-label"),
      [t("ai.cmd.col-chat"), t("ai.cmd.col-what"), t("ai.cmd.col-script"), t("ai.cmd.col-writes")].map(escText),
      rows.map((r) => [`<a href="#cmd-${r.slug}"><code>${escText(r.chat)}</code></a>`, escText(t(`ai.cmd.what.${r.slug}`)), `<code>${escText(r.script)}</code>`, escText(t(r.writes ? "ai.cmd.writes-go" : "ai.cmd.writes-no"))]),
    );
    const sections = [...rows, ...EXTRA.map((slug) => ({ slug, chat: "", what: "", script: "", writes: false }))].map((r) => section(r, t, root));
    return [table, ...sections].join("\n").replace(/^/gm, indent).replace(/^[ \t]+$/gm, "");
  });
}
