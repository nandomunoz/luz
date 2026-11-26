# Creative toolkit

Optional moves that give a README identity. Use one signature and a few supporting moves, never all. An element earns its place only if it carries information or identity: if it still fits after swapping the project name, it is decoration.

## What GitHub renders

**Works:** `div`, `p`, `br`, `table`, `details`/`summary`, `picture`/`source`, `img` (with `width`, `height`, `alt`), the `align` attribute, `kbd`, `sub`, `sup`, alerts (`> [!NOTE]`, `[!WARNING]`...), footnotes, task lists, fenced code with highlighting, Mermaid, math, HTML comments.

**Does not work:** `style`, `class`, `<style>`, `<script>`, `<iframe>`, forms, custom fonts or colors, `target="_blank"`.

npm, PyPI, crates.io and other hosts render less. If the README is shown there, keep the top in plain Markdown plus `align` and `img`, and put `picture`, `details` and Mermaid lower down.

## Signature ideas

Let the form of the README say what the project is, while the first screen still says what it is and how to start.

- CLI: a man-page block (NAME, SYNOPSIS, EXAMPLES) under a plain intro, or a real terminal transcript.
- Parser, compiler, converter: input and output side by side in a two-column table.
- Game: controls as a table with `kbd`.
- Font, icons, tokens: a real specimen.
- Agent or skill pack: a verbatim excerpt of the rule that makes it behave differently, or a real before and after.
- Tiny library: the whole README fits one screen. Restraint is the idea.
- Research: method before claim, dated entries.

## Hand-built SVG

The only way to get color and motion with no CSS in the page.

- Store in `assets/`, reference with a relative path, set `viewBox`, `role="img"`, `aria-label` and `<title>`.
- System font stack only. For dark and light, ship two files (`name-light.svg`, `name-dark.svg`) and use `picture` with `prefers-color-scheme`, which follows the theme chosen on GitHub. Colors in both files are CSS variables or plain values chosen for contrast on `#ffffff` and `#0d1117`. A single SVG with a media query inside follows the operating system instead, so it can clash with the GitHub theme.
- SVG collapses whitespace: leading spaces in `<text>` vanish. Indent with `x`.
- Motion slow and small, one `@keyframes` with per-element delays (`style="--d:0.4s"`), off under `prefers-reduced-motion`.
- Text drawn in an image is a second copy of the truth. Say in the report that it goes stale.
- Check it renders in a real browser, and let the person do it: ImageMagick ignores CSS and shows a blank image, so do not use it. Show the SVG in the draft, write it to `assets/` only after approval, and ask the person to open the file in their own browser. Do not run a browser yourself, and never one with its sandbox turned off. Never render an SVG that came from the repository: it can carry script. If the person cannot check it, say in the report that the asset was not checked.

## Tables as layout

- Two columns for before and after, input and output, two modes.
- A comparison that includes where the project loses.
- Routing tables that send a reader by intent, each row carrying a real rule: "You want / Install / Load, in this order" for adoption levels, "I want to / How" for use, copy, fork, report, contribute.
- Never a table for a plain list of features.

## Code blocks as canvas

- An annotated file tree, one honest comment per important entry.
- A command cheat sheet aligned in columns.

## Other moves

- `<details><summary>Specific label</summary>` for full options, platform notes, long references. Leave a blank line after `<summary>`.
- One status alert (`> [!WARNING]`) on the first screen when the project is beta: what can change and what to do (pin a version).
- Two audiences: users above, maintainers below a single horizontal rule with a sentence that names the split.
- Link each claim to the file that proves it.

## Voice

- First person when there is one author, "we" only for a real team.
- One opinion or deliberate trade-off. One honest rough edge. A short origin from the git history.
- Humor only if it fits the author, and one good line at most.

## How far to go

Serious infrastructure or security: restraint and precision. Personal project: more voice and story. Creative or design project: a hand-built SVG hero is justified. If the user asks for "cool" with no more direction, do not ask: add a real signature (SVG, diagram, excerpt) and say what you left out (emojis, stat cards, generated banners) and why.

## Never

- Stat cards, streak counters, typing-animation services, trophy banners.
- Generated gradient banners that carry no information.
- Fake screenshots or mock-ups of a UI that does not exist.
- Large GIFs. Prefer a small SVG or an optimized recording.
- A visual the reader must decode before learning what the project does.
