# Graph Report - /home/cesar/dev/claudely  (2026-05-03)

## Corpus Check
- 18 files · ~7,723 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 119 nodes · 155 edges · 12 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Setup & Config|Setup & Config]]
- [[_COMMUNITY_CLI Entry & Flags|CLI Entry & Flags]]
- [[_COMMUNITY_Lister Tests|Lister Tests]]
- [[_COMMUNITY_Module Imports|Module Imports]]
- [[_COMMUNITY_Provider Dispatch|Provider Dispatch]]
- [[_COMMUNITY_Resume Session|Resume Session]]
- [[_COMMUNITY_Compat Layer|Compat Layer]]
- [[_COMMUNITY_Version Reporting|Version Reporting]]
- [[_COMMUNITY_CLI Help|CLI Help]]
- [[_COMMUNITY_Model Entry Type|Model Entry Type]]
- [[_COMMUNITY_Runner Type|Runner Type]]
- [[_COMMUNITY_Split Result Type|Split Result Type]]

## God Nodes (most connected - your core abstractions)
1. `main()` - 11 edges
2. `main()` - 7 edges
3. `listLmStudio()` - 6 edges
4. `listOllama()` - 6 edges
5. `listV1Models()` - 6 edges
6. `listForProvider()` - 5 edges
7. `PROVIDERS registry` - 5 edges
8. `runSetup()` - 5 edges
9. `ListerKind type` - 4 edges
10. `INCOMPATIBILITIES table` - 4 edges

## Surprising Connections (you probably didn't know these)
- `applyCompat()` --calls--> `main()`  [INFERRED]
  compat.ts → cli.ts
- `main()` --calls--> `loadSettings()`  [INFERRED]
  cli.ts → config.ts
- `main()` --calls--> `loadConfig()`  [INFERRED]
  cli.ts → config.ts
- `main()` --calls--> `runSetup()`  [INFERRED]
  cli.ts → setup.ts
- `loadConfig()` --calls--> `runSetup()`  [INFERRED]
  config.ts → setup.ts

## Communities

### Community 0 - "Setup & Config"
Cohesion: 0.14
Nodes (20): ClaudelyConfig, src/cli.ts, src/compat.ts, configDir(), Linux config path, macOS config path, Windows config path, configPath() (+12 more)

### Community 1 - "CLI Entry & Flags"
Cohesion: 0.12
Nodes (13): FlagSpec interface, splitArgs(), FLAG_SPEC, main(), applyCompat(), INCOMPATIBILITIES table, Incompatibility interface, Arg splitting pattern (own vs claude passthrough) (+5 more)

### Community 2 - "Lister Tests"
Cohesion: 0.15
Nodes (6): installFake(), prependToPath(), readArgvLog(), listLmStudio(), listOllama(), listV1Models()

### Community 3 - "Module Imports"
Cohesion: 0.26
Nodes (9): listForProvider(), main(), configDir(), configPath(), loadConfig(), loadSettings(), saveConfig(), listForProvider() (+1 more)

### Community 4 - "Provider Dispatch"
Cohesion: 0.25
Nodes (14): listForProvider(), Auth env-style pattern (auth_token vs api_key), Lister fallback pattern (CLI tool -> /v1/models HTTP), listLmStudio(), listOllama(), listV1Models(), custom provider, EnvStyle type (+6 more)

### Community 5 - "Resume Session"
Cohesion: 0.32
Nodes (4): encodeCwdForClaude(), hasRecentSessionForCwd(), isResumeIntent(), shouldAutoResume()

### Community 6 - "Compat Layer"
Cohesion: 0.33
Nodes (2): applyCompat(), isAnthropicHost()

### Community 7 - "Version Reporting"
Cohesion: 0.6
Nodes (3): probeClaudeVersion(), readClaudelyVersion(), renderVersion()

### Community 11 - "CLI Help"
Cohesion: 1.0
Nodes (1): HELP text

### Community 12 - "Model Entry Type"
Cohesion: 1.0
Nodes (1): ModelEntry interface

### Community 13 - "Runner Type"
Cohesion: 1.0
Nodes (1): Runner type

### Community 14 - "Split Result Type"
Cohesion: 1.0
Nodes (1): SplitResult interface

## Knowledge Gaps
- **8 isolated node(s):** `HELP text`, `ModelEntry interface`, `Runner type`, `Incompatibility interface`, `FlagSpec interface` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Compat Layer`** (7 nodes): `compat.test.ts`, `compat.ts`, `applyCompat()`, `isAnthropicHost()`, `loadSettings()`, `compat.test.ts`, `compat.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Help`** (1 nodes): `HELP text`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Model Entry Type`** (1 nodes): `ModelEntry interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Runner Type`** (1 nodes): `Runner type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Split Result Type`** (1 nodes): `SplitResult interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Module Imports` to `Compat Layer`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `main()` connect `CLI Entry & Flags` to `Provider Dispatch`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `listForProvider()` connect `Provider Dispatch` to `CLI Entry & Flags`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `main()` (e.g. with `applyCompat()` and `loadConfig()`) actually correct?**
  _`main()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `listLmStudio()` (e.g. with `ListerKind type` and `lmstudio provider`) actually correct?**
  _`listLmStudio()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `listOllama()` (e.g. with `ListerKind type` and `ollama provider`) actually correct?**
  _`listOllama()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HELP text`, `ModelEntry interface`, `Runner type` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._