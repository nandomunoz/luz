# @luz-ds/ai

The `luz-start` skill and, later, the agents and skills of luz-ai. **Not published yet:** this package is private until the plan's phase 5.

## What is here

`skills/luz-start/scripts/luz-start.mjs` is the one executable of the skill. It reads and reports; it never writes a file, never asks a question and never reaches the network. It depends on nothing but Node 20 or later.

```bash
node packages/ai/skills/luz-start/scripts/luz-start.mjs doctor
node packages/ai/skills/luz-start/scripts/luz-start.mjs check .claude --json
```

| Command | What it does |
| --- | --- |
| `doctor` | The project, the assistants it has (`.claude`, `.agents`, `.codex`, `.gemini`, `.cursor`, `AGENTS.md`) and a check of the skills and agents it finds. Warns when `AGENTS.md` is over the 32 KiB that Codex reads. |
| `check` | The front matter and the body of skills (`SKILL.md`) and subagents: strict YAML, the closed list of fields, the name, the description, the 500 lines of a body, hidden characters and references one level deep. |

| Exit code | Meaning |
| --- | --- |
| 0 | nothing blocks |
| 1 | a problem blocks |
| 2 | the command was used wrongly |

`skills/luz-start/assets/fields.json` is the closed list of fields per kind of file and target. `assets/facts.json` is written by `node scripts/build-ai-facts.js` from the packages' manifests and fails a test when it is out of step.
