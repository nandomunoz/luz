# The agents and skills of luz-ai

Offer the ones that fit what the person says matters to them, the recommended first. Never offer one they do not need. `agent list` gives the fields of each agent.

## By what matters to the person

- Found by search engines and by AI assistants: `luz-seo-geo-specialist`.
- Usable by everyone, with a keyboard, a screen reader or a small screen: `luz-accessibility-auditor`.
- Fast on a phone: `luz-core-web-vitals-optimizer`.
- The site has an AI feature (a chatbot, an assistant, AI search); a site with none does not need it: `luz-ai-auditor`.

## Agents

Each is a base template with fields left to fill. `agent add <name> --for <assistants>` writes it for Claude Code, Gemini CLI or Codex. A field left out stays `[ADAPT: …]`, and the agent stops and asks until it is filled.

- `luz-accessibility-auditor` (tools: Read, Grep, Glob): Audits a website's accessibility (WCAG) by reviewing component, template and style code, and proposes concrete fixes. Use it before shipping UI changes or to review an existing section. Base template that must be adapted to the project before use.
- `luz-ai-auditor` (tools: Read, Grep, Glob): Audits the AI features built into a website (chatbots, assistants, LLM-powered search or generation, agents with tools) for security, privacy, transparency and regulatory compliance risks, and proposes fixes. Use it before launching or extending an AI feature. Base template that must be adapted to the project before use.
- `luz-core-web-vitals-optimizer` (tools: Read, Edit, Grep, Glob, Bash): Diagnoses and improves a website's Core Web Vitals (LCP, INP, CLS) and overall loading performance, applying code changes and measuring before and after. Use it when a page is slow, shifts while loading or responds late to interaction. Base template that must be adapted to the project before use.
- `luz-seo-geo-specialist` (tools: Read, Grep, Glob): Audits a website's technical and content SEO and its readiness for GEO (Generative Engine Optimization), so that AI-powered search engines and assistants can understand, cite and recommend it. Proposes prioritized improvements. Base template that must be adapted to the project before use.

## Skills

`skill add <name>` writes the skill folder in `.agents/skills` and in `.claude/skills`.

- `luz-create-landing`: Plans, builds or reviews a landing page. First decides which of two types it is, a standard landing (it leads to a later step such as buying, booking or signing up) or a landing with an integrated service (the product is used inside the page itself), asking the user with interactive questions when the project does not make it clear. Then applies the section-by-section anatomy of that type and the SEO and GEO rules for it. Use it when the user asks to create, restructure, review or audit a landing page or homepage, or to decide how a landing should be laid out.
- `luz-create-video`: Creates an animated video trailer of the current project to share on social media, with sound and striking animations, using HyperFrames. Use it when the user wants a promotional video or trailer for their repository or project.
- `luz-readme`: Writes or rewrites a project README that reads as written by a person, not by an AI. Works for any kind of repository. Every README gets a strong title and subtitle, a cover, links to its sections, the repo's GitHub data, and fixed sections: what it is, usage, installation, credits and license. Use it when the user asks to create, rewrite or improve a README, or to remove the AI feel from one.
