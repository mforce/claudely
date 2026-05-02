# loclaude

*pron. **"lo-clawd"** — short for **"local claude"***

Launch [Claude Code](https://docs.anthropic.com/en/docs/claude-code) against a
local LLM (LM Studio, Ollama, llama.cpp, or any Anthropic-compatible
endpoint), without affecting the regular `claude` command — that one keeps
talking to the official Anthropic API.

> **Disclaimer.** This is an unofficial, community-maintained helper. It is
> not affiliated with, endorsed by, or sponsored by Anthropic. *Claude* and
> *Claude Code* are trademarks of Anthropic, used here only descriptively to
> identify the upstream tool this CLI wraps. `loclaude` does not modify the
> `claude` binary; it only sets [documented environment variables](https://code.claude.com/docs/en/env-vars)
> and spawns `claude` unchanged.

---

## Install

```bash
# global (recommended)
npm i -g loclaude

# or one-shot, no install
npx loclaude
```

Requires Node.js ≥ 20 and the `claude` CLI on your `PATH`.

## Quickstart

```bash
# LM Studio (default), interactive picker over your downloaded models
loclaude

# Ollama
loclaude -p ollama

# llama.cpp (whichever GGUF llama-server is currently serving)
loclaude -p llamacpp

# Skip the picker by naming a model
loclaude -p ollama -m gpt-oss:20b
loclaude -p lmstudio -m openai/gpt-oss-20b

# Just print what's available, don't launch claude
loclaude -p ollama --list

# Custom Anthropic-compatible endpoint (e.g. a litellm proxy)
loclaude -p custom -u http://localhost:4000 -t sk-anything -m my-model

# Forward extra flags through to claude (note the `--` separator)
loclaude -p ollama -m gpt-oss:20b -- --print "explain this repo"
```

## Supported providers

| Provider             | Default base URL          | Native? | Docs |
|----------------------|---------------------------|---------|------|
| `lmstudio` (default) | `http://localhost:1234`   | yes     | <https://lmstudio.ai/blog/claudecode> |
| `ollama`             | `http://localhost:11434`  | yes     | <https://docs.ollama.com/integrations/claude-code> |
| `llamacpp`           | `http://localhost:8080`   | yes     | <https://unsloth.ai/docs/basics/claude-code> |
| `custom`             | (you supply it)           | depends | point at any Anthropic-compatible endpoint or proxy |

For backends that only speak the OpenAI protocol (vLLM, text-generation-webui,
TabbyAPI, …), front them with a translation proxy such as
[litellm](https://docs.litellm.ai) or
[claude-code-router](https://github.com/musistudio/claude-code-router) and
point `loclaude` at the proxy via `-p custom`.

## Prerequisites

- Node.js ≥ 20 and the `claude` CLI on your `PATH`
- A running local server for the provider you want:
  - **LM Studio** — `lms server start --port 1234` plus at least one
    downloaded model (`lms ls --llm`)
  - **Ollama** — `ollama serve` plus at least one pulled model
    (`ollama list`)
  - **llama.cpp** — `llama-server --port 8080 -m /path/to/model.gguf`
    (single model per server instance)

## Selection precedence

| Setting   | Sources, first match wins                                                       |
|-----------|---------------------------------------------------------------------------------|
| Provider  | `-p` flag → `$LOCLAUDE_PROVIDER` → `lmstudio`                                   |
| Model     | `-m` flag → `$LOCLAUDE_MODEL` → `$LMSTUDIO_MODEL` / `$OLLAMA_MODEL` / `$LLAMACPP_MODEL` → interactive picker |
| Base URL  | `-u` flag → `$LOCLAUDE_BASE_URL` → provider default                             |
| Token     | `-t` flag → `$LOCLAUDE_TOKEN` → provider default                                |
| Port      | `$LMSTUDIO_PORT` / `$OLLAMA_PORT` / `$LLAMACPP_PORT` (only affect provider defaults) |

## What loclaude exports to `claude`

Every variable is set in the spawned process only — your shell (and the
regular `claude` command) is untouched.

```bash
ANTHROPIC_BASE_URL=<provider base URL>

# auth_token style (lmstudio, ollama, custom):
ANTHROPIC_AUTH_TOKEN=<provider token>
ANTHROPIC_API_KEY=""           # blanks any inherited real Anthropic key

# api_key style (llamacpp, per unsloth's docs):
ANTHROPIC_API_KEY=<provider token>
# ANTHROPIC_AUTH_TOKEN unset

# KV-cache fix (only set if not already in your env):
CLAUDE_CODE_ATTRIBUTION_HEADER=0
```

### KV-cache speedup (handled automatically)

Claude Code prepends an attribution string to the system prompt that contains
a per-request hash (`x-anthropic-billing-header: cc_version=…; cch=…;`). On
a local server every turn hashes differently, so the prompt cache misses
every single time — [unsloth measured ~90% slowdown](https://unsloth.ai/docs/basics/claude-code).
The fix is a single env var: `CLAUDE_CODE_ATTRIBUTION_HEADER=0`. `loclaude`
sets it for you in the spawned process, so the regular `claude` command is
unaffected. Override per-invocation by exporting your own value first.

References: [official env-vars docs](https://code.claude.com/docs/en/env-vars),
[claude-code#50085](https://github.com/anthropics/claude-code/issues/50085).

### Optional, not set by default

```bash
# Skip Claude Code's telemetry / feedback traffic. Useful when the model is
# local, but it's left to your judgment — loclaude does not disable analytics
# Anthropic uses to improve Claude Code without an explicit opt-in.
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

## Notes and limitations

- LM Studio and Ollama JIT-load models on first request. llama.cpp serves
  whichever GGUF was passed at startup; switch models by restarting
  `llama-server` with a different `-m` path.
- Claude Code's in-session `/model` command does **not** auto-discover
  backend models; it accepts an arbitrary id string. To switch mid-session,
  type `/model <id>` with one of the ids shown by `loclaude --list`.

## License

[MIT](LICENSE)
