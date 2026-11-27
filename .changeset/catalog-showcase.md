---
"@luz-ds/catalog": minor
---

`<luz-showcase>`, a new CSS-only tag (`components/showcase.css`): a row of links, each a logo and a name, for the sites built with something, its users, its customers or its sponsors. Still by default, wrapped and centred. With the `scroll` attribute it is a marquee: the list is written twice (the copy `aria-hidden="true"`, its links `tabindex="-1"`), it stops on hover and on focus, runs the other way right to left, and does not move under reduced motion or on paper. `--luz-showcase-duration` sets how long one loop takes.
