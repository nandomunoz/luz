---
"@luz-ds/ai": minor
---

First release of `@luz-ds/ai`: the `luz` skill (`/luz`) for AI assistants. `npx @luz-ds/ai init --target claude` (or `codex`, `gemini`, `cursor`, `agents-md`) puts the skill where your assistant reads it. The skill asks what you want to make with LUZ, writes a starter page for a landing page, a blog, an app or a documentation site (plain HTML or Astro) that `@luz-ds/check` reads without a finding (it does not test accessibility), and finishes it with you, writing nothing until you say go.

The one executable, `luz-ai`, also lists and adds the accessibility agent of luz-ai, `luz-agent-accessibility`, for Claude Code, Gemini CLI and Codex, with the fields you give it filled in; checks the front matter of skills and agents; and diagnoses a project. It makes no network request, runs no program, installs nothing, and never writes over a file or through a symbolic link unless you say so.
