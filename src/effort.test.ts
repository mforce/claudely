import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { effortWarning, loadEffortLevel, maybeWarnEffort } from "./effort.js";

test("effortWarning warns when effortLevel is xhigh against a non-Anthropic base URL", () => {
  const msg = effortWarning({
    effortLevel: "xhigh",
    baseUrl: "http://localhost:1234",
  });

  assert.ok(msg, "expected a warning string");
  assert.match(msg, /effortLevel/);
  assert.match(msg, /xhigh/);
});

test("effortWarning returns null for safe effort levels and when unset", () => {
  for (const level of ["low", "medium", "high", undefined]) {
    assert.equal(
      effortWarning({ effortLevel: level, baseUrl: "http://localhost:1234" }),
      null,
      `expected null for effortLevel=${level}`,
    );
  }
});

test("effortWarning returns null when targeting api.anthropic.com even with xhigh", () => {
  for (const baseUrl of [
    "https://api.anthropic.com",
    "https://api.anthropic.com/",
    "https://api.anthropic.com/v1",
  ]) {
    assert.equal(
      effortWarning({ effortLevel: "xhigh", baseUrl }),
      null,
      `expected null for baseUrl=${baseUrl}`,
    );
  }
});

test("effortWarning does NOT warn for 'max' (it's in the accepted enum per the observed 400)", () => {
  assert.equal(
    effortWarning({ effortLevel: "max", baseUrl: "http://localhost:1234" }),
    null,
  );
  assert.equal(
    effortWarning({ effortLevel: "max", baseUrl: "https://api.anthropic.com" }),
    null,
  );
});

test("loadEffortLevel returns the value when settings.json is present and valid", () => {
  const dir = mkdtempSync(join(tmpdir(), "loclaude-test-"));
  const path = join(dir, "settings.json");
  try {
    writeFileSync(path, JSON.stringify({ effortLevel: "xhigh" }));
    assert.equal(loadEffortLevel(path), "xhigh");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadEffortLevel returns undefined for missing, unreadable, or malformed settings.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "loclaude-test-"));
  try {
    assert.equal(loadEffortLevel(join(dir, "does-not-exist.json")), undefined);

    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not valid json");
    assert.equal(loadEffortLevel(bad), undefined);

    const noKey = join(dir, "no-key.json");
    writeFileSync(noKey, JSON.stringify({ other: "thing" }));
    assert.equal(loadEffortLevel(noKey), undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("maybeWarnEffort writes warning to writer when xhigh + non-Anthropic settings.json found", () => {
  const dir = mkdtempSync(join(tmpdir(), "loclaude-test-"));
  const settingsPath = join(dir, "settings.json");
  writeFileSync(settingsPath, JSON.stringify({ effortLevel: "xhigh" }));
  const lines: string[] = [];
  try {
    maybeWarnEffort({
      baseUrl: "http://localhost:1234",
      settingsPath,
      write: (s) => lines.push(s),
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(lines.length, 1, "expected exactly one warning line");
  assert.match(lines[0], /effortLevel/);
  assert.match(lines[0], /xhigh/);
  assert.ok(lines[0].endsWith("\n"), "warning should end with newline");
});

test("maybeWarnEffort writes nothing for safe effort, missing settings, or Anthropic target", () => {
  const dir = mkdtempSync(join(tmpdir(), "loclaude-test-"));
  const safe = join(dir, "safe.json");
  writeFileSync(safe, JSON.stringify({ effortLevel: "high" }));
  const xhigh = join(dir, "xhigh.json");
  writeFileSync(xhigh, JSON.stringify({ effortLevel: "xhigh" }));
  try {
    const lines: string[] = [];
    const write = (s: string) => lines.push(s);

    maybeWarnEffort({ baseUrl: "http://localhost:1234", settingsPath: safe, write });
    maybeWarnEffort({
      baseUrl: "http://localhost:1234",
      settingsPath: join(dir, "missing.json"),
      write,
    });
    maybeWarnEffort({ baseUrl: "https://api.anthropic.com", settingsPath: xhigh, write });

    assert.equal(lines.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
