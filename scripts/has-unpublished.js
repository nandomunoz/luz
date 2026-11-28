/**
 * LUZ Design System — Is any version still to publish?
 * Tells the Release workflow (`.github/workflows/publish.yml`, job `gate`) whether at least one package of
 * PUBLISHED has a version the public npm registry lacks, so the full UI suite and the publish job (and the
 * approval of the `release` environment) run only when something is going to leave.
 *
 * For each published package it reads the name and version of its package.json and asks the registry
 * `GET https://registry.npmjs.org/<name>/<version>` (a scoped name is encoded: `@luz-ds%2ftokens`):
 * 200 is published, 404 is not. Anything else (another status, a timeout, a network error) counts as
 * unpublished for that package, so a doubt keeps the old behaviour and never skips a release; the script
 * never exits non-zero because of the network.
 *
 * Prints one line per package and, when GITHUB_OUTPUT is set, appends `unpublished=true|false` to it.
 *
 * Usage: node scripts/has-unpublished.js      (Node 20 or later, no dependency)
 */

import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLISHED } from "./luz-packages.js";

const REGISTRY = "https://registry.npmjs.org";
const TIMEOUT_MS = 15_000;

/** Is `name@version` on the registry? { unpublished, reason } — a doubt is unpublished. */
async function check(fetchFn, name, version, timeoutMs) {
  // `@luz-ds/tokens` is asked as `@luz-ds%2ftokens`: the scope keeps its @, only the slash is encoded
  const url = `${REGISTRY}/${name.replace("/", "%2f")}/${encodeURIComponent(version)}`;
  try {
    const res = await fetchFn(url, { headers: { accept: "application/json" }, signal: globalThis.AbortSignal.timeout(timeoutMs) });
    // Free the connection: only the status matters
    await res.body?.cancel?.().catch(() => {});
    if (res.status === 200) return { unpublished: false, reason: "already on npm" };
    if (res.status === 404) return { unpublished: true, reason: "not on npm" };
    return { unpublished: true, reason: `HTTP ${res.status}, counts as unpublished` };
  } catch (error) {
    return { unpublished: true, reason: `${error?.name ?? "Error"}: ${error?.message ?? error}, counts as unpublished` };
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.root]      repository root (default: the parent of scripts/)
 * @param {typeof fetch} [options.fetch]  injected for the tests
 * @param {string[]} [options.names]   package folders to check (default: PUBLISHED)
 * @param {number} [options.timeoutMs] per request
 * @param {(line: string) => void} [options.log]
 * @returns {Promise<{ unpublished: boolean, packages: { name: string, version: string, unpublished: boolean, reason: string }[] }>}
 */
export async function hasUnpublished({
  root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  fetch: fetchFn = globalThis.fetch,
  names = PUBLISHED,
  timeoutMs = TIMEOUT_MS,
  log = console.log,
} = {}) {
  const packages = [];
  for (const folder of names) {
    const manifest = JSON.parse(readFileSync(join(root, "packages", folder, "package.json"), "utf-8"));
    const result = await check(fetchFn, manifest.name, manifest.version, timeoutMs);
    packages.push({ name: manifest.name, version: manifest.version, ...result });
    log(`${manifest.name}@${manifest.version}: ${result.reason}`);
  }
  return { unpublished: packages.some((p) => p.unpublished), packages };
}

/** Runs the check, prints the verdict and appends it to $GITHUB_OUTPUT when there is one. Returns the verdict. */
export async function run({ env = process.env, log = console.log, ...options } = {}) {
  const { unpublished } = await hasUnpublished({ ...options, log });
  const line = `unpublished=${unpublished}`;
  log(line);
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${line}\n`);
  return unpublished;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
