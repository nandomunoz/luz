// The site-wide and documentation block of /catalog/: every piece of the docs groups `site-wide` and `documentation`,
// live. Five cards for the pieces that act for the whole site (the announcement, the cookie banner open, the search
// trigger with its fallback, the slider of the day, the page transition drawn as two pages and the fade between them),
// then one documentation page made of the seven pieces of a docs site: the shell (docs-layout) holding the sidebar's
// links, the rail ("On this page" and its actions) and the content, which is the doc header, an example, a Do and
// don't, the pager and the page footer. No <luz-search>, <luz-cookie-consent> or <luz-theme-time> tag (catalog.js
// would load their scripts) and no .luz-sidebar class (it would load the scroll spy): the static markup of the state
// worth showing, with the classes the stylesheets draw.
export function panel({ t, html }) {
  const w = (key) => t(`level.catalog.sitewide.${key}`);
  const link = (file) => html(`<link rel="stylesheet" href="…/components/${file}.min.css">`);
  const card = (name, live, file = name) =>
    `<div class="landing-card landing-card--${name}"><p class="landing-card__title"><code>${name}</code></p><div class="landing-core__live" inert>${live}</div>${link(file)}</div>`;
  const label = (key) => `<p class="landing-core__label">${w(key)}</p>`;

  // The announcement, both tones: one band, and the warning
  const announcement = [
    `<div class="landing-cat-sitewide__bands">`,
    `<luz-announcement><section aria-labelledby="cat-sitewide-ann"><p><strong id="cat-sitewide-ann">${w("ann.label")}</strong> ${w("ann.text")} <a>${w("ann.link")}</a></p></section></luz-announcement>`,
    `<luz-announcement tone="warning"><section aria-labelledby="cat-sitewide-ann-warn"><p><strong id="cat-sitewide-ann-warn">${w("ann.warn.label")}</strong> ${w("ann.warn.text")} <a>${w("ann.warn.link")}</a></p></section></luz-announcement>`,
    `</div>`,
  ].join("");

  // The cookie banner as it asks, in the flow of its card (on a site it is a band at the bottom of the window)
  const cookie = [
    `<section class="luz-cookie-consent" aria-labelledby="cat-sitewide-cookie">`,
    `<h3 class="luz-cookie-consent__title" id="cat-sitewide-cookie">${w("cookie.title")}</h3>`,
    `<p>${w("cookie.text")} <a>${w("cookie.policy")}</a>.</p>`,
    `<form class="o-actions"><button class="luz-btn luz-btn--primary" type="submit" value="all">${w("cookie.accept")}</button><button class="luz-btn luz-btn--primary" type="submit" value="none">${w("cookie.reject")}</button></form>`,
    `<details class="luz-cookie-consent__choices"><summary>${w("cookie.choose")}</summary><form class="o-stack"><fieldset class="luz-fieldset"><legend>${w("cookie.legend")}</legend><div class="luz-check-group"><label class="luz-check-item"><input type="checkbox" value="analytics"> ${w("cookie.analytics")}</label><label class="luz-check-item"><input type="checkbox" value="marketing"> ${w("cookie.marketing")}</label></div></fieldset><div class="o-actions"><button class="luz-btn luz-btn--secondary" type="submit">${w("cookie.save")}</button></div></form></details>`,
    `</section>`,
  ].join("");

  // The search: the trigger the script shows, and the link that stands in for it without JavaScript
  const search = [
    `<div class="landing-core__group">${label("search.js")}<div><button class="luz-search__trigger" type="button" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K"><svg class="luz-search__trigger-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span class="luz-search__trigger-label">${w("search.label")}</span><kbd class="luz-search__trigger-key" aria-hidden="true">Ctrl K</kbd></button></div></div>`,
    `<div class="landing-core__group">${label("search.nojs")}<div><a class="luz-search__fallback">${w("search.fallback")}</a></div></div>`,
  ].join("");

  // The slider of the day with the hour, the place and the moments (on a site, show="time place moments")
  const moment = (value, checked = "") => `<label class="luz-theme-time__moment"><input class="luz-theme-time__input" type="radio" name="cat-sitewide-moment" value="${value}"${checked}>${w(`time.${value}`)}</label>`;
  const time = [
    `<div class="landing-cat-sitewide__time">`,
    `<div class="luz-theme-time__bar"><p class="luz-theme-time__where">${w("time.where")}</p><p class="luz-theme-time__hour">13:00</p><div class="luz-theme-time__day"><label class="luz-theme-time__label" for="cat-sitewide-hour">${w("time.label")}</label><input class="luz-theme-time__slider" id="cat-sitewide-hour" type="range" min="0" max="1439" value="780"></div></div>`,
    `<fieldset class="luz-theme-time__moments"><legend class="luz-theme-time__legend">${w("time.moments")}</legend>${["dawn", "morning"].map((v) => moment(v)).join("")}${moment("afternoon", " checked")}${["sunset", "dusk", "night"].map((v) => moment(v)).join("")}</fieldset>`,
    `</div>`,
  ].join("");

  // The page transition has no look of its own: the page before, the two crossing, the page after, held still
  const frame = (mod) => `<span class="landing-cat-sitewide__frame landing-cat-sitewide__frame--${mod}"><span></span><span></span><span></span></span>`;
  const arrow = `<svg class="landing-cat-sitewide__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-luz-flip><path d="M4 12h15m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const transition = [
    `<div class="landing-cat-sitewide__fade" aria-hidden="true">${frame("a")}${arrow}<span class="landing-cat-sitewide__cross">${frame("a")}${frame("b")}</span>${arrow}${frame("b")}</div>`,
    `<p class="landing-cat-sitewide__note">${w("transition.note")}</p>`,
  ].join("");

  // One page of a documentation site, made of every piece of the documentation group
  const navLink = (key, current = "") => `<li><a class="luz-sidebar__link${current ? " is-active" : ""}"${current ? ' aria-current="page"' : ""}>${w(`docs.nav.${key}`)}</a></li>`;
  const railLink = (key, current = "") => `<a class="luz-sidebar__link luz-page-rail__link"${current ? ' aria-current="true"' : ""}>${w(`docs.rail.${key}`)}</a>`;
  const verdict = (kind, why, title) =>
    `<figure class="luz-do-dont__item luz-do-dont__item--${kind}"><figcaption><strong class="luz-do-dont__verdict">${w(`docs.${kind}`)}</strong> ${w(why)}</figcaption><div class="luz-do-dont__stage" aria-hidden="true"><h4>${w(title)}</h4></div></figure>`;
  const docs = [
    `<div class="o-shell luz-docs-layout landing-cat-sitewide__shell">`,
    `<header class="landing-cat-sitewide__head"><button class="luz-nav-toggle landing-cat-sitewide__toggle" type="button" aria-label="${w("docs.menu")}"><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span></button><p class="landing-cat-sitewide__brand">${w("docs.brand")}</p></header>`,
    `<div class="luz-docs-nav landing-cat-sitewide__nav"><p class="luz-sidebar__section-label">${w("docs.nav")}</p><ul>${navLink("start")}${navLink("install", true)}${navLink("configure")}${navLink("deploy")}</ul></div>`,
    `<div class="luz-page-rail"><div class="luz-page-rail__inner"><div class="luz-page-rail__onpage"><details class="luz-page-rail__fold" open><summary class="luz-page-rail__title">${w("docs.onpage")}</summary><ul class="luz-page-rail__list"><li>${railLink("example", true)}</li><li>${railLink("title")}<ul class="luz-page-rail__sub"><li>${railLink("dodont")}</li></ul></li></ul></details></div><div class="luz-page-rail__actions"><a>${w("docs.edit")}</a><a>${w("docs.report")}</a></div></div></div>`,
    `<div class="luz-docs-main">`,
    `<header class="luz-doc-header"><p class="luz-doc-header__eyebrow">${w("docs.eyebrow")}</p><h3>${w("docs.title")}</h3><p class="luz-doc-header__lead">${w("docs.lead")}</p><ul class="luz-doc-header__meta"><li>${w("docs.meta.version")}</li><li>${w("docs.meta.os")}</li><li><a>${w("docs.meta.issues")}</a></li></ul></header>`,
    `<figure class="luz-example"><div class="luz-example__preview"><div class="luz-example__frame"><button class="luz-btn luz-btn--primary" type="button">${w("docs.save")}</button></div></div><div class="luz-example__code"><pre class="luz-code-block" data-lang="html" dir="ltr"><code>&lt;button class="luz-btn"&gt;…&lt;/button&gt;</code></pre></div></figure>`,
    `<div class="luz-do-dont">${verdict("do", "docs.do.why", "docs.title")}${verdict("dont", "docs.dont.why", "docs.dont.title")}</div>`,
    `<ul class="luz-pager"><li class="luz-pager__prev"><a class="luz-pager__link" rel="prev"><span class="luz-pager__label">${w("docs.prev")}</span> <span class="luz-pager__title">${w("docs.nav.start")}</span></a></li><li class="luz-pager__next"><a class="luz-pager__link" rel="next"><span class="luz-pager__label">${w("docs.next")}</span> <span class="luz-pager__title">${w("docs.nav.configure")}</span></a></li></ul>`,
    `<p class="luz-page-footer">${w("docs.updated")} <time datetime="2026-10-17">${w("docs.date")}</time> · <a>${w("docs.edit")}</a> · <a>${w("docs.report")}</a></p>`,
    `</div>`,
    `</div>`,
  ].join("");

  return {
    panel: [
      `<div class="landing-cards">`,
      card("announcement", announcement),
      card("search", search),
      card("page-transition", transition),
      card("cookie-consent", cookie),
      card("theme-time", time),
      `</div>`,
      `<div class="landing-core__live landing-cat-sitewide__docs" inert>${docs}</div>`,
    ].join(""),
    aside: html(
      [
        '<body class="o-shell luz-docs-layout">',
        '<nav class="luz-sidebar luz-docs-nav">',
        '<aside class="luz-page-rail">',
        '<main class="o-main luz-docs-main">',
        '  <header class="luz-doc-header">',
        '  <figure class="luz-example">',
        '  <div class="luz-do-dont">',
        '  <ul class="luz-pager">',
        '  <p class="luz-page-footer">',
      ].join("\n"),
    ),
  };
}
