/**
 * The sources of the luz skill (presets of the kinds, stacks, the starter's base) are `packages/ai/src`. A test that edits a
 * copy of the repository whose `packages` is linked to the real one would write through the link: this gives the copy its
 * own `packages/ai/src` and keeps every other entry a link.
 */
import { cpSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";

export function ownSkillSources(root, dir) {
  if (resolve(dir) === resolve(root)) throw new Error("ownSkillSources: the copy is the repository itself");
  const packages = join(dir, "packages");
  if (lstatSync(packages, { throwIfNoEntry: false })?.isSymbolicLink()) {
    rmSync(packages);
    mkdirSync(packages);
    for (const pkg of readdirSync(join(root, "packages"))) symlinkSync(join(root, "packages", pkg), join(packages, pkg));
  }
  mkdirSync(packages, { recursive: true });
  const ai = join(packages, "ai");
  rmSync(ai, { recursive: true, force: true });
  mkdirSync(ai);
  for (const entry of readdirSync(join(root, "packages/ai"))) if (entry !== "src") symlinkSync(join(root, "packages/ai", entry), join(ai, entry));
  cpSync(join(root, "packages/ai/src"), join(ai, "src"), { recursive: true });
}
