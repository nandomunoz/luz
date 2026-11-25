# The agents of luz-ai

Offer the one that fits what the person says matters to them. Never offer one they do not need. `agent list` gives the fields of each agent. Every agent is named `luz-agent-<word>`, the word being what it looks after.

## By what matters to the person

- Usable by everyone, with a keyboard, a screen reader or a small screen: `luz-agent-accessibility`.

## Agents

`agent add <name> --for <assistants>` writes it for Claude Code, Gemini CLI or Codex. An agent with no field is written as it is. A field left out of one that has fields stays `[ADAPT: …]`, and the agent stops and asks until it is filled.

- `luz-agent-accessibility` (tools: Read, Grep, Glob): Reviews the HTML, CSS and JavaScript of a web project for accessibility against WCAG 2.2 level AA and EN 301 549, reading source files only. Use it when a page or a component is written or changed. It reads your files and writes nothing.
