# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released version below has a corresponding GitHub Release; the version
section is also used as the body of the Release notes by the
`release-on-version-bump` workflow.

## [Unreleased]

## [0.1.5] - 2026-05-03

### Added
- `claudely setup` interactive wizard: walks through provider, base URL,
  auth token, connection test with model discovery, and default model
  selection. Saves to a platform-native config file (`~/.config/claudely/`
  on Linux, `~/Library/Application Support/claudely/` on macOS,
  `%APPDATA%\claudely\` on Windows).
- Persistent config loaded on every run. Precedence: CLI flag > env var >
  config file > provider default.
- New `src/config.ts` consolidates all config I/O: `configDir()`,
  `configPath()`, `loadConfig()`, `saveConfig()`, and `loadSettings()`
  (moved from compat.ts to decouple I/O from business logic).

### Fixed
- llamacpp provider switched from `api_key` to `auth_token` envStyle —
  fixes 401 errors for Claude Max users whose OAuth session token was
  overriding `ANTHROPIC_API_KEY`.
- Setup wizard connection test now sends `Authorization: Bearer` header —
  previously fetched `/v1/models` without auth, causing silent failures on
  servers that require a key.

### Changed
- `loadSettings()` moved from `compat.ts` to `config.ts`. `compat.ts` now
  contains only business logic (no `fs` import).

## [0.1.4] - 2026-05-02

### Added
- Auto-resume on bare `claudely` invocation: when a saved claude session
  exists for the current directory, `claudely` (with no args) now resumes
  it instead of starting fresh. A one-line stderr notice announces the
  behavior (`claudely: resuming previous session (use --new for a fresh
  one)`).
- New `--new` flag forces a fresh session even when a saved one exists
  for the cwd.
- New `CLAUDELY_NO_AUTO_RESUME=1` env var disables auto-resume globally.

### Changed
- Explicit resume flags (`-c` / `--continue`, `-r` / `--resume`,
  `--session-id`, `--from-pr`) now skip the model picker. Previously the
  picker still ran even when the user was clearly resuming, producing a
  model value the saved session would override.
- Model selection and resume detection are now independent decisions.
  `claudely --model X` (with a saved session) auto-resumes AND passes
  `--model X` through to claude; `claudely -c --model X` no longer
  silently drops the explicit model. Env-derived model defaults
  (`CLAUDELY_MODEL`, provider-specific env vars) are skipped on resume,
  since they're "default for fresh," not "intent to override the saved
  session."

## [0.1.3] - 2026-05-01

### Added
- `-V` / `--version` flag prints both `claudely` and the wrapped `claude`
  CLI versions on two lines, then exits. Reports `claude  not found on
  PATH` (without failing) when the upstream binary isn't installed, so
  bug reports always have both numbers.
- Real-subprocess integration tests for the `lms` and `ollama` model
  listers. Drops fake shell scripts onto a temp dir and prepends it to
  `PATH`, exercising the actual `promisify(execFile)` path (PATH lookup,
  ENOENT, exit codes, argv) without depending on either provider being
  installed.

### Changed
- `--help` and `--version` now provably short-circuit before provider
  resolution, base-url/token validation, lister discovery, and spawning
  `claude` — covered by an end-to-end test that runs the compiled CLI
  with `PATH` cleared and a bogus `CLAUDELY_PROVIDER`.
- Declares `@anthropic-ai/claude-code >=2.0.0` as a peer dependency, so
  `npm i -g claudely` on npm 7+ also installs `claude` automatically.
  Users who installed Claude Code via the native installer or Homebrew
  are unaffected — npm just installs an additional copy under the npm
  prefix, and `PATH` order decides which one runs.

## [0.1.2] - 2026-05-01

### Changed
- Publish pipeline now uses npm Trusted Publishing (OIDC) end to end, with
  npm pinned to `11.13.0` in the publish job. No code changes; this is the
  first version actually delivered to npm under the new pipeline (0.1.1
  was tagged on GitHub but never reached the registry, because Node 22's
  bundled npm 10.x silently does not implement OIDC trusted publishing).

## [0.1.1] - 2026-05-01

### Changed
- No user-facing changes. Internal release validating the automated
  `release-on-version-bump` → `publish.yml` chain end to end.

## [0.1.0] - 2026-05-01

### Added
- Initial release of `claudely`, a TypeScript CLI that wraps `claude` for use
  against local model servers.
- Auto-detection of LM Studio (`lms ls`) and Ollama (`ollama list`) installations
  with an interactive model picker.
- Compatibility registry that translates `~/.claude/settings.json` `effortLevel`
  values (e.g. `xhigh`) into provider-appropriate flags, with a warning when a
  local server rejects the configured level.
- `--effort high` injection into the `claude` argv when the registry calls for it.
- Argv passthrough: unknown flags are forwarded to `claude` without requiring a
  `--` separator.
- CI workflow (Node 20, 22) and npm publish workflow triggered by GitHub Release.

[Unreleased]: https://github.com/mforce/claudely/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/mforce/claudely/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/mforce/claudely/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/mforce/claudely/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/mforce/claudely/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/mforce/claudely/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mforce/claudely/releases/tag/v0.1.0
