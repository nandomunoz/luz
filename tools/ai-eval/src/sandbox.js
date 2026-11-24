/**
 * The sandbox of a run: a folder made from the case's fixture with the skill installed as a person installs it, a clean
 * config of the assistant (only the credentials, copied), and a PATH where `luz-check` and `npx` reach the checker of this
 * repository and nothing on the network. `claudeArgs` is the whole command: print mode, no prompts, project settings only,
 * a closed list of tools, no web.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const TOOLS = "Read,Write,Edit,Glob,Grep,Skill,Bash";
const ALLOWED = "Read,Write,Edit,Glob,Grep,Skill,Bash(node *luz.mjs*),Bash(node *luz-check.js*),Bash(npx luz-check *),Bash(npx @luz-ds/check@* *),Bash(npx --yes @luz-ds/check@* *),Bash(luz-check *),Bash(ls *),Bash(cat *),Bash(head *),Bash(tail *),Bash(grep *),Bash(echo *),Bash(wc *),Bash(sed -n *),Bash(mkdir -p *),Bash(which *),Bash(cd *),Bash(git status *)";

export function claudeArgs({ prompt, model, resume }) {
  if (typeof prompt !== "string" || !prompt || prompt.startsWith("-")) throw new Error(`the prompt is a text that does not start with "-" (${JSON.stringify(prompt)})`);
  const args = ["-p", prompt, "--model", model, "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk", "--setting-sources", "project", "--tools", TOOLS, "--allowedTools", ALLOWED];
  if (resume) args.push("--resume", resume);
  return args;
}

/** A fixture file that would run in the session of the person running the lab, or change how it runs. */
export const unsafeFixture = (path) => path.split("/").some((part) => part.startsWith(".") || part === "..") || /(^|\/)(package\.json|Makefile)$/.test(path);

/** What `--keep` copies out of a run: nothing that starts with a dot, no CLAUDE.md, AGENTS.md or package.json, which a later session of the owner could load. */
export const keepFilter = (path) => !path.split("/").some((part) => part.startsWith(".") || /^(CLAUDE\.md|AGENTS\.md|package\.json)$/.test(part));

export const defaultCredentials = () => join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), ".credentials.json");

export function createSandbox({ caseDef, root, credentials = defaultCredentials(), tmpRoot = tmpdir() }) {
  const fixture = caseDef.fixture ?? {};
  for (const path of Object.keys(fixture)) if (unsafeFixture(path) || path.startsWith("/")) throw new Error(`${caseDef.id}: the fixture file ${path} would run in the session of the person running the lab`);
  const dir = mkdtempSync(join(tmpRoot, "luz-lab-run-"));
  const configDir = mkdtempSync(join(tmpRoot, "luz-lab-config-"));
  const binDir = mkdtempSync(join(tmpRoot, "luz-lab-bin-"));
  const cleanup = () => [dir, configDir, binDir].forEach((d) => rmSync(d, { recursive: true, force: true }));
  try {
    for (const [path, text] of Object.entries(fixture)) {
      if (!resolve(dir, path).startsWith(dir + sep)) throw new Error(`${caseDef.id}: the fixture path ${path} is outside the folder of the run`);
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    const r = spawnSync(process.execPath, [join(root, "packages/ai/skills/luz/scripts/luz.mjs"), "init", "--target", "claude", "--dir", dir], { encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`the skill could not be installed for the run: ${r.stderr}`);
    if (credentials && existsSync(credentials)) {
      copyFileSync(credentials, join(configDir, ".credentials.json"));
      chmodSync(join(configDir, ".credentials.json"), 0o600);
    }
    const check = join(root, "packages/check/dist/luz-check.js");
    writeFileSync(join(binDir, "luz-check"), `#!/bin/sh\nexec "${process.execPath}" "${check}" "$@"\n`, { mode: 0o755 });
    writeFileSync(join(binDir, "npx"), '#!/bin/sh\n[ "$1" = "--yes" ] || [ "$1" = "-y" ] && shift\ncase "$1" in luz-check|@luz-ds/check|@luz-ds/check@*) shift; exec luz-check "$@";; esac\necho "npx: only luz-check is available in this sandbox" >&2\nexit 1\n', { mode: 0o755 });
  } catch (error) {
    cleanup();
    throw error;
  }
  const env = { PATH: `${binDir}:${process.env.PATH}`, HOME: configDir, CLAUDE_CONFIG_DIR: configDir, TMPDIR: process.env.TMPDIR ?? tmpRoot, LANG: process.env.LANG ?? "C.UTF-8", TERM: "dumb" };
  return { dir, configDir, binDir, env, cleanup };
}
