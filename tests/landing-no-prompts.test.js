/**
 * The prompts are gone (owner, 2026-11-25): the home's words point to the /luz skill and its docs instead.
 *
 *   1  what LUZ is, how it is different, the fast lane and the next steps no longer speak of a prompt (the note of
 *      level 4 and the keys of the old prompt dialog leave with the prompts: tests/home-cli.test.js)
 *   2  what LUZ is and the fast lane name the skill, /luz
 *   3  the next step of the catalog and of the skill's page lead to the skill, not to a prompt to paste
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LANGS = ["en", "es", "ar"];
const catalog = (lang) => JSON.parse(readFileSync(new URL(`../apps/landing/i18n/${lang}.json`, import.meta.url), "utf-8"));

describe("the home without prompts", () => {
  for (const lang of LANGS) {
    const words = catalog(lang);

    it(`${lang}: what LUZ is, how it is different, the fast lane and the next steps speak of no prompt`, () => {
      const keys = ["faq.what.a", "faq.different.a", "faq.how.p1", "level.catalog.next.lead", "level.ai.next.title", "level.ai.next.lead"];
      expect(keys.filter((key) => /\bprompts?\b|موجّه|تعليمات/i.test(words[key]))).toEqual([]);
    });

    it(`${lang}: what LUZ is and the fast lane name the skill, /luz`, () => {
      expect(words["faq.what.a"]).toContain("<code>/luz</code>");
      expect(words["faq.how.p1"]).toContain("<code>/luz</code>");
    });

    it(`${lang}: the next steps of the catalog and of the skill's page lead to the skill`, () => {
      expect(words["level.catalog.next.lead"]).toMatch(/luz/);
      expect(words["level.ai.next.title"]).not.toMatch(/npm/);
    });
  }
});
