// The structure block of /catalog/: every piece of the navigation and page-structure groups, live, as three little
// sites of one bookshop, Albar: its home page (site-header with the navbar, a submenu open and the language switch
// open; a hero, a section, the site-footer), its journal (masthead, page-header, article-header) and its back office
// (sidebar beside the app-bar). Each is a card titled with the names of its pieces, over its markup.
// No popover attribute anywhere: the navbar is a row from 769 px and its panel drawn open below, as a phone shows it,
// and the language list is drawn open from 769 px; the toggle shows where the navbar is a panel; and
// the sidebar is a static column (no data-luz-spy, no href, so catalog.js's scroll spy finds nothing to watch).
export function panel({ t, html }) {
  const w = (key) => t(`level.catalog.structure.${key}`);
  const names = (list) => list.map((n) => `<code>${n}</code>`).join(" ");
  const card = (cls, pieces, live, code) =>
    `<div class="landing-card landing-cat-structure__card landing-cat-structure__card--${cls}"><p class="landing-card__title landing-cat-structure__names">${names(pieces)}</p><div class="landing-core__live landing-cat-structure__frame" inert>${live}</div>${html(code)}</div>`;
  const link = (key, current = "") => `<li><a class="luz-navbar__link"${current}>${w(key)}</a></li>`;
  const globe =
    '<svg class="luz-lang-switch__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5Z"/></svg>';

  // The home page: the header with its links (Books open), the language list open, a hero, a section, the footer
  const site = [
    `<header class="luz-site-header">`,
    `<div class="o-container o-container--inline o-row">`,
    `<button class="luz-nav-toggle" type="button" aria-expanded="true" aria-label="${w("nav.menu")}"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></g></svg></button>`,
    `<a class="luz-site-header__brand">Albar</a>`,
    `<nav class="luz-navbar" aria-label="${w("nav.label")}"><ul class="luz-navbar__list">`,
    link("nav.home", ' aria-current="page"'),
    `<li><luz-submenu><details open><summary>${w("nav.books")}</summary><ul>${link("nav.novels")}${link("nav.poetry")}${link("nav.essays")}</ul></details></luz-submenu></li>`,
    link("nav.events"),
    `</ul></nav>`,
    `<div class="o-row luz-site-header__actions">`,
    `<luz-lang-switch class="landing-cat-structure__lang"><button class="luz-lang-switch__button" type="button">${globe}<span class="u-sr-only">${w("lang.label")} </span><span class="luz-lang-switch__name">English</span></button>`,
    `<nav class="luz-lang-switch__menu" aria-label="${w("lang.title")}"><p class="luz-lang-switch__title">${w("lang.title")}</p><ul class="luz-lang-switch__list"><li><a class="luz-lang-switch__link" hreflang="en" lang="en" aria-current="true">English</a></li><li><a class="luz-lang-switch__link" hreflang="es" lang="es">Español</a></li><li><a class="luz-lang-switch__link" hreflang="ar" lang="ar" dir="rtl">العربية</a></li></ul></nav></luz-lang-switch>`,
    `</div>`,
    `</div>`,
    `</header>`,
    `<section class="luz-hero o-grid o-grid--split" aria-label="${w("hero.title")}">`,
    `<div class="luz-hero__copy"><p class="luz-hero__eyebrow">${w("hero.eyebrow")}</p><p class="luz-hero__title">${w("hero.title")}</p><p class="luz-hero__lead">${w("hero.lead")}</p><div class="o-actions"><a class="luz-btn luz-btn--primary">${w("hero.cta")}</a><a class="luz-btn luz-btn--outline">${w("hero.cta2")}</a></div></div>`,
    `<div class="luz-hero__media"><div class="luz-image luz-image--4x3"></div></div>`,
    `</section>`,
    `<div class="o-stack luz-section">`,
    `<div class="o-row"><p class="luz-section__title">${w("section.title")}</p><a class="luz-section__more">${w("section.more")}</a></div>`,
    `<div class="landing-cat-structure__shelf">${'<div class="luz-image luz-image--16x9"></div>'.repeat(3)}</div>`,
    `</div>`,
    `<div class="luz-site-footer"><div class="o-container o-container--inline o-row"><p class="u-text-muted">Albar · ${w("footer.tagline")}</p><div class="o-actions"><a class="luz-btn luz-btn--ghost luz-btn--sm">${w("footer.hours")}</a><a class="luz-btn luz-btn--ghost luz-btn--sm">${w("footer.gift")}</a></div></div></div>`,
  ].join("");

  // The journal: the masthead over a page header and the header of its first article
  const blog = [
    `<header class="luz-masthead">`,
    `<div class="o-container o-container--inline o-stack">`,
    `<div class="o-row luz-masthead__top"><p class="luz-masthead__date"><time datetime="2026-10-14">${w("blog.date")}</time></p><div class="o-row luz-masthead__actions"><a class="luz-btn luz-btn--ghost">${w("blog.subscribe")}</a></div></div>`,
    `<a class="luz-masthead__brand">${w("blog.brand")}</a>`,
    `<div class="o-row luz-masthead__sections"><nav class="luz-navbar" aria-label="${w("blog.nav")}"><ul class="luz-navbar__list">${link("blog.reviews", ' aria-current="page"')}${link("blog.interviews")}${link("blog.news")}</ul></nav></div>`,
    `</div>`,
    `</header>`,
    `<div class="luz-page-header"><p class="luz-page-header__title">${w("blog.reviews")}</p><p class="luz-page-header__lead">${w("page.lead")}</p></div>`,
    `<header class="luz-article-header">`,
    `<p class="luz-article-header__kicker"><a>${w("nav.poetry")}</a></p>`,
    `<p class="luz-article-header__title">${w("article.title")}</p>`,
    `<p class="luz-article-header__standfirst">${w("article.standfirst")}</p>`,
    `<div class="luz-article-header__byline"><span class="luz-avatar luz-avatar--lg" aria-hidden="true">AR</span><div><p>${w("article.by")} <a>Ana Ruiz</a></p><p class="luz-meta"><time datetime="2026-10-12">${w("article.date")}</time> <span>${w("article.read")}</span></p></div></div>`,
    `</header>`,
  ].join("");

  // The back office: the sidebar as the column of an application, the app bar over the view
  const app = [
    `<div class="landing-cat-structure__shell">`,
    `<nav class="luz-sidebar" aria-label="${w("app.nav")}">`,
    `<div class="luz-sidebar__brand"><div class="luz-sidebar__brand-name"><span class="luz-sidebar__logo" aria-hidden="true">A</span>Albar</div><div class="luz-sidebar__version">v2.4</div></div>`,
    `<div class="luz-sidebar__section"><div class="luz-sidebar__section-label">${w("app.shop")}</div><a class="luz-sidebar__link is-active" aria-current="page">${w("app.orders")}</a><a class="luz-sidebar__link">${w("app.stock")}</a><a class="luz-sidebar__link">${w("app.customers")}</a></div>`,
    `</nav>`,
    `<div class="landing-cat-structure__main">`,
    `<header class="luz-app-bar"><div class="o-row"><div class="o-row luz-app-bar__actions"><button class="luz-btn luz-btn--ghost luz-app-bar__account" type="button"><span class="luz-avatar luz-avatar--sm" aria-hidden="true">AM</span> <span class="luz-app-bar__account-name">Ana Martín</span></button></div></div></header>`,
    `<div class="o-stack landing-cat-structure__view"><h3 class="landing-cat-structure__heading">${w("app.orders")}</h3><span class="landing-wire"></span><span class="landing-wire"></span><span class="landing-wire"></span></div>`,
    `</div>`,
    `</div>`,
  ].join("");

  return {
    panel: [
      `<div class="landing-cards landing-cat-structure">`,
      card("site", ["site-header", "navbar", "submenu", "lang-switch", "hero", "section", "site-footer"], site, '<nav class="luz-navbar">…<luz-submenu>…</luz-submenu></nav>\n<section class="luz-hero">…</section>'),
      card("blog", ["masthead", "page-header", "article-header"], blog, '<header class="luz-masthead">…</header>\n<header class="luz-article-header">…</header>'),
      card("app", ["sidebar", "app-bar"], app, '<nav class="luz-sidebar">…</nav>\n<header class="luz-app-bar">…</header>'),
      `</div>`,
    ].join(""),
    aside: html('<link rel="stylesheet" href="…/components/site-header.min.css">\n<link rel="stylesheet" href="…/components/navbar.min.css">'),
  };
}
