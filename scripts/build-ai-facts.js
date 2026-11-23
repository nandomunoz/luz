/**
 * LUZ — the facts of the `luz-start` skill (`.claude/plans/luz-ai-skill.md`, B.3).
 *
 * `packages/ai/skills/luz-start/assets/facts.json` is what the skill knows about this release, read from the
 * repository and never typed: the versions of the packages, the kinds of site and the stacks the prompts offer.
 * `tests/ai-start.test.js` fails when the file is not what this builds.
 *
 * Usage: node scripts/build-ai-facts.js (from the repo root) writes the file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLISHED } from "./luz-packages.js";
import { FITS_KINDS } from "./docs-site/kinds.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FACTS_FILE = "packages/ai/skills/luz-start/assets/facts.json";

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), "utf-8"));

export function buildAiFacts({ root = repo } = {}) {
  const versions = Object.fromEntries(PUBLISHED.map((pkg) => [pkg, readJson(root, `packages/${pkg}/package.json`).version]));
  const stacks = readJson(root, "apps/site/prompts/stacks.json").stacks.map(({ id, name, ext }) => ({ id, name, ext }));
  return { versions, kinds: [...FITS_KINDS], stacks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(join(repo, FACTS_FILE), `${JSON.stringify(buildAiFacts(), null, 2)}\n`);
}
