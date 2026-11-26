# Reading the licences of a project

Read only the project's own files. Never the network, and never a licence from memory as if it were what a package says today.

## Where a licence is written

| Source | What to read | What to say if it is missing |
| --- | --- | --- |
| `package.json` | `license` (an SPDX name such as `MIT`), `author`, `files` | "unknown": ask the person. |
| `LICENSE*`, `COPYING*`, `NOTICE*` at the root | The text and its copyright line | There is no licence file: say so. |
| A folder of a dependency under `node_modules` | Its own `package.json` `license` and its licence file, if the folder is already on disk | "not installed here": do not guess. |
| The lockfile | Names and versions only: most lockfiles do not carry the licence | Do not infer a licence from a name. |
| A font, icon or image folder | A `LICENSE-*.txt`, a `README` or a header comment beside the files | "no notice found": report it. |

## How to sort what you found

1. **MIT** and the text is there: nothing to do, or add the notice next to the work if it ships.
2. **Another permissive licence you can name from its text** (for example BSD or ISC): report it, do not rewrite it. LUZ publishes MIT only, so what this means for the project is the person's decision.
3. **Dual, OFL, Creative Commons, GPL, a custom or a no-commercial text**: put it in the separate list, with the file. Say in a sentence what it asks (attribution, share-alike, no commercial use) only if the text says it. Do not decide.
4. **No licence at all**: that is not permission. Report it as unknown.

## What to write in the report

For each item: the file, the licence as written there, and the action. Never "compliant", "safe to publish" or "no problem". A doubt goes to a lawyer.
