/**
 * LUZ — dist builder of @luz-ds/ai (`.claude/plans/luz-ai-skill.md`, phase 5).
 *
 * The package ships one folder, the luz skill, with the executable that installs it, writes a starter page and
 * adds the agents and skills of luz-ai:
 *
 *   packages/ai/dist/skills/luz/   SKILL.md, LICENSE, agents/, assets/, references/ and scripts/
 *
 * It is a copy of `packages/ai/skills/luz/` of what the skill carries (the folders above, and no file or folder
 * that starts with a dot), with its evals and everything else left behind. It fails, before writing anything, when a
 * file that `scripts/build-ai-facts.js` generates is not what the repository's manifests and prompts say now (run it
 * first), or when what it would copy has a hidden character. The same bytes on every build: no date, no path. Nothing
 * is compiled or minified: the script is plain Node with no dependency, and people and the security audit read it.
 * The bin of the package is the script, with its executable bit.
 *
 * buildAi({ outdir }) writes <outdir>/skills/luz/ and returns the list of its files, so a test reads exactly what
 * `pnpm build` would write; importing this file builds nothing.
 *
 * Usage: node scripts/build-ai.js (from the repo root)
 */
import { chmodSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAiFiles } from "./build-ai-facts.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "packages/ai/skills/luz";
export const CARRIES = ["SKILL.md", "LICENSE", "agents", "assets", "references", "scripts"];
const RANGES = [[0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff], [0xe0000, 0xe007f]];
const hasHidden = (text) => [...text].some((ch) => RANGES.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b));

/** The files the package carries, as paths under the skill folder. */
export function carried(root = repo) {
  const base = join(root, SOURCE);
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(base, join(e.parentPath, e.name)).split(sep).join("/"))
    .filter((rel) => !rel.split("/").some((part) => part.startsWith(".")))
    .filter((rel) => CARRIES.includes(rel.split("/")[0]))
    .sort();
}

export function buildAi({ outdir = join(repo, "packages/ai/dist"), root = repo } = {}) {
  for (const [file, text] of Object.entries(buildAiFiles({ root }))) {
    if (readFileSync(join(root, file), "utf-8") !== text) throw new Error(`build-ai: ${file} is not what the manifests and prompts say: run node scripts/build-ai-facts.js`);
  }
  const files = carried(root);
  for (const rel of files) {
    if (hasHidden(readFileSync(join(root, SOURCE, rel), "utf-8"))) throw new Error(`build-ai: ${rel} has a hidden or bidi character`);
  }
  const target = join(outdir, "skills/luz");
  rmSync(outdir, { recursive: true, force: true });
  for (const rel of files) {
    mkdirSync(dirname(join(target, rel)), { recursive: true });
    writeFileSync(join(target, rel), readFileSync(join(root, SOURCE, rel)));
  }
  chmodSync(join(target, "scripts/luz.mjs"), 0o755);
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = buildAi();
  console.log(`✓ @luz-ds/ai: ${files.length} files in packages/ai/dist/skills/luz`);
}
