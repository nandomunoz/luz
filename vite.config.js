import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { resolve, sep } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { docsSite } from "./scripts/docs-site/plugin.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distRoot = resolve(__dirname, "dist");
/**
 * The private folder of a checkout, `<root>/.claude/**`, as a glob Vite matches
 * against the absolute path of a file (picomatch, forward slashes). It is anchored
 * at the root: a worktree lives under <main checkout>/.claude/luz-worktree/, so
 * "**\/.claude/**" would match every file of it. The path is escaped, so a "[", "(" or
 * "{" in a folder's name is a letter and not a glob.
 * @param {string} root absolute path of the checkout
 */
export const ownClaudeDeny = (root) =>
  `${root.replace(/\\/g, "/").replace(/\/$/, "").replace(/[\\()[\]{}*?!+@]/g, "\\$&")}/.claude/**`;
// `vite build --mode pages` builds the GitHub Pages site into docs/.
// docs/ is git-ignored build output: CI builds it and pages.yml deploys it (red line 14).
// LUZ_PAGES_OUT builds it elsewhere (a folder inside the OS temp dir).
const pagesRoot = resolve(__dirname, process.env.LUZ_PAGES_OUT ?? "docs");
// emptyOutDir wipes pagesRoot: allow only docs/ or a folder inside the OS temp dir
const insideTmp = pagesRoot.startsWith(resolve(tmpdir()) + sep);
if (pagesRoot !== resolve(__dirname, "docs") && !insideTmp) {
  throw new Error(`LUZ_PAGES_OUT must be docs/ or a folder inside ${tmpdir()}, got ${pagesRoot}`);
}

/**
 * The site's path on its domain: "/", because GitHub Pages serves the site at
 * the root of luzds.com. Only the not-found page uses it, as its <base href>:
 * GitHub Pages serves /404.html at whatever URL was missing, so its relative
 * URLs need a fixed base. A fork served at https://<user>.github.io/<repo>/
 * changes it to "/<repo>/"; if it is wrong, the 404 page is still readable,
 * only unstyled.
 */
export const PAGES_BASE = "/";

/**
 * The published site's root URL: luzds.com, the custom domain of the GitHub
 * Pages of github.com/nandomunoz/luz (the git remote). The pages build writes
 * the home pages' canonical and hreflang alternates with it, absolute as
 * search engines ask, and CNAME with its host (cnameOf() in
 * scripts/docs-site/plugin.js); the dev server keeps them root-absolute.
 */
export const SITE_URL = `https://luzds.com${PAGES_BASE}`;

/**
 * Content-Security-Policy for the published GitHub Pages site. Pages cannot
 * send headers, so it goes in a <meta>; only the pages build gets it (the
 * dev server needs its own websocket and client). Scripts come only from
 * the site itself; inline styles stay allowed for the demos' style
 * attributes and the HTML elements page's <style> example.
 */
export const PAGES_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  // srcdoc frames need no data:; the pages build never inlines assets
  "frame-src 'self'",
  // The HTML elements page demonstrates <object> and <embed> with its own files
  "object-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * The one page that may frame another site: the Embed page of the catalog (and
 * its language variants, /es/docs/catalog/embed/: the source is matched, as the
 * build hands it over), whose live demo loads a
 * player after the visitor presses play and agrees. Its policy is PAGES_CSP
 * with `frame-src 'self' <that service>`; every other directive and every other
 * page keep `frame-src 'self'`.
 */
const EMBED_PAGE = /^\/apps\/docs\/(?:pages|_virtual\/[a-z]{2,3}(?:-[a-z0-9]+)*)\/catalog\/embed\.html$/;
export const EMBED_FRAME_ORIGIN = "https://www.youtube-nocookie.com";

