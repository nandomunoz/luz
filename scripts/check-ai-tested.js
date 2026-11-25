/**
 * LUZ — what is known about the luz skill before a release (`.claude/plans/ai-eval-lab.md`, phase 5). The lab informs and the
 * deterministic tests are the gate: a model is not the same every time, so a pass of the release layer is a claim ("Tested in")
 * and never a blocker. `packages/ai/tested.json` (written by `pnpm ai:eval tested <run>`, nine cases in ten green) should name
 * this package version, this skill version and the release model, and no frozen example of the docs should be older than the skill.
 *
 *   node scripts/check-ai-tested.js [--root <folder>] [--strict]
 *                       prints what is missing or stale as warnings and exits 0; with --strict it exits 1 on any
 *
 * Reads files of the repository; no network, no process. Importing this module runs nothing.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (f) => JSON.parse(readFileSync(f, "utf-8"));

export function checkAiTested(root = repo) {
  const problems = [];
  const skillVersion = /^\s*version: "([^"]+)"/m.exec(readFileSync(join(root, "packages/ai/skills/luz/SKILL.md"), "utf-8"))?.[1];
  const packageVersion = json(join(root, "packages/ai/package.json")).version;
  const file = join(root, "packages/ai/tested.json");
  if (!existsSync(file)) problems.push("packages/ai/tested.json is missing: run `pnpm ai:eval script --layer release`, then `pnpm ai:eval tested <run>`");
  else {
    const t = json(file);
    if (t.packageVersion !== packageVersion) problems.push(`the pass is for package version ${t.packageVersion}, the package is ${packageVersion}`);
    if (t.skillVersion !== skillVersion) problems.push(`the pass is for skill version ${t.skillVersion}, the skill is ${skillVersion}`);
    if (t.model !== "opus") problems.push(`the pass is for model ${t.model}: a release needs the release layer, opus`);
    if (t.host !== "claude-code") problems.push(`the pass names the host ${t.host}, not claude-code`);
  }
  const dir = join(root, "tools/ai-eval/cases/examples");
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const e = json(join(dir, f));
    if (e.skillVersion !== skillVersion) problems.push(`example ${e.example} was frozen from skill version ${e.skillVersion}, the skill is ${skillVersion}: freeze it again from a green run (pnpm ai:eval freeze)`);
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--root");
  const problems = checkAiTested(at === -1 ? repo : resolve(args[at + 1] ?? "."));
  for (const p of problems) process.stderr.write(`check:ai-tested: ! ${p}\n`);
  if (!problems.length) process.stdout.write("check:ai-tested: the skill has a release pass for this version and no stale example\n");
  process.exitCode = problems.length && args.includes("--strict") ? 1 : 0;
}
