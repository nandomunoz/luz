---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-badge`: words have room at the sides of the pill. The side padding was 4 px, drawn for a count of one or two digits, so a badge with words ("Changes code, after your go") touched both ends; it is 8 px now, the `xs` step of the space scale. A count keeps its 20 px height and its 20 px minimum width.
