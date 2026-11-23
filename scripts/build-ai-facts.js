/**
 * LUZ — the facts and the starters of the `luz-start` skill (`.claude/plans/luz-ai-skill.md`, B.3).
 *
 * What the skill knows about this release is read from the repository and never typed. Under
 * `packages/ai/skills/luz-start/`:
 *
 *   assets/facts.json              the versions of the packages, the kinds of site and the stacks the prompts offer
 *   assets/templates/<kind>.html.tpl a starter page per kind of site: the head (the stylesheets and scripts the prompt of
 *                                  that kind links, in its order) and the skeleton of its preset, with {{lang}} and
 *                                  {{title}} for the script to fill
 *   references/kinds/<kind>.md     what to ask for that kind of site: the preset of the prompt, without its skeleton
 *   references/stacks.md           where each stack loads LUZ and which extensions the check reads
 *
 * A starter is a text for the person's own site, not a page of this repository, so it is `.html.tpl`: nothing here loads it,
 * and the CDN addresses in it are the ones the prompts print (RL-12 reads the `.html` pages of packages/ and apps/).
 *
 * `tests/ai-start.test.js` fails when a file is not what this builds.
 *
 * Usage: node scripts/build-ai-facts.js (from the repo root) writes the files.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLISHED } from "./luz-packages.js";
import { FITS_KINDS } from "./docs-site/kinds.js";
import { assemblePrompt } from "./docs-site/prompts.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = "packages/ai/skills/luz-start";
export const FACTS_FILE = `${SKILL}/assets/facts.json`;

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), "utf-8"));

export function buildAiFacts({ root = repo } = {}) {
  const versions = Object.fromEntries(PUBLISHED.map((pkg) => [pkg, readJson(root, `packages/${pkg}/package.json`).version]));
  const stacks = readJson(root, "apps/site/prompts/stacks.json").stacks.map(({ id, name, ext }) => ({ id, name, ext }));
  return { versions, kinds: [...FITS_KINDS], stacks };
}

/** The section of a prompt about its kind of site, from its heading to the next one. */
function kindSection(prompt) {
  const start = prompt.indexOf("\n## The kind of site:");
  const end = prompt.indexOf("\n## ", start + 1);
  return prompt.slice(start + 1, end).trimEnd();
}

const FENCE = /```html\n([\s\S]*?)\n```/;

/** One starter page per kind. */
function template(prompt) {
  const links = prompt.split("\n").filter((l) => /^<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/[^"]+">$/.test(l) || /^<script type="module" src="https:\/\/cdn\.jsdelivr\.net\/npm\/@luz-ds\/[^"]+"><\/script>$/.test(l));
  const body = kindSection(prompt).match(FENCE)?.[1];
  if (!links.length || !body) throw new Error("build-ai-facts: a prompt has no links or no skeleton to start a page from");
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

/** What to ask for a kind of site: its section of the prompt, the skeleton replaced by the file that holds it. */
function kindReference(kind, prompt) {
  const section = kindSection(prompt).replace(FENCE, `The skeleton of the page is \`assets/templates/${kind}.html.tpl\`: \`site new --kind ${kind}\` writes it, and you fill it in.`);
  return `${section}\n`;
}

function stacksReference(root) {
  const rows = readJson(root, "apps/site/prompts/stacks.json").stacks.map((s) => {
    // The prompt points at the tags it prints; here they are the starter page's
    const load = s.load.replace("the tags above, in every page", "the `<link>` and `<script>` tags of the starter page, in every page");
    return `- ${s.name} (\`${s.id}\`): ${load}.${s.ext ? ` Check it with \`--ext ${s.ext}\`.` : ""}`;
  });
  return ["# Where each stack loads LUZ", "", ...rows, ""].join("\n");
}

/** Every generated file of the skill, by path under the repository. */
export function buildAiFiles({ root = repo } = {}) {
  const facts = buildAiFacts({ root });
  const files = { [FACTS_FILE]: `${JSON.stringify(facts, null, 2)}\n` };
  for (const kind of facts.kinds) {
    const prompt = assemblePrompt(kind, { root });
    files[`${SKILL}/assets/templates/${kind}.html.tpl`] = template(prompt);
    files[`${SKILL}/references/kinds/${kind}.md`] = kindReference(kind, prompt);
  }
  files[`${SKILL}/references/stacks.md`] = stacksReference(root);
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [file, text] of Object.entries(buildAiFiles())) {
    mkdirSync(dirname(join(repo, file)), { recursive: true });
    writeFileSync(join(repo, file), text);
  }
}
