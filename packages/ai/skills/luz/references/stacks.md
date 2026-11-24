# Where each stack loads LUZ

- Plain HTML (`vanilla`): the `<link>` and `<script>` tags of the starter page, in every page.
- Astro (`astro`): the `<head>` of the base layout. Check it with `--ext .astro`.
- React (Vite, Next.js) (`react`): `import "@luz-ds/tokens/css"`, then core and catalog, in the root layout (`className` for `class`). Check it with `--ext .jsx,.tsx`.
- Vue (Vite, Nuxt) (`vue`): the imports of `main.js` (Nuxt: `css` in `nuxt.config`). Check it with `--ext .vue`.
- Angular (`angular`): `styles` in `angular.json`.
- Other (`other`): the global stylesheets.
