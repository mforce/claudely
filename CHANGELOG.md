# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released version below has a corresponding GitHub Release; the version
section is also used as the body of the Release notes by the
`release-on-version-bump` workflow.

## [Unreleased]

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

[Unreleased]: https://github.com/mforce/claudely/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/mforce/claudely/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mforce/claudely/releases/tag/v0.1.0
