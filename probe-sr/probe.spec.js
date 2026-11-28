import { nvdaTest, voiceOverTest, orcaTest } from "@guidepup/playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { appendFileSync } from "node:fs";

const url = pathToFileURL(resolve("page.html")).href;
const summary = process.env.GITHUB_STEP_SUMMARY;
const report = (name, log) => {
  const text = `### ${name}\n\n\`\`\`\n${log.join("\n")}\n\`\`\`\n`;
  console.log(text);
  if (summary) appendFileSync(summary, text);
};

async function walk(sr, name) {
  await sr.navigateToWebContent();
  for (let i = 0; i < 4; i++) await sr.nextHeading();
  const log = await sr.spokenPhraseLog();
  report(name, log);
  return log;
}

const platform = process.platform;
if (platform === "win32") {
  nvdaTest("NVDA reads the headings", async ({ page, nvda }, info) => {
    await page.goto(url, { waitUntil: "load" });
    const log = await walk(nvda, `NVDA + ${info.project.name}`);
    if (!log.some((p) => /LUZ probe/i.test(p))) throw new Error("NVDA never said the h1");
  });
} else if (platform === "darwin") {
  voiceOverTest("VoiceOver reads the headings", async ({ page, voiceOver }) => {
    await page.goto(url, { waitUntil: "load" });
    const log = await walk(voiceOver, "VoiceOver + WebKit");
    if (!log.some((p) => /LUZ probe/i.test(p))) throw new Error("VoiceOver never said the h1");
  });
} else {
  orcaTest("Orca reads the headings", async ({ page, orca }) => {
    await page.goto(url, { waitUntil: "load" });
    const log = await walk(orca, "Orca + Firefox");
    if (!log.some((p) => /LUZ probe/i.test(p))) throw new Error("Orca never said the h1");
  });
}
