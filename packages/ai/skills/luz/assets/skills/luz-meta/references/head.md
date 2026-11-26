# The head of a page

| Element | What to check | Notes |
| --- | --- | --- |
| `<html lang>` | Present and right for the page | A valid language tag (`en`, `es`, `ar`). For `ar`, `dir="rtl"`. |
| `<meta charset>` and `viewport` | `charset="utf-8"`, first in the head; `width=device-width, initial-scale=1` | Never `user-scalable=no` or `maximum-scale`. |
| `<title>` | One per page, unique, says what the page is | About 50 to 60 characters so it is not cut. The site's name at the end. Not a list of keywords. |
| `meta name="description"` | One per page, a sentence that matches the page | About 70 to 160 characters. A search engine may write its own. |
| `link rel="canonical"` | An absolute URL of the page itself, one per page | Needs the domain. Same on the duplicates of a page. |
| `link rel="alternate" hreflang` | One per language of the page, each pointing to the other, and to itself | Only for languages that exist. |
| Open Graph | `og:title`, `og:description`, `og:type`, `og:url`, `og:image` (absolute URL), `og:site_name`, `og:locale` | `og:image` only if a real image exists: ask, never invent one. Add its `alt` (`og:image:alt`). |
| Twitter card | `twitter:card` (`summary` or `summary_large_image`), plus title, description and image if different from Open Graph | The platforms fall back to Open Graph for what is missing. |
| `meta name="theme-color"` | Optional, from the site's own colour token or value | Do not pick a colour. |
| Icons | `link rel="icon"`, `apple-touch-icon` | Only files that exist. |
| `link rel="manifest"` | Only if a manifest exists | See files.md. |

## JSON-LD

`<script type="application/ld+json">` with data that is visible on the page, in the language of the page.

| Type | When | Fields from |
| --- | --- | --- |
| `Organization` | The site belongs to an organisation | Name, URL, logo (a real file), `sameAs` links already in the page. |
| `WebSite` | Home page | Name, URL. No `SearchAction` unless the site has a search page that takes the query in the URL. |
| `Article` | A post or article | Headline, dates, author and image that the page shows. |
| `BreadcrumbList` | A page with a visible breadcrumb | The same links, in the same order. |

Never add a rating, a review, a price, an address, an opening hour or an event that the page does not show. Valid JSON, no comments. Do not put text from the page into the JSON without escaping it; write the object, do not build it by pasting.

## Common findings

- Same title or description on every page.
- A canonical that points to another page, or to `http` when the site is `https`.
- `og:image` as a relative path.
- `noindex` left over on a page that should be found: ask before you remove it.
- Two descriptions, or two canonicals, in one head.
