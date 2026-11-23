# What to review, and who does it

Go through each list on the page the check cannot see. If you have a helper for a review, give it the list and the files; if you have none, do it yourself, in this order. The check never replaces a list: it reads source files, not names, labels or the language of a page.

## Structure and accessibility

- Every page has `lang`, one `h1`, landmarks (`header`, `nav`, `main`, `footer`) and a skip link that reaches `main`.
- Native elements do the job (`button`, `a`, `dialog`, `details`, `form`, `table`). ARIA only where no element does it.
- Every image has `alt` text that says what it shows, or `alt=""` when it is decoration.
- Every control has a visible label. The current page has `aria-current="page"` in the navigation.
- The page works without JavaScript. A state class such as `is-active` is set by LUZ's scripts and never typed.

## Style

- Colours, spacing, type and radii come from tokens (`var(--luz-…)`), never from literal values. No `style` attribute.
- The project's own CSS goes in the layer `site`, after LUZ's links, and starts the layers with `@layer luz, site;`.
- No other CSS framework.

## Content

- No "…" is left in the page: `site new` printed how many there were.
- The title, the description and the names are the person's, not placeholders.

## What nobody here can verify

Say it to the person: whether the labels and the alt text are right, the contrast of their own colours, and how a screen reader reads the page.
