---
"@luz-ds/core": patch
"@luz-ds/check": patch
---

`.luz-badge`: the text is centred in its box whatever the mono face. The padding above the text only fitted one face, so the digits and the words of a badge rode about 0.7 px high in the others. Where the browser supports `text-box`, the box of the text is trimmed to the height of the capitals and figures and the padding is the same above and below; the other browsers keep the flex centring they had.
