---
"@luz-ds/check": minor
---

The accessibility agent that `luz-check agent` prints is named `luz-agent-accessibility`, not `luz-accessibility-reviewer`, and `@luz-ds/ai` writes the same one: the agents of LUZ are named `luz-agent-<word>`. Copy it with `npx @luz-ds/check agent > .claude/agents/luz-agent-accessibility.md`; the export `./agents/accessibility.md` is unchanged. If you copied the old file, delete it so the two do not both answer.
