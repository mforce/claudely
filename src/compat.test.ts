import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCompat, type Incompatibility } from "./compat.js";

test("effortLevel xhigh against non-Anthropic: warning + ['--effort','high']", () => {
  const result = applyCompat({
    settings: { effortLevel: "xhigh" },
    baseUrl: "http://localhost:1234",
    existingClaudeArgs: [],
  });

  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /effortLevel/);
  assert.match(result.warnings[0], /xhigh/);
  assert.deepEqual(result.extraArgs, ["--effort", "high"]);
});

test("table iteration: a 2-entry fixture produces both warnings and concatenated args", () => {
  const fixtureTable: readonly Incompatibility[] = [
    {
      settingKey: "effortLevel",
      badValues: new Set(["xhigh"]),
      safeValue: "high",
      cliFlag: "--effort",
      appliesWhen: () => true,
      warning: (bad, safe) => `effort: ${bad} -> ${safe}`,
    },
    {
      settingKey: "wireFormat",
      badValues: new Set(["beta"]),
      safeValue: "stable",
      cliFlag: "--wire-format",
      appliesWhen: () => true,
      warning: (bad, safe) => `wire: ${bad} -> ${safe}`,
    },
  ];

  const result = applyCompat(
    {
      settings: { effortLevel: "xhigh", wireFormat: "beta" },
      baseUrl: "http://localhost:1234",
      existingClaudeArgs: [],
    },
    fixtureTable,
  );

  assert.deepEqual(result.warnings, ["effort: xhigh -> high", "wire: beta -> stable"]);
  assert.deepEqual(result.extraArgs, ["--effort", "high", "--wire-format", "stable"]);
});

test("undefined settings (missing/malformed file): no-op", () => {
  assert.deepEqual(
    applyCompat({
      settings: undefined,
      baseUrl: "http://localhost:1234",
      existingClaudeArgs: [],
    }),
    { warnings: [], extraArgs: [] },
  );
});

test("safe / unset / unknown setting values: no-op", () => {
  const empty = { warnings: [], extraArgs: [] };
  for (const settings of [
    { effortLevel: "high" },
    { effortLevel: "low" },
    { effortLevel: "max" },
    { effortLevel: 42 }, // wrong type
    { somethingElse: "value" }, // unrelated key
    {},
  ] as Array<Record<string, unknown>>) {
    assert.deepEqual(
      applyCompat({
        settings,
        baseUrl: "http://localhost:1234",
        existingClaudeArgs: [],
      }),
      empty,
      `expected no-op for ${JSON.stringify(settings)}`,
    );
  }
});

test("user already passed --effort in claudeArgs: engine yields", () => {
  const result = applyCompat({
    settings: { effortLevel: "xhigh" },
    baseUrl: "http://localhost:1234",
    existingClaudeArgs: ["--effort", "max", "--print", "hi"],
  });
  assert.deepEqual(result, { warnings: [], extraArgs: [] });
});

test("effortLevel xhigh against api.anthropic.com: no-op", () => {
  for (const baseUrl of [
    "https://api.anthropic.com",
    "https://api.anthropic.com/",
    "https://api.anthropic.com/v1",
  ]) {
    const result = applyCompat({
      settings: { effortLevel: "xhigh" },
      baseUrl,
      existingClaudeArgs: [],
    });
    assert.deepEqual(result, { warnings: [], extraArgs: [] }, `should be no-op for ${baseUrl}`);
  }
});
