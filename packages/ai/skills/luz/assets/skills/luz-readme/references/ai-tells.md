# Stock phrases of machine-written READMEs

Read it twice: before you draft, so you do not write these, and in the audit, to find them and put something checkable in their place.

No single item proves who wrote a README, and people write every one of them too. What gives a text away is how many there are and how alike they look. Swapping one word for a synonym changes nothing. Replacing a vague sentence with a fact does.

How to count: a **hard** pattern is rewritten wherever it appears. A **soft** pattern is left alone the first time and rewritten from the third.

## 1. Adjectives that claim and show nothing

Hard: robust, seamless, powerful, comprehensive, cutting-edge, next-generation, effortless, game-changing, revolutionary, supercharge, unlock, leverage, utilize, empower, streamline, elevate, delve, holistic, "best practices" with no practice named, "battle-tested" with no place named, "lightning-quick".

Soft: simple, easy, modern, lightweight, flexible, scalable, clean, elegant, minimal, production-ready, ecosystem, solution.

Fix: put the number or the example where the adjective was. "Lightweight" becomes "11 kB gzipped, no dependencies". "Easy to configure" becomes "one file, `config.toml`, five keys". When nothing can be counted or shown, cut the claim.

## 2. Openings that clear their throat

Hard:

- "More than just X": the "not only X but also Y" and "it is not X, it is Y" frames.
- "No matter how much experience you have".
- A first line about how quickly software, the web or AI is changing.
- "Picture this", "Say farewell to X", "The truth is", "At the heart of".
- A heading phrased as a question and answered with a sales pitch.
- A sentence set on its own line to sound weighty.

Fix: the first sentence of a section says what the thing is or what it does. The reason for it comes after, and only if it is not obvious.

## 3. Rhythm that repeats

- Triplets: three adjectives in a tagline, three bullets under each heading, three use cases. Write as many as the project has.
- Sections of the same length and sentences of the same length. A README written by hand is lumpy: one section takes a line, another a screen.
- Three sentences in a row that start with the same word.
- A long dash joining every clause. A full stop, a comma or a colon is usually the right mark.
- Hedges piled up ("could possibly help in certain situations"). Keep one only when you can name the case it is for.
- Connectors that connect nothing: "Furthermore", "Moreover", "Additionally", "In summary".

## 4. Praise where a fact belongs

- A verdict instead of a description: "a testament to the team's craft", "ushers in a new era", "rethinks what is possible".
- A closing clause that markets: "..., perfect for teams of any size", "..., so everything just works". Delete it.
- A crowd nobody can check: "loved by the community", "adopted across the industry", "the de facto choice". Give a name or a figure, or remove it.
- A grand verb where a short one works: "serves as", "boasts", "offers", "enables you to". Say "is", "has", "does".
- The author admiring the design: "a thoughtfully crafted interface".

## 5. Shape that all generated READMEs share

- **Bold word, colon, empty phrase** as the form of every bullet (`- **Reliable:** works as expected.`). Write the bullet as a plain sentence about this project, or drop the bold word.
- Emoji or ornament (ticks, rockets, sparkles, coloured dots) in headings and lists.
- Headings in Title Case joined by an ampersand ("Setup & Configuration"). Use sentence case and say what the section contains.
- One skeleton for every repository: Features, Installation, Usage, Contributing, License, Acknowledgements. Keep a section only when you have something to put in it.
- A table of contents above a README that fits on one screen.
- A row of badges that answers no question a visitor asks. [anatomy.md](anatomy.md) names the few worth keeping.
- A horizontal rule between every pair of sections.
- A sentence that introduces the table or the list that follows. The heading has already done that.
- A recap of the whole page at the bottom. Stop at the last fact the reader needs, usually the licence.
- "Built with passion" or "Contributions are welcome!" standing in for how to contribute.

## 6. Left over from a chat

- "Sure, here is the README", "Hope this is useful", "Don't hesitate to".
- Statements about its own knowledge: "to the best of my knowledge", "this may have changed".
- Template residue: `your-org/your-repo`, `Project Title`, `TODO`, `[Insert description]`, lorem ipsum.
- Instructions for what the reader knows already: installing Node, what a terminal is.
- A biography or sponsor banner before the first screen of the project itself.
- Examples that do not run: a command with no script behind it, an option the program does not take.

## 7. What is absent

The surest sign is what is not there, and no edit can remove an absence, only fill it:

- no claim anyone could disagree with;
- no limit, no non-goal, no open problem;
- no reason the project was started, no past;
- nothing odd or particular to this project, every feature phrased the same way.

Fix: write what only the author can. Why the project exists, a trade-off taken on purpose, something it refuses to do, a rough edge that is still there, an opinion held firmly.

## 8. Other languages

Each family above has its own versions in every language. Run the same checks on the language the README is in, and keep technical words in the form that community uses. In Spanish, watch for "en un mundo cada vez más digital", "potente", "robusto", "de forma fluida", "eleva tu proyecto", "una herramienta todo en uno", "más que un simple X". In another language, look for the same families: the claim with nothing behind it, the opening before the point, the repeated rhythm.
