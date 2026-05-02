import { test } from "node:test";
import assert from "node:assert/strict";
import { splitArgs, type FlagSpec } from "./argsplit.js";

const SPEC: FlagSpec = {
  string: new Set(["provider", "model", "base-url", "token"]),
  boolean: new Set(["list", "help"]),
  short: { p: "provider", m: "model", u: "base-url", t: "token", h: "help" },
};

test("splits known claudely flags from passthrough args", () => {
  const result = splitArgs(["-p", "ollama", "--print", "hi"], SPEC);
  assert.deepEqual(result.own, ["-p", "ollama"]);
  assert.deepEqual(result.claude, ["--print", "hi"]);
});

test("explicit -- forces all subsequent tokens to claude, even claudely-known ones", () => {
  const result = splitArgs(["--", "-p", "collide", "--list"], SPEC);
  assert.deepEqual(result.own, []);
  assert.deepEqual(result.claude, ["-p", "collide", "--list"]);
});

test("-- in the middle: tokens before stay on claudely, tokens after go to claude verbatim", () => {
  const result = splitArgs(["-p", "ollama", "--", "--provider", "force"], SPEC);
  assert.deepEqual(result.own, ["-p", "ollama"]);
  assert.deepEqual(result.claude, ["--provider", "force"]);
});

test("recognizes glued short value -pollama", () => {
  const result = splitArgs(["-pollama"], SPEC);
  assert.deepEqual(result.own, ["-pollama"]);
  assert.deepEqual(result.claude, []);
});

test("recognizes -p=ollama and --provider=ollama (= form)", () => {
  const a = splitArgs(["-p=ollama"], SPEC);
  assert.deepEqual(a.own, ["-p=ollama"]);
  assert.deepEqual(a.claude, []);

  const b = splitArgs(["--provider=ollama"], SPEC);
  assert.deepEqual(b.own, ["--provider=ollama"]);
  assert.deepEqual(b.claude, []);
});

test("--list (boolean) does not consume the next token", () => {
  const result = splitArgs(["--list", "extra-positional"], SPEC);
  assert.deepEqual(result.own, ["--list"]);
  assert.deepEqual(result.claude, ["extra-positional"]);
});

test("unknown long flag and its following positional both go to claude verbatim", () => {
  const result = splitArgs(["--print", "hi", "-p", "ollama"], SPEC);
  assert.deepEqual(result.own, ["-p", "ollama"]);
  assert.deepEqual(result.claude, ["--print", "hi"]);
});

test("unknown short flag goes to claude untouched", () => {
  const result = splitArgs(["-x", "value"], SPEC);
  assert.deepEqual(result.own, []);
  assert.deepEqual(result.claude, ["-x", "value"]);
});

test("bare positional tokens (no leading dash) go to claude", () => {
  const result = splitArgs(["chat", "with", "claude"], SPEC);
  assert.deepEqual(result.own, []);
  assert.deepEqual(result.claude, ["chat", "with", "claude"]);
});
