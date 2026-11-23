# AI tells in READMEs

A catalogue of patterns that make a README read as machine-written, with the fix for each. Use it in two places: while drafting (do not produce them) and in the audit (find and remove them).

Hard hit: fix on sight. Soft hit: harmless once, a tell when it repeats. Fix any soft pattern that appears three or more times.

None of these is proof on its own. Humans write some of them too. The signal is volume and uniformity, so the real fix is rarely a synonym swap. It is replacing a vague sentence with a concrete one.

## 1. Vocabulary

**Hard hits. Never use:**

delve, robust, comprehensive, leverage, seamless, seamlessly, cutting-edge, state-of-the-art, empower, streamline, harness, elevate, embark, pivotal, crucial, meticulous, showcase, beacon, tapestry, landscape (as metaphor), deep dive, unpack, holistic, actionable, best practices, utilize, facilitate, foster, game-changer, paradigm, realm, testament, ever-evolving, intuitive, blazing fast, lightning fast, powerful, next-generation, revolutionize, supercharge, unlock, effortless, out of the box (as marketing), battle-tested (unless you can say where).

**Soft hits:** simple, easy, modern, lightweight, flexible, scalable, enterprise-grade, production-ready, minimal, clean, elegant, ecosystem, solution, journey, world of.

Fix: replace the adjective with the evidence. Not "blazing fast" but "parses a 40 MB file in 0.8 s on a 2020 laptop (script in `bench/`)". If there is no evidence, delete the claim.

## 2. Staging instead of stating

Hard hits:

- "Not just X, but Y" and "It's not X, it's Y".
- "Whether you're a beginner or an expert."
- "In today's fast-paced world", "In the ever-evolving landscape of".
- "Imagine a world where..."
- One-line dramatic closers, "Let that sink in", "And that's it."
- "Here's the thing", "At its core", "What really matters is".
- Rhetorical question headings: "Why use X?", "What is X?" followed by marketing.
- "Say goodbye to X and hello to Y."

Fix: state the point in the first sentence. "X does Y." Then the reason, if it is not obvious.

## 3. Rhythm by rule

- Forced triads: "fast, simple and reliable", three bullets under every heading, three benefits in every tagline. Use the number of items the content has.
- Every sentence the same length. Every paragraph the same size. Every section the same shape. Real documents are uneven. Let a section be one line, another thirty.
- Repeated sentence openings ("This...", "It...", "You can...") three times in a row.
- Em dashes used as the universal connector. Use a period, comma or colon. Keep an em dash only where the author's own writing uses them, and never more than a few in the whole file.
- Stacked hedges: "can potentially help to some extent". Keep only qualifiers you can support.
- Transition filler: "Moreover", "Furthermore", "Additionally", "In conclusion", "Overall".

## 4. Inflation and borrowed authority

- Significance inflation: "a testament to", "marks a new era", "reimagines how we...". Keep the fact, drop the verdict.
- Shallow trailing clauses: "..., making it ideal for modern teams", "..., ensuring a seamless experience". Cut them.
- Vague authority: "widely used", "trusted by developers", "experts agree", "industry-standard". Name the user, the number, or cut it.
- Avoiding plain verbs: "serves as", "boasts", "offers", "features", "provides a way to". Use "is", "has", "does".
- Sales voice in a technical document: "nestled", "crafted with care", "designed to delight".
- Self-referential praise: "a thoughtfully designed API".

## 5. Formatting by rule

- **Bold-label bullets.** The single strongest README tell:
  `- **Fast:** runs quickly.` `- **Flexible:** adapts to your needs.`
  Fix: write the feature as a sentence or a short list of plain items without labels. At most one bold phrase per bullet, and only if a reader scanning needs it.
- Emoji in headings or bullets. Remove all of them.
- Decorative symbols: check marks, arrows, stars, colored circles as ornament.
- Title Case Headings With Ampersands & Pairs ("Features & Benefits", "Installation & Setup"). Use sentence case and name what the section holds ("Run it", "What it will not do").
- Boilerplate section set in the same order in every repo: Features, Installation, Usage, Contributing, License, Acknowledgements, "Show your support". Keep a section only if it has real content.
- A table of contents on a short README.
- Badge soup: more than eight badges, or badges that answer no question a visitor has. The GitHub data section in [anatomy.md](anatomy.md) says which ones earn a place.
- Horizontal rules between every section.
- Sections that announce themselves: "This section covers...", "The table below compares...". Delete the sentence, the heading already says it.
- A closing summary that repeats the page. End on the last useful fact, such as the license line or a pointer to the next doc.
- "Made with love by", "Star this repo if you like it", "PRs welcome!" as the only contribution text.

## 6. Leftovers and wrong reader

- Chatbot residue: "Certainly!", "Here is your README", "I hope this helps", "Feel free to".
- Knowledge-limit hedging: "As of my last update", "details may vary".
- Placeholder remnants: `your-username`, `Project Name Here`, `TODO`, `Lorem ipsum`, `[ADD DESCRIPTION]`.
- Re-explaining what the reader already knows: how to install Node, what git is, what a pull request is.
- Describing the author instead of the project (long bio, sponsor links above the fold).
- Unrunnable examples: pseudocode that looks plausible, `npm start` with no start script, a flag the CLI does not have.

## 7. Structural tells of a generated README

These are not words. They are the overall shape, and readers feel them before they can name them.

- Every project, whatever its nature, gets the same skeleton.
- Every feature gets the same grammatical form.
- No opinion anywhere. No sentence a person could disagree with.
- No limits, no non-goals, no known problems.
- No history. No reason it exists. No "I built this because".
- Perfect symmetry: three features, three steps, three use cases.
- Nothing is quirky, specific or slightly imperfect.

Fix: add what a human would know and an AI would not volunteer. The origin, a trade-off the author made on purpose, a thing it deliberately does not do, one real rough edge, one strong opinion.

## 8. Non-English READMEs

The same patterns exist in every language, with local clichés. Apply the same rules to the target language. Spanish examples to avoid: "en el panorama actual", "sumérgete en", "potente", "robusto", "sin fisuras", "revolucionario", "lleva X al siguiente nivel", "descubre cómo", "no solo X, sino también Y", "una solución integral", "diseñado para ser intuitivo". For other languages, find the equivalents of each section above and treat them the same way. Keep technical terms in the form the community actually uses.

## Prior art

This catalogue draws on the public Wikipedia guide "Signs of AI writing" (WikiProject AI Cleanup) and on ideas from existing open skills such as blader/humanizer, ephemerallyCaden/write-readme and adewale/good-readme. The lists here are rewritten and adapted to READMEs. Review those projects at their source if you want their original rules.
