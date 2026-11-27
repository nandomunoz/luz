/**
 * LUZ docs site: a page that only sends the reader somewhere else.
 *
 * The page of the catalog was /components/ until 2026-11-23, when it became /catalog/ (owner: "the URL says catalog,
 * not components"). The old address, in every language, is a document of the site that redirects: a static host has
 * no server to answer with a 301, so the page says it with `<meta http-equiv="refresh">`, a canonical link to the new
 * address (search engines treat it as the page that moved) and a link for a reader whose browser does not follow it.
 *
 * It says nothing in words, so it needs no translation: the link is the address itself.
 */

/** The pages that moved: the old path and the new one, both after the language's route (`/es/` + `components/`). */
export const MOVED = [{ from: "components/", to: "catalog/" }];

/**
 * The redirect from `from` to `to`, two routes ("/es/components/", "/es/catalog/"). Both are siblings, so the way
 * between them is `../<last segment>/`, which holds under any base path (the pages build serves from a sub-path).
 */
export function renderRedirect({ from, to, lang, dir, siteUrl = "" }) {
  const name = to.split("/").filter(Boolean).at(-1);
  const sibling = from.split("/").filter(Boolean).slice(0, -1).join("/") === to.split("/").filter(Boolean).slice(0, -1).join("/");
  if (!sibling) throw new Error(`a redirect goes to a sibling route: ${from} → ${to}`);
  const relative = `../${name}/`;
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="0; url=${relative}">
<meta name="robots" content="noindex">
<title>${to}</title>
<link rel="canonical" href="${siteUrl ? siteUrl + to.slice(1) : to}">
</head>
<body>
<p><a href="${to}">${to}</a></p>
</body>
</html>
`;
}
