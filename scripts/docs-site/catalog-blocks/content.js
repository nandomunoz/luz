// The content block of /catalog/: every piece of the docs group "content", live, a card each, with the one
// <link> line of its stylesheet. No <luz-timeline> and no <luz-embed>: their class markup, in the state worth
// showing (the vertical timeline with the line travelled up to the current milestone; the embed's poster and
// play mark, as the page shows it before any script). No href, no ids, no data-luz-spy.
export function panel({ t, html }) {
  const w = (key) => t(`level.catalog.content.${key}`);
  const link = (file) => html(`<link rel="stylesheet" href="…/components/${file}.min.css">`);
  const card = (name, file, live) =>
    `<div class="landing-card landing-card--${name}"><p class="landing-card__title"><code>${name}</code></p><div class="landing-core__live" inert>${live}</div>${link(file)}</div>`;
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const ICON = {
    code: '<circle cx="7" cy="5.5" r="2.25"/><circle cx="7" cy="18.5" r="2.25"/><circle cx="17" cy="7" r="2.25"/><path d="M7 7.75v8.5M17 9.25c0 4.5-10 3-10 7"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6"/>',
    feed: '<circle cx="6" cy="18" r="1"/><path d="M6 11a7 7 0 0 1 7 7M6 4a14 14 0 0 1 14 14"/>',
  };

  const faq = [
    `<luz-faq>`,
    `<h3 class="luz-faq__title">${w("faq.title")}</h3>`,
    `<div class="luz-faq__group">`,
    `<h4 class="luz-faq__group-title">${w("faq.group")}</h4>`,
    `<details class="luz-faq__item" open><summary class="luz-faq__question">${w("faq.q1")}</summary><div class="luz-faq__answer"><p>${w("faq.a1")}</p></div></details>`,
    `<details class="luz-faq__item"><summary class="luz-faq__question">${w("faq.q2")}</summary><div class="luz-faq__answer"><p>${w("faq.a2")}</p></div></details>`,
    `<details class="luz-faq__item"><summary class="luz-faq__question">${w("faq.q3")}</summary><div class="luz-faq__answer"><p>${w("faq.a3")}</p></div></details>`,
    `</div>`,
    `</luz-faq>`,
  ].join("");

  const embed = [
    `<div class="landing-cat-content__embed">`,
    `<a class="luz-embed__link">`,
    `<svg class="luz-embed__poster" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="currentColor" opacity=".18"/><circle cx="250" cy="44" r="16" fill="currentColor" opacity=".45"/><path d="M0 180 80 90l50 50 70-80 60 60 60-30v90Z" fill="currentColor" opacity=".35"/></svg>`,
    `<span class="u-sr-only">${w("embed.play")} </span>`,
    `<span class="luz-embed__title">${w("embed.title")}</span>`,
    `</a>`,
    `</div>`,
  ].join("");

  const steps = [
    ["2024", "past"],
    ["2025", "active"],
    ["2026", ""],
  ];
  const timeline = `<ol class="luz-timeline landing-cat-content__timeline">${steps
    .map(
      ([year, state], i) =>
        `<li class="luz-timeline__item"${state ? ` data-luz-state="${state}"` : ""}><time class="luz-timeline__date" datetime="${year}">${year}</time><p class="luz-timeline__title">${w(`timeline.title${i + 1}`)}</p><p class="luz-timeline__text">${w(`timeline.text${i + 1}`)}</p></li>`,
    )
    .join("")}</ol>`;

  const toc = [
    // In a div: beside an article's text the contents take its second column (grid-column: 2), which in the
    // card's grid would open an empty first one
    `<div>`,
    `<nav class="luz-toc" aria-labelledby="cat-content-toc">`,
    `<h3 class="luz-toc__title" id="cat-content-toc">${w("toc.title")}</h3>`,
    `<ol class="luz-toc__list">`,
    [1, 2, 3, 4].map((n) => `<li><a${n === 2 ? ' aria-current="true"' : ""}>${w(`toc.link${n}`)}</a></li>`).join(""),
    `</ol>`,
    `</nav>`,
    `</div>`,
  ].join("");

  const posts = [
    ["2026-10-12", 1],
    ["2026-10-09", 2],
    ["2026-10-04", 3],
  ];
  const postList = `<ul class="luz-post-list luz-post-list--compact" role="list">${posts
    .map(
      ([date, n]) =>
        `<li><article class="luz-card"><p class="luz-card__title"><a>${w(`post.title${n}`)}</a></p><p class="luz-meta"><time datetime="${date}">${w(`post.date${n}`)}</time> <span>${w(`post.read${n}`)}</span></p></article></li>`,
    )
    .join("")}</ul>`;

  const stat = `<ul class="landing-cat-content__stats" role="list">${[
    ["4,000+", "stat.label1"],
    ["99.95%", "stat.label2"],
  ]
    .map(([value, label]) => `<li><div class="luz-stat"><p class="luz-stat__value">${value}</p><p class="luz-stat__label">${w(label)}</p></div></li>`)
    .join("")}<li class="luz-card"><div class="luz-stat"><p class="luz-stat__value">12</p><p class="luz-stat__label">${w("stat.label3")}</p></div></li></ul>`;

  const social = [
    `<div class="landing-cat-content__social">`,
    `<ul class="luz-social"><li><a>${icon(ICON.code)}<span>GitHub</span></a></li><li><a>${icon(ICON.person)}<span>Mastodon</span></a></li><li><a>${icon(ICON.feed)}<span>${w("social.feed")}</span></a></li></ul>`,
    `<ul class="luz-social luz-social--icons"><li><a>${icon(ICON.code)}<span class="u-sr-only">GitHub</span></a></li><li><a>${icon(ICON.person)}<span class="u-sr-only">Mastodon</span></a></li><li><a>${icon(ICON.feed)}<span class="u-sr-only">${w("social.feed")}</span></a></li></ul>`,
    `</div>`,
  ].join("");

  const terminal = [
    `<div class="luz-terminal">`,
    `<nav class="luz-tabs luz-terminal__tabs" aria-label="${w("terminal.label")}"><a class="luz-tab is-active" aria-current="page">npm</a><a class="luz-tab">CDN</a></nav>`,
    `<div class="luz-tabpanel luz-terminal__pane">`,
    `<button class="luz-copy-btn" type="button" aria-label="${w("terminal.copylabel")}">${w("terminal.copy")}</button>`,
    `<pre class="luz-terminal__code" data-lang="bash" dir="ltr"><code>npm install @luz-ds/catalog</code></pre>`,
    `</div>`,
    `</div>`,
  ].join("");

  return {
    panel: `<div class="landing-cards landing-cat-content">${[
      card("faq", "faq", faq),
      card("embed", "embed", embed),
      card("toc", "article", toc),
      card("timeline", "timeline", timeline),
      card("post-list", "post-list", postList),
      card("stat", "stat", stat),
      card("terminal", "terminal", terminal),
      card("social", "social", social),
    ].join("")}</div>`,
    aside: "",
  };
}
