/**
 * `scripts/has-unpublished.js` tells the Release workflow whether any package of PUBLISHED has a version the
 * public registry lacks, so `ui-full` and `publish` (and the approval of the `release` environment) run only
 * when something is going to leave. It asks `GET https://registry.npmjs.org/<name>/<version>`: 200 is published,
 * 404 is not. Any other answer, a timeout or a network error counts as unpublished, so a doubt keeps the old
 * behaviour (the job runs and waits for its approval) and the script never fails because of the network.
 */
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PUBLISHED } from "../scripts/luz-packages.js";
import { hasUnpublished, run } from "../scripts/has-unpublished.js";

const dirs = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

const VERSIONS = { tokens: "1.2.3", core: "1.2.3", catalog: "1.2.3", check: "0.4.0", ai: "0.1.0" };

/** A repository root with a manifest for each published package, plus `extra` packages that are not published. */
function repoRoot(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), "luz-unpublished-"));
  dirs.push(root);
  for (const [name, version] of [...PUBLISHED.map((n) => [n, VERSIONS[n]]), ...Object.entries(extra)]) {
    mkdirSync(join(root, "packages", name), { recursive: true });
    writeFileSync(join(root, "packages", name, "package.json"), JSON.stringify({ name: `@luz-ds/${name}`, version }));
  }
  return root;
}

/** A fetch that answers by URL from `table` (a status, or an Error to throw), and records what it was asked. */
function fakeFetch(table, calls = []) {
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    const answer = table(String(url));
    if (answer instanceof Error) throw answer;
    return { status: answer };
  };
  fn.calls = calls;
  return fn;
}
const urlOf = (name) => `https://registry.npmjs.org/@luz-ds%2f${name}/${VERSIONS[name]}`;
const quiet = () => {};

describe("hasUnpublished", () => {
  it("is false when the registry has every version", async () => {
    const f = fakeFetch(() => 200);
    const r = await hasUnpublished({ root: repoRoot(), fetch: f, log: quiet });
    expect(r.unpublished).toBe(false);
    expect(f.calls).toHaveLength(PUBLISHED.length);
  });

  it("is true when one package is missing (404) and the others are there (200)", async () => {
    const r = await hasUnpublished({ root: repoRoot(), fetch: fakeFetch((url) => (url === urlOf("catalog") ? 404 : 200)), log: quiet });
    expect(r.unpublished).toBe(true);
    expect(r.packages.filter((p) => p.unpublished).map((p) => p.name)).toEqual(["@luz-ds/catalog"]);
  });

  it("is true when every package is missing", async () => {
    const r = await hasUnpublished({ root: repoRoot(), fetch: fakeFetch(() => 404), log: quiet });
    expect(r.unpublished).toBe(true);
    expect(r.packages.every((p) => p.unpublished)).toBe(true);
  });

  it("asks for the encoded scoped name and the version: @luz-ds%2f<name>/<version>", async () => {
    const f = fakeFetch(() => 200);
    await hasUnpublished({ root: repoRoot(), fetch: f, log: quiet });
    expect(f.calls.map((c) => c.url).sort()).toEqual(PUBLISHED.map(urlOf).sort());
  });

  it("ignores a package that is not in PUBLISHED, even at a version the registry lacks", async () => {
    const f = fakeFetch((url) => (url.includes("private-thing") ? 404 : 200));
    const r = await hasUnpublished({ root: repoRoot({ "private-thing": "9.9.9" }), fetch: f, log: quiet });
    expect(r.unpublished).toBe(false);
    expect(f.calls.some((c) => c.url.includes("private-thing"))).toBe(false);
  });

  it("counts a 500, a 429, a 403 and a redirect as unpublished: an uncertain answer keeps the job", async () => {
    for (const status of [500, 502, 429, 403, 301]) {
      const r = await hasUnpublished({ root: repoRoot(), fetch: fakeFetch((url) => (url === urlOf("core") ? status : 200)), log: quiet });
      expect(r.unpublished, `HTTP ${status}`).toBe(true);
    }
  });

  it("counts a thrown network error as unpublished, and does not throw", async () => {
    const r = await hasUnpublished({ root: repoRoot(), fetch: fakeFetch((url) => (url === urlOf("ai") ? new TypeError("fetch failed") : 200)), log: quiet });
    expect(r.unpublished).toBe(true);
  });

  it("counts a timeout as unpublished: the request carries an AbortSignal and gives up", async () => {
    const f = (url, init) =>
      new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      });
    const r = await hasUnpublished({ root: repoRoot(), fetch: f, timeoutMs: 20, log: quiet });
    expect(r.unpublished).toBe(true);
    expect(r.packages.every((p) => p.unpublished)).toBe(true);
  });

  it("prints one line per package, with its name, version and what it concluded", async () => {
    const lines = [];
    await hasUnpublished({ root: repoRoot(), fetch: fakeFetch((url) => (url === urlOf("check") ? 404 : url === urlOf("ai") ? 500 : 200)), log: (l) => lines.push(l) });
    expect(lines).toHaveLength(PUBLISHED.length);
    expect(lines.find((l) => l.includes("@luz-ds/tokens@1.2.3"))).toMatch(/already on npm/);
    expect(lines.find((l) => l.includes("@luz-ds/check@0.4.0"))).toMatch(/not on npm/);
    expect(lines.find((l) => l.includes("@luz-ds/ai@0.1.0"))).toMatch(/HTTP 500[^\n]*counts as unpublished/);
  });
});

describe("run (the entry point)", () => {
  it("appends unpublished=false to $GITHUB_OUTPUT when everything is on npm", async () => {
    const out = join(repoRoot(), "github-output");
    await run({ root: repoRoot(), fetch: fakeFetch(() => 200), env: { GITHUB_OUTPUT: out }, log: quiet });
    expect(readFileSync(out, "utf-8")).toBe("unpublished=false\n");
  });

  it("appends unpublished=true when one version is missing, keeping what the file already had", async () => {
    const out = join(repoRoot(), "github-output");
    writeFileSync(out, "other=1\n");
    await run({ root: repoRoot(), fetch: fakeFetch((url) => (url === urlOf("core") ? 404 : 200)), env: { GITHUB_OUTPUT: out }, log: quiet });
    expect(readFileSync(out, "utf-8")).toBe("other=1\nunpublished=true\n");
  });

  it("writes nothing and does not fail when GITHUB_OUTPUT is not set", async () => {
    const lines = [];
    const r = await run({ root: repoRoot(), fetch: fakeFetch(() => 200), env: {}, log: (l) => lines.push(l) });
    expect(r).toBe(false);
    expect(lines.at(-1)).toBe("unpublished=false");
  });

  it("answers true, not an error, when the network is down for every package", async () => {
    const out = join(repoRoot(), "github-output");
    const r = await run({ root: repoRoot(), fetch: fakeFetch(() => new TypeError("fetch failed")), env: { GITHUB_OUTPUT: out }, log: quiet });
    expect(r).toBe(true);
    expect(readFileSync(out, "utf-8")).toBe("unpublished=true\n");
  });
});
