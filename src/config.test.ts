import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { configDir, configPath, loadConfig, saveConfig, loadSettings } from "./config.js";

// --- platform mocking helpers ---
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
function mockPlatform(value: string) {
  Object.defineProperty(process, "platform", { value, configurable: true });
}
function restorePlatform() {
  Object.defineProperty(process, "platform", originalPlatform);
}

// --- configDir platform tests ---

test("configDir on linux uses $XDG_CONFIG_HOME/claudely when set", () => {
  const saved = process.env.XDG_CONFIG_HOME;
  try {
    mockPlatform("linux");
    process.env.XDG_CONFIG_HOME = "/tmp/custom-xdg";
    assert.equal(configDir(), "/tmp/custom-xdg/claudely");
  } finally {
    restorePlatform();
    if (saved === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = saved;
  }
});

test("configDir on linux defaults to ~/.config/claudely when XDG unset", () => {
  const saved = process.env.XDG_CONFIG_HOME;
  try {
    mockPlatform("linux");
    delete process.env.XDG_CONFIG_HOME;
    assert.equal(configDir(), join(homedir(), ".config", "claudely"));
  } finally {
    restorePlatform();
    if (saved === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = saved;
  }
});

test("configDir on darwin uses Library/Application Support/claudely", () => {
  try {
    mockPlatform("darwin");
    assert.equal(configDir(), join(homedir(), "Library", "Application Support", "claudely"));
  } finally {
    restorePlatform();
  }
});

test("configDir on win32 uses APPDATA/claudely", () => {
  const saved = process.env.APPDATA;
  try {
    mockPlatform("win32");
    process.env.APPDATA = "C:\\Users\\test\\AppData\\Roaming";
    assert.equal(configDir(), join("C:\\Users\\test\\AppData\\Roaming", "claudely"));
  } finally {
    restorePlatform();
    if (saved === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = saved;
  }
});

test("configPath ends with config.json", () => {
  assert.ok(configPath().endsWith("config.json"));
});

// --- loadConfig / saveConfig tests ---

test("round-trip: saveConfig then loadConfig returns same object", () => {
  const dir = mkdtempSync(join(tmpdir(), "claudely-cfg-"));
  const savedXDG = process.env.XDG_CONFIG_HOME;
  try {
    mockPlatform("linux");
    process.env.XDG_CONFIG_HOME = dir;
    const config = { provider: "ollama", baseUrl: "http://localhost:11434", model: "llama3" };
    saveConfig(config);
    const loaded = loadConfig();
    assert.deepEqual(loaded, config);
  } finally {
    restorePlatform();
    if (savedXDG === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedXDG;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadConfig returns {} for missing file", () => {
  const dir = mkdtempSync(join(tmpdir(), "claudely-cfg-"));
  const savedXDG = process.env.XDG_CONFIG_HOME;
  try {
    mockPlatform("linux");
    process.env.XDG_CONFIG_HOME = dir;
    // No config file exists in this temp dir
    assert.deepEqual(loadConfig(), {});
  } finally {
    restorePlatform();
    if (savedXDG === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedXDG;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadConfig returns {} and writes warning to stderr for corrupt JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "claudely-cfg-"));
  const savedXDG = process.env.XDG_CONFIG_HOME;
  try {
    mockPlatform("linux");
    process.env.XDG_CONFIG_HOME = dir;

    // Create the claudely subdirectory and write corrupt JSON
    const cfgDir = join(dir, "claudely");
    mkdirSync(cfgDir, { recursive: true });
    writeFileSync(join(cfgDir, "config.json"), "{ not valid json !!!");

    // Capture stderr
    const chunks: string[] = [];
    const origWrite = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof process.stderr.write;

    try {
      const result = loadConfig();
      assert.deepEqual(result, {});
      assert.ok(chunks.some((c) => c.includes("corrupt")), "expected stderr warning about corrupt config");
    } finally {
      process.stderr.write = origWrite;
    }
  } finally {
    restorePlatform();
    if (savedXDG === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedXDG;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("saveConfig creates parent directories if missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "claudely-cfg-"));
  const savedXDG = process.env.XDG_CONFIG_HOME;
  try {
    mockPlatform("linux");
    // Point XDG to a non-existent subdirectory
    const nested = join(dir, "deeply", "nested");
    process.env.XDG_CONFIG_HOME = nested;
    assert.ok(!existsSync(nested));
    saveConfig({ provider: "test" });
    assert.ok(existsSync(join(nested, "claudely", "config.json")));
  } finally {
    restorePlatform();
    if (savedXDG === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = savedXDG;
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- loadSettings tests (moved from compat.test.ts) ---

test("loadSettings returns parsed object for a valid file", () => {
  const dir = mkdtempSync(join(tmpdir(), "claudely-test-"));
  try {
    const path = join(dir, "settings.json");
    writeFileSync(path, JSON.stringify({ effortLevel: "xhigh", other: 1 }));
    assert.deepEqual(loadSettings(path), { effortLevel: "xhigh", other: 1 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadSettings returns undefined for missing, malformed, or non-object JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "claudely-test-"));
  try {
    assert.equal(loadSettings(join(dir, "nope.json")), undefined);

    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not valid json");
    assert.equal(loadSettings(bad), undefined);

    const arr = join(dir, "arr.json");
    writeFileSync(arr, "[1,2,3]");
    assert.equal(loadSettings(arr), undefined);

    const lit = join(dir, "lit.json");
    writeFileSync(lit, '"a string"');
    assert.equal(loadSettings(lit), undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
