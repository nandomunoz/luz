# The skills of luz-ai

Small skills of one task each, apart from the agents, which review. Offer the one that fits what the person says matters to them. Never offer one they do not need. A skill has no field.

## By what matters to the person

- A README that reads as written by a person, with true facts: `luz-readme`.
- The colours, fonts and corners of their own brand on LUZ, in light, dark and high contrast: `luz-theme`.
- A site that already exists, moved to LUZ one page at a time: `luz-migrate`.

## Skills

`skill add <name>` (or `add <name>`) writes the skill folder in `.agents/skills` and in `.claude/skills`. Once added, the person asks the assistant for it by name.

- `luz-migrate`: Moves a project that has its own CSS (Bootstrap, Tailwind, a hand-written stylesheet) to LUZ one page at a time, without breaking the pages that have not moved: an inventory first, the old CSS in a layer before LUZ, one small region by hand, then page by page with a check for each and a commit that the person makes, and the old CSS removed only at the end. Use it when someone wants to move an existing site to LUZ. Not for starting a new site (that is /luz).
- `luz-readme`: Writes or rewrites a project README that reads as written by a person, not by an AI. Works for any kind of repository. Every README gets a strong title and subtitle, a cover, links to its sections, the repo's GitHub data, and fixed sections: what it is, usage, installation, credits and license. Use it when the user asks to create, rewrite or improve a README, or to remove the AI feel from one.
- `luz-theme`: Makes the theme of a brand for a site that uses LUZ: a CSS file of semantic tokens for light, dark and high contrast, started from the template that @luz-ds/core ships, with the contrast of every pair measured by the checker of LUZ. Use it when someone wants LUZ in their own colours, fonts or corners, or says that LUZ does not look like their brand. Not for changing a component of LUZ itself.
