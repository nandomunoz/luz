/**
 * LUZ Design System — Publisher
 * Publishes each package whose current version is not on the registry yet,
 * lowest layer first. Already-published versions are skipped, so the script
 * is safe to re-run; any real failure stops the release.
 *
 * Tarballs are created with `pnpm pack` (rewrites the workspace: protocol)
 * and uploaded with `npm publish` (OIDC trusted publishing + provenance).
 * Before upload, the real tarball is checked against pack-files.txt and its
 * manifest against the workspace: protocol, so what ships is what was
 * reviewed (check-pack.js inspects `npm pack --dry-run`, not this file).
 *
 * Usage: node scripts/publish.js [--dry-run]   (run `pnpm build` first)
 */

import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
// Order matters: a package is only published after the ones it depends on
// (scripts/luz-packages.js lists them in that order)
import { PUBLISHED } from "./luz-packages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function checkTarball(tarball, pkgRoot, name) {
  const shipped = execFileSync("tar", ["-tzf", tarball], { encoding: "utf-8" })
    .split("\n")
    .filter((line) => line && !line.endsWith("/"))
    .map((line) => line.replace(/^package\//, ""))
    .sort();
  const expected = readFileSync(resolve(pkgRoot, "pack-files.txt"), "utf-8").split("\n").filter(Boolean).sort();
  const added = shipped.filter((p) => !expected.includes(p));
  const removed = expected.filter((p) => !shipped.includes(p));
  if (added.length || removed.length) {
    throw new Error(
      `${name}: tarball differs from pack-files.txt\n  added: ${added.join(", ") || "none"}\n  missing: ${removed.join(", ") || "none"}`,
    );
  }
  const manifest = execFileSync("tar", ["-xzOf", tarball, "package/package.json"], { encoding: "utf-8" });
  if (manifest.includes("workspace:")) throw new Error(`${name}: tarball manifest still uses the workspace: protocol`);
}

function isPublished(name, version) {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version", "--json"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch (error) {
    // Only "not found" means unpublished; anything else must stop the release
    if (/E404/.test(`${error.stdout}${error.stderr}`)) return false;
    throw error;
  }
}

// A package still at its workspace placeholder has no release behind it (its changeset is missing or was not versioned):
// publishing it would put 0.0.0 on the registry, so nothing is published
const placeholders = PUBLISHED.filter((dir) => /^0\.0\.0(-|$)/.test(JSON.parse(readFileSync(resolve(repoRoot, "packages", dir, "package.json"), "utf-8")).version));
if (placeholders.length) {
  console.error(`✗ ${placeholders.map((d) => `@luz-ds/${d}`).join(", ")} is at 0.0.0, the placeholder of a package with no release: add its changeset and run the version step first. Nothing was published.`);
  process.exit(1);
}

for (const dir of PUBLISHED) {
  const pkgRoot = resolve(repoRoot, "packages", dir);
  const { name, version } = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));

  if (isPublished(name, version)) {
    console.log(`– ${name}@${version} already published, skipping`);
    continue;
  }

  const outDir = mkdtempSync(join(tmpdir(), "luz-pack-"));
  execFileSync("pnpm", ["pack", "--pack-destination", outDir], { cwd: pkgRoot, stdio: "inherit" });
  const tarball = join(outDir, readdirSync(outDir).find((f) => f.endsWith(".tgz")));
  checkTarball(tarball, pkgRoot, name);

  const args = ["publish", tarball, "--access", "public", "--provenance"];
  if (dryRun) args.push("--dry-run");
  execFileSync("npm", args, { stdio: "inherit" });
  console.log(`✓ ${name}@${version} ${dryRun ? "would be published" : "published"}`);
}
