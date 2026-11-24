# What makes a README read as machine-written

Two uses: while drafting, do not produce these; in the audit, find them and replace each with something specific.

Nothing here proves anything alone, since people write all of it too. What gives a README away is how much of it there is and how alike it all is. A synonym swap fixes nothing. A vague sentence replaced by a checkable one does.

How to count: a **hard** pattern is fixed wherever it appears. A **soft** one is left alone once and fixed when it shows up three times or more.

## 1. Words that promise and prove nothing

Hard: robust, seamless, powerful, comprehensive, cutting-edge, next-generation, blazing fast, effortless, game-changer, supercharge, unlock, revolutionize, leverage, utilize, empower, streamline, elevate, delve, holistic, "best practices" with no practice named, "battle-tested" with no place named.

Soft: simple, easy, modern, lightweight, flexible, scalable, clean, elegant, minimal, production-ready, ecosystem, solution.

Fix: swap the adjective for the measurement or the example. "Fast" becomes "builds the 300-page docs in 4 s on a laptop, script in `bench/`". If nothing can be measured or shown, delete the claim.

## 2. Sentences that set a scene before saying the thing

Hard:

- "Not just X, but Y", "It is not X, it is Y".
- "Whether you are a beginner or a seasoned developer".
- An opening about the pace or state of the world or of the industry.
- "Imagine ...", "Say goodbye to X", "Here is the thing", "At its core".
- A heading that is a question, followed by a pitch.
- A one-line paragraph written for effect.

Fix: the first sentence of a section says what it is or does. Reasons come second, and only when they are not obvious.

## 3. Rhythm that follows a template

- Lists of exactly three: three adjectives, three bullets, three use cases. Use as many as the project has.
- Sections of one size and sentences of one length. A real README is uneven: one section is a line, another is a page.
- The same first word on three sentences in a row.
- A dash as the joint between every clause. Prefer a full stop, a comma or a colon.
- Hedges stacked on each other ("may potentially help in some cases"). Keep a hedge only if you can say what the exception is.
- Linking words that add no link: "Moreover", "Additionally", "Overall", "In conclusion".

## 4. Praise written as description

- A verdict where a fact belongs: "a testament to", "marks a new era", "reimagines".
- A trailing clause that sells: "..., ideal for modern teams", "..., ensuring a smooth experience". Cut the clause.
- A crowd that cannot be checked: "trusted by developers", "widely used", "industry standard". Name who, or how many, or remove it.
- A fancy verb where a plain one fits: "serves as", "boasts", "offers", "provides a way to". Write "is", "has", "does".
- The author praising their own design: "a carefully designed API".

## 5. Layout that every generated README shares

- **Bold label, colon, vague phrase** as the bullet pattern (`- **Fast:** runs quickly.`). The commonest sign of all. Write the bullet as a sentence, or drop the label.
- Emoji or ornament (check marks, arrows, stars, coloured dots) in headings and bullets.
- Headings in Title Case with an ampersand ("Features & Benefits"). Use sentence case and say what the section holds.
- The same sections in the same order in every repo (Features, Installation, Usage, Contributing, License, Acknowledgements). Keep a section only when it has something to say.
- A table of contents on a README that fits on one screen.
- More badges than questions a visitor has. [anatomy.md](anatomy.md) says which ones earn a place.
- A rule line between all sections.
- A sentence that announces what the next block is ("The table below lists..."). The heading already did.
- A summary at the end that repeats the page. End on the last useful fact.
- "Made with love", "Star this repo", "PRs welcome" as the whole contribution section.

## 6. Traces of the conversation it came from

- "Certainly!", "Here is your README", "I hope this helps", "Feel free to".
- Hedges about its own knowledge: "as of my last update", "details may vary".
- Template leftovers: `your-username`, `Project Name Here`, `TODO`, `[ADD DESCRIPTION]`, lorem ipsum.
- Teaching what the reader already knows: how to install Node, what git is.
- A long author bio or sponsor links above the first screen.
- Examples that cannot run: a command the project has no script for, a flag the CLI does not accept.

## 7. What is missing

The most reliable sign is absence, and nothing in the text can be struck out to fix it:

- no opinion a reader could disagree with;
- no limit, non-goal or known problem;
- no reason the project exists, and no history;
- nothing slightly odd or specific to this project; every feature described in the same grammatical form.

Fix: add what only the author knows. Why it exists, one trade-off made on purpose, something it will not do, one rough edge that is still there, one firm opinion.

## 8. Other languages

Every pattern above has a local version in each language. Apply the same tests to the language of the README, and keep technical terms in the form the community uses. In Spanish, for example: "sumérgete en", "potente", "robusto", "sin fisuras", "lleva X al siguiente nivel", "una solución integral", "no solo X, sino también Y". For another language, look for the same families: the promise with no proof, the scene before the point, the template rhythm.
