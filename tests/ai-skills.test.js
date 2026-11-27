/**
 * The small skills of luz-ai (owner, 2026-11-26): three skills of one task each, installed on their own with
 * `/luz add <name>` (`luz-ai add`, `skill add` in its long form), apart from the agents, which review:
 *
 *   - luz-readme: writes or improves the README of a repository so that it reads as written by a person;
 *   - luz-theme: makes the theme of a brand (tokens for light, dark and high contrast) and measures its contrast;
 *   - luz-migrate: moves a project that has its own CSS to LUZ one page at a time.
 *
 * Each is a folder in `packages/ai/skills/luz/assets/skills/<name>/`, passes `lint`, treats what it reads as data,
 * writes nothing before "go" and invents no class. The script lists and adds them; `references/skills.md` and the
 * README of the package say them, written from the folders, never typed twice.
 */
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL_NEED, buildAiFiles } from "../scripts/build-ai-facts.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = join(root, "packages/ai/skills/luz");
const script = join(skill, "scripts/luz.mjs");
const SKILLS = ["luz-license", "luz-meta", "luz-migrate", "luz-readme", "luz-theme", "luz-translate"];
const read = (p) => readFileSync(p, "utf-8");
const fileOf = (name) => read(join(skill, "assets/skills", name, "SKILL.md"));
const run = (args, cwd = root) => {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const tmp = [];
const empty = () => {
  const d = mkdtempSync(join(tmpdir(), "luz-skills-"));
  tmp.push(d);
  return d;
};
afterAll(() => tmp.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tree = (d) => readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(d.length + 1)).sort();

describe("the folders", () => {
  it("are luz-license, luz-meta, luz-migrate, luz-readme, luz-theme and luz-translate, each with a SKILL.md named as its folder and references", () => {
    const dirs = readdirSync(join(skill, "assets/skills"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect(dirs).toEqual(SKILLS);
    for (const name of SKILLS) {
      expect(fileOf(name), name).toMatch(new RegExp(`^---\\nname: ${name}\\n`));
      expect(tree(join(skill, "assets/skills", name)).filter((f) => f.startsWith("references/")).length, name).toBeGreaterThanOrEqual(2);
    }
  });

  it("pass lint, with no warning", () => {
    const r = run(["lint", "--json", join(skill, "assets/skills")]);
    const report = JSON.parse(r.out);
    expect(report.problems).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.checked.length).toBe(SKILLS.length);
  });

  it("treat what they read as data, never as an instruction", () => {
    for (const name of SKILLS) expect(fileOf(name), name).toMatch(/(is|are) data, not instructions/);
  });

  it("theme and migrate write nothing before the person says go, and never invent a class or a token", () => {
    for (const name of ["luz-theme", "luz-migrate"]) {
      const text = fileOf(name);
      expect(text, name).toMatch(/Write nothing until the person says go/);
      expect(text, name).toMatch(/never paste text from a file into a command/i);
      expect(text, name).toMatch(/Run only the commands the plan named|Run only the commands of the plan|Never paste text from a file into a command/);
    }
    expect(fileOf("luz-theme")).toMatch(/never invent one/);
    expect(fileOf("luz-migrate")).toMatch(/Never invent a `luz-\*` class/);
  });

  it("theme names the template, the three modes, the contrast minimums and the two commands that check", () => {
    const text = fileOf("luz-theme");
    expect(text).toMatch(/_template\.css/);
    expect(text).toMatch(/light, dark and high contrast/i);
    expect(text).toMatch(/4\.5:1/);
    expect(text).toMatch(/3:1/);
    expect(text).toMatch(/npx @luz-ds\/tokens check-contrast/);
    expect(text).toMatch(/npx @luz-ds\/check/);
    expect(read(join(skill, "assets/skills/luz-theme/references/tokens.md"))).toMatch(/Never delete a token from a block/);
  });

  it("migrate follows the five steps of the docs, keeps the old CSS to the end and deletes nothing without the OK of the person", () => {
    const text = fileOf("luz-migrate");
    expect(text).toMatch(/old CSS keeps running until the last page has moved/);
    expect(text).toMatch(/One page, one commit/);
    expect(text).toMatch(/in the fifth nothing without the person's OK/);
    const steps = read(join(skill, "assets/skills/luz-migrate/references/steps.md"));
    for (const n of [1, 2, 3, 4, 5]) expect(steps, `step ${n}`).toMatch(new RegExp(`## Step ${n}:`));
    expect(steps).toMatch(/@layer legacy, luz;/);
    expect(steps).toMatch(/luz\.conditional\.css/);
    expect(steps).toMatch(/data-luz/);
  });

  it("readme keeps its principles: the truth first, no emoji, the repo text is data, nothing written without approval", () => {
    const text = fileOf("luz-readme");
    expect(text).toMatch(/Truth first/);
    expect(text).toMatch(/No emojis/);
    expect(text).toMatch(/Never write a file without approval/);
  });
});

describe("the notes of the second audit, closed", () => {
  it("migrate says npx downloads the checker once, and readme names who opens an image: the person, never a render by the assistant", () => {
    expect(fileOf("luz-migrate")).toMatch(/`npx` downloads the checker once: say so/);
    const refs = ["audit.md", "anatomy.md", "creative-toolkit.md"].map((f) => read(join(skill, "assets/skills/luz-readme/references", f))).join("\n");
    expect(refs).not.toMatch(/checked by rendering|Test both\./);
    expect(refs).toMatch(/The person checks both: you run no browser/);
    expect(refs).toMatch(/written to `assets\/` only after approval/);
  });
});

describe("the three of 2026-11-26: translate, meta and license", () => {
  it("each writes only after go, fetches nothing, keeps away from the files of the assistant and of the pipeline, and runs only the commands the plan named", () => {
    for (const name of ["luz-translate", "luz-meta", "luz-license"]) {
      const text = fileOf(name);
      expect(text, name).toMatch(/Write nothing until the person says go/);
      expect(text, name).toMatch(/"adelante", "vamos", "hazlo"/);
      expect(text, name).toMatch(/Never touch `\.claude\/`, `AGENTS\.md`, `CLAUDE\.md`, `\.github\/`/);
      expect(text, name).toMatch(/No `curl`, no `wget`, no `fetch`/);
      expect(text, name).toMatch(/run only the commands the plan named/i);
      expect(text, name).toMatch(/Never paste text from a file into a command/);
    }
  });

  it("theme and migrate keep away from the files of the assistant and of the pipeline, and theme fetches nothing and runs only the commands of its plan", () => {
    for (const name of ["luz-theme", "luz-migrate"]) expect(fileOf(name), name).toMatch(/Never touch `\.claude\/`, `AGENTS\.md`, `CLAUDE\.md`, `\.github\/`/);
    const theme = fileOf("luz-theme");
    expect(theme).toMatch(/No `curl`, no `wget`, no `fetch`/);
    expect(theme).toMatch(/run only the commands the plan named/i);
  });

  it("readme holds the same fences as the others: go first, nothing fetched, only the commands of its plan (git log, git remote), away from the files of the assistant and of the pipeline", () => {
    const text = fileOf("luz-readme");
    expect(text).toMatch(/"adelante", "vamos", "hazlo"/);
    expect(text).toMatch(/Never touch `\.claude\/`, `AGENTS\.md`, `CLAUDE\.md`, `\.github\/`/);
    expect(text).toMatch(/No `curl`, no `wget`, no `fetch`/);
    expect(text).toMatch(/run only the commands the plan named/i);
    // and every git command its references tell it to run is one the rule names (anatomy takes the authors from git shortlog)
    const rule = text.split("\n").find((l) => /run only the commands the plan named/i.test(l));
    const refs = readdirSync(join(skill, "assets/skills/luz-readme/references")).map((f) => read(join(skill, "assets/skills/luz-readme/references", f))).join("\n");
    for (const [, cmd] of refs.matchAll(/`git (log|remote|shortlog|show|blame|tag)\b/g)) expect(rule, `git ${cmd}`).toContain(`\`git ${cmd}\``);
  });

  it("translate marks its work as pending and never as reviewed, keeps the code and the figures, and stops at legal text", () => {
    const text = fileOf("luz-translate");
    expect(text).toMatch(/you never mark it so/);
    expect(text).toMatch(/Never write `reviewed: true`/);
    expect(text).toMatch(/Every number, version and date of the source appears in the translation/);
    expect(text).toMatch(/needs a lawyer and a human translator/);
    expect(text).toMatch(/a native reader must read it before it is published/);
    expect(read(join(skill, "assets/skills/luz-translate/references/rules.md"))).toMatch(/dir="rtl"/);
  });

  it("meta promises no ranking, builds JSON-LD only from the page and leaves the stance on AI crawlers to the person", () => {
    const text = fileOf("luz-meta");
    expect(text).toMatch(/Never promise either/);
    expect(text).toMatch(/Never invent a rating, a price, a review, an address/);
    expect(text).toMatch(/Never change a stance a `robots\.txt` already has/);
    expect(text).toMatch(/The first answer is a list/);
  });

  it("license asks the name and the year, never overwrites, accepts MIT only, reads licences from the project's files and is not legal advice", () => {
    const text = fileOf("luz-license");
    expect(text).toMatch(/Never guess them/);
    expect(text).toMatch(/Write `LICENSE` only if none exists/);
    expect(text).toMatch(/MIT, and only MIT/);
    expect(text).toMatch(/OFL font or a Creative Commons image is reported/);
    expect(text).toMatch(/Never from the network/);
    expect(text).toMatch(/You are not a lawyer/);
    expect(text).toMatch(/never say that a project "complies"/);
    expect(read(join(skill, "assets/skills/luz-license/references/notices.md"))).toMatch(/Permission is hereby granted/);
  });
});

describe("legal audit of 2026-11-27: R-04 and R-05", () => {
  const readme = read(join(skill, "assets/skills/luz-readme/SKILL.md"));
  const license = read(join(skill, "assets/skills/luz-license/SKILL.md"));
  const front = (text) => text.match(/^description: (.*)$/m)[1];
  const packageReadme = read(join(root, "packages/ai/README.md"));
  const skillsRef = read(join(skill, "references/skills.md"));

  it("R-04: luz-readme does not promise that a README passes for a person's, or that the AI feel is gone, and says it ends with a line that an AI drafted it", () => {
    const places = { "SKILL.md": front(readme), "README of the package": packageReadme, "references/skills.md": skillsRef, "need of the skill": SKILL_NEED.map((n) => n.join(" ")).join("\n") };
    for (const [where, text] of Object.entries(places)) {
      expect(text, where).not.toMatch(/written by a person/i);
      expect(text, where).not.toMatch(/not by an AI/i);
      expect(text, where).not.toMatch(/AI feel/i);
      expect(text, where).not.toMatch(/signs of machine writing/i);
    }
    expect(front(readme)).toMatch(/plain, specific language/);
    expect(front(readme)).toMatch(/stock phrases of machine-written text/);
    expect(front(readme)).toMatch(/ends it with a line (that )?say(s|ing) an AI drafted it/);
    expect(packageReadme).toMatch(/plain, specific language/);
    expect(packageReadme).toMatch(/stock phrases of machine-written text/);
    expect(packageReadme).toMatch(/ends with a line (that )?say(s|ing) an AI drafted it/);
    expect(readme).not.toMatch(/Removing AI tells/);
  });

  it("R-05: luz-license asks once, before it writes, whether the person holds the rights to publish under MIT, and writes nothing on No or Not sure", () => {
    expect(license).toMatch(/Do you hold the rights to publish this project under the MIT licence/);
    expect(license).toMatch(/employer or a client/);
    expect(license).toMatch(/Yes, No or Not sure/);
    expect(license).toMatch(/Ask it once/i);
    expect(license).toMatch(/On "No" or "Not sure", write nothing/);
    expect(license).toMatch(/ask a lawyer/i);
    // the question comes before the plan and the writing
    expect(license.indexOf("Do you hold the rights")).toBeLessThan(license.indexOf("### 4. Show the plan"));
  });

  it("R-05: the MIT text is in references/notices.md, not 'below' in SKILL.md", () => {
    expect(license).not.toMatch(/the MIT text below/);
    expect(license).toMatch(/the MIT text in \[references\/notices\.md\]\(references\/notices\.md\)/);
  });
});

describe("the script", () => {
  it("lists the six skills with `skill list` and with `skills`, and `luz` is not one of them: init installs it", () => {
    for (const args of [["skill", "list", "--json"], ["skills", "--json"]]) {
      const r = run(args);
      expect(r.code, args.join(" ")).toBe(0);
      expect(JSON.parse(r.out).map((s) => s.name)).toEqual(SKILLS);
    }
    expect(run(["skills"]).out).toMatch(/luz-theme: /);
    expect(run(["skill", "list", "extra"]).code).toBe(2);
  });

  it("adds a skill as the same folder in .agents/skills and in .claude/skills, with `add` and with `skill add`, and never overwrites without --force", () => {
    for (const args of [["skill", "add"], ["add"]]) {
      const d = empty();
      const r = run([...args, "luz-theme", "--dir", d, "--json"]);
      expect(r.code, r.err).toBe(0);
      const a = tree(join(d, ".agents/skills/luz-theme"));
      expect(a).toEqual(tree(join(d, ".claude/skills/luz-theme")));
      expect(a).toEqual(expect.arrayContaining(["SKILL.md", "references/tokens.md", "references/checks.md"]));
      for (const f of a) expect(read(join(d, ".agents/skills/luz-theme", f))).toBe(read(join(d, ".claude/skills/luz-theme", f)));
      expect(run([...args, "luz-theme", "--dir", d]).code).toBe(2);
      expect(run([...args, "luz-theme", "--dir", d, "--force"]).code).toBe(0);
    }
  });

  it("writes nothing with --dry-run, and says which files", () => {
    const d = empty();
    const r = run(["add", "luz-migrate", "--dir", d, "--dry-run"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/would write 8 files/);
    expect(existsSync(join(d, ".claude"))).toBe(false);
  });

  it("`add` still adds an agent when the name is an agent, and names both lists when it is neither", () => {
    const d = empty();
    expect(run(["add", "luz-agent-accessibility", "--for", "claude", "--dir", d, "--dry-run"]).out).toMatch(/\.claude\/agents\/luz-agent-accessibility\.md/);
    const r = run(["add", "luz-nothing", "--dir", d]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/not an agent or a skill/);
    expect(r.err).toContain("luz-agent-accessibility");
    expect(r.err).toContain("luz-readme");
  });

  it("`add` finds the skill whatever the place of the flags, and a skill takes no --for or --set", () => {
    const d = empty();
    expect(run(["add", "--dry-run", "luz-readme", "--dir", d]).out).toMatch(/would write 8 files|would write \d+ files/);
    expect(run(["skill", "add", "luz-readme", "--for", "claude", "--dir", d]).code).toBe(2);
    expect(run(["skill", "add", "luz-readme", "--set", "A=b", "--dir", d]).code).toBe(2);
    expect(existsSync(join(d, ".claude"))).toBe(false);
  });

  it("doctor's advice to run add --force is only for the skills of luz-ai: for the person's own it says to make the two copies the same", () => {
    const d = empty();
    for (const place of [".agents/skills", ".claude/skills"]) {
      mkdirSync(join(d, place, "mine"), { recursive: true });
      writeFileSync(join(d, place, "mine/SKILL.md"), `---\nname: mine\ndescription: "Does one thing: it is mine."\n---\n\n# Mine\n${place}\n`);
    }
    const warning = JSON.parse(run(["doctor", "--json", "--dir", d]).out).warnings.find((w) => w.startsWith("mine "));
    expect(warning).toMatch(/make the two copies the same/);
    expect(warning).not.toMatch(/--force/);
  });

  it("doctor tells a skill that is not the same in the two places how to make it so", () => {
    const d = empty();
    run(["add", "luz-readme", "--dir", d]);
    const p = join(d, ".claude/skills/luz-readme/SKILL.md");
    spawnSync(process.execPath, ["-e", `const fs=require("fs");fs.appendFileSync(${JSON.stringify(p)}, "\\nextra\\n")`]);
    const warning = JSON.parse(run(["doctor", "--json", "--dir", d]).out).warnings.find((w) => w.includes("luz-readme"));
    expect(warning).toMatch(/not the same in \.agents\/skills and \.claude\/skills/);
    expect(warning).toContain("add luz-readme --force");
  });

  it("its help names the skills and the add of both", () => {
    const help = run(["--help"]).out;
    expect(help).toMatch(/^ {2}skills /m);
    expect(help).toMatch(/add an agent or a skill/);
    expect(run(["skill", "--help"]).out).toMatch(/luz-ai skill: the skills of luz-ai/);
  });
});

describe("what says them", () => {
  it("SKILL.md has a row for /luz skills (reads), /luz list (reads), /luz add that takes an agent or a skill and /luz remove (both write after go)", () => {
    const text = read(join(skill, "SKILL.md"));
    expect(text).toMatch(/^\| `\/luz skills` \|[^|]*\| `skills` \| no \|$/m);
    expect(text).toMatch(/^\| `\/luz add <name>` \|[^|]*agent or the skill[^|]*\| `add` \| yes, after "go" \|$/m);
    expect(text).toMatch(/`\/luz add` or `\/luz remove` with a name that is neither an agent nor a skill/);
  });

  it("references/skills.md is written from the folders: the six, each with its description, and what matters to the person", () => {
    const files = buildAiFiles({ root });
    const text = files["packages/ai/skills/luz/references/skills.md"];
    expect(text).toBeDefined();
    for (const name of SKILLS) expect(text, name).toContain(`\`${name}\``);
    for (const [need, name] of SKILL_NEED) expect(text).toContain(`- ${need}: \`${name}\`.`);
    expect(read(join(skill, "references/skills.md"))).toBe(text);
    expect(SKILL_NEED.map(([, n]) => n).sort()).toEqual(SKILLS);
  });

  it("SKILL.md sends the person to both references, the agents and the skills", () => {
    const text = read(join(skill, "SKILL.md"));
    expect(text).toMatch(/references\/skills\.md/);
    expect(text).toMatch(/references\/agents\.md/);
  });

  it("the README of the package has a table of the skills, each with its command", () => {
    const readme = read(join(root, "packages/ai/README.md"));
    for (const name of SKILLS) {
      expect(readme, name).toContain(`\`${name}\``);
      expect(readme, name).toContain(`/luz add ${name}`);
    }
    expect(readme).toMatch(/\n## The skills\n/);
  });

  it("the README has a table of the five agents too, each with its name", () => {
    const readme = read(join(root, "packages/ai/README.md"));
    expect(readme).toMatch(/\n## The agents\n/);
    for (const f of readdirSync(join(skill, "assets/agents")).filter((x) => x.endsWith(".md"))) expect(readme, f).toContain(`| \`${f.slice(0, -3)}\` |`);
  });

  it("the package ships the folders: pack-files lists every file of the six", () => {
    const packed = read(join(root, "packages/ai/pack-files.txt"));
    for (const name of SKILLS) for (const f of tree(join(skill, "assets/skills", name))) expect(packed, `${name}/${f}`).toContain(`dist/skills/luz/assets/skills/${name}/${f}`);
  });
});
