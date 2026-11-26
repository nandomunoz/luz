# The files around the head

Create a file only if it does not exist. If it exists, show the change as a diff and keep what the person already decided.

## robots.txt

At the root of the site.

```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- Never `Disallow: /` unless the person says the site is not to be indexed.
- **The crawlers of AI services are the person's decision.** Ask for each one you want to name (for example the crawlers that train a model and the ones that fetch a page for a user's question): allow, or block with its own `User-agent` group and `Disallow: /`. Name only crawlers whose `User-agent` the person knows or gives you; do not copy a list from memory as if it were current. If `robots.txt` already has a stance, keep it and say what it is.
- It is a request that well-behaved crawlers follow. It is not security.

## sitemap.xml

- The canonical URLs of the pages that should be found, absolute, `https`, one `<url><loc>` each. Add `<lastmod>` only when the project knows the date (git, a front matter field), never a guessed one.
- Pages with `noindex`, redirects and duplicates stay out.
- One file for up to 50,000 URLs; `xhtml:link` alternates for languages when the site has them.
- Say that the file lists what the project has on disk, and that you could not check that the URLs answer.

## llms.txt

A plain-text (Markdown) file at the root that describes the site for an AI reader: `# Name`, a one-line quote of what it is, and sections of links with a short note each. Only links to pages that exist, written in the site's words. It is a convention, not a standard that any engine promises to read: do not promise it will be read or that it brings citations. If the project's generator already writes one, do not write it by hand.

## Web manifest

`manifest.webmanifest` (JSON): `name`, `short_name`, `start_url`, `display`, `icons` that exist (a 192 and a 512 px file), `theme_color` and `background_color` from the site's own values. Only for a site that is meant to be installed; ask first. Link it from the head.

## What you cannot check

Whether a crawler reads these files, how often, or what it does with them. Say it in the report.
