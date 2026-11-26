/**
 * The sandbox of a run: a folder made from the case's fixture with the skill installed as a person installs it, a clean
 * config of the assistant (only the credentials, copied), and a PATH where `luz-check` and `npx` reach the checker of this
 * repository and nothing on the network. `claudeArgs` is the whole command: print mode, no prompts, project settings only,
 * a closed list of tools, no web. A case may name small skills or agents to add after the skill (`install`).
 */
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const TOOLS = "Read,Write,Edit,Glob,Grep,Skill,Bash";
const ALLOWED = "Read,Write,Edit,Glob,Grep,Skill,Bash(node *luz.mjs*),Bash(node *luz-check.js*),Bash(npx luz-check *),Bash(npx @luz-ds/check@* *),Bash(npx --yes @luz-ds/check@* *),Bash(luz-check *),Bash(ls *),Bash(cat *),Bash(head *),Bash(tail *),Bash(grep *),Bash(echo *),Bash(wc *),Bash(sed -n *),Bash(mkdir -p *),Bash(which *),Bash(cd *),Bash(git status *)";

/** `tools` narrows the closed list (a trigger or an agent run needs fewer); `maxTurns` bounds the assistant's own turns. */
export function claudeArgs({ prompt, model, resume, tools, maxTurns }) {
  if (typeof prompt !== "string" || !prompt || prompt.startsWith("-")) throw new Error(`the prompt is a text that does not start with "-" (${JSON.stringify(prompt)})`);
  const args = ["-p", prompt, "--model", model, "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk", "--setting-sources", "project", "--tools", TOOLS, "--allowedTools", ALLOWED];
  if (tools !== undefined) {
    args.splice(args.indexOf("--tools") + 1, 1, tools);
    if (tools) args.splice(args.indexOf("--allowedTools") + 1, 1, tools);
  }
  if (maxTurns) args.push("--max-turns", String(maxTurns));
  if (resume) args.push("--resume", resume);
  return args;
}

/** A fixture file that would run in the session of the person running the lab, or change how it runs. */
export const unsafeFixture = (path) => path.split("/").some((part) => part.startsWith(".") || part === "..") || /(^|\/)(package\.json|Makefile)$/.test(path);

/** What `--keep` copies out of a run: nothing that starts with a dot, no CLAUDE.md, AGENTS.md or package.json, which a later session of the owner could load. */
export const keepFilter = (path) => !path.split("/").some((part) => part.startsWith(".") || /^(CLAUDE\.md|AGENTS\.md|package\.json)$/.test(part));

export const defaultCredentials = () => join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), ".credentials.json");

/**
 * The pieces of luz-ai a case adds after the skill (`install`): each a small skill (`assets/skills/<name>/SKILL.md`) or an
 * agent (`assets/agents/<name>.md`) that the package ships, added by its own script as a person adds it. A name is checked
 * against those folders before anything is made, so it can never be a flag or a path.
 */
export function installCommands(caseDef, root) {
  const install = caseDef.install ?? [];
  if (!Array.isArray(install)) throw new Error(`${caseDef.id}: install is a list of names of luz-ai`);
  const assets = join(root, "packages/ai/skills/luz/assets");
  return install.map((name) => {
    if (typeof name !== "string" || !/^luz-[a-z0-9-]+$/.test(name)) throw new Error(`${caseDef.id}: install names ${JSON.stringify(name)}, which is not a name of luz-ai`);
    if (existsSync(join(assets, "skills", name, "SKILL.md"))) return ["skill", "add", name];
    if (existsSync(join(assets, "agents", `${name}.md`))) return ["agent", "add", name, "--for", "claude"];
    throw new Error(`${caseDef.id}: install names ${name}, which luz-ai does not ship as a skill or an agent`);
  });
}

export function createSandbox({ caseDef, root, credentials = defaultCredentials(), tmpRoot = tmpdir() }) {
  const fixture = caseDef.fixture ?? {};
  for (const path of Object.keys(fixture)) if (unsafeFixture(path) || path.startsWith("/")) throw new Error(`${caseDef.id}: the fixture file ${path} would run in the session of the person running the lab`);
  const extra = installCommands(caseDef, root);
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
    const script = join(root, "packages/ai/skills/luz/scripts/luz.mjs");
    const r = spawnSync(process.execPath, [script, "init", "--target", "claude", "--dir", dir], { encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`the skill could not be installed for the run: ${r.stderr}`);
    for (const args of extra) {
      const a = spawnSync(process.execPath, [script, ...args, "--dir", dir], { encoding: "utf-8" });
      if (a.status !== 0) throw new Error(`${args[2]} could not be installed for the run: ${a.stderr}`);
    }
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
