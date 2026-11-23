/**
 * The catalog's page was /components/ and is /catalog/ (owner, 2026-11-23). The old address, in every language, is a page
 * that redirects (scripts/docs-site/redirect.js): a static host cannot answer with a 301, so the page says it with
 * `<meta http-equiv="refresh">`, a canonical link and a link, by a path that holds under any base path (the siblings'
 * `../catalog/`), and tells search engines not to index it.
 */
import { describe, expect, it } from "vitest";
import { MOVED, renderRedirect } from "../scripts/docs-site/redirect.js";

describe("the old address of the catalog redirects", () => {
  it("moves /components/ to /catalog/, and nothing else", () => {
    expect(MOVED).toEqual([{ from: "components/", to: "catalog/" }]);
  });

  it.each([
    ["/components/", "/catalog/", "en", "ltr"],
    ["/es/components/", "/es/catalog/", "es", "ltr"],
    ["/ar/components/", "/ar/catalog/", "ar", "rtl"],
  ])("%s refreshes to its sibling, points its canonical link at %s and keeps out of the index", (from, to, lang, dir) => {
    const html = renderRedirect({ from, to, lang, dir });
    expect(html).toContain(`<html lang="${lang}" dir="${dir}">`);
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=../catalog/">');
    expect(html).toContain(`<link rel="canonical" href="${to}">`);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain(`<a href="${to}">${to}</a>`);
    expect(html).not.toMatch(/<script/i);
  });

  it("writes an absolute canonical address under the site's URL (which ends in a slash) in the pages build", () => {
    expect(renderRedirect({ from: "/components/", to: "/catalog/", lang: "en", dir: "ltr", siteUrl: "https://luz.example/luz/" })).toContain('<link rel="canonical" href="https://luz.example/luz/catalog/">');
  });

  it("refuses a redirect that is not to a sibling route", () => {
    expect(() => renderRedirect({ from: "/components/", to: "/docs/catalog/", lang: "en", dir: "ltr" })).toThrow(/sibling/);
  });
});
