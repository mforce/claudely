# Graph Report - .  (2026-08-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 81 nodes · 165 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2545b3a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cli.ts
- listers.test.ts
- main
- config.ts
- compat.ts
- version.ts
- argsplit.ts
- cli.integration.test.ts

## God Nodes (most connected - your core abstractions)
1. `main()` - 12 edges
2. `listLmStudio()` - 8 edges
3. `listOllama()` - 8 edges
4. `listV1Models()` - 8 edges
5. `loadConfig()` - 7 edges
6. `runSetup()` - 7 edges
7. `isResumeIntent()` - 6 edges
8. `renderVersion()` - 6 edges
9. `listForProvider()` - 5 edges
10. `saveConfig()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `splitArgs()`  [EXTRACTED]
  src/cli.ts → src/argsplit.ts
- `main()` --calls--> `applyCompat()`  [EXTRACTED]
  src/cli.ts → src/compat.ts
- `main()` --calls--> `loadConfig()`  [EXTRACTED]
  src/cli.ts → src/config.ts
- `main()` --calls--> `loadSettings()`  [EXTRACTED]
  src/cli.ts → src/config.ts
- `main()` --references--> `Provider`  [EXTRACTED]
  src/cli.ts → src/providers.ts

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "cli.ts"
Cohesion: 0.24
Nodes (16): FLAG_SPEC, listForProvider(), defaultRun, listLmStudio(), listOllama(), listV1Models(), LmsListEntry, LmsPsEntry (+8 more)

### Community 1 - "listers.test.ts"
Cohesion: 0.20
Nodes (5): skipOnWindows, Runner, mockV1Fallback(), mockFetch(), restoreFetch()

### Community 2 - "main"
Cohesion: 0.31
Nodes (9): main(), AssembleArgs, assembleClaudeArgv(), isResumeIntent(), ModelResolution, resolveModelForSpawn(), ResolveModelForSpawnInputs, RESUME_BOOLS (+1 more)

### Community 3 - "config.ts"
Cohesion: 0.38
Nodes (6): ClaudelyConfig, configDir(), configPath(), loadConfig(), loadSettings(), saveConfig()

### Community 4 - "compat.ts"
Cohesion: 0.32
Nodes (5): applyCompat(), ApplyContext, CompatResult, INCOMPATIBILITIES, Incompatibility

### Community 5 - "version.ts"
Cohesion: 0.52
Nodes (5): defaultExec, ExecRunner, probeClaudeVersion(), readClaudelyVersion(), renderVersion()

### Community 6 - "argsplit.ts"
Cohesion: 0.47
Nodes (4): FlagSpec, splitArgs(), SplitResult, SPEC

### Community 7 - "cli.integration.test.ts"
Cohesion: 0.40
Nodes (3): CLI, run, skipOnWindows

## Knowledge Gaps
- **20 isolated node(s):** `SPEC`, `SplitResult`, `run`, `skipOnWindows`, `CLI` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `listLmStudio()` connect `cli.ts` to `listers.test.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `listOllama()` connect `cli.ts` to `listers.test.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `renderVersion()` connect `version.ts` to `cli.ts`, `main`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `SPEC`, `SplitResult`, `run` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._