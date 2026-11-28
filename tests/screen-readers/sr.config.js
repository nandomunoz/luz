import { defineConfig } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";

/**
 * The screen readers LUZ drives from CI (PRINCIPLES.md SR-6). One project per reader and
 * browser, chosen by the runner's system: NVDA on Windows (with Firefox and with Chrome),
 * VoiceOver on macOS (with the WebKit of Playwright, not Safari), Orca on Linux (with Firefox).
 * Not part of the `chromium` and `chromium-nojs` runs of the suite: its own config and a
 * `.sr.js` file name, so `playwright test` at the root never finds it.
 */
const projects =
  process.platform === "win32"
    ? [
        { name: "nvda-firefox", use: { browserName: "firefox" } },
        { name: "nvda-chrome", use: { browserName: "chromium", channel: "chrome" } },
      ]
    : process.platform === "darwin"
      ? [{ name: "voiceover-webkit", use: { browserName: "webkit" } }]
      : [{ name: "orca-firefox", use: { browserName: "firefox" } }];

const PORT = 4173;

export default defineConfig(
  withGuidepup({
    testDir: ".",
    testMatch: "*.sr.js",
    reportSlowTests: null,
    timeout: 3 * 60 * 1000,
    // A window that does not take the focus is the one flake seen so far
    retries: 2,
    reporter: [["list"]],
    use: { baseURL: `http://127.0.0.1:${PORT}` },
    webServer: {
      command: `node serve.js ${process.env.SR_SITE_DIR ?? "../../docs"} ${PORT}`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: true,
      timeout: 30 * 1000,
    },
    projects,
  }),
);
