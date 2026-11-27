---
"@luz-ds/core": patch
---

On paper, `::before` and `::after` lose their shadow, transition and animation like every element (the print rule listed them inside `:where()`, where a pseudo-element is dropped), and the focus ring of the custom-theme button (`.luz-theme-apply-btn`) uses `--luz-focus-ring` like every other control instead of `--luz-sidebar-text-hover`, a token of the sidebar, which core no longer reads.
