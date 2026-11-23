// The charts block of /catalog/: a little analytics dashboard (.luz-dashboard) whose six tiles are the other six
// pieces of the group, each over its native list, table or meter, each tile naming its piece in small code text.
// <luz-chart> is never written (catalog.js would load its script): the line chart and the spark are the static
// markup chart.js would draw (.luz-chart__bar, __figure, __plot, __series, __line, __marker, __legend, __spark).
export function panel({ t, html }) {
  const w = (key) => t(`level.catalog.charts.${key}`);
  const name = (piece) => `<span class="landing-cat-charts__name"><code>${piece}</code></span>`;
  const p = (v) => +v.toFixed(1);

  // The marks chart.js gives series 1 and 2: a circle, a square
  const marker = (n, x, y, r) => [
    `M${p(x - r)} ${p(y)}a${p(r)} ${p(r)} 0 1 0 ${p(2 * r)} 0a${p(r)} ${p(r)} 0 1 0 ${p(-2 * r)} 0`,
    `M${p(x - r)} ${p(y - r)}h${p(2 * r)}v${p(2 * r)}h${p(-2 * r)}z`,
  ][n - 1];

  // chart: visitors by device, January to June, two series on one scale (0 to 1,500)
  const months = ["jan", "feb", "mar", "apr", "may", "jun"];
  const series = [
    { key: "desktop", values: [1204, 1310, 1180, 1420, 1390, 1480] },
    { key: "mobile", values: [640, 620, 700, 690, 760, 812] },
  ];
  const W = 320, H = 150, left = 38, right = 310, top = 8, bottom = 126, max = 1500;
  const x = (i) => left + (i * (right - left)) / (months.length - 1);
  const y = (v) => bottom - (v / max) * (bottom - top);
  const ticks = [0, 500, 1000, 1500];
  const grid = ticks.map((v) => `M${left} ${p(y(v))}H${right}`).join("");
  const plot = [
    `<svg class="luz-chart__plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${w("chart.summary")}">`,
    `<path class="luz-chart__grid" d="${grid}"/>`,
    ...ticks.map((v) => `<text class="luz-chart__tick" x="${left - 6}" y="${p(y(v))}" dy="0.32em" text-anchor="end">${v.toLocaleString("en")}</text>`),
    ...months.map((m, i) => `<text class="luz-chart__tick" x="${p(x(i))}" y="${bottom + 16}" text-anchor="middle">${w(`month.${m}`)}</text>`),
    ...series.map((s, i) => {
      const d = s.values.map((v, j) => `${j ? "L" : "M"}${p(x(j))} ${p(y(v))}`).join("");
      const last = s.values.length - 1;
      return `<g class="luz-chart__series" data-n="${i + 1}"><path class="luz-chart__line" d="${d}"/><path class="luz-chart__marker" d="${marker(i + 1, x(last), y(s.values[last]), 3.5)}"/></g>`;
    }),
    `</svg>`,
  ].join("");
  const legend = `<ul class="luz-chart__legend">${series.map((s, i) => `<li class="luz-chart__key" data-n="${i + 1}"><svg class="luz-chart__swatch" viewBox="-8 -8 16 16" aria-hidden="true"><path class="luz-chart__line" d="M-8 0H8"/><path class="luz-chart__marker" d="${marker(i + 1, 0, 0, 4)}"/></svg>${w(`chart.${s.key}`)}</li>`).join("")}</ul>`;
  const chart = `<div class="landing-cat-charts__chart"><div class="luz-chart__bar"><p class="luz-chart__title">${w("chart.title")}</p></div><div class="luz-chart__figure">${plot}${legend}</div></div>`;

  // chart, type="spark": visitors a day, last seven days; the line, and its last figure as text
  const days = [32, 36, 34, 45, 47, 52, 58];
  const sx = (i) => (i * 100) / (days.length - 1);
  const sy = (v) => 22 - ((v - 30) / 30) * 20;
  const spark = `<p class="landing-cat-charts__spark">${name("chart · spark")}<span class="u-text-muted">${w("spark.label")}</span><svg class="luz-chart__spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path class="luz-chart__line" d="${days.map((v, i) => `${i ? "L" : "M"}${p(sx(i))} ${p(sy(v))}`).join("")}"/></svg><strong>58</strong></p>`;

  // column-chart: orders per day, this week, one series (the head row is the axis)
  const week = ["mon", "tue", "wed", "thu", "fri"];
  const orders = [120, 96, 134, 150, 172];
  const columns = [
    `<div class="luz-table-wrap" role="region" aria-labelledby="cat-charts-orders" tabindex="0"><table class="luz-column-chart">`,
    `<caption class="u-sr-only">${w("columns.title")}</caption>`,
    `<thead><tr>${week.map((d) => `<th scope="col">${w(`day.${d}`)}</th>`).join("")}</tr></thead>`,
    `<tbody><tr>${orders.map((v) => `<td style="--v: ${p(v / 180)}">${v}</td>`).join("")}</tr></tbody>`,
    `</table></div>`,
  ].join("");

  // bar-list: visits by page
  const pages = [["home", 1204, "1,204"], ["docs", 812, "812"], ["blog", 377, "377"]];
  const bars = `<figure class="luz-bar-list" aria-labelledby="cat-charts-pages"><ul class="luz-bar-list__rows">${pages.map(([k, v, s]) => `<li class="luz-bar-list__row"><span class="luz-bar-list__name">${w(`bars.${k}`)}</span><span class="luz-bar-list__figure">${s}</span><meter class="luz-bar-list__meter" min="0" max="1500" value="${v}" aria-hidden="true">${s}</meter></li>`).join("")}</ul></figure>`;

  // ring: one value over a goal
  const ring = `<figure class="luz-ring" style="--v1: 1260; --max: 2000"><figcaption class="u-sr-only">${w("ring.title")}</figcaption><p class="luz-ring__value"><span class="luz-ring__figure">1,260</span><span class="luz-ring__label">${w("ring.of")}</span></p></figure>`;

  // stacked-bar: the shares of a whole, a bar and the legend that says them
  const sources = [["search", 52], ["direct", 26], ["social", 14], ["email", 6], ["other", 2]];
  const stacked = `<figure class="luz-stacked-bar"><figcaption class="u-sr-only">${w("stacked.title")}</figcaption><div class="luz-stacked-bar__bar" aria-hidden="true">${sources.map(([, v]) => `<span class="luz-stacked-bar__part" style="--v: ${v}"></span>`).join("")}</div><ul class="luz-stacked-bar__legend">${sources.map(([k, v]) => `<li class="luz-stacked-bar__item"><span class="luz-stacked-bar__name">${w(`stacked.${k}`)}</span> <span class="luz-stacked-bar__figure">${v} %</span></li>`).join("")}</ul></figure>`;

  // heat-map: visits per part of the day, Monday to Friday
  const parts = [["morning", [120, 240, 360, 480, 600]], ["afternoon", [0, 60, 300, 180, 540]], ["evening", [30, 90, 150, 270, 420]]];
  const heat = [
    `<div class="luz-table-wrap" role="region" aria-labelledby="cat-charts-heat" tabindex="0"><table class="luz-heat-map">`,
    `<caption id="cat-charts-heat">${w("heat.title")}<span class="landing-cat-charts__note">${w("heat.note")}</span></caption>`,
    `<thead><tr><td></td>${week.map((d) => `<th scope="col">${w(`day.${d}`)}</th>`).join("")}</tr></thead>`,
    `<tbody>${parts.map(([k, vs]) => `<tr><th scope="row">${w(`heat.${k}`)}</th>${vs.map((v) => `<td style="--v: ${p(v / 600)}">${v}</td>`).join("")}</tr>`).join("")}</tbody>`,
    `</table></div>`,
  ].join("");

  const tile = (piece, title, body, { id = "", wide = false } = {}) =>
    `<li class="luz-card luz-dashboard__panel landing-cat-charts__tile${wide ? " luz-dashboard__panel--wide" : ""}">${name(piece)}${title ? `<h3 class="luz-card__title"${id ? ` id="cat-charts-${id}"` : ""}>${title}</h3>` : ""}${body}</li>`;

  const board = [
    `<div class="luz-dashboard landing-cat-charts">`,
    `<div class="luz-dashboard__head">${name("dashboard")}<p class="luz-dashboard__title">${w("overview")}</p>${spark}</div>`,
    `<ul class="o-grid o-grid--auto">`,
    tile("chart", "", chart),
    tile("ring", w("ring.title"), ring),
    tile("column-chart", w("columns.title"), columns, { id: "orders" }),
    tile("heat-map", "", heat),
    tile("bar-list", w("bars.title"), bars, { id: "pages" }),
    tile("stacked-bar", w("stacked.title"), stacked),
    `</ul>`,
    `</div>`,
  ].join("");

  const sheets = ["dashboard", "chart", "column-chart", "bar-list", "ring", "stacked-bar", "heat-map"];
  return {
    panel: `<div class="landing-core__live landing-cat-charts__live" inert>${board}</div>`,
    aside: html(sheets.map((s) => `<link rel="stylesheet" href="…/components/${s}.min.css">`).join("\n")),
  };
}
