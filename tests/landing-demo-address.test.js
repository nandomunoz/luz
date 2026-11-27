import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  fileURLToPath(new URL("../apps/landing/index.html", import.meta.url)),
  "utf8",
);

describe("landing demo address", () => {
  it("uses no address on a domain we do not own", () => {
    expect(html).not.toMatch(/@luz\.dev/);
  });
});
