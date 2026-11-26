# @luz-ds/ai

The luz skill for AI assistants. It asks what you want to make with LUZ, writes a starter page that [`@luz-ds/check`](https://www.npmjs.com/package/@luz-ds/check) reads without a finding, and finishes it with you. It can also add the agents and the small skills of luz-ai to your project. The agents are `luz-agent-accessibility`, `luz-agent-ux` (design and UX), `luz-agent-optimiza` (speed and Core Web Vitals), `luz-agent-seogeo` (SEO and GEO) and `luz-agent-legal` (legal and privacy in the European Union, not legal advice). The skills are `luz-readme` (your repository's README), `luz-theme` (your brand's theme) and `luz-migrate` (moving a project to LUZ). It is a tool, not a stylesheet: it loads nothing in a page.

> **Beta, version 0.x.** This package has its own version, apart from tokens, core and catalog. Pin an exact version and read the changelog before you upgrade.

## Use it

```bash
npx @luz-ds/ai init --target claude
```

That puts the skill in your project, where your assistant reads it. Type `/luz` (`$luz` in Codex), or tell the assistant what you want to make: "a landing page for my booking app, with LUZ". It asks the rest in a few questions, shows you the plan, and writes nothing until you say go.

| `--target` | Writes | Read by |
| --- | --- | --- |
| `claude` | `.claude/skills/luz` | Claude Code |
| `codex` | `.agents/skills/luz` | Codex |
| `gemini` | `.agents/skills/luz` | Gemini CLI |
| `cursor` | `.agents/skills/luz` | Cursor (it also reads `.claude/skills`) |
| `agents-md` | a short LUZ section for `AGENTS.md` | any assistant that reads it |

Give several, comma separated: `--target claude,codex`. `--dry-run` shows what would be written and writes nothing. Nothing is overwritten without `--force`, and a `AGENTS.md` that exists is never touched: the section is printed for you to add. The command never asks a question: a missing `--target` is an error that says so.

The folders are the ones each assistant documents. Claude Code reads `.claude/skills` and does not document `.agents/skills`; Codex, Gemini CLI and Cursor read `.agents/skills`.

## The commands

Type `/luz` in your assistant, with a subcommand or without. A word that is not in the table gets the table, never a guess.

The skill is tested only in Claude Code. The other assistants get it written from their own documentation; if one of them fails, [tell us](https://github.com/nandomunoz/luz/issues/new?template=ai-target.yml).

| In the chat | What it does | Writes |
| --- | --- | --- |
| `/luz` | Asks what you want to make, shows the plan, waits for your go, writes the starter page and finishes it with you. | yes, after "go" |
| `/luz new <landing, blog, app or docs>` | The same, without asking the kind of site. | yes, after "go" |
| `/luz doctor` | The project, its assistants, and the skills and agents it has. | no |
| `/luz lint [path]` | The front matter of the skills and agents of the project, or of the path. | no |
| `/luz facts` | The versions, the kinds of site and the stacks of this release. | no |
| `/luz agents` | The agents of luz-ai. | no |
| `/luz skills` | The small skills of luz-ai: a README, a theme, a migration. | no |
| `/luz add <name>` | Adds the agent or the skill you name, after asking its fields if it has any. | yes, after "go" |
| `/luz help` | This table. | no |

Each one has a real conversation, and what the script prints, on https://luzds.com/docs/ai/commands/. `init` runs only in a terminal.

## The agents

Agents review or improve your project once you add them. They are named `luz-agent-<word>`. Add one with `/luz add <name>`.

| Agent | Looks after | Tools | Fields to fill |
| --- | --- | --- | --- |
| `luz-agent-accessibility` | WCAG 2.2 AA and EN 301 549, from your source | reads | none |
| `luz-agent-ux` | design and UX: hierarchy, layout, forms, states, the words of the interface | reads | 2 |
| `luz-agent-seogeo` | SEO and GEO: search engines and AI assistants that cite you | reads | 4 |
| `luz-agent-legal` | personal data, cookies, the site notice and other legal points in the European Union, which is not legal advice | reads | 3 |
| `luz-agent-optimiza` | loading speed and Core Web Vitals (LCP, INP, CLS) | reads and edits files after you agree to its list; not written for Gemini CLI | 3 |

A field is something the agent needs to know about your project. One you leave out stays `[ADAPT: …]`, and the agent stops and asks until it is filled.

## The skills

A skill is a folder of one task that your assistant uses on its own once you add it. Add one with `/luz add <name>` (or `luz-ai skill add <name>`): it writes the same folder in `.agents/skills` and in `.claude/skills`, and never over a file that exists. Then ask your assistant for it by name.

| Skill | What it does | Add it |
| --- | --- | --- |
| `luz-readme` | Writes or improves the README of your repository so that it reads as written by a person, with true facts and no signs of machine writing. | `/luz add luz-readme` |
| `luz-theme` | Makes the theme of your brand (colours, fonts, corners) in light, dark and high contrast, started from the template of `@luz-ds/core`, and measures its contrast. | `/luz add luz-theme` |
| `luz-migrate` | Moves a project that has its own CSS to LUZ one page at a time, with the old CSS running until the last page has moved. | `/luz add luz-migrate` |

## The script

The skill's one executable is the command `luz-ai`. The skill runs it for you, and you can run it yourself.

```bash
npx @luz-ds/ai new --name "Acme" --kind landing --stack vanilla --target ./acme --dry-run
npx @luz-ds/ai agents
npx @luz-ds/ai add luz-agent-accessibility --for claude,codex --dry-run
npx @luz-ds/ai skills
npx @luz-ds/ai add luz-readme --dry-run
npx @luz-ds/ai doctor
npx @luz-ds/ai lint .claude
```

| Command | What it does |
| --- | --- |
| `init` | Puts this skill where your assistant reads it. |
| `new` | Writes the starter page of a kind of site (landing page, blog, app, documentation) for plain HTML or Astro. |
| `agents`, `skills`, `add` | Lists the agents of luz-ai (named `luz-agent-<word>`) or its small skills, or writes the one you name: an agent for Claude Code, Gemini CLI and Codex, with the fields you give it filled in (`luz-agent-accessibility` has none: it reads your files as it is), or a skill as a folder in `.agents/skills` and in `.claude/skills`. A field left out stays `[ADAPT: …]`, and the agent stops and asks until it is filled. `luz-agent-optimiza` edits files, after you agree to its list of changes, so it is not written for Gemini CLI yet; the other agents only read. |
| `doctor` | The project, the assistants it has, the skills and agents it finds, and whether the two copies of a skill agree. |
| `lint` | The front matter and the body of skills and agents: strict YAML, names, descriptions, hidden characters and references. A field that the list of an assistant does not know is a warning, never a failure: the lists were read at their sources on a date. |

Every command takes `--help`, and `--json` prints one JSON object. Only `init`, `new` and `add` write (`site new`, `agent list`, `agent add`, `skill list` and `skill add` are their long forms), only the files they name, and never over a file that exists unless `--force` says so, nor through a symbolic link.

| Exit code | Meaning |
| --- | --- |
| 0 | nothing blocks |
| 1 | at least one problem blocks (`lint`, `doctor`) |
| 2 | the command was used wrongly |

## What it does not do

It makes no network request, runs no program and installs nothing. It does not decide your content, your brand or your final choices: the starter page has `…` where your words go, and the skill counts them. It does not check names, labels, alt text or contrast: the skill says so at the end, so you check them. Codex cannot limit the tools of an agent in the agent's file, so an agent of luz-ai that only reads is read-only there by its instructions alone; set the sandbox of your session.

Loading LUZ from a CDN sends your visitors' IP addresses to the CDN. If you do not want that, install from npm and serve the files from your own server.

LUZ is not affiliated with Anthropic, OpenAI, Google or Anysphere (Cursor). Claude Code, Codex, Gemini CLI and Cursor are named only to say which files each reads; their names belong to their owners.


<!-- luz:ai-agents:start -->
## For AI agents

`@luz-ds/ai` 0.0.0 is in beta: any release may break anything. Read the breaking changes below before you update, and use only what the files under "Read first" list.

### Breaking changes

Not released yet: 0.0.0 is the workspace's placeholder; the first release is 0.1.0. Nothing is deprecated and nothing breaks.

### Read first

1. `README.md` in this package: what the command does and its exit codes.
2. `npx @luz-ds/ai@0.0.0 --help`: the command's options, from the version you run.
3. https://luzds.com/llms.txt: the index of the documentation, short enough for a small context.
4. https://luzds.com/llms-full.txt: the same pages in full.
5. https://luzds.com/examples/: one standalone page of markup for each component and pattern.

### Load order

`@luz-ds/ai` is a command, not a stylesheet: it loads nothing in a page and needs no other LUZ package.

### Check what you write

Run `npx @luz-ds/check@0.3.2 <files>` on every HTML and CSS file you write, and fix what it reports. To copy the accessibility reviewer into your project: `npx @luz-ds/check@0.3.2 agent > .claude/agents/luz-agent-accessibility.md`.

<!-- luz:ai-agents:end -->

## License

MIT
