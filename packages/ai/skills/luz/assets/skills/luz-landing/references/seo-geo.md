# SEO and GEO rules

SEO: search engines find, understand and show the page. GEO (Generative Engine Optimization): AI assistants and generative search understand the page, trust it and cite it. The SEO rules are the floor: a page that is not crawled is not cited either.

Generative engines change often. Treat the GEO rules as reasonable practice, not as a guarantee.

## SEO, common to both types

**Intent and content**

- One landing answers one search intent. If it answers two, it is two pages.
- The main search appears in the `title`, the `h1`, the first paragraph and the URL, written the way a person would write it. Never forced.
- No other page of the site competes for the same search.

**Metadata**

- Unique `title`, about 50 to 60 characters, the important part first.
- Unique `meta description`, about 140 to 160 characters, with the benefit and the action. It does not rank, it decides the click.
- `<link rel="canonical">` on every page.
- Correct `<html lang>`. With several languages, reciprocal `hreflang` and one URL per language.
- Open Graph and Twitter Card: title, description and a 1200 x 630 image.

**HTML structure**

- One `h1`. Heading levels without jumps.
- Semantic HTML: `header`, `nav`, `main`, `section`, `footer`.
- Buttons are `<button>`, links are `<a href>`. A link without `href` is not crawled.
- The text that must rank is in the initial HTML.
- Accordion and tab content is in the HTML even when collapsed. `<details>` does it without JavaScript.

**Crawling and indexing**

- Short URL, lowercase, hyphens, no parameters.
- `robots.txt` and `meta robots` without accidental blocks. Sitemap up to date.
- Internal links with descriptive text. No "click here".

**Performance (Core Web Vitals)**

- Targets: LCP under 2.5 s, INP under 200 ms, CLS under 0.1.
- The hero image has `fetchpriority="high"` and no `loading="lazy"`. Images below the first screen are lazy.
- Every image has `width`, `height`, a modern format (AVIF or WebP) and a descriptive `alt`.
- Fonts with `font-display: swap`, and the main one preloaded.
- Mobile first: what does not work at 360 px wide is not finished.

**Structured data (JSON-LD)**

- Mark up only what is visible on the page and true. Markup for reviews or ratings that do not exist can bring a penalty.
- `Organization` and `WebSite` on the home. `BreadcrumbList` when there is a hierarchy.
- Structured data helps the page be understood. It does not guarantee rich results.

## SEO, standard landing

- `Product` with `Offer` (price, currency, availability) for each product sold. `AggregateRating` and `Review` only with real, visible reviews.
- With a physical shop or a service area: `LocalBusiness` with name, address and phone identical to the footer.
- The showcase and the categories link to their pages with a real `<a href>`. They are the most valuable internal links of the page.
- Unique text on each product and category card. The manufacturer's description is not copied.
- Product images carry an `alt` with the product name and its variant.
- The FAQ holds the real purchase questions. The answers contain the facts (delivery time, return days) instead of pointing to another page.

## SEO, landing with an integrated service

- The widget is not content for a search engine. What ranks is the text around it: headline, subheadline, how it works, advantages and FAQ, all in the initial HTML.
- The `h1` is the task with its verb: "Convert PDF to Word", not "The best document tool".
- The widget does not slow the page: it reserves its space with fixed dimensions (CLS), loads heavy JavaScript when the visitor interacts, and is not the LCP element if it depends on JavaScript.
- Without JavaScript the page still shows the text, and a notice where the widget would be.
- `WebApplication` or `SoftwareApplication` with `applicationCategory`, `operatingSystem` (for example "Web") and `offers` (price 0 when the basic use is free).
- The directory of variants is the SEO strategy: each variant ("X to Y") has its own URL, `title`, `h1`, text and preconfigured widget.
- A variant that only changes two words is duplicate content. If nothing specific can be written about it (formats, limits, a use case), it does not deserve a page.
- Each variant links to the main tool and to its siblings. The footer repeats the most searched ones.
- The state of the widget (result, loaded file) does not create indexable URLs. If there are parameters, the canonical points to the clean URL.
- The limits shown next to the button match the FAQ and the plans table.

## GEO, common to both types

**Answers that can be cited**

- Each section opens with the answer in one or two sentences, then develops it.
- Key sentences make sense out of context: they name the product instead of saying "this" or "our solution".
- Concrete facts with their unit: price, time, size, number of formats. "25 MB per file" gets cited. "Large files" does not.
- A one-sentence definition near the top: "X is a ... that ...".

**Clear entity**

- Who the brand is, what it offers and where it operates, said the same way in the text, the footer and the structured data.
- The same product name across the page. No creative synonyms.
- `sameAs` in `Organization` with the official profiles.

**Trust**

- A visible last-updated date when facts expire (prices, limits).
- Links to "about", contact and legal policies.
- Figures carry their source or their date.

**Machine-readable format**

- The main content is in the initial HTML. Many AI crawlers do not run JavaScript.
- Comparisons go in a `<table>` with headers. Steps in an `<ol>`. Lists in a `<ul>`.
- FAQ questions are written the way a person would ask an assistant, with the full answer right below.

**AI crawlers**

- Which AI crawlers `robots.txt` allows (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and others) is a business decision. It is made on purpose, by the user, and the configuration is checked against it.
- Blocking training and allowing search are different things and go in different rules.
- `llms.txt` is optional. It is not a universally adopted standard.

## GEO, standard landing

- One sentence that says what is sold, for whom and what sets it apart, with verifiable facts.
- Price, delivery time, returns and guarantee written as text, not only in images or icons.
- A specification or comparison table when there are several options.
- The reviews shown carry detail (what it was used for, what changed). "Love it" gives an assistant nothing.
- The FAQ covers comparison questions: "how is it different from", "who is it not for".

## GEO, landing with an integrated service

- One sentence that says what the tool does, with which input and which output: "X converts PDF files into editable Word documents in the browser".
- The "How it works" steps are a numbered list and each one stands alone. They are the answer to "how do I do X".
- Formats, limits, price of the free and paid plans, in text and in a table. An assistant needs them to recommend the tool.
- The data policy in one citable sentence: what is stored, for how long and where it is processed.
- If there is an API, one sentence on what it does and the link to its documentation. AI agents are users too.
- The FAQ answers yes or no first and then explains: "Is it free? Yes, up to 10 files a day of 25 MB each."

## Final checklist

**Type**

- [ ] The type is decided and can be justified in one sentence.

**Anatomy**

- [ ] The first screen says what it is and what can be done, without scrolling.
- [ ] Standard: one main CTA, repeated down the page.
- [ ] Integrated service: the widget works in the hero, limits in sight, no account asked.
- [ ] Integrated service: the privacy message sits next to the widget.
- [ ] The FAQ answers the real brakes of that type of landing.

**SEO**

- [ ] `title`, `meta description`, `canonical`, `lang` and Open Graph.
- [ ] One `h1` with the main search and clean heading levels.
- [ ] The text is in the initial HTML.
- [ ] Images with `alt`, `width` and `height`. The hero image has priority.
- [ ] JSON-LD of the right type, consistent with what is visible.

**GEO**

- [ ] A one-sentence definition of the product near the top.
- [ ] Concrete facts (prices, limits, times) are in text.
- [ ] Comparisons in a table, steps in a numbered list.
- [ ] Nothing invented: reviews, figures and logos are real or marked as sample.
