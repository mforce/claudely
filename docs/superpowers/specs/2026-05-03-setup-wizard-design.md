# `claudely setup` — Interactive Configuration Wizard

## Summary

Add a `claudely setup` subcommand that walks the user through configuring
their provider, base URL, auth token, and default model via an interactive
wizard. Values are persisted to a platform-native config file and loaded on
every subsequent `claudely` invocation, slotting into the resolution chain
below CLI flags and env vars but above hardcoded provider defaults.

## Config file location

Platform-native paths, no new dependencies:

| Platform | Path |
|----------|------|
| Linux    | `$XDG_CONFIG_HOME/claudely/config.json` (default `~/.config/claudely/`) |
| macOS    | `~/Library/Application Support/claudely/config.json` |
| Windows  | `%APPDATA%\claudely\config.json` |

## Config shape

```ts
interface ClaudelyConfig {
  provider?: string;
  baseUrl?: string;
  token?: string;
  model?: string;
}
```

All fields optional. Missing fields fall through to the next source in the
precedence chain.

## Precedence

For each setting, highest wins:

```
CLI flag  >  env var  >  config file  >  provider default
```

Examples:
- `provider`: `--provider` > `$CLAUDELY_PROVIDER` > `config.provider` > `"lmstudio"`
- `baseUrl`: `--base-url` > `$CLAUDELY_BASE_URL` > `config.baseUrl` > `provider.defaultBaseUrl()`
- `token`: `--token` > `$CLAUDELY_TOKEN` > `config.token` > `provider.defaultToken`
- `model` (non-resume): `--model` > `$CLAUDELY_MODEL` > `config.model` > picker

## New files

### `src/config.ts` — All config I/O in one place

Consolidates all config-reading logic. `loadSettings()` moves here from
`compat.ts` so that disk I/O and compat business logic are decoupled.

- `configDir(): string` — platform-aware directory resolution
- `configPath(): string` — `configDir() + "/config.json"`
- `loadConfig(): ClaudelyConfig` — reads and parses JSON; returns `{}` if
  file is missing or corrupt (logs a warning on corrupt)
- `saveConfig(config: ClaudelyConfig): void` — writes pretty-printed JSON;
  creates directory with `{ recursive: true }` if needed
- `loadSettings(settingsPath: string)` — moved from `compat.ts`; reads
  Claude Code's `~/.claude/settings.json` and returns the parsed object
  (or `undefined` on missing/corrupt)

### `src/setup.ts` — Interactive wizard

Exported entry point: `runSetup(): Promise<number>` (returns exit code).

Flow:

1. **Load existing config** — pre-fill prompts with saved values (if any)
2. **Pick provider** — `@inquirer/prompts` select over `PROVIDER_NAMES`,
   default = existing config value or `lmstudio`
3. **Base URL** — input prompt, pre-filled with `config.baseUrl` or the
   selected provider's default
4. **Auth token** — input prompt, pre-filled with `config.token` or the
   provider's default
5. **Test connection** — `fetch(baseUrl + "/v1/models")` with a 5 s timeout.
   On success: print model count. On failure: warn but continue (server may
   not be running yet — config is still valid to save)
6. **Pick default model** — if connection succeeded and models were returned,
   show the model picker (reuse `listForProvider`). If connection failed,
   offer a text input for manual model ID entry (or Enter to skip)
7. **Confirm & save** — print a summary table of what will be written, then
   call `saveConfig()`

Running `claudely setup` when a config already exists shows current values
as prompt defaults so the user can accept (Enter) or edit inline.

## Changes to existing files

### `src/compat.ts` — Decouple I/O from business logic

- **Remove** `loadSettings()` (moves to `config.ts`)
- **Remove** `import { readFileSync } from "node:fs"` (no longer needed)
- `applyCompat()`, `INCOMPATIBILITIES`, `isAnthropicHost()` stay unchanged
- Re-export `loadSettings` from `config.ts` for backwards compat during
  transition, or update all import sites directly (preferred)

### `src/cli.ts`

- **Import change** — `loadSettings` imported from `"./config.js"` instead
  of `"./compat.js"`
- **Subcommand dispatch** — before `parseArgs`, check if
  `process.argv[2] === "setup"`. If so, import and call `runSetup()`, then
  exit with its return code.
- **Config loading** — after `parseArgs`, call `loadConfig()` and thread the
  result into provider/baseUrl/token/model resolution per the precedence
  table above.
- **HELP text** — add `claudely setup` to the usage block.

## Testing

### `src/config.test.ts`

- `configDir()` returns correct path per platform (mock `process.platform`)
- `loadConfig()` / `saveConfig()` round-trip through a temp directory
- `loadConfig()` returns `{}` on missing file
- `loadConfig()` returns `{}` and warns on corrupt JSON
- `saveConfig()` creates parent directories if missing
- `loadSettings()` — existing tests from `compat.test.ts` that cover
  `loadSettings` move here (or compat.test.ts imports from config.ts)

### Setup wizard

The wizard is interactive (`@inquirer/prompts`), so it is not unit-tested
directly. The config layer covers the persistence logic; the wizard is
verified via manual smoke testing.

## Out of scope

- Per-project config (`.claudely/config.json` in cwd) — future enhancement
- Config migration from env-var-only setups
- `claudely config get/set` subcommands — future enhancement
