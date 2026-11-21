# proto/sitepro

A design proposal for the LUZ site: the home page, the documentation and the 404.
It is a mock-up, in English only and in light mode only. It is not built on the
packages and it does not replace `apps/`: nothing here is linted, tested or
published.

## Look at it

Open `index.html` in a browser. Every page works from the file system.

| Page | File |
| --- | --- |
| Home | `index.html` |
| Docs portal | `docs/index.html` |
| Tutorial | `docs/get-started.html` |
| Component gallery | `docs/components.html` |
| Component page | `docs/button.html` |
| Token page | `docs/color.html` |
| Catalog | `docs/catalog.html` |
| Accessibility statement | `docs/accessibility.html` |
| Not found | `404.html` |

A sidebar entry with no page of its own opens the template of its kind.

## Change it

The HTML at the root and in `docs/` is generated. Edit the sources and rebuild:

```sh
node proto/sitepro/tools/build.mjs
```

- `src/pages/` has one fragment per page, with its facts in a first-line `<!--meta {…} -->`.
- `src/partials/` has the shell, the header, the footers, the docs layout and the search.
- `assets/site.css` and `assets/docs.css` are the styles; `assets/site.js` is the script.
- `assets/look.css` is the look, loaded last: monochrome, ET Book, mono labels, one blue.
- The art is the type scale of LUZ: `{{scale}}` draws one outlined column per step of `tokens.json`, as tall as its size.

The build has no dependency. It reads the version, the number of components and
the weight ceilings from the repository, and it computes every contrast ratio
(`{{cr:ffffff/2b66f0}}`), so no figure in the copy is typed.

## What it follows

`.claude/worktree/proto/proto/GUIA-SISTEMA-DE-DISENO.md`, sections 7 to 9:

- The home says what LUZ is in one sentence, offers two actions, shows the
  version, and puts the proof (a live example and the install line) before
  anything else. Then the pieces, the figures, accessibility with its gaps, and
  a short section for AI. No testimonials, no logos, nothing that moves by itself.
- The docs have grouped navigation with only the current area open, a search
  that lists the sections of the page first, "On this page", previous and next,
  the facts under the title, and related pages at the end.
- A component page starts with the example and follows the order LUZ already has.
- Components are grouped by what the reader wants to do, with an A to Z index,
  and only a piece on trial carries a label.

## Languages

English is the source and Spanish lives under `es/`. The header has an EN / ES
switch that goes to the same page in the other language.

- `src/i18n/es.json` maps each unit of English text (a paragraph, a heading, a
  link, a button, with its inline tags and `{{placeholders}}`) to its Spanish.
  `tools/i18n.mjs` finds the units, so there is no second copy of the markup.
- A unit with no entry stays in English and the build lists it, so a new line
  of copy shows up as untranslated instead of failing quietly. What is left
  today is code, file names and package names, on purpose.
- Code blocks, the two terminal sketches on the home and the contrast figures
  are not translated.
- To add a language: add its code to `LANGS` in `tools/build.mjs` and write
  `src/i18n/<code>.json`. `node tools/i18n.mjs es` lists what is missing.

## Motion

`assets/motion.css` and `assets/motion.js` follow
`.claude/worktree/proto/proto/GUIA-VISUAL-UX-UI.md`, section 14:

- The art is HTML columns drawn from the type scale; it holds still.
- Sections fade in and rise a little as they arrive; section titles ink in letter
  by letter as you scroll (colour, not motion). The first screen is readable at once, with no animation to wait for.
- The marquee is the only loop. It stops on hover, on focus and with its Pause button.
- The three layers are sheets that stack as you scroll; the figures count
  up; the terminal fills in line by line.
- Pages cross-fade into each other (view transitions, Chromium only), and a
  thin bar under the header shows how far you have read.
- With reduced motion, every rise becomes a plain fade and nothing loops.
  Without JavaScript, everything is simply there.

The playground on the home is real: the colour mode is CSS only (`:has()`),
the accordion is `details`, the dialog is `dialog`, the error appears after
you leave the field (`:user-invalid`), and the toast stays until you dismiss it.

Serve it over HTTP to see the transitions between pages, from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

and open `http://127.0.0.1:8765/proto/sitepro/`.

## What is not real

- The palette and the components drawn here (`.x-*`) are the proposal, not LUZ's CSS.
- The output of `luz-check` on the home, the rows of "Status by component" and
  the reading times are examples.
- "Edit on GitHub", "Copy as Markdown" and the Markdown `rel="alternate"` show
  where those would go.

The serif is ET Book, read from `packages/tokens/fonts/` (MIT).
