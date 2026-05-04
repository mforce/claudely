# CLI Entry & Flags

> 19 nodes · cohesion 0.12

## Key Concepts

- **main()** (11 connections) — `src/cli.ts`
- **INCOMPATIBILITIES table** (4 connections) — `src/compat.ts`
- **applyCompat()** (3 connections) — `src/compat.ts`
- **renderVersion()** (3 connections) — `src/version.ts`
- **FLAG_SPEC** (2 connections) — `src/cli.ts`
- **splitArgs()** (2 connections) — `src/argsplit.ts`
- **isResumeIntent()** (2 connections) — `src/resume.ts`
- **hasRecentSessionForCwd()** (2 connections) — `src/resume.ts`
- **shouldAutoResume()** (2 connections) — `src/resume.ts`
- **Settings incompatibility clamping pattern** (2 connections) — `src/compat.ts`
- **loadSettings()** (1 connections) — `src/compat.ts`
- **Incompatibility interface** (1 connections) — `src/compat.ts`
- **isAnthropicHost()** (1 connections) — `src/compat.ts`
- **FlagSpec interface** (1 connections) — `src/argsplit.ts`
- **assembleClaudeArgv()** (1 connections) — `src/resume.ts`
- **encodeCwdForClaude()** (1 connections) — `src/resume.ts`
- **readClaudelyVersion()** (1 connections) — `src/version.ts`
- **probeClaudeVersion()** (1 connections) — `src/version.ts`
- **Arg splitting pattern (own vs claude passthrough)** (1 connections) — `src/argsplit.ts`

## Relationships

- [[Provider Dispatch]] (2 shared connections)

## Source Files

- `src/argsplit.ts`
- `src/cli.ts`
- `src/compat.ts`
- `src/resume.ts`
- `src/version.ts`

## Audit Trail

- EXTRACTED: 36 (86%)
- INFERRED: 6 (14%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*