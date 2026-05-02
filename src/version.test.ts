import { test } from "node:test";
import assert from "node:assert/strict";
import { readClaudelyVersion, probeClaudeVersion, renderVersion } from "./version.js";

test("readClaudelyVersion returns the semver from package.json", () => {
  const v = readClaudelyVersion();
  assert.match(v, /^\d+\.\d+\.\d+/, `expected semver, got ${v}`);
});

test("probeClaudeVersion: happy path returns trimmed stdout", async () => {
  const v = await probeClaudeVersion(async () => ({
    stdout: "1.2.3 (Claude Code)\n",
    stderr: "",
  }));
  assert.equal(v, "1.2.3 (Claude Code)");
});

test("probeClaudeVersion: ENOENT becomes 'not found on PATH'", async () => {
  const v = await probeClaudeVersion(async () => {
    const err = new Error("spawn claude ENOENT") as Error & { code?: string };
    err.code = "ENOENT";
    throw err;
  });
  assert.equal(v, "not found on PATH");
});

test("probeClaudeVersion: nonzero exit surfaces stderr (or message fallback)", async () => {
  const v = await probeClaudeVersion(async () => {
    const err = new Error("Command failed") as Error & { stderr?: string };
    err.stderr = "claude: bad license\n";
    throw err;
  });
  assert.equal(v, "claude: bad license");
});

test("probeClaudeVersion: error with no stderr falls back to error message", async () => {
  const v = await probeClaudeVersion(async () => {
    throw new Error("timeout");
  });
  assert.equal(v, "error: timeout");
});

test("renderVersion: composes both lines in the documented shape", async () => {
  const out = await renderVersion(async () => ({ stdout: "9.9.9", stderr: "" }));
  const [line1, line2] = out.split("\n");
  assert.match(line1, /^claudely \d+\.\d+\.\d+/);
  assert.equal(line2, "claude  9.9.9");
});

test("renderVersion: still returns 2 lines when claude is missing", async () => {
  const out = await renderVersion(async () => {
    const err = new Error("spawn claude ENOENT") as Error & { code?: string };
    err.code = "ENOENT";
    throw err;
  });
  const [line1, line2] = out.split("\n");
  assert.match(line1, /^claudely \d+\.\d+\.\d+/);
  assert.equal(line2, "claude  not found on PATH");
});
