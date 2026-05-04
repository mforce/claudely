# Graph Report - /home/cesar/dev/claudely  (2026-05-03)

## Corpus Check
- Corpus is ~14,888 words - fits in a single context window. You may not need a graph.

## Summary
- 165 nodes · 210 edges · 15 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_CLI Core & Config|CLI Core & Config]]
- [[_COMMUNITY_Compiled Output (dist-test)|Compiled Output (dist-test)]]
- [[_COMMUNITY_Setup Wizard Spec|Setup Wizard Spec]]
- [[_COMMUNITY_Source Modules & Tests|Source Modules & Tests]]
- [[_COMMUNITY_Lister Integration Tests|Lister Integration Tests]]
- [[_COMMUNITY_Provider & Model Discovery|Provider & Model Discovery]]
- [[_COMMUNITY_Test Helpers & Mocking|Test Helpers & Mocking]]
- [[_COMMUNITY_Session Resume Logic|Session Resume Logic]]
- [[_COMMUNITY_CLI-Lister Bridge|CLI-Lister Bridge]]
- [[_COMMUNITY_Compatibility Layer|Compatibility Layer]]
- [[_COMMUNITY_Version Tests (dist)|Version Tests (dist)]]
- [[_COMMUNITY_Help Text|Help Text]]
- [[_COMMUNITY_ModelEntry Type|ModelEntry Type]]
- [[_COMMUNITY_Runner Type|Runner Type]]
- [[_COMMUNITY_RestoreFetch Helper|RestoreFetch Helper]]

## God Nodes (most connected - your core abstractions)
1. `main()` - 21 edges
2. `main()` - 10 edges
3. `main()` - 10 edges
4. `PROVIDERS registry` - 8 edges
5. `listLmStudio()` - 6 edges
6. `listOllama()` - 6 edges
7. `listV1Models()` - 6 edges
8. `claudely setup -- Interactive Configuration Wizard` - 6 edges
9. `listForProvider()` - 5 edges
10. `listV1Models()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `src/config.ts -- Config persistence layer` --semantically_similar_to--> `Compatibility layer (applyCompat, loadSettings, INCOMPATIBILITIES)`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-05-03-setup-wizard-design.md → dist-test/compat.js
- `Setting resolution precedence chain` --semantically_similar_to--> `Auto-resume on bare invocation feature`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-05-03-setup-wizard-design.md → dist-test/cli.js
- `main()` --implemented_by--> `KV-cache speedup via CLAUDE_CODE_ATTRIBUTION_HEADER=0`  [EXTRACTED]
  src/cli.ts → README.md
- `main()` --implemented_by--> `Setting resolution precedence chain`  [INFERRED]
  src/cli.ts → docs/superpowers/specs/2026-05-03-setup-wizard-design.md
- `PROVIDERS registry` --reads--> `src/setup.ts -- Interactive wizard (runSetup)`  [EXTRACTED]
  src/providers.ts → docs/superpowers/specs/2026-05-03-setup-wizard-design.md

## Hyperedges (group relationships)
- **config.ts consolidates all config I/O functions** — setup_config_ts, setup_load_config, setup_save_config, setup_config_dir, setup_config_path, setup_load_settings [INFERRED 1.00]
- **Platform-native config file locations resolved by configDir()** — setup_config_file_linux, setup_config_file_macos, setup_config_file_windows [INFERRED 1.00]
- **loadSettings decoupling: moved from compat.ts to config.ts, cli.ts import updated** — setup_cli_ts, setup_compat_ts, setup_config_ts [INFERRED 1.00]

## Communities

### Community 0 - "CLI Core & Config"
Cohesion: 0.08
Nodes (27): FlagSpec interface, Argument splitter (splitArgs), splitArgs(), Auto-resume on bare invocation feature, FLAG_SPEC, main(), Compatibility layer (applyCompat, loadSettings, INCOMPATIBILITIES), Arg splitting pattern (own vs claude passthrough) (+19 more)

### Community 1 - "Compiled Output (dist-test)"
Cohesion: 0.18
Nodes (14): splitArgs(), main(), applyCompat(), loadSettings(), assembleClaudeArgv(), encodeCwdForClaude(), hasRecentSessionForCwd(), isResumeIntent() (+6 more)

### Community 2 - "Setup Wizard Spec"
Cohesion: 0.14
Nodes (20): ClaudelyConfig, src/cli.ts, src/compat.ts, configDir(), Linux config path, macOS config path, Windows config path, configPath() (+12 more)

### Community 3 - "Source Modules & Tests"
Cohesion: 0.15
Nodes (3): probeClaudeVersion(), readClaudelyVersion(), renderVersion()

### Community 4 - "Lister Integration Tests"
Cohesion: 0.16
Nodes (3): listLmStudio(), listOllama(), listV1Models()

### Community 5 - "Provider & Model Discovery"
Cohesion: 0.23
Nodes (15): listForProvider(), Auth env-style pattern (auth_token vs api_key), Lister fallback pattern (CLI tool -> /v1/models HTTP), Provider env-style auth (auth_token vs api_key), listLmStudio(), listOllama(), listV1Models(), custom provider (+7 more)

### Community 6 - "Test Helpers & Mocking"
Cohesion: 0.22
Nodes (3): mockV1Fallback(), mockFetch(), mockV1Fallback()

### Community 7 - "Session Resume Logic"
Cohesion: 0.32
Nodes (5): encodeCwdForClaude(), hasRecentSessionForCwd(), isResumeIntent(), shouldAutoResume(), seedSessionFile()

### Community 8 - "CLI-Lister Bridge"
Cohesion: 0.57
Nodes (5): listForProvider(), listLmStudio(), listOllama(), listV1Models(), listForProvider()

### Community 9 - "Compatibility Layer"
Cohesion: 0.5
Nodes (4): applyCompat(), INCOMPATIBILITIES table, Incompatibility interface, Settings incompatibility clamping pattern

### Community 17 - "Version Tests (dist)"
Cohesion: 1.0
Nodes (1): HELP text

### Community 18 - "Help Text"
Cohesion: 1.0
Nodes (1): ModelEntry interface

### Community 19 - "ModelEntry Type"
Cohesion: 1.0
Nodes (1): Runner type

### Community 20 - "Runner Type"
Cohesion: 1.0
Nodes (1): SplitResult interface

### Community 23 - "RestoreFetch Helper"
Cohesion: 1.0
Nodes (1): claudely - launch Claude Code against local LLM

## Knowledge Gaps
- **18 isolated node(s):** `HELP text`, `ModelEntry interface`, `Runner type`, `Incompatibility interface`, `FlagSpec interface` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Version Tests (dist)`** (1 nodes): `HELP text`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Help Text`** (1 nodes): `ModelEntry interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ModelEntry Type`** (1 nodes): `Runner type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Runner Type`** (1 nodes): `SplitResult interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `RestoreFetch Helper`** (1 nodes): `claudely - launch Claude Code against local LLM`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `CLI Core & Config` to `Compatibility Layer`, `Provider & Model Discovery`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `main()` connect `Compiled Output (dist-test)` to `CLI-Lister Bridge`, `Source Modules & Tests`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `mockV1Fallback()` connect `Test Helpers & Mocking` to `Lister Integration Tests`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `main()` (e.g. with `splitArgs()` and `renderVersion()`) actually correct?**
  _`main()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `main()` (e.g. with `splitArgs()` and `loadSettings()`) actually correct?**
  _`main()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HELP text`, `ModelEntry interface`, `Runner type` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CLI Core & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._