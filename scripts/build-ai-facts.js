/**
 * LUZ — the facts and the starters of the `luz` skill (`.claude/plans/luz-ai-skill.md`, B.3).
 *
 * What the skill knows about this release is read from the repository and never typed. Under
 * `packages/ai/skills/luz/`:
 *
 *   assets/facts.json              the versions of the packages, the kinds of site and the stacks the skill offers
 *   assets/templates/<kind>.html.tpl a starter page per kind of site: the head (the stylesheets and scripts of the kind,
 *                                  in the order of the cascade) and the skeleton of its preset, with {{lang}} and
 *                                  {{title}} for the script to fill
 *   references/kinds/<kind>.md     what to ask for that kind of site: its preset (packages/ai/src/kinds), without its skeleton
 *   references/stacks.md           where each stack loads LUZ and which extensions the check reads
 *   assets/agents/luz-agent-accessibility.md   the reviewer of @luz-ds/check, built from its source (scripts/build-check.js)
 *   references/agents.md           the agents of luz-ai that the skill can add, from their own front matter
 *
 * A starter is a text for the person's own site, not a page of this repository, so it is `.html.tpl`: nothing here loads it,
 * and the CDN addresses in it are the packages' own (RL-12 reads the `.html` pages of packages/ and apps/).
 *
 * `tests/ai-start.test.js` fails when a file is not what this builds.
 *
 * Usage: node scripts/build-ai-facts.js (from the repo root) writes the files.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAgent } from "./build-check.js";
import { PUBLISHED } from "./luz-packages.js";
import { CASCADE, FITS_KINDS, fileKinds, isKindFile, kindPatterns } from "./docs-site/kinds.js";
import { FILES, catalogComponents, catalogFilesIn, minified } from "./docs-site/snippets.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = "packages/ai/skills/luz";
export { BY_NEED };
export const FACTS_FILE = `${SKILL}/assets/facts.json`;

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), "utf-8"));

export function buildAiFacts({ root = repo } = {}) {
  const versions = Object.fromEntries(PUBLISHED.map((pkg) => [pkg, readJson(root, `packages/${pkg}/package.json`).version]));
  const stacks = readJson(root, "packages/ai/src/stacks.json").stacks.map(({ id, name, ext, page }) => ({ id, name, ext, page }));
  return { versions, kinds: [...FITS_KINDS], stacks };
}

const CDN = "https://cdn.jsdelivr.net/npm";
const BASE = ["tokens", "core", "catalog"];
const versionOf = (root, pkg) => readJson(root, `packages/${pkg}/package.json`).version;

/** The text of the preset of a kind, with the one placeholder it has resolved, from its own file. */
function kindSection(kind, root) {
  const catalogFile = readJson(root, "packages/catalog/dist/classes.json").classes.find((c) => c.name === "luz-nav-toggle")?.files?.[0];
  if (!catalogFile) throw new Error("build-ai-facts: no classes.json lists a file for luz-nav-toggle, which the presets name");
  const text = readFileSync(join(root, "packages/ai/src/kinds", `${kind}.md`), "utf-8").trim().replace(/\{\{nav-toggle-css\}\}/g, catalogFile);
  const left = text.search(/\{\{|\}\}/);
  if (left !== -1) throw new Error(`build-ai-facts: a placeholder is left in packages/ai/src/kinds/${kind}.md, line ${text.slice(0, left).split("\n").length}`);
  const end = text.indexOf("\n## ", 1);
  return (end === -1 ? text : text.slice(0, end)).trimEnd();
}

const FENCE = /```html\n([\s\S]*?)\n```/;

/**
 * The tags of a starter page's head: tokens, core and the catalog files of the kind (what its preset names, the base of
 * every starter and the patterns that fit the kind), in the order of the cascade, then the scripts of the packages.
 */
function headLinks(kind, root) {
  const at = (pkg) => `@luz-ds/${pkg}@${versionOf(root, pkg)}`;
  const components = catalogComponents({ root });
  const kinds = fileKinds(root);
  const { base } = readJson(root, "packages/ai/src/starter.json");
  const preset = readFileSync(join(root, "packages/ai/src/kinds", `${kind}.md`), "utf-8");
  const own = kindPatterns(kind, root, components).files;
  const place = (file) => CASCADE.indexOf(file.replace(/^components\/|\.css$/g, ""));
  const catalogFiles = [...new Set([...[...base, ...catalogFilesIn(preset, components).filter((file) => !isKindFile(file, kinds))].sort(), ...own])].sort((a, b) => place(a) - place(b));
  const stylesheets = (pkg) => (pkg === "catalog" ? catalogFiles.map(minified) : [FILES[pkg].css]);
  return [
    ...BASE.flatMap((pkg) => stylesheets(pkg).map((file) => `<link rel="stylesheet" href="${CDN}/${at(pkg)}/dist/${file}">`)),
    ...BASE.filter((pkg) => FILES[pkg].js).map((pkg) => `<script type="module" src="${CDN}/${at(pkg)}/dist/${FILES[pkg].js}"></script>`),
  ];
}

