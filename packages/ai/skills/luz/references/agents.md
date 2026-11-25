# The agents of luz-ai

Offer the one that fits what the person says matters to them. Never offer one they do not need. `agent list` gives the fields of each agent. Every agent is named `luz-agent-<word>`, the word being what it looks after.

## By what matters to the person

- Usable by everyone, with a keyboard, a screen reader or a small screen: `luz-agent-accessibility`.
- Easy to understand and to use, and good to look at: `luz-agent-ux`.
- Fast to load and quick to answer, on a phone too: `luz-agent-optimiza`.
- Found by search engines and cited by AI assistants: `luz-agent-seogeo`.
- Clear about personal data, cookies and the other legal points of a site in the European Union: `luz-agent-legal`.

## Agents

`agent add <name> --for <assistants>` writes it for Claude Code, Gemini CLI or Codex. An agent with no field is written as it is. A field left out of one that has fields stays `[ADAPT: …]`, and the agent stops and asks until it is filled.

- `luz-agent-accessibility` (tools: Read, Grep, Glob): Reviews the HTML, CSS and JavaScript of a web project for accessibility against WCAG 2.2 level AA and EN 301 549, reading source files only. Use it when a page or a component is written or changed. It reads your files and writes nothing.
- `luz-agent-legal` (tools: Read, Grep, Glob): Reviews a website for the legal and privacy points the European Union asks of a site (personal data, cookies and storage, the site notice, consumer information, accessibility, AI transparency, the licences of its assets), and proposes wording and fixes. Use it before launching a site or when it starts collecting data. It reads your files and writes nothing. It is not legal advice.
- `luz-agent-optimiza` (tools: Read, Grep, Glob, Edit): Improves the loading speed and the Core Web Vitals (LCP, INP, CLS) of a website. It finds what slows its key pages from the source and the measurements the user gives, proposes small changes, and applies them in the files after the user agrees. Use it when a page is slow, shifts while it loads or answers a tap late. It changes code.
- `luz-agent-seogeo` (tools: Read, Grep, Glob): Reviews the HTML of a website for SEO and GEO (Generative Engine Optimization), so that search engines index its key pages and AI assistants can understand, trust and cite them, and proposes prioritized fixes. Use it before launching a site or when its pages are not found. It reads your files and writes nothing.
- `luz-agent-ux` (tools: Read, Grep, Glob): Reviews the design and the user experience of a website from its source (hierarchy, layout, typography and spacing, navigation, forms, states, the words of the interface, small screens), and proposes concrete changes. Use it when a page is written or changed, or when visitors do not find or do what they came for. It reads your files and writes nothing.
