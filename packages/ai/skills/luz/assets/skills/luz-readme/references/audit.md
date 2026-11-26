# Audit

Run before showing a draft. Two passes, then a score. Fix and re-run on what changed.

## Pass 1: tells

Against [ai-tells.md](ai-tells.md):

1. Zero hard-hit words and phrases.
2. Zero bold-label bullets in lists of features.
3. Zero emojis and decorative symbols.
4. A few em dashes at most in the whole file.
5. Headings in sentence case, no ampersand pairs, each naming what it holds.
6. No self-announcing sections, closing summaries, transition filler or chatbot residue.
7. Uneven rhythm: sentence and section lengths vary, no triads everywhere.
8. At least two of: an opinion, a limit, an origin, a rough edge.

## Pass 2: truth

- Title and subtitle: the title matches the manifest or repo name. The subtitle passes the portability test and every claim in it is verifiable.
- Cover: exists, current, real alt text. SVG opened in a browser by the person, or said to be unchecked.
- Section links: every anchor matches a heading, every external link points at something real.
- GitHub data: each badge URL uses the real `OWNER/REPO` from the remote and links to its GitHub page. CI points at an existing workflow file, release only if releases exist, license only if `LICENSE` exists. Plain-line values come from a command you ran. At most eight.
- Fixed sections: What it is, Usage, Installation, Credits and License all present, in that order, with real content. Credits names only real people and material.
- Commands: each one traces to a manifest script, Makefile, Dockerfile or CI file. Flags exist. Copy targets exist or are created.
- Code: every fenced block has a language tag. Shell blocks have no `$` prompt.
- Diagram: present only if needed, drawn from the code, with real names. Removing it would lose information.
- License: badge, last section, `LICENSE` file and manifest agree. Third-party material has its own line. If there is no `LICENSE`, no section claims one and the report says so.
- Versions, requirements and numbers come from files. No placeholders left (`OWNER`, `your-username`, `TODO`).
- External links you could not check, and badges that fail on private repos, are listed in the report.
- Images exist, have meaningful alt text, show the current project, and SVGs were opened in a browser by the person, or the report says they were not checked.
- Dark and light: every image with color has a light and a dark variant in a `picture`, or has contrast on both backgrounds, which the person checks by opening it on a white page and on a near-black one (`#ffffff`, `#0d1117`); say in the report if it was not checked. Badges and Mermaid are fine. No fixed-color HTML.
- Portability test on every paragraph and visual.

## Rubric (100 points)

| Category | Points | Full marks |
|---|---|---|
| First screen | 20 | Title, subtitle, cover, links and GitHub data tell a stranger what it is and where to go in ten seconds. |
| Truth | 20 | Every command, badge, link, version, number and license reference checked. Nothing invented. |
| Specificity | 20 | Passes the portability test throughout. Claims backed by facts or file links. |
| Voice | 15 | One human voice, no tells, at least an opinion or a rough edge. |
| Fit to the repo | 15 | Sections, diagram and signature match this project's type and seriousness. Nothing a template would add by default. |
| Structure and length | 10 | No empty sections, uneven sizes, depth tucked away, within the ceiling. |

90 to 100: ready. 85 to 89: show and name the weakest category. Below 85: keep working.

## Final read

Read it from the top as a stranger. Can you say what it is in one sentence? Can you start without leaving the page? Is there one thing you would remember tomorrow? Is there a line nobody checked? Fix any no.