/** One starter page per kind. */
function template(kind, root) {
  const links = headLinks(kind, root);
  const body = kindSection(kind, root).match(FENCE)?.[1];
  if (!links.length || !body) throw new Error("build-ai-facts: a preset has no links or no skeleton to start a page from");
  return [
    "<!doctype html>",
    '<html lang="{{lang}}">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>{{title}}</title>",
    // The layer statement comes before the first stylesheet of LUZ (luz-check load/layer-statement)
    "<style>@layer luz, site;</style>",
    ...links,
    "</head>",
    body,
    "</html>",
    "",
  ].join("\n");
}

/** What to ask for a kind of site: its preset, the skeleton replaced by the file that holds it. */
function kindReference(kind, root) {
  const section = kindSection(kind, root).replace(FENCE, `The skeleton of the page is \`assets/templates/${kind}.html.tpl\`: \`site new --kind ${kind}\` writes it, and you fill it in.`);
  return `${section}\n`;
}

function stacksReference(root) {
  const rows = readJson(root, "packages/ai/src/stacks.json").stacks.map((s) => {
    // A stack's text points at the tags of a page; here they are the starter page's
    const load = s.load.replace("the tags above, in every page", "the `<link>` and `<script>` tags of the starter page, in every page");
    return `- ${s.name} (\`${s.id}\`): ${load}.${s.ext ? ` Check it with \`--ext ${s.ext}\`.` : ""}`;
  });
  return ["# Where each stack loads LUZ", "", ...rows, ""].join("\n");
}

/** name, description and tools of an agent or a skill, from its front matter (a value in quotes is JSON). */
function frontOf(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const field = (key) => {
    const v = block.match(new RegExp(`^${key}:[ ]*(.*)$`, "m"))?.[1]?.trim() ?? "";
    return v.startsWith('"') ? JSON.parse(v) : v;
  };
  return { name: field("name"), description: field("description"), tools: field("tools") };
}

// What the person says matters to them, and the agent for it: the choice the skill offers. The names are checked
// against the agents the package has (tests/ai-start.test.js), so an agent renamed or removed fails there.
const BY_NEED = [["Usable by everyone, with a keyboard, a screen reader or a small screen", "luz-agent-accessibility"]];

function agentsReference(root) {
  const dir = join(root, SKILL, "assets");
  const agents = readdirSync(join(dir, "agents")).filter((f) => f.endsWith(".md")).sort().map((f) => frontOf(readFileSync(join(dir, "agents", f), "utf-8")));
  return [
    "# The agents of luz-ai",
    "",
    "Offer the one that fits what the person says matters to them. Never offer one they do not need. `agent list` gives the fields of each agent. Every agent is named `luz-agent-<word>`, the word being what it looks after.",
    "",
    "## By what matters to the person",
    "",
    ...BY_NEED.map(([need, name]) => `- ${need}: \`${name}\`.`),
    "",
    "## Agents",
    "",
    "Each is a base template with fields left to fill. `agent add <name> --for <assistants>` writes it for Claude Code, Gemini CLI or Codex. A field left out stays `[ADAPT: …]`, and the agent stops and asks until it is filled.",
    "",
    ...agents.map((a) => `- \`${a.name}\` (tools: ${a.tools}): ${a.description}`),
    "",
  ].join("\n");
}

/** Every generated file of the skill, by path under the repository. */
export function buildAiFiles({ root = repo } = {}) {
  const facts = buildAiFacts({ root });
  const files = { [FACTS_FILE]: `${JSON.stringify(facts, null, 2)}\n` };
  for (const kind of facts.kinds) {
    files[`${SKILL}/assets/templates/${kind}.html.tpl`] = template(kind, root);
    files[`${SKILL}/references/kinds/${kind}.md`] = kindReference(kind, root);
  }
  files[`${SKILL}/references/stacks.md`] = stacksReference(root);
  // The one accessibility agent is the reviewer of @luz-ds/check, from the same source (.claude/agents/accessibility-engineer.md)
  files[`${SKILL}/assets/agents/luz-agent-accessibility.md`] = buildAgent();
  files[`${SKILL}/references/agents.md`] = agentsReference(root);
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [file, text] of Object.entries(buildAiFiles())) {
    mkdirSync(dirname(join(repo, file)), { recursive: true });
    writeFileSync(join(repo, file), text);
  }
}