function pagesCsp() {
  return {
    name: "pages-csp",
    transformIndexHtml: {
      order: "post",
      handler: (html, ctx) => {
        const csp = EMBED_PAGE.test(ctx?.path ?? "") ? PAGES_CSP.replace("frame-src 'self'", `frame-src 'self' ${EMBED_FRAME_ORIGIN}`) : PAGES_CSP;
        return html.replace(/(<meta charset="[^"]*">)/i, `$1\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`);
      },
    },
  };
}

/**
 * packages/core/src/i18n.js names each language file by a literal
 * (`import("./i18n-es.js")`, SEC-CHUNK-1), and the build writes that file from
 * src/i18n/<code>.json: it is not in src/. A page that imports the source in
 * dev (tests/player.spec.js) gets the module from the JSON, as the build would.
 */
function coreLanguages() {
  const prefix = "\0luz-core-language:";
  return {
    name: "core-languages",
    apply: "serve",
    resolveId(source, importer) {
      const code = /^\.\/i18n-([a-z]{2,3})\.js$/.exec(source)?.[1];
      if (code && importer?.replaceAll("\\", "/").endsWith("/packages/core/src/i18n.js")) return prefix + code;
    },
    load(id) {
      if (!id.startsWith(prefix)) return;
      const strings = JSON.parse(readFileSync(resolve(__dirname, "packages/core/src/i18n", `${id.slice(prefix.length)}.json`), "utf-8"));
      delete strings.$header;
      return `export default ${JSON.stringify(strings)};`;
    },
  };
}

/**
 * The pages build keeps Vite's `__vitePreload` helper (MIT, VoidZero Inc. and Vite
 * contributors) in docs/assets, so it serves Vite's notice at docs/LICENSE-vite.txt
 * (RL-13). `pnpm check:license` fails on the helper without it.
 */
function viteLicence() {
  return {
    name: "pages-vite-licence",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "LICENSE-vite.txt",
        source: readFileSync(resolve(__dirname, "node_modules/vite/LICENSE.md"), "utf-8"),
      });
    },
  };
}

/**
 * The Pages site serves ET Book (MIT, Dmitry Krasny, Bonnie Scranton, Edward Tufte) in
 * docs/assets, and the home's wordmark is outlined from it: it serves the notice beside the
 * fonts, assets/LICENSE-ETBook.txt, from the one the tokens package ships (RL-13).
 * `pnpm check:license` fails on a font without it.
 */
function etbookLicence() {
  return {
    name: "pages-etbook-licence",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "assets/LICENSE-ETBook.txt",
        source: readFileSync(resolve(__dirname, "packages/tokens/fonts/LICENSE-ETBook.txt"), "utf-8"),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const pages = mode === "pages";
  const outRoot = pages ? pagesRoot : distRoot;

  return {
    root: __dirname,
    // Relative URLs so the Pages site works under /<repo>/ and on a custom domain
    base: pages ? "./" : "/",
    publicDir: false,
    // The site's routes, dev server, layouts and partials, link check and the
    // move of each HTML file to its route: scripts/docs-site/plugin.js
    plugins: [coreLanguages(), docsSite({ repoRoot: __dirname, relative: pages, outRoot, pagesBase: PAGES_BASE, siteUrl: SITE_URL, csp: PAGES_CSP }), ...(pages ? [pagesCsp(), viteLicence(), etbookLicence()] : [])],
    server: {
      open: "/",
      fs: {
        allow: [__dirname],
        // root is the repository, so every file under it is a URL: keep the
        // secrets, the git store and the private Claude files out of it (F8, L1).
        // Vite's default is [".env", ".env.*", "*.{crt,pem}", "**/.git/**"];
        // setting deny replaces it, so the list repeats it. The last one is this
        // checkout's own .claude/ (see ownClaudeDeny), never any .claude/ in the path
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", ownClaudeDeny(__dirname)],
      },
    },
    build: {
      outDir: outRoot,
      emptyOutDir: true,
      // Pages: every asset is a file, never a data: URI, so the CSP can keep
      // media-src and connect-src at 'self' (the MIDI demo fetches its file)
      ...(pages ? { assetsInlineLimit: 0 } : {}),
      // Pages: no module-preload polyfill. It is Vite's code (MIT, VoidZero Inc. and
      // Vite contributors) and would be served in docs/assets with no notice (RL-13);
      // the browsers LUZ supports have <link rel="modulepreload">
      ...(pages ? { modulePreload: false } : {}),
      // rollupOptions.input: one entry per route, from the docs-site plugin
    },
  };
});
