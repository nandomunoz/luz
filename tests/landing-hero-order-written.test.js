/**
 * The hero of the home had a written deviation (owner, 2026-10-30): on a phone the AI button was moved first with CSS
 * `order: -1` while the source kept "Get started" first, against PRINCIPLES.md section 7 ("Works without CSS: source
 * order is reading order") and WCAG 2.4.3 and 1.3.2. Since the tunnel hero (2026-11-26) the AI button is first in the
 * source and "Get started" is gone, so the deviation is gone too, and nothing may still describe it: not the
 * principle, not the known issues of the accessibility statement, in English and in Spanish, not the stylesheet.
 * The order itself is in tests/landing-hero-buttons.spec.js.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const text = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf-8");

/** The Known issues section of the statement: from its h2 to the next h2. */
const known = (html) => {
  const start = html.search(/id="h-a11y-known"/);
  if (start === -1) return "";
  const next = html.indexOf("<h2", start + 10);
  return html.slice(start, next === -1 ? undefined : next);
};

describe("the order of the home's hero buttons is the order of the source", () => {
  it("PRINCIPLES.md writes no deviation of the hero next to 'source order is reading order'", () => {
    const line = text("PRINCIPLES.md").split("\n").find((l) => /source order is reading order/i.test(l));
    expect(line, "the 'source order is reading order' line").toBeTruthy();
    expect(line).not.toMatch(/hero|deviation/i);
  });

  for (const file of ["apps/docs/pages/accessibility.html", "apps/docs/i18n/es/pages/accessibility.html"]) {
    it(`${file}: no known issue names the hero buttons with WCAG 2.4.3 and 1.3.2`, () => {
      const section = known(text(file));
      expect(section, "a Known issues section").not.toBe("");
      const items = section.match(/<li>[\s\S]*?<\/li>/g) ?? [];
      expect(items.filter((item) => /hero/i.test(item) && /\b2\.4\.3\b/.test(item))).toEqual([]);
    });
  }

  it("landing.css moves no button of the hero with `order`", () => {
    expect(text("apps/landing/landing.css")).not.toMatch(/\.landing-hero__ai\s*\{[^}]*\border\s*:/);
  });
});
