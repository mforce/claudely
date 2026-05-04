# Provider Dispatch

> 14 nodes · cohesion 0.25

## Key Concepts

- **listLmStudio()** (6 connections) — `src/listers.ts`
- **listOllama()** (6 connections) — `src/listers.ts`
- **listV1Models()** (6 connections) — `src/listers.ts`
- **listForProvider()** (5 connections) — `src/cli.ts`
- **PROVIDERS registry** (5 connections) — `src/providers.ts`
- **ListerKind type** (4 connections) — `src/providers.ts`
- **Provider interface** (3 connections) — `src/providers.ts`
- **EnvStyle type** (2 connections) — `src/providers.ts`
- **lmstudio provider** (2 connections) — `src/providers.ts`
- **ollama provider** (2 connections) — `src/providers.ts`
- **llamacpp provider** (2 connections) — `src/providers.ts`
- **custom provider** (2 connections) — `src/providers.ts`
- **Lister fallback pattern (CLI tool -> /v1/models HTTP)** (2 connections) — `src/listers.ts`
- **Auth env-style pattern (auth_token vs api_key)** (1 connections) — `src/providers.ts`

## Relationships

- [[CLI Entry & Flags]] (2 shared connections)

## Source Files

- `src/cli.ts`
- `src/listers.ts`
- `src/providers.ts`

## Audit Trail

- EXTRACTED: 26 (54%)
- INFERRED: 22 (46%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*