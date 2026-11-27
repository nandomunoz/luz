# Notices

## The licence of the project

`LICENSE` at the root, plain text, with the standard MIT text:

```
MIT License

Copyright (c) <year> <holder>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`<year>` and `<holder>` are the person's answers. A `package.json` of a published package also names it in `license` (`"MIT"`), and the file is listed in `files` or sits where the package manager includes it.

## What kind of work needs a notice

| Work | What to keep next to it |
| --- | --- |
| A font file | `LICENSE-<Font>.txt` with its copyright line and its licence, as it came. |
| An icon set or a file copied from a library | Its copyright line and licence, in a file beside it or in the header of the file if that is how it came. |
| A copied piece of code | The header it had, unchanged. |
| An image, audio or video | The licence and the author, in a file beside it, if it is not the person's own. |

Third-party MIT work keeps its own notice. Do not merge it into the project's `LICENSE` and do not rewrite it.

## What to report, not to accept

List each with its file and where you read the licence, and write what it is in one sentence. Do not rewrite it, do not remove it and do not relicense it.

| Found | Why it goes to the person |
| --- | --- |
| A dual licence (MIT or another) | The project publishes under MIT only; a dual licence is the person's choice to keep or replace. |
| OFL (fonts) | Not MIT. |
| Creative Commons (images, text, audio) | Not MIT. |
| GPL, AGPL, LGPL or another copyleft | It may bind what the project publishes: a lawyer's question. |
| No licence, or the licence "unknown" | Without a licence the work is not free to use: ask who owns it. |
| A licence text that was edited | Compare with the standard text and say what differs. |

## Where to read licences, offline

1. `package.json`: `license`, `licenses`, `author`.
2. `node_modules/<package>/package.json` and its `LICENSE*`, when the folder exists. Do not install anything to look.
3. The lockfile, which may carry a `license` for each entry; if not, it is "unknown".
4. Files beside the assets (`LICENSE*`, `README`, `NOTICE`).

A dependency that is not shipped (a build tool, a test library) does not need a notice in what the project publishes; say which you left out and why.

## Do not say

"Compliant", "fully licensed", "safe to publish", "no legal risk". Say what you read and what you could not verify.
