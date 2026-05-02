// Real-subprocess integration tests for the listers.
//
// Unlike listers.test.ts (which injects a fake Runner), these tests exercise
// the actual `promisify(execFile)` path: PATH lookup, ENOENT bubbling, exit
// codes, stderr capture, and the JSON shape we expect from real
// `lms ls --json` / `ollama list`. We do NOT depend on LM Studio or Ollama
// being installed — instead, we drop fake shell scripts onto a temp dir and
// prepend it to PATH for the duration of each test.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { listLmStudio, listOllama } from "./listers.js";
import { restoreFetch, mockFetch } from "./test-helpers.js";

// POSIX-only: skip on Windows since the fakes use sh shebangs.
const skipOnWindows = { skip: process.platform === "win32" ? "POSIX-only" : false };

const realPath = process.env.PATH;
let tempDir: string;
let argvLog: string;
let emptyDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "claudely-listers-"));
  emptyDir = mkdtempSync(join(tmpdir(), "claudely-empty-"));
  argvLog = join(tempDir, "argv.log");
  restoreFetch();
});

afterEach(() => {
  process.env.PATH = realPath;
  restoreFetch();
  rmSync(tempDir, { recursive: true, force: true });
  rmSync(emptyDir, { recursive: true, force: true });
});

function installFake(name: string, body: string): void {
  const path = join(tempDir, name);
  writeFileSync(path, body, { mode: 0o755 });
}

function prependToPath(dir: string): void {
  process.env.PATH = `${dir}${delimiter}${realPath ?? ""}`;
}

function readArgvLog(): string[] {
  if (!existsSync(argvLog)) return [];
  return readFileSync(argvLog, "utf8").trim().split("\n");
}

test(
  "listLmStudio: real subprocess — PATH lookup, JSON parse, argv assertion",
  skipOnWindows,
  async () => {
    installFake(
      "lms",
      `#!/usr/bin/env sh
echo "$@" >> "${argvLog}"
case "$1" in
  ls)
    cat <<'JSON'
[{"modelKey":"qwen3-coder","displayName":"Qwen3 Coder","paramsString":"8B","quantization":{"name":"Q4_K_M"},"trainedForToolUse":true}]
JSON
    ;;
  ps)
    echo "[]"
    ;;
esac
`,
    );
    prependToPath(tempDir);

    const result = await listLmStudio("http://localhost:1234", "tok");

    assert.deepEqual(result, [
      {
        id: "qwen3-coder",
        display: "Qwen3 Coder",
        extras: ["8B", "Q4_K_M", "tools"],
        loaded: false,
      },
    ]);

    const argv = readArgvLog().sort();
    assert.deepEqual(argv, ["ls --llm --json", "ps --json"]);
  },
);

test(
  "listLmStudio: ENOENT (binary missing on PATH) → falls back to listV1Models",
  skipOnWindows,
  async () => {
    // Intentionally clobber PATH: the fallback (listV1Models) uses fetch, not execFile.
    process.env.PATH = emptyDir;
    mockFetch({ ok: true, json: async () => ({ data: [{ id: "fallback-model" }] }) });

    const result = await listLmStudio("http://localhost:1234", "tok");

    assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
  },
);

test(
  "listLmStudio: nonzero exit (real stderr/exitcode bubbles) → falls back to listV1Models",
  skipOnWindows,
  async () => {
    installFake(
      "lms",
      `#!/usr/bin/env sh
echo "$@" >> "${argvLog}"
echo "boom" >&2
exit 1
`,
    );
    prependToPath(tempDir);
    mockFetch({ ok: true, json: async () => ({ data: [{ id: "fallback-model" }] }) });

    const result = await listLmStudio("http://localhost:1234", "tok");

    assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
    // Both calls were attempted before falling back.
    const argv = readArgvLog().sort();
    assert.deepEqual(argv, ["ls --llm --json", "ps --json"]);
  },
);

test(
  "listOllama: real subprocess — PATH lookup, table parse, argv assertion",
  skipOnWindows,
  async () => {
    installFake(
      "ollama",
      `#!/usr/bin/env sh
echo "$@" >> "${argvLog}"
cat <<'TABLE'
NAME                ID              SIZE    MODIFIED
qwen3:8b            abc123def456    4.7 GB  2 days ago
llama3:latest       fed987cba321    4.1 GB  3 weeks ago
TABLE
`,
    );
    prependToPath(tempDir);

    const result = await listOllama("http://localhost:11434", "tok");

    assert.deepEqual(result, [
      { id: "qwen3:8b", display: "qwen3:8b", extras: ["4.7 GB", "2 days ago"] },
      { id: "llama3:latest", display: "llama3:latest", extras: ["4.1 GB", "3 weeks ago"] },
    ]);
    assert.deepEqual(readArgvLog(), ["list"]);
  },
);

test(
  "listOllama: ENOENT (binary missing on PATH) → falls back to listV1Models",
  skipOnWindows,
  async () => {
    // Intentionally clobber PATH: the fallback (listV1Models) uses fetch, not execFile.
    process.env.PATH = emptyDir;
    mockFetch({ ok: true, json: async () => ({ data: [{ id: "fallback-model" }] }) });

    const result = await listOllama("http://localhost:11434", "tok");

    assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
  },
);

test(
  "listOllama: nonzero exit (real stderr/exitcode bubbles) → falls back to listV1Models",
  skipOnWindows,
  async () => {
    installFake(
      "ollama",
      `#!/usr/bin/env sh
echo "$@" >> "${argvLog}"
echo "boom" >&2
exit 2
`,
    );
    prependToPath(tempDir);
    mockFetch({ ok: true, json: async () => ({ data: [{ id: "fallback-model" }] }) });

    const result = await listOllama("http://localhost:11434", "tok");

    assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
    assert.deepEqual(readArgvLog(), ["list"]);
  },
);
