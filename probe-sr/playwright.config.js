import { defineConfig } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";

const project =
  process.platform === "win32" ? { name: "nvda-chrome", use: { browserName: "chromium", channel: "chrome" } }
  : process.platform === "darwin" ? { name: "voiceover-webkit", use: { browserName: "webkit" } }
  : { name: "orca-firefox", use: { browserName: "firefox" } };

export default defineConfig(withGuidepup({
  testDir: ".",
  testMatch: "probe.spec.js",
  reportSlowTests: null,
  timeout: 3 * 60 * 1000,
  retries: 0,
  reporter: [["list"]],
  projects: [project],
}));
