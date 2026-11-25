# The agents of luz-ai

Offer the one that fits what the person says matters to them. Never offer one they do not need. `agent list` gives the fields of each agent. Every agent is named `luz-agent-<word>`, the word being what it looks after.

## By what matters to the person

- Usable by everyone, with a keyboard, a screen reader or a small screen: `luz-agent-accessibility`.

## Agents

Each is a base template with fields left to fill. `agent add <name> --for <assistants>` writes it for Claude Code, Gemini CLI or Codex. A field left out stays `[ADAPT: …]`, and the agent stops and asks until it is filled.

- `luz-agent-accessibility` (tools: Read, Grep, Glob): Audits the accessibility (WCAG) of a site made with LUZ by reviewing its markup and styles, and proposes concrete fixes. Use it before shipping UI changes or to review an existing section. Base template that must be adapted to the project before use.
