import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface ClaudelyConfig {
  provider?: string;
  baseUrl?: string;
  token?: string;
  model?: string;
}

export function configDir(): string {
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "claudely");
    case "darwin":
      return join(homedir(), "Library", "Application Support", "claudely");
    default:
      return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "claudely");
  }
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function loadConfig(): ClaudelyConfig {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as ClaudelyConfig;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return {};
    process.stderr.write("claudely: warning: corrupt config file, using defaults\n");
    return {};
  }
}

export function saveConfig(config: ClaudelyConfig): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.json"), JSON.stringify(config, null, 2) + "\n");
}

export function loadSettings(settingsPath: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
