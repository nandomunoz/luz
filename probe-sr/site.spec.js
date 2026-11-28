import { nvdaTest, voiceOverTest, orcaTest } from "@guidepup/playwright";
import { appendFileSync } from "node:fs";

const PAGES = ["https://luzds.com/", "https://luzds.com/ai/"];
const summary = process.env.GITHUB_STEP_SUMMARY;

async function walk(sr, page, url, name) {
  await page.goto(url, { waitUntil: "load" });
  await page.locator("h1").first().waitFor();
  await sr.navigateToWebContent();
  for (let i = 0; i < 6; i++) await sr.nextHeading();
  for (let i = 0; i < 4; i++) await sr.nextLink();
  const log = await sr.spokenPhraseLog();
  const text = `### ${name}: ${url}\n\n\`\`\`\n${log.join("\n")}\n\`\`\`\n`;
  console.log(text);
  if (summary) appendFileSync(summary, text);
  if (!log.some((p) => /LUZ/.test(p))) throw new Error(`${name} never said LUZ on ${url}`);
}

const platform = process.platform;
for (const url of PAGES) {
  if (platform === "win32") {
    nvdaTest(`NVDA ${url}`, ({ page, nvda }, info) => walk(nvda, page, url, `NVDA + ${info.project.name}`));
  } else if (platform === "darwin") {
    voiceOverTest(`VoiceOver ${url}`, ({ page, voiceOver }) => walk(voiceOver, page, url, "VoiceOver + WebKit"));
  } else {
    orcaTest(`Orca ${url}`, ({ page, orca }) => walk(orca, page, url, "Orca + Firefox"));
  }
}
