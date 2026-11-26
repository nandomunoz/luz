---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`luz.css` and `luz.conditional.css` are lighter (about 125 and 160 bytes gzipped), with no change to how a page looks or behaves: declarations that another rule already gave or that could never apply are gone (the hover underline of a link, which a link already has; `text-decoration: none` on the hover of the breadcrumb and the dropdown items; the padding and border of the hidden table head; a dead cell padding in the stacked table), rules with the same body are merged (the two `dl` spacings, the hover and focus of `<luz-theme-mode>`'s option and button, the two container queries of the table), the tooltip is shifted with `translate` so the anchored version no longer undoes and redoes the shift, and the lists of bare elements are grouped in `:is()` so the conditional build scopes each once.
