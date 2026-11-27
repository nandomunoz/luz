---
"@luz-ds/catalog": minor
"@luz-ds/check": minor
---

Two new CSS-only tags. `<luz-showcase>` (`components/showcase.css`): a row of links, each a logo and a name, for the sites built with something, its users, its customers or its sponsors; wrapped and centred. `<luz-marquee>` (`components/marquee.css`): content that loops along one line between two hairlines, fading at both ends, such as a ticker of short phrases or a showcase; write it twice, the second copy `aria-hidden="true"`. It stops while the pointer is over it or something has the focus, runs the other way right to left, and does not move under reduced motion or on paper. `--luz-marquee-duration` sets how long one loop takes.
