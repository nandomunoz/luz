/**
 * A place for a model that must do nothing but answer (the person, the judge): an empty folder and a config that holds only the
 * credentials, both new for each call and removed after it. What the assistant under test wrote into its own sandbox, memory
 * or settings included, is never loaded by the model that grades it.
 */
import { copyFileSync, chmodSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function inScratch(sandbox, fn) {
  const cwd = mkdtempSync(join(tmpdir(), "luz-lab-ask-"));
  const config = mkdtempSync(join(tmpdir(), "luz-lab-askcfg-"));
  try {
    const credentials = join(sandbox.configDir ?? "", ".credentials.json");
    if (sandbox.configDir && existsSync(credentials)) {
      copyFileSync(credentials, join(config, ".credentials.json"));
      chmodSync(join(config, ".credentials.json"), 0o600);
    }
    return await fn({ cwd, env: { ...sandbox.env, PATH: process.env.PATH, HOME: config, CLAUDE_CONFIG_DIR: config } });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(config, { recursive: true, force: true });
  }
}
