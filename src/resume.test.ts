import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isResumeIntent,
  assembleClaudeArgv,
  encodeCwdForClaude,
  hasRecentSessionForCwd,
  shouldAutoResume,
  resolveModelForSpawn,
} from "./resume.js";

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

test("assembleClaudeArgv: explicit model + --continue in claudeArgs → both present (resume + model override)", () => {
  const out = assembleClaudeArgv({
    model: "qwen3-coder",
    extraArgs: [],
    claudeArgs: ["--continue"],
  });
  assert.deepEqual(out, ["--model", "qwen3-coder", "--continue"]);
});

test("assembleClaudeArgv: explicit model + -c short form → both present", () => {
  const out = assembleClaudeArgv({
    model: "qwen3-coder",
    extraArgs: ["--effort", "high"],
    claudeArgs: ["-c"],
  });
  assert.deepEqual(out, ["--model", "qwen3-coder", "--effort", "high", "-c"]);
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

test("encodeCwdForClaude mirrors claude's per-cwd directory naming", () => {
  assert.equal(encodeCwdForClaude("/home/cesar/dev/claudely"), "-home-cesar-dev-claudely");
  assert.equal(
    encodeCwdForClaude("/home/cesar/dev/shelfydex--worktrees/feat-api-security"),
    "-home-cesar-dev-shelfydex--worktrees-feat-api-security",
  );
});

let fakeHome: string;

beforeEach(() => {
  fakeHome = mkdtempSync(join(tmpdir(), "claudely-home-"));
});

afterEach(() => {
  rmSync(fakeHome, { recursive: true, force: true });
});

function seedSessionFile(cwd: string, sessionId: string) {
  const dir = join(fakeHome, ".claude", "projects", encodeCwdForClaude(cwd));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${sessionId}.jsonl`), '{"type":"summary"}\n');
}

test("hasRecentSessionForCwd: no projects dir at all → false", () => {
  assert.equal(hasRecentSessionForCwd("/some/where", { home: fakeHome }), false);
});

test("hasRecentSessionForCwd: empty per-cwd dir (no .jsonl) → false", () => {
  const cwd = "/home/u/proj";
  mkdirSync(join(fakeHome, ".claude", "projects", encodeCwdForClaude(cwd)), {
    recursive: true,
  });
  assert.equal(hasRecentSessionForCwd(cwd, { home: fakeHome }), false);
});

test("hasRecentSessionForCwd: per-cwd dir contains .jsonl → true", () => {
  const cwd = "/home/u/proj";
  seedSessionFile(cwd, "abc-session-id");
  assert.equal(hasRecentSessionForCwd(cwd, { home: fakeHome }), true);
});

test("hasRecentSessionForCwd: only non-jsonl files (e.g. memory dir) → false", () => {
  const cwd = "/home/u/proj";
  const dir = join(fakeHome, ".claude", "projects", encodeCwdForClaude(cwd));
  mkdirSync(join(dir, "memory"), { recursive: true });
  writeFileSync(join(dir, "settings.json"), "{}");
  assert.equal(hasRecentSessionForCwd(cwd, { home: fakeHome }), false);
});

test("hasRecentSessionForCwd: a different cwd's session does not leak", () => {
  seedSessionFile("/home/u/other", "abc");
  assert.equal(hasRecentSessionForCwd("/home/u/proj", { home: fakeHome }), false);
});

const baseInputs = {
  ownValues: {},
  claudeArgs: [] as string[],
  hasRecentSession: true,
  env: {} as NodeJS.ProcessEnv,
};

test("shouldAutoResume: bare invocation with a saved session → true", () => {
  assert.equal(shouldAutoResume(baseInputs), true);
});

test("shouldAutoResume: no saved session → false", () => {
  assert.equal(shouldAutoResume({ ...baseInputs, hasRecentSession: false }), false);
});

test("shouldAutoResume: --new opts out → false", () => {
  assert.equal(shouldAutoResume({ ...baseInputs, ownValues: { new: true } }), false);
});

test("shouldAutoResume: --list path → false", () => {
  assert.equal(shouldAutoResume({ ...baseInputs, ownValues: { list: true } }), false);
});

test("shouldAutoResume: --model present does NOT block auto-resume — model and resume are independent", () => {
  assert.equal(shouldAutoResume({ ...baseInputs, ownValues: { model: "x" } }), true);
});

test("shouldAutoResume: any forwarded claudeArgs (positional or flag) → false", () => {
  assert.equal(shouldAutoResume({ ...baseInputs, claudeArgs: ["--print", "hi"] }), false);
  assert.equal(shouldAutoResume({ ...baseInputs, claudeArgs: ["explain X"] }), false);
});

test("shouldAutoResume: CLAUDELY_NO_AUTO_RESUME=1 opts out → false", () => {
  assert.equal(
    shouldAutoResume({ ...baseInputs, env: { CLAUDELY_NO_AUTO_RESUME: "1" } }),
    false,
  );
});

test("shouldAutoResume: CLAUDELY_NO_AUTO_RESUME=0/false/empty does NOT opt out", () => {
  for (const v of ["0", "false", ""]) {
    assert.equal(
      shouldAutoResume({ ...baseInputs, env: { CLAUDELY_NO_AUTO_RESUME: v } }),
      true,
      `CLAUDELY_NO_AUTO_RESUME=${JSON.stringify(v)} should not opt out`,
    );
  }
});

test("resolveModelForSpawn: explicit CLI --model wins over everything, resume or not", () => {
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: "deepseek-ai/DeepSeek-V4-Flash-0731",
      env: {},
      configModel: "opus[1m]",
      providerModelEnvVar: "LLAMACPP_MODEL",
      explicitlyResuming: true,
    }),
    { model: "deepseek-ai/DeepSeek-V4-Flash-0731", needsPicker: false },
  );
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: "deepseek-ai/DeepSeek-V4-Flash-0731",
      env: {},
      configModel: "opus[1m]",
      explicitlyResuming: false,
    }),
    { model: "deepseek-ai/DeepSeek-V4-Flash-0731", needsPicker: false },
  );
});

test("resolveModelForSpawn: AUTO-resume (not explicit) still applies the configured model — regression for stale Anthropic sessions", () => {
  // Bare `claudely` auto-resumes: the shared ~/.claude dir may hold a session
  // from a different provider (Anthropic), so we MUST still pass the local
  // config's model. claude --continue then uses it instead of falling back to
  // the settings.json model (opus[1m]) which doesn't exist on the local server.
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: {},
      configModel: "deepseek-ai/DeepSeek-V4-Flash-0731",
      providerModelEnvVar: "LLAMACPP_MODEL",
      explicitlyResuming: false, // auto-resume
    }),
    { model: "deepseek-ai/DeepSeek-V4-Flash-0731", needsPicker: false },
  );
});

test("resolveModelForSpawn: EXPLICIT resume keeps the saved session's model (no override, no picker)", () => {
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: {},
      configModel: "deepseek-ai/DeepSeek-V4-Flash-0731",
      providerModelEnvVar: "LLAMACPP_MODEL",
      explicitlyResuming: true, // user passed -c / --session-id / etc.
    }),
    { model: undefined, needsPicker: false },
  );
});

test("resolveModelForSpawn: fresh run falls back to CLAUDELY_MODEL then config then provider env", () => {
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: { CLAUDELY_MODEL: "from-env" },
      configModel: "config-model",
      explicitlyResuming: false,
    }),
    { model: "from-env", needsPicker: false },
  );
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: {},
      configModel: "config-model",
      explicitlyResuming: false,
    }),
    { model: "config-model", needsPicker: false },
  );
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: { LLAMACPP_MODEL: "provider-env-model" },
      configModel: undefined,
      providerModelEnvVar: "LLAMACPP_MODEL",
      explicitlyResuming: false,
    }),
    { model: "provider-env-model", needsPicker: false },
  );
});

test("resolveModelForSpawn: no model anywhere and not resuming → needs picker", () => {
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: {},
      configModel: undefined,
      providerModelEnvVar: "LLAMACPP_MODEL",
      explicitlyResuming: false,
    }),
    { model: undefined, needsPicker: true },
  );
});

test("resolveModelForSpawn: no model and resuming (auto or explicit) → no picker, no model (claude --continue already knows its session)", () => {
  // Auto-resume with no configured model: skip picker, let claude --continue
  // do its thing rather than interrupting to ask.
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: {},
      configModel: undefined,
      explicitlyResuming: false,
    }),
    { model: undefined, needsPicker: true },
  );
  assert.deepEqual(
    resolveModelForSpawn({
      explicitModel: undefined,
      env: {},
      configModel: undefined,
      explicitlyResuming: true,
    }),
    { model: undefined, needsPicker: false },
  );
});
