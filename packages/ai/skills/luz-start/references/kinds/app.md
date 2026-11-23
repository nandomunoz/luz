## The kind of site: an app

An app is a web application: dashboard, back office, tool. Ask:

1. The navigation: a sidebar (recommended above five views), a header only, or both.
2. The first views by name: dashboard, list, detail, form, settings.
3. What the data comes from (an API, a store) and who renders it (server or client).
4. The empty, loading and error states of each view: their text.

Start from this skeleton. `luz-nav-toggle` needs `components/sidebar.css`. A menu is a `luz-dropdown` with a `popover`; `luz-btn` is never a `summary`. Numbers are cards; tables, forms, dialogs, tabs and alerts are core's. Data views (bar list, column chart, stacked bar, heat map, line chart) each draw a native table or list that stays in the page; the author supplies the data. A line chart is `<luz-chart>`. A stacked bar part is sized by `style="--v: 62"`, a column or heat map cell by `--v: 0.8` (0 to 1): the one `style` allowed.

The skeleton of the page is `assets/templates/app.html.tpl`: `site new --kind app` writes it, and you fill it in.
