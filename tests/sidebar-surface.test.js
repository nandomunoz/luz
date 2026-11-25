// The sidebar is the colour of the page in light and in high contrast (owner, 2026-11-25), and in the two moments
// over light (morning, sunset): no panel of another colour. Dark keeps its own, darker one. Every text of it is read.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, resolveColor } from "./helpers/design-tokens.js";

const moments = readFileSync(new URL("../apps/site/theme-light.css", import.meta.url), "utf-8");
const block = (moment) => {
  const i = moments.indexOf(`data-moment="${moment}"]`);
  return moments.slice(i, moments.indexOf("\n}\n", i));
};
const value = (b, token) => new RegExp(`--luz-${token}: ([^;]+);`).exec(b)?.[1].trim();

describe("the sidebar takes the colour of the body", () => {
  it.each(["light", "high-contrast"])("%s: --luz-sidebar-bg is --luz-surface-page", (mode) => {
    expect(resolveColor(mode, "sidebar-bg")).toBe(resolveColor(mode, "surface-page"));
  });

  it("dark keeps a panel darker than its page", () => {
    expect(resolveColor("dark", "sidebar-bg")).not.toBe(resolveColor("dark", "surface-page"));
  });

  it.each(["light", "high-contrast"])("%s: its links, its label and the current link are read (4.5:1)", (mode) => {
    for (const fg of ["sidebar-text", "sidebar-text-hover", "sidebar-label"]) expect(contrast(mode, fg, "sidebar-bg"), fg).toBeGreaterThanOrEqual(4.5);
    expect(contrast(mode, "sidebar-text-hover", "sidebar-hover")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(mode, "sidebar-text", "sidebar-hover")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(mode, "sidebar-active-text", "sidebar-active-bg")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["morning", "sunset"])("%s, over light: the sidebar is the page of the moment", (moment) => {
    const b = block(moment);
    expect(value(b, "sidebar-bg")).toBe(value(b, "surface-page"));
    expect(value(b, "sidebar-hover")).toBe(value(b, "surface-hover"));
  });
});
