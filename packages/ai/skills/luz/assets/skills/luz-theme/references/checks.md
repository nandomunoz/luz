# Checking a theme

| Command | What it proves | What it does not |
| --- | --- | --- |
| `npx @luz-ds/tokens check-contrast <file>.css` | The contrast of the pairs LUZ keeps readable, in light, dark and high contrast, against the minimums: 4.5:1 for text, 3:1 for disabled text, borders, field borders and focus rings. | Anything about a colour that is not one of those pairs, or about a real page. |
| `npx @luz-ds/check <files>` | That the HTML and CSS use LUZ's classes, elements, load order and colour tokens, and that a theme file's contrast reads as LUZ expects. | Names, labels, alt text, headings, or focus order. A clean run is not an accessibility result. |

## Load order

1. `luz-tokens.css`, then `luz.css` (or the LUZ stylesheets the page uses).
2. The theme file, after them, outside any `@layer`: CSS that is not in a layer wins over every layer of LUZ.
3. On `<html>`: `data-theme="my-brand"`, and `data-luz-themes="my-brand"` so the mode switcher remembers it. `data-mode="dark"` or `"high-contrast"` select the other blocks.

## When a pair fails

Say which pair, its ratio and the minimum. Propose the nearest value that passes in that mode only, and let the person choose between it and a different brand colour. Never write a failing value and never lower a minimum.

## What the person checks themselves

The theme on a real page in the three modes (the specimen page of the docs shows every component in them), a phone in sunlight, the print stylesheet, and whether the brand still looks like the brand.
