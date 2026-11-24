# Structure by project type

Every README has the header and the five fixed sections from [anatomy.md](anatomy.md): What it is, Usage, Installation, Credits, License. This page decides what goes between Installation and Credits. Drop any section you cannot fill with real content. Ceilings are limits for the body, not goals.

## Classifying

First match wins.

| Signal | Type |
|---|---|
| `SKILL.md`, an agents folder, prompt files | Agent or skill pack |
| Terraform, Helm, Ansible, deploy-only Dockerfiles | Infrastructure |
| Unity, Godot, Unreal files, a main loop with play assets | Game |
| Notebooks, datasets, a paper | Data or research |
| Fonts, icons, tokens, a style guide | Design asset |
| A `bin` field, `[[bin]]`, an argument parser | CLI |
| Server framework, routes, front-end build | Web app or service |
| Published package with an exported API | Library |
| Several packages in one repo | Monorepo |
| Configs, notes, scripts, anything else | Other: write in one sentence what it is and take the closest type |

Special cases: early-stage (say so on the first screen and state what works), fork (what changed and why), solo project (first person).

## Body by type

**Library.** A short real example with output. A second example of the most common task. What it does not do. Compatibility. Link to API docs. About 120 lines.

**CLI.** A real terminal transcript. The commands people actually use. Configuration in `<details>`. Exit codes or env vars if they matter. Limits. About 150 lines.

**Web app or service.** A current screenshot or the live link. Required environment variables in a table. How it is deployed, one paragraph. Architecture diagram only if non-obvious. Limits. About 150 lines.

**Game.** A real screenshot or capture. Controls. Build from source. Asset credits with their licenses. About 100 lines.

**Data or research.** The question or finding. How to reproduce, with expected output. Data sources with licenses. Method. Citation block. Limits of the data. About 150 lines.

**Design asset.** A real specimen. How to import. Usage rules. License near the top. About 80 lines.

**Infrastructure.** What it provisions and what it assumes. Prerequisites with versions. Plan or dry-run first, then apply. Inputs and outputs in tables. Cost or blast-radius warning. Teardown. About 150 lines.

**Agent or skill pack.** A real excerpt or before and after. Install paths. How to invoke. Tools and permissions each item has, and what it can touch. Customization points. Limits. About 100 lines.

**Monorepo.** A table of packages: name, what it is, link. A dependency diagram if packages stack. How to work on the repo. About 80 lines, each package keeps its own README.

**Other or small.** What it is, what works, how to use it. About 50 lines. Short is not a failure, padded is.

## Two audiences

When the repo has real maintainer material (workspace layout, build, tests, releases), users go first within the ceiling, then one horizontal rule and a sentence naming the split, then short maintainer sections linking to `CONTRIBUTING.md` or `docs/`. Past about 200 lines, the header link row becomes required.

## Sections that usually earn their place

- What it will not do.
- What does not work yet, in plain words.
- Why it exists, two or three sentences with a real reason.
- Compatibility and versions, when behavior differs.
- For AI agents, only when the repo ships `llms.txt`, a machine-readable list of names, or a validator: what to read, what to use, the command that checks the output.
- Use or contribute as an "I want to / How" table, instead of a contributing essay.

## Sections that usually do not

- A features list that restates the intro.
- A table of contents under about 200 lines (the header link row is enough).
- Acknowledgements with nothing specific.
- A roadmap with no dates or issues behind it.
- Support or sponsor blocks above the fold.
- A FAQ with invented questions.
