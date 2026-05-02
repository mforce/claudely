import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { listLmStudio, listOllama, listV1Models, type Runner } from "./listers.js";
import { restoreFetch, mockFetch } from "./test-helpers.js";

function fakeRun(responses: Record<string, string | Error>): Runner {
  return async (cmd: string, args: string[]) => {
    const key = `${cmd} ${args.join(" ")}`;
    const r = responses[key];
    if (r === undefined) throw new Error(`unexpected exec: ${key}`);
    if (r instanceof Error) throw r;
    return { stdout: r, stderr: "" };
  };
}

const enoentRunner: Runner = async () => {
  const err = new Error("spawn ENOENT") as Error & { code?: string };
  err.code = "ENOENT";
  throw err;
};

function mockV1Fallback(id = "fallback-model") {
  mockFetch({
    ok: true,
    json: async () => ({ data: [{ id }] }),
  });
}

beforeEach(() => {
  restoreFetch();
});

afterEach(() => {
  restoreFetch();
});

test("listV1Models parses /v1/models data into ModelEntry[] with empty extras", async () => {
  mockFetch({
    ok: true,
    json: async () => ({
      data: [{ id: "model-a" }, { id: "model-b" }],
    }),
  });

  const result = await listV1Models("http://localhost:1234", "tok");

  assert.deepEqual(result, [
    { id: "model-a", display: "model-a", extras: [] },
    { id: "model-b", display: "model-b", extras: [] },
  ]);
});

test("listV1Models returns [] when the server responds non-OK", async () => {
  mockFetch({ ok: false, json: async () => ({ data: [{ id: "should-not-appear" }] }) });

  const result = await listV1Models("http://localhost:1234", "tok");

  assert.deepEqual(result, []);
});

test("listV1Models returns [] when fetch rejects (network error / timeout)", async () => {
  globalThis.fetch = (async () => {
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;

  const result = await listV1Models("http://localhost:1234", "tok");

  assert.deepEqual(result, []);
});

test("listLmStudio maps lms ls entries to ModelEntry shape (not loaded → loaded:false)", async () => {
  const run = fakeRun({
    "lms ls --llm --json": JSON.stringify([
      { modelKey: "qwen3-coder", displayName: "Qwen3 Coder" },
    ]),
    "lms ps --json": "[]",
  });

  const result = await listLmStudio("http://localhost:1234", "tok", run);

  assert.deepEqual(result, [
    { id: "qwen3-coder", display: "Qwen3 Coder", extras: [], loaded: false },
  ]);
});

test("listLmStudio tags loaded models with [LOADED] prefix and loaded:true", async () => {
  const run = fakeRun({
    "lms ls --llm --json": JSON.stringify([
      { modelKey: "qwen3-coder", displayName: "Qwen3 Coder" },
      { modelKey: "llama-3", displayName: "Llama 3" },
    ]),
    "lms ps --json": JSON.stringify([{ modelKey: "qwen3-coder" }]),
  });

  const result = await listLmStudio("http://localhost:1234", "tok", run);

  assert.equal(result[0].loaded, true);
  assert.equal(result[0].display, "[LOADED] Qwen3 Coder");
  assert.equal(result[1].loaded, false);
  assert.equal(result[1].display, "Llama 3");
});

test("listLmStudio builds extras from paramsString, quantization.name, trainedForToolUse, dropping blanks", async () => {
  const run = fakeRun({
    "lms ls --llm --json": JSON.stringify([
      {
        modelKey: "full-meta",
        displayName: "Full",
        paramsString: "8B",
        quantization: { name: "Q4_K_M" },
        trainedForToolUse: true,
      },
      {
        modelKey: "sparse-meta",
        displayName: "Sparse",
      },
    ]),
    "lms ps --json": "[]",
  });

  const result = await listLmStudio("http://localhost:1234", "tok", run);

  assert.deepEqual(result[0].extras, ["8B", "Q4_K_M", "tools"]);
  assert.deepEqual(result[1].extras, []);
});

test("listLmStudio falls back to /v1/models when lms ls returns empty", async () => {
  const run = fakeRun({
    "lms ls --llm --json": "[]",
    "lms ps --json": "[]",
  });
  mockV1Fallback();

  const result = await listLmStudio("http://localhost:1234", "tok", run);

  assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
});

test("listLmStudio falls back to /v1/models when lms binary throws", async () => {
  mockV1Fallback();

  const result = await listLmStudio("http://localhost:1234", "tok", enoentRunner);

  assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
});

test("listOllama parses ollama list table into rows with size and modified extras", async () => {
  const run = fakeRun({
    "ollama list": [
      "NAME                ID              SIZE    MODIFIED",
      "qwen3:8b            abc123def456    4.7 GB  2 days ago",
      "llama3:latest       fed987cba321    4.1 GB  3 weeks ago",
    ].join("\n"),
  });

  const result = await listOllama("http://localhost:11434", "tok", run);

  assert.deepEqual(result, [
    { id: "qwen3:8b", display: "qwen3:8b", extras: ["4.7 GB", "2 days ago"] },
    { id: "llama3:latest", display: "llama3:latest", extras: ["4.1 GB", "3 weeks ago"] },
  ]);
});

test("listOllama falls back to /v1/models when only header line is present", async () => {
  const run = fakeRun({
    "ollama list": "NAME                ID              SIZE    MODIFIED",
  });
  mockV1Fallback();

  const result = await listOllama("http://localhost:11434", "tok", run);

  assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
});

test("listOllama falls back to /v1/models when ollama binary throws", async () => {
  mockV1Fallback();

  const result = await listOllama("http://localhost:11434", "tok", enoentRunner);

  assert.deepEqual(result, [{ id: "fallback-model", display: "fallback-model", extras: [] }]);
});

test("listV1Models hits {baseUrl}/v1/models with Authorization: Bearer <token>", async () => {
  let capturedUrl: string | undefined;
  let capturedHeaders: Record<string, string> | undefined;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    capturedHeaders = init?.headers as Record<string, string>;
    return { ok: true, json: async () => ({ data: [] }) } as Response;
  }) as typeof fetch;

  await listV1Models("http://localhost:1234", "secret-token");

  assert.equal(capturedUrl, "http://localhost:1234/v1/models");
  assert.equal(capturedHeaders?.Authorization, "Bearer secret-token");
});
