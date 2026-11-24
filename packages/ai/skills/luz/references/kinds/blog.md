## The kind of site: a blog

A blog is a site of articles. Ask:

1. The CMS or generator, and its templates folder: ask before changing one.
2. The templates: home, post list, article, page, search, 404.
3. The header: one row with sections and a search, or a masthead.
4. The article: contents, author, related posts, comments.

Start from this skeleton: a list or an article in one `main`. One-row header: `luz-site-header luz-site-header--publication`. `luz-nav-toggle` needs `components/sidebar.css`.

`<luz-search>`: `a[data-luz-search-fallback]`, `button.luz-search__trigger[data-luz-search-open][hidden]` and `dialog.luz-modal.luz-search[data-luz-search-src]` (the JSON index) holding `input`, `[role=status]`, `[data-luz-search-results]`.

The skeleton of the page is `assets/templates/blog.html.tpl`: `site new --kind blog` writes it, and you fill it in.
