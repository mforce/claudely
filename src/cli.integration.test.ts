// End-to-end guards that --help and --version short-circuit BEFORE provider
// resolution, lister discovery, or spawning claude. We run the compiled CLI
// in a child process with PATH cleared so a missing `claude` binary cannot
// be silently spawned, and with no provider env so any accidental discovery
// would fail loudly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);
const skipOnWindows = { skip: process.platform === "win32" ? "POSIX-only" : false };
const CLI = join(process.cwd(), "dist-test", "cli.js");

let emptyDir: string;

function emptyEnv(): NodeJS.ProcessEnv {
  // Keep only what's needed to run node itself; strip provider/anthropic
  // overrides so the short-circuit can't be masked by ambient config.
  return {
    PATH: emptyDir,
    HOME: process.env.HOME,
  };
}

test.before(() => {
  emptyDir = mkdtempSync(join(tmpdir(), "claudely-cli-empty-"));
});

test.after(() => {
  rmSync(emptyDir, { recursive: true, force: true });
});

test("--help exits 0 and prints usage without touching providers or claude", skipOnWindows, async () => {
  const { stdout, stderr } = await run(process.execPath, [CLI, "--help"], {
    env: emptyEnv(),
    timeout: 5000,
  });
  assert.match(stdout, /Usage: claudely/);
  assert.match(stdout, /-V, --version/);
  assert.equal(stderr, "");
});

test("--version exits 0 and prints both lines, even with no claude on PATH", skipOnWindows, async () => {
  const { stdout, stderr } = await run(process.execPath, [CLI, "--version"], {
    env: emptyEnv(),
    timeout: 5000,
  });
  const lines = stdout.trim().split("\n");
  assert.equal(lines.length, 2, `expected 2 lines, got: ${JSON.stringify(stdout)}`);
  assert.match(lines[0], /^claudely \d+\.\d+\.\d+/);
  assert.equal(lines[1], "claude  not found on PATH");
  assert.equal(stderr, "");
});

test("-V short flag works the same as --version", skipOnWindows, async () => {
  const { stdout } = await run(process.execPath, [CLI, "-V"], {
    env: emptyEnv(),
    timeout: 5000,
  });
  const lines = stdout.trim().split("\n");
  assert.match(lines[0], /^claudely \d+\.\d+\.\d+/);
  assert.equal(lines[1], "claude  not found on PATH");
});

test("--help wins over a bogus provider env (proves it short-circuits before provider resolution)", skipOnWindows, async () => {
  const { stdout } = await run(process.execPath, [CLI, "--help"], {
    env: { ...emptyEnv(), CLAUDELY_PROVIDER: "this-provider-does-not-exist" },
    timeout: 5000,
  });
  assert.match(stdout, /Usage: claudely/);
});

test("--version wins over a bogus provider env (proves it short-circuits before provider resolution)", skipOnWindows, async () => {
  const { stdout } = await run(process.execPath, [CLI, "--version"], {
    env: { ...emptyEnv(), CLAUDELY_PROVIDER: "this-provider-does-not-exist" },
    timeout: 5000,
  });
  assert.match(stdout, /^claudely \d+\.\d+\.\d+/);
});
