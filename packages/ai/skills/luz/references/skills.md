# The skills of luz-ai

Small skills of one task each, apart from the agents, which review. Offer the one that fits what the person says matters to them. Never offer one they do not need. A skill has no field.

## By what matters to the person

- A README in plain, specific language, with true facts: `luz-readme`.
- The colours, fonts and corners of their own brand on LUZ, in light, dark and high contrast: `luz-theme`.
- A site that already exists, moved to LUZ one page at a time: `luz-migrate`.
- Pages or catalogs of strings in another language, with a glossary and a translation a person still has to review: `luz-translate`.
- The head of the pages and the files around it (description, social cards, structured data, robots.txt, sitemap) written correctly: `luz-meta`.
- The MIT licence and the notices of third-party work next to what the project publishes: `luz-license`.

## Skills

`skill add <name>` (or `add <name>`) writes the skill folder in `.agents/skills` and in `.claude/skills`. Once added, the person asks the assistant for it by name.

- `luz-license`: Puts the MIT licence and the notices of third-party work next to what a project publishes: it first asks once whether the person holds the rights to publish under MIT (and writes nothing if the answer is no or not sure), then the holder's name and the year, and writes a LICENSE only when none exists, keeps the notice of a third-party MIT work next to it, and reports to the person any dual licence, OFL or Creative Commons asset instead of accepting it. It reads the licences of the dependencies from the project's own files, never from the network. Use it when someone wants to license a project or find out what licence its files carry. It is not legal advice.
- `luz-meta`: Reviews and writes the head of a page and the files around it: title, meta description, canonical, language, Open Graph, Twitter card, JSON-LD built only from data already on the page, robots.txt, sitemap.xml, llms.txt and the web manifest. It starts with a list of findings and the proposed changes, writes after the person says go, promises no ranking and no citation by an AI, and leaves the stance on AI crawlers to the person. Use it when someone wants their site to share, index or describe itself well. Not for the content of the page.
- `luz-migrate`: Moves a project that has its own CSS (Bootstrap, Tailwind, a hand-written stylesheet) to LUZ one page at a time, without breaking the pages that have not moved: an inventory first, the old CSS in a layer before LUZ, one small region by hand, then page by page with a check for each and a commit that the person makes, and the old CSS removed only at the end. Use it when someone wants to move an existing site to LUZ. Not for starting a new site (that is /luz).
- `luz-readme`: Writes or rewrites a project README in plain, specific language, without the stock phrases of machine-written text, and ends it with a line saying an AI drafted it. Works for any kind of repository. Every README gets a strong title and subtitle, a cover, links to its sections, the repo's GitHub data, and fixed sections: what it is, usage, installation, credits and license. Use it when the user asks to create, rewrite or improve a README, or to take the stock phrases out of one.
- `luz-theme`: Makes the theme of a brand for a site that uses LUZ: a CSS file of semantic tokens for light, dark and high contrast, started from the template that @luz-ds/core ships, with the contrast of every pair measured by the checker of LUZ. Use it when someone wants LUZ in their own colours, fonts or corners, or says that LUZ does not look like their brand. Not for changing a component of LUZ itself.
- `luz-translate`: Translates the pages and the string catalogs of a site (English, Spanish, Arabic or another language the person names) with a small glossary the person approves: it keeps every code, id, class, attribute name, link target and heading level as it is, translates the visible text and the text attributes, keeps every figure, marks its own work as pending review and never marks it as reviewed. Use it when someone wants a page or a catalog of strings in another language. Not for legal text, and not for the strings of LUZ's own scripts (those are JSON files of core).
