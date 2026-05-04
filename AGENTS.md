## graphify — Knowledge Graph

This project has a pre-built knowledge graph at `graphify-out/`. Use it to understand architecture before reading source files.

### Before exploring the codebase

Read `graphify-out/GRAPH_REPORT.md` for god nodes, community structure, and surprising connections. If `graphify-out/wiki/index.md` exists, navigate the wiki instead of reading raw source files — each article covers one architectural community with its nodes, edges, and relationships.

### Instead of grep for architecture questions

Use graph queries instead of scanning files:

```bash
graphify query "how does config connect to providers?"
graphify path "ConfigModule" "ProviderRegistry"
graphify explain "main()"
```

These traverse EXTRACTED + INFERRED edges in the knowledge graph rather than doing text search.

### After modifying code

Run `graphify --update` to keep the graph current. This is AST-only for code changes — no API cost.
