# The tokens of a theme

What goes in the file, from the template that `@luz-ds/core` ships (`dist/themes/_template.css`). Read the template itself for the exact names: this page says what each group is for.

## The three blocks

| Block | Selector | Mode |
| --- | --- | --- |
| First | `[data-theme="my-brand"]`, with `[data-mode="light"]` and the `:has(…)` path | Light, the default of the theme |
| Second | the same with `[data-mode="dark"]` | Dark |
| Third | the same with `[data-mode="high-contrast"]` | High contrast |

The three are complete on purpose. Never delete a token from a block to "inherit" it.

## The groups of the first block

The headings of the template, in its order: **Surfaces**, **Text** (icons use the same tokens), **Lines**, **Brand**, the solid brand surfaces that carry `--luz-text-on-fill` (the primary button), **Sidebar**, **Status**, **Inputs**, **Extended**, the **Code syntax** colours and the **Charts** series. The dark block adds **Shadows**, drawn heavier on a darker ground. Change a group only where the brand needs it, and keep the others as LUZ has them.

## Optional, in the first block only

Fonts (`--luz-font-body`, `--luz-font-heading`, `--luz-font-serif`), corners (`--luz-radius-sm`, `--luz-radius-md`) and shadows (`--luz-shadow-sm`, `-md`, `-lg`). A font for a script ET Book lacks (Arabic, for one) goes in the stack with its own `lang` rule in the person's CSS.

## How the brand maps

- The brand colour is the **fill of the main action**, and the text on it must reach 4.5:1: white or black, whichever does.
- The same colour is rarely right as **text on the page**: a lighter or darker step may be needed for links, in each mode.
- **Dark mode is not the inverse of light.** Pick the surfaces first (dark, not black), then the text, then the brand step that reads on them.
- **High contrast is for the people who need it:** black on white (and the reverse), borders at full strength, no tints. Do not tint it with the brand beyond the focus ring and the fill.

## What a theme never does

Change a primitive, change a component's CSS, name a class of LUZ, add a token LUZ does not read, or turn off a focus ring.
