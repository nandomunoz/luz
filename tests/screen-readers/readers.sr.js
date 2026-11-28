import { nvdaTest, voiceOverTest, orcaTest } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import { appendFileSync } from "node:fs";

/**
 * What a screen reader says on the built site (SR-6, automated). The page is the oracle:
 * the headings and the colour-mode button a reader must reach are read from the DOM, never
 * typed, so a rewritten title does not break the test and a heading a reader skips does.
 * It proves that names, roles and states reach the reader. Whether what is said is useful
 * is a person's judgement, and TalkBack and a real Safari are not driven from here.
 */

const PAGES = ["/", "/ai/", "/docs/catalog/marquee/"];
const summary = process.env.GITHUB_STEP_SUMMARY;

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const said = (log, text) => norm(log.join(" ")).includes(norm(text));

function record(title, log) {
  const text = `### ${title}\n\n\`\`\`\n${log.join("\n")}\n\`\`\`\n`;
  console.log(text);
  if (summary) appendFileSync(summary, text);
}

// The headings of main that a visitor can reach (a heading in a hidden panel is not one)
const reachable = (page, selector) =>
  page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => el.checkVisibility() && !el.closest("[aria-hidden='true'], [inert]"))
      .map((el) => el.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );

async function headings(sr, page, path, { h1 }) {
  await page.goto(path, { waitUntil: "load" });
  await page.locator("h1").first().waitFor();
  const expected = await reachable(page, "main h2");
  expect(expected.length, `${path} has h2 headings to reach`).toBeGreaterThan(0);
  await sr.navigateToWebContent();
  for (let i = 0; i < expected.length + 2; i++) await sr.nextHeading();
  const log = await sr.spokenPhraseLog();
  record(`${path} headings`, log);
  for (const text of expected) expect(said(log, text), `the reader says the heading "${text}" on ${path}`).toBe(true);
  if (h1) {
    const [title] = await reachable(page, "h1");
    expect(said(log, title), `the reader says the h1 "${title}" on ${path}`).toBe(true);
  }
}

async function colourMode(sr, page, path) {
  await page.goto(path, { waitUntil: "load" });
  const button = page.locator("luz-theme-mode button").first();
  await button.waitFor();
  await sr.navigateToWebContent();
  await button.focus();
  const name = (await button.getAttribute("aria-label")) ?? (await button.textContent());
  const focusLog = await sr.spokenPhraseLog();
  record(`${path} colour mode: focus`, focusLog);
  expect(said(focusLog, name.trim()), `the reader says the name of the colour-mode button ("${name.trim()}")`).toBe(true);
  await sr.clearSpokenPhraseLog();
  await sr.act();
  await page.waitForTimeout(500);
  const after = ((await button.getAttribute("aria-label")) ?? (await button.textContent())).trim();
  const log = await sr.spokenPhraseLog();
  record(`${path} colour mode: after activating`, log);
  expect(after, "activating the button changes its state").not.toBe(name.trim());
  expect(said(log, after) || said(log, "dark") || said(log, "light") || said(log, "auto") || said(log, "high contrast"), "the change is announced").toBe(true);
}

async function marquee(sr, page, path) {
  await page.goto(path, { waitUntil: "load" });
  const names = await reachable(page, "luz-marquee a");
  expect(names.length, "the marquee has links a visitor can reach").toBeGreaterThan(0);
  const first = page.locator("luz-marquee a").first();
  await first.waitFor();
  await sr.navigateToWebContent();
  await first.focus();
  for (let i = 0; i < names.length + 3; i++) await sr.nextLink();
  const log = await sr.spokenPhraseLog();
  record(`${path} marquee links`, log);
  const spoken = norm(log.join(" | "));
  for (const text of names) {
    const count = spoken.split(norm(text)).length - 1;
    expect(count, `"${text}" is said once, not once for the hidden copy`).toBe(1);
  }
}

const platform = process.platform;

for (const path of PAGES) {
  if (platform === "win32") {
    nvdaTest(`NVDA reaches the headings of ${path}`, ({ page, nvda }) => headings(nvda, page, path, { h1: true }));
  } else if (platform === "darwin") {
    voiceOverTest(`VoiceOver reaches the headings of ${path}`, ({ page, voiceOver }) => headings(voiceOver, page, path, { h1: true }));
  } else {
    // Orca starts on the h1 and goes to the next heading, so it never says it
    orcaTest(`Orca reaches the headings of ${path}`, ({ page, orca }) => headings(orca, page, path, { h1: false }));
  }
}

if (platform === "win32") {
  nvdaTest("NVDA says the colour-mode button and its change", ({ page, nvda }) => colourMode(nvda, page, "/"));
  nvdaTest("NVDA says the marquee links once", ({ page, nvda }) => marquee(nvda, page, "/docs/catalog/marquee/"));
} else if (platform === "darwin") {
  voiceOverTest("VoiceOver says the colour-mode button and its change", ({ page, voiceOver }) => colourMode(voiceOver, page, "/"));
  voiceOverTest("VoiceOver says the marquee links once", ({ page, voiceOver }) => marquee(voiceOver, page, "/docs/catalog/marquee/"));
} else {
  orcaTest("Orca says the colour-mode button and its change", ({ page, orca }) => colourMode(orca, page, "/"));
  orcaTest("Orca says the marquee links once", ({ page, orca }) => marquee(orca, page, "/docs/catalog/marquee/"));
}
