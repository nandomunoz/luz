# Rules of a translation

## Never touch

| What | Why |
| --- | --- |
| The text of `<pre>`, `<code>`, `<kbd>`, `<samp>`, `<var>` | It is code, a command or a key: it must work when copied. |
| `id`, `class`, `data-*`, `name`, `for`, `type`, `role`, every attribute name and every attribute value that is not text | Styles, scripts, anchors and forms read them. |
| `href`, `src`, `action` | A link target stays. A link to a page that exists in the language may be changed only if the plan said so. |
| Heading levels (`h1` to `h6`) and their order | The outline of the page. |
| The element tree | Same elements, same order. |
| Placeholders (`{n}`, `{name}`, `%s`) | A script fills them. Move one in the sentence if the grammar needs it; never drop or rename it. |
| Names of products, of packages and of commands | Unless the glossary says otherwise. |

## Translate

- The visible text of every element.
- The text attributes: `alt`, `title`, `aria-label`, `aria-description`, `placeholder`, and the `content` of `meta name="description"` and of Open Graph titles.
- `<title>`.
- Set `lang` on `<html>` to the target language. A passage that stays in another language (a demo, a quote) carries its own `lang`.

## Figures

Every figure of the source (numbers, versions, dates, sizes, percentages) must appear in the translation. Separators may change with the language (`1,000` and `1.000`), the value does not. Count them before you report.

## Pending review

A machine translation carries the project's flag as not reviewed, and a notice in the page's language if the project has one ("This translation is pending review"). Only a named person who has read the page changes it. If the project has no flag, say so and propose one in the plan; do not invent a field the project does not read.

## Right to left (Arabic, Hebrew, Persian, Urdu)

1. `dir="rtl"` on `<html>` (or on the element that holds the page) and `lang` set.
2. Code blocks, commands, URLs and demos stay left to right: `dir="ltr"` on them, and `lang="en"` on a demo that stays English.
3. A `{placeholder}` that sits in the middle of an Arabic sentence can be wrapped in a bidi isolate (U+2066 to U+2068 before, U+2069 after). No other bidi control (no override, U+202A to U+202E).
4. A font stack that has the script: ask the person which; do not load a font from another host on your own.
5. Look at the page at 320 px, and at a long page, a table and a form. You run no browser: tell the person to look, and what to look for (text cut off, icons that should flip, a number in the wrong place, a table that overflows).
6. A native reader reads it before it goes live.
