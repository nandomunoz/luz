/**
 * Known issue: the motion of the home page's hero. Since 2026-11-26 the hero is the tunnel (thirteen outlines of the
 * logo's triangle flying towards the reader) over the stars of dawn, dusk and night; the globe and its light are gone.
 * Both move for more than five seconds and stop only with the system's reduced-motion setting (RL-8 holds: every
 * animation stops under prefers-reduced-motion), so WCAG 2.2 success criterion 2.2.2 (Pause, Stop, Hide, level A) is
 * not met for them. The accessibility statement, apps/docs/pages/accessibility.html, says so under "Known issues", in
 * the form of the other criteria it lists (a bullet that starts with a bold name and names "WCAG 2.2 success
 * criterion x.y.z"), and no longer describes the globe, its bar or a deviation of the order of the hero's buttons.
 */
import { describe, expect, it } from "vitest";
import { readPage, sectionsOf, textOf } from "./helpers/page-facts.js";

const page = () => readPage("accessibility.html");
const known = () => sectionsOf(page().body).get("h-a11y-known");
const items = () => [...known().html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => ({ html: m[1], text: textOf(m[1]) }));
/** The bullet of the hero's motion. */
const bullet = () => items().find((i) => /^<strong>Motion of the home page’s hero\.<\/strong>/.test(i.html.trim()));

describe("the accessibility statement no longer talks about the globe of the home page", () => {
  it("says nothing of Pause motion, of the globe, of the light bar or of the slider of the day", () => {
    const text = textOf(page().body);
    expect(text).not.toMatch(/Pause motion/i);
    expect(text).not.toMatch(/remembers the choice/i);
    expect(text).not.toMatch(/\bglobe\b(?! only)/i);
    expect(text).not.toMatch(/Show the light bar|Scrub the day/);
  });

  it("has no bullet for the Light of the home page, nor for the order of the hero's buttons on a phone", () => {
    expect(items().find((i) => /^<strong>Light of the home page/i.test(i.html.trim()))).toBeUndefined();
    expect(items().find((i) => /^<strong>Order of the hero buttons/i.test(i.html.trim()))).toBeUndefined();
  });
});

describe("the accessibility statement lists WCAG 2.2.2 as not met for the motion of the home page's hero", () => {
  it("has a bullet <strong>Motion of the home page’s hero.</strong>", () => {
    expect(known(), "a Known issues section").toBeTruthy();
    expect(bullet(), "the bullet of the hero's motion").toBeTruthy();
  });

  it("names the criterion as the other bullets do: WCAG 2.2 success criterion 2.2.2, Pause, Stop, Hide, level A", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/WCAG 2\.2 success criterion 2\.2\.2/);
    expect(t).toMatch(/Pause, Stop, Hide/);
    expect(t).toMatch(/level A\b(?!A)/);
  });

  it("says it is not met, for the outlines of the tunnel and for the stars", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/not met/i);
    expect(t).toMatch(/\boutlines\b/i);
    expect(t).toMatch(/\btriangle\b/i);
    expect(t).toMatch(/\bstars\b/i);
  });

  it("says the drawing is hidden from assistive technology, stops off screen and tilts only on a desktop with a mouse", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/hidden from assistive technology/i);
    expect(t).toMatch(/off screen/i);
    expect(t).toMatch(/desktop with a mouse/i);
  });

  it("says the motion stops only with the system's reduced-motion setting, and that the page has no pause control", () => {
    const t = bullet()?.text ?? "";
    expect(t).toMatch(/only/i);
    expect(t).toMatch(/reduced-motion/i);
    expect(t).toMatch(/system/i);
    expect(t).toMatch(/no button or other control/i);
  });

  it("says it has not been tested with a screen reader", () => {
    expect(bullet()?.text ?? "").toMatch(/not (?:yet |been )?tested with a screen reader/i);
  });
});
