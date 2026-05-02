import { test } from "node:test";
import assert from "node:assert/strict";
import { isResumeIntent, assembleClaudeArgv } from "./resume.js";

test("isResumeIntent: empty args → false", () => {
  assert.equal(isResumeIntent([]), false);
});

test("isResumeIntent: ordinary claude args without resume flags → false", () => {
  assert.equal(isResumeIntent(["--print", "explain this repo"]), false);
  assert.equal(isResumeIntent(["--effort", "high", "--debug"]), false);
});

test("isResumeIntent: -c short flag → true", () => {
  assert.equal(isResumeIntent(["-c"]), true);
});

test("isResumeIntent: --continue long flag → true", () => {
  assert.equal(isResumeIntent(["--continue"]), true);
});

test("isResumeIntent: -r short flag (alone, picker mode) → true", () => {
  assert.equal(isResumeIntent(["-r"]), true);
});

test("isResumeIntent: -r with a search/id argument → true", () => {
  assert.equal(isResumeIntent(["-r", "auth-refactor"]), true);
});

test("isResumeIntent: --resume long flag → true", () => {
  assert.equal(isResumeIntent(["--resume"]), true);
  assert.equal(isResumeIntent(["--resume", "session-id-123"]), true);
});

test("isResumeIntent: --resume=value (equals form) → true", () => {
  assert.equal(isResumeIntent(["--resume=auth-refactor"]), true);
});

test("isResumeIntent: --session-id <uuid> → true", () => {
  assert.equal(
    isResumeIntent(["--session-id", "550e8400-e29b-41d4-a716-446655440000"]),
    true,
  );
});

test("isResumeIntent: --session-id=<uuid> (equals form) → true", () => {
  assert.equal(
    isResumeIntent(["--session-id=550e8400-e29b-41d4-a716-446655440000"]),
    true,
  );
});

test("isResumeIntent: --from-pr (with or without value) → true", () => {
  assert.equal(isResumeIntent(["--from-pr"]), true);
  assert.equal(isResumeIntent(["--from-pr", "123"]), true);
  assert.equal(isResumeIntent(["--from-pr=123"]), true);
});

test("isResumeIntent: resume flag mixed in with other args → true", () => {
  assert.equal(isResumeIntent(["--debug", "--continue", "--print"]), true);
});

test("isResumeIntent: a positional that LOOKS like a flag substring → false", () => {
  // The user's prompt happens to contain the word "--continue" — must not match.
  assert.equal(isResumeIntent(["--print", "should I --continue or stop?"]), false);
  // Likewise something that contains "session-id" but isn't the flag.
  assert.equal(isResumeIntent(["--print", "explain --session-id"]), false);
});

test("assembleClaudeArgv: model present → injects --model at the front", () => {
  const out = assembleClaudeArgv({
    model: "qwen3-coder",
    extraArgs: ["--effort", "high"],
    claudeArgs: ["--print", "hello"],
  });
  assert.deepEqual(out, ["--model", "qwen3-coder", "--effort", "high", "--print", "hello"]);
});

test("assembleClaudeArgv: model undefined (resume case) → no --model in argv", () => {
  const out = assembleClaudeArgv({
    model: undefined,
    extraArgs: ["--effort", "high"],
    claudeArgs: ["-c"],
  });
  assert.deepEqual(out, ["--effort", "high", "-c"]);
  assert.equal(out.includes("--model"), false);
});

test("assembleClaudeArgv: empty extras and claude args → just the model pair (or nothing)", () => {
  assert.deepEqual(
    assembleClaudeArgv({ model: "m", extraArgs: [], claudeArgs: [] }),
    ["--model", "m"],
  );
  assert.deepEqual(
    assembleClaudeArgv({ model: undefined, extraArgs: [], claudeArgs: [] }),
    [],
  );
});
