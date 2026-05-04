# Graphify Agent Discovery Integration

**Date:** 2026-05-03
**Status:** Approved

## Goal

Make the graphify knowledge graph discoverable by any coding agent (Claude Code, Copilot CLI, Cursor) immediately on clone, so agents read the pre-built graph instead of scanning raw source files — saving tokens and improving architecture awareness.

## Decisions

- **Agent scope:** Claude Code + cross-agent via AGENTS.md (Copilot CLI, Cursor). No per-agent files (GEMINI.md, .cursorrules) for now.
- **Hook scope:** Keep current search-only PreToolUse hook (grep/rg/find/fd/ack/ag). No interception of file reads.
- **Commit strategy:** Commit all graphify outputs (graph.json, GRAPH_REPORT.md, graph.html, wiki/) so the graph is available on clone.
- **Instruction consolidation:** AGENTS.md is the single source of truth for graphify instructions. CLAUDE.md references it instead of duplicating.

## Changes

### 1. Create `AGENTS.md`

New root file read by all agents. Contains:
- Instruction to read `graphify-out/GRAPH_REPORT.md` before exploring the codebase
- Instruction to navigate `graphify-out/wiki/index.md` instead of reading raw source files
- Available query commands: `graphify query`, `graphify path`, `graphify explain`
- Instruction to run `graphify --update` after code changes

### 2. Update `CLAUDE.md`

Replace the `## graphify` section (written by `graphify claude install`) with a one-liner referencing AGENTS.md. The PreToolUse hook remains in `.claude/settings.json` — it's Claude Code infrastructure, not agent instructions.

### 3. Generate wiki

Run the graphify wiki pipeline to produce `graphify-out/wiki/` with `index.md` + one article per community. The CLAUDE.md rule "if wiki/index.md exists, navigate it instead of reading raw files" becomes active once this exists.

### 4. Update `.gitignore`

Uncomment `graphify-out/cache/` to actively ignore it. Keep ignoring `manifest.json` (mtime-based, breaks after clone) and `cost.json` (local tracking). Everything else in `graphify-out/` is committed.

### 5. Commit all outputs

Single commit containing:
- `AGENTS.md` (new)
- `CLAUDE.md` (updated)
- `.claude/settings.json` (already exists, unchanged)
- `.hooks/post-commit`, `.hooks/post-checkout` (already exist)
- `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html`
- `graphify-out/wiki/` (new)

## What's NOT changing

- PreToolUse hook in `.claude/settings.json` — already correct, search-only
- Git hooks in `.hooks/` — already installed and working
- No new source code in claudely itself
- No GEMINI.md or .cursorrules files
