/**
 * The breakpoints on their docs page (apps/docs/pages/tokens/layout.html) are drawn as devices, the small wireframes of
 * the page of the tokens (owner, 2026-11-23: "not bars"): phone, tablet, laptop, monitor, one per breakpoint, in the
 * order of tokens.json, over the list that names them.
 *
 * Each device is as wide as its own token, read by the docs' stylesheet (apps/docs/reference.css) as
 * `var(--luz-mq-<step>)` times one scale, so no width is typed; its label says the step and the value of tokens.json.
 * The row is a picture (aria-hidden): the list under it is what a screen reader reads.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(repo, file), "utf-8");
const page = read("apps/docs/pages/tokens/layout.html");
const css = read("apps/docs/reference.css");
const breakpoint = JSON.parse(read("packages/tokens/tokens.json")).breakpoint;
const steps = Object.keys(breakpoint);
const valueOf = (step) => breakpoint[step].value ?? breakpoint[step].$value;
const KIND = { sm: "phone", md: "tablet", lg: "laptop", xl: "laptop", xxl: "desktop", xxxl: "desktop" };

const section = page.slice(page.indexOf('id="breakpoints"'));
const row = /<ul class="docs-devices" aria-hidden="true">([\s\S]*?)<\/ul>/.exec(section)?.[1] ?? "";

describe("the breakpoints of the docs are devices", () => {
  it("draws one device per breakpoint, in the order of tokens.json, before the list that names them", () => {
    expect(steps.length).toBe(6);
    const items = [...row.matchAll(/<li><span class="docs-device docs-device--([a-z]+) docs-device--([a-z]+)"><\/span><code>([a-z]+) ([\d.]+px)<\/code><\/li>/g)];
    expect(items.map((m) => m[2])).toEqual(steps);
    for (const [, kind, step, label, value] of items) {
      expect(kind, step).toBe(KIND[step]);
      expect(label).toBe(step);
      expect(value, step).toBe(valueOf(step));
    }
    expect(section.indexOf('class="docs-devices"')).toBeLessThan(section.indexOf('class="docs-scale-list"'));
  });

  it("sizes each device from its own token, never a typed width", () => {
    for (const step of steps) expect(css, step).toMatch(new RegExp(`\\.docs-device--${step}\\s*\\{[^}]*--docs-device-w:\\s*var\\(--luz-mq-${step}\\)`));
    expect(css).toMatch(/\.docs-device\s*\{[^}]*inline-size:\s*calc\(var\(--docs-device-w\) \* [\d.]+\)/);
    for (const kind of ["phone", "tablet", "laptop", "desktop"]) expect(css, kind).toMatch(new RegExp(`\\.docs-device--${kind}\\s*\\{[^}]*aspect-ratio`));
  });
});
