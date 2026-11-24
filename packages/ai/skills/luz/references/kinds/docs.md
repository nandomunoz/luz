## The kind of site: documentation

Documentation is a site of pages. Ask:

1. The generator, if any (Starlight, Eleventy…), and its layouts folder.
2. The areas and first pages, by name, and what each has (head, "On this page", previous and next).
3. The search needs a JSON index from the build: can it write one?

Start from this skeleton. `luz-nav-toggle` needs `components/sidebar.css`.

`<luz-search>`: `a[data-luz-search-fallback]`, `button.luz-search__trigger[data-luz-search-open][hidden]` and `dialog.luz-modal.luz-search[data-luz-search-src]` (the JSON index) holding `input`, `[role=status]`, `[data-luz-search-results]`.

The skeleton of the page is `assets/templates/docs.html.tpl`: `site new --kind docs` writes it, and you fill it in.
