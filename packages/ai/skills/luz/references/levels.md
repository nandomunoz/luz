# Which parts of LUZ a site uses

The person does not choose this; you do, from the answers of the first round.

LUZ has three packages, each needing the one before it:

- **Tokens** (`@luz-ds/tokens`): the values only, as CSS variables: colours, spacing, type, radii. No class, no element style.
- **Core** (`@luz-ds/core`): what every page needs. The bare HTML elements styled with no class, the layout objects (`o-*`), the components every page may use, and the small scripts that enhance them.
- **Catalog** (`@luz-ds/catalog`): what a page links on its own, one stylesheet per piece, when it uses it: the navigation, the charts and data views, the patterns of a kind of site, the pieces with a script of their own.

## The rule

| The person has | Use |
| --- | --- |
| A site of their own whose CSS stays, and wants LUZ's values | Tokens only |
| A new site, or a refactor onto LUZ | Tokens, core, and the catalog stylesheets of the kind of site |
| An existing project that gets some LUZ pieces | Tokens and core first, then the catalog pieces they name, page by page |

For a new site the starter page links the stylesheets that fit its kind, so that a section added later already has its styles: `site new` wrote them. When the page is finished, remove the ones the page does not use. Link them after core, in the order the starter page has.

## Refactoring a site onto LUZ

Do it page by page and say what changed and what is left. Keep the old CSS under a lower layer so it cannot win by order, and list every `!important`: those still win. Search the scripts and templates for a class before removing it. Never delete the old framework or its files without the person's yes for that step.
