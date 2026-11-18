---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

A bare checkbox and radio button (no `luz-` class) now draw a dark box in dark mode, and in the system's dark when the page names no mode: `elements/forms.css` gives them `color-scheme: var(--luz-scheme, light)`, the hook the date and time fields and the select already read. High contrast is a light mode here (white surface, black text), so its box stays light. `.luz-*` controls are unchanged.

To pay for the rule, core's block-axis and size properties in a few components and in the utilities are written as logical ones (`inline-size`, `min-block-size`, `margin-block-end`), with no visual change: core 11,764 B and conditional 11,768 B, 7 B and 8 B less than before.

The track of a bare `meter`, `progress` and `range` stays the browser's (below 3:1 against the surface): DESIGN.md writes it as an exception under DR-2 and DR-10, and the Forms page says to use `.luz-meter` or `.luz-progress` for a track with contrast.
