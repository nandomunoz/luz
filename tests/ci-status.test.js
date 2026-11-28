/**
 * `scripts/ci-status.js` says how a GitHub Actions run went without an agent reading its logs (AGENTS.md
 * section 8, a script before an agent): one row per job, then only the lines of the failed jobs that say
 * why (a failed test, an `Error:`, `Expected` and `Received`, an `##[error]`), with no timestamps, no
 * retries and no repeats, a few per job. It finds the run by id, by pull request or by branch through
 * `gh`, which the tests replace.
 */
import { describe, expect, it } from "vitest";
import { failureLines, findRun, parseArgs, summarize } from "../scripts/ci-status.js";

const LOG = [
  "Lint\tRun lint\t2026-11-28T14:53:00.0310837Z ok",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:53:00.0310837Z   ✘  1 [chromium] › a.spec.js:3:1 › opens the menu (6.1s)",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:53:06.6512791Z   ✘  2 [chromium] › a.spec.js:3:1 › opens the menu (retry #1) (5.3s)",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:54:11.8893739Z     Error: expect(locator).toBeVisible() failed",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:54:11.8896274Z     Expected: visible",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:54:11.8896275Z     Received: hidden",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:54:11.8907817Z     Error: expect(locator).toBeVisible() failed",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:54:11.9035694Z   1 failed",
  "UI (shard 1/2)\tRun tests\t2026-11-28T14:54:12.0000000Z ##[error]Process completed with exit code 1.",
  "Unit\tRun vitest\t2026-11-28T14:55:00.0000000Z  FAIL  tests/a.test.js > sums > adds",
  "Unit\tRun vitest\t2026-11-28T14:55:00.0000001Z AssertionError: expected 3 to be 4",
].join("\n");

describe("failureLines", () => {
  it("keeps the lines that say why, per job, without timestamps, retries or repeats", () => {
    const lines = failureLines(LOG);
    expect(lines.get("UI (shard 1/2)")).toEqual([
      "✘  1 [chromium] › a.spec.js:3:1 › opens the menu (6.1s)",
      "Error: expect(locator).toBeVisible() failed",
      "Expected: visible",
      "Received: hidden",
      "1 failed",
      "##[error]Process completed with exit code 1.",
    ]);
    expect(lines.get("Unit")).toEqual(["FAIL  tests/a.test.js > sums > adds", "AssertionError: expected 3 to be 4"]);
    expect(lines.has("Lint")).toBe(false);
  });

  it("keeps at most `max` lines of a job", () => {
    expect(failureLines(LOG, { max: 2 }).get("UI (shard 1/2)")).toHaveLength(2);
  });
});

describe("summarize", () => {
  const run = {
    databaseId: 7,
    status: "completed",
    conclusion: "failure",
    url: "https://github.com/o/r/actions/runs/7",
    workflowName: "CI",
    headBranch: "feat/x",
    jobs: [
      { name: "Lint", conclusion: "success", startedAt: "2026-11-28T14:50:00Z", completedAt: "2026-11-28T14:51:30Z" },
      { name: "UI (shard 1/2)", conclusion: "failure", startedAt: "2026-11-28T14:50:00Z", completedAt: "2026-11-28T15:02:00Z" },
    ],
  };

  it("writes a table of the jobs, their result and minutes, then the reasons of the failed ones", () => {
    const text = summarize(run, LOG);
    expect(text).toContain("CI #7 (feat/x): failure");
    expect(text).toContain("| Lint | success | 1.5 |");
    expect(text).toContain("| UI (shard 1/2) | failure | 12.0 |");
    expect(text).toContain("### UI (shard 1/2)");
    expect(text).toContain("Received: hidden");
    expect(text).not.toContain("### Lint");
  });

  it("says a run in progress is in progress and reads no log", () => {
    const text = summarize({ ...run, status: "in_progress", conclusion: "", jobs: [] }, "");
    expect(text).toContain("CI #7 (feat/x): in_progress");
  });
});

describe("parseArgs", () => {
  it("reads a run id, a pull request, a branch and --wait", () => {
    expect(parseArgs(["123"])).toEqual({ run: "123", wait: false });
    expect(parseArgs(["--pr", "190", "--wait"])).toEqual({ pr: "190", wait: true });
    expect(parseArgs(["--branch", "probe/sr2"])).toEqual({ branch: "probe/sr2", wait: false });
    expect(parseArgs(["--branch", "b", "--workflow", "Screen readers"])).toEqual({ branch: "b", workflow: "Screen readers", wait: false });
  });

  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["--nope"])).toThrow(/--nope/);
  });
});

describe("findRun", () => {
  it("takes the latest run of a branch through gh", () => {
    const calls = [];
    const gh = (args) => {
      calls.push(args);
      return JSON.stringify([{ databaseId: 42 }]);
    };
    expect(findRun({ branch: "feat/x", workflow: "CI" }, gh)).toBe("42");
    expect(calls[0]).toEqual(["run", "list", "--branch", "feat/x", "--limit", "1", "--json", "databaseId", "--workflow", "CI"]);
  });

  it("takes the head branch of a pull request", () => {
    const gh = (args) => (args[0] === "pr" ? JSON.stringify({ headRefName: "feat/y" }) : JSON.stringify([{ databaseId: 9 }]));
    expect(findRun({ pr: "190" }, gh)).toBe("9");
  });

  it("fails clearly when there is no run", () => {
    expect(() => findRun({ branch: "none" }, () => "[]")).toThrow(/no run/i);
  });
});
