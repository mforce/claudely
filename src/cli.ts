#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// claudely — launch Claude Code against a local LLM.
//
// Unaffiliated community helper — not endorsed by Anthropic. "Claude" /
// "Claude Code" are Anthropic trademarks, used here descriptively to
// identify the upstream tool this script wraps. The wrapper does not
// modify the `claude` binary; it only sets documented environment
// variables (https://code.claude.com/docs/en/env-vars) and spawns
// `claude` unchanged.

import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { search } from "@inquirer/prompts";
import { PROVIDERS, type Provider } from "./providers.js";
import {
  listLmStudio,
  listOllama,
  listV1Models,
  type ModelEntry,
} from "./listers.js";
import { applyCompat } from "./compat.js";
import { loadSettings, loadConfig } from "./config.js";
import { splitArgs, type FlagSpec } from "./argsplit.js";
import { runSetup } from "./setup.js";
import { renderVersion } from "./version.js";
import {
  isResumeIntent,
  assembleClaudeArgv,
  resolveModelForSpawn,
} from "./resume.js";

const FLAG_SPEC: FlagSpec = {
  string: new Set(["provider", "model", "base-url", "token"]),
  boolean: new Set(["list", "help", "version", "new"]),
  short: {
    p: "provider",
    m: "model",
    u: "base-url",
    t: "token",
    h: "help",
    V: "version",
  },
};

const HELP = `Usage: claudely [claudely-options] [claude-args...]

claudely options:
  -p, --provider <name>   lmstudio (default) | ollama | llamacpp | custom
  -m, --model <id>        Skip the picker and use this model id
  -u, --base-url <url>    Override the provider's default base URL
  -t, --token <token>     Override the provider's default auth token
      --list              Print available models for the provider and exit
  -h, --help              Show this help
  -V, --version           Print claudely and claude versions, then exit
      setup               Configure provider, URL, token, and default model

Bare \`claudely\` (no args) starts a FRESH session with the configured
provider model. To resume a previous conversation, pass a claude resume
flag with a prompt (see examples), e.g. \`claudely -c "<prompt>"\`. The
old auto-resume behavior (and the \`--new\` flag that toggled it) were
removed, because Claude >=2.1 dropped prompt-less \`--continue\`; \`--new\`
is still accepted as a no-op for backward compatibility.

When you pass a claude resume flag (-c/--continue, -r/--resume,
--session-id, --from-pr) claudely skips the model picker and does NOT
inject --model — the saved session already knows its model.

Any flag claudely does not recognize is forwarded verbatim to \`claude\`.
Use \`--\` as an escape hatch to force a token through (e.g. when claude
gains a flag whose name collides with one of claudely's own).

Examples:
  claudely setup                                     # interactive config wizard
  claudely                                       # LM Studio + interactive picker
  claudely -p ollama                             # Ollama
  claudely -p llamacpp                           # llama.cpp
  claudely -p ollama -m gpt-oss:20b              # skip the picker
  claudely -p custom -u http://localhost:4000 -t sk-x -m my-model
  claudely -p ollama --list                      # print models, don't launch
  claudely --print "explain this repo"           # forwarded to claude (no -- needed)
  claudely -- --provider force-this-to-claude    # escape hatch for collisions

Selection precedence:
  Provider:  -p  >  $CLAUDELY_PROVIDER  >  lmstudio
  Model:     -m  >  $CLAUDELY_MODEL     >  provider-specific env  >  picker
  Base URL:  -u  >  $CLAUDELY_BASE_URL  >  provider default
  Token:     -t  >  $CLAUDELY_TOKEN     >  provider default
  Port:      $LMSTUDIO_PORT / $OLLAMA_PORT / $LLAMACPP_PORT  >  defaults
`;

function listForProvider(
  provider: Provider,
  baseUrl: string,
  token: string,
): Promise<ModelEntry[]> {
  switch (provider.lister) {
    case "lmstudio":
      return listLmStudio(baseUrl, token);
    case "ollama":
      return listOllama(baseUrl, token);
    case "v1_models":
      return listV1Models(baseUrl, token);
  }
}

async function main(): Promise<number> {
  if (process.argv[2] === "setup") {
    return runSetup();
  }

  // Anything claudely doesn't recognize as one of its own flags is forwarded
  // to claude. Use `--` as an explicit escape hatch to force a token through
  // (e.g. when claude has a flag that collides with one of ours).
  const { own: ownArgs, claude: claudeArgs } = splitArgs(process.argv.slice(2), FLAG_SPEC);

  let parsed;
  try {
    parsed = parseArgs({
      args: ownArgs,
      options: {
        provider: { type: "string", short: "p" },
        model: { type: "string", short: "m" },
        "base-url": { type: "string", short: "u" },
        token: { type: "string", short: "t" },
        list: { type: "boolean" },
        new: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "V" },
      },
      allowPositionals: false,
      strict: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`claudely: ${msg}`);
    return 2;
  }

  const { values } = parsed;
  const config = loadConfig();

  if (values.help) {
    console.log(HELP);
    return 0;
  }

  if (values.version) {
    console.log(await renderVersion());
    return 0;
  }

  const providerName = values.provider ?? process.env.CLAUDELY_PROVIDER ?? config.provider ?? "lmstudio";
  const provider = PROVIDERS[providerName];
  if (!provider) {
    console.error(
      `claudely: unknown provider '${providerName}' (expected: ${Object.keys(PROVIDERS).join(" | ")})`,
    );
    return 2;
  }

  const baseUrl =
    values["base-url"] ?? process.env.CLAUDELY_BASE_URL ?? (config.baseUrl || undefined) ?? provider.defaultBaseUrl();
  const token = values.token ?? process.env.CLAUDELY_TOKEN ?? (config.token || undefined) ?? provider.defaultToken;

  if (!baseUrl) {
    console.error(
      `claudely: provider '${providerName}' requires --base-url <url> (or $CLAUDELY_BASE_URL, or run \`claudely setup\`)`,
    );
    return 2;
  }
  if (!token) {
    console.error(
      `claudely: provider '${providerName}' requires --token <token> (or $CLAUDELY_TOKEN, or run \`claudely setup\`)`,
    );
    return 2;
  }

  if (values.list) {
    const entries = await listForProvider(provider, baseUrl, token);
    for (const e of entries) {
      const cols = [e.id, e.display, ...e.extras];
      process.stdout.write(cols.join("\t") + "\n");
    }
    return 0;
  }

  // Explicit resume flags (-c/-r/--session-id/--from-pr) mean the user chose
  // to resume a specific conversation, so we keep that session's saved model:
  // no --model injection and no picker. A bare `claudely` (no args) is a FRESH
  // session — claude >=2.1 dropped prompt-less `--continue`, so auto-resuming
  // a bare invocation would fail with "No conversation found to continue", and
  // it could resume a stale Anthropic-API session from the shared ~/.claude dir.
  const explicitlyResuming = isResumeIntent(claudeArgs);

  let { model, needsPicker } = resolveModelForSpawn({
    explicitModel: values.model,
    env: process.env,
    configModel: config.model,
    providerModelEnvVar: provider.modelEnvVar,
    explicitlyResuming,
  });

  if (needsPicker && !explicitlyResuming) {
    const entries = await listForProvider(provider, baseUrl, token);
      if (entries.length === 0) {
        console.error(
          `claudely: no models discovered for provider '${providerName}' at ${baseUrl}.`,
        );
        if (provider.startHint) console.error(`  hint: ${provider.startHint}`);
        return 1;
      }
      model = await search<string>({
        message: `${providerName} model`,
        source: async (input) => {
          const q = (input ?? "").toLowerCase();
          const filtered = !q
            ? entries
            : entries.filter(
                (e) =>
                  e.display.toLowerCase().includes(q) ||
                  e.id.toLowerCase().includes(q),
              );
          return filtered.map((e) => ({
            name: e.display,
            value: e.id,
            description:
              e.extras.length > 0
                ? `${e.id}  ·  ${e.extras.join(" · ")}`
                : e.id,
          }));
        },
      });
  }

  // Build the env recipe to hand to claude.
  const env: NodeJS.ProcessEnv = { ...process.env, ANTHROPIC_BASE_URL: baseUrl };
  if (provider.envStyle === "auth_token") {
    env.ANTHROPIC_AUTH_TOKEN = token;
    // Defensive: blank an inherited real Anthropic key so it can't shadow the
    // local token (Ollama's docs explicitly recommend this).
    env.ANTHROPIC_API_KEY = "";
  } else {
    env.ANTHROPIC_API_KEY = token;
    delete env.ANTHROPIC_AUTH_TOKEN;
  }
  // KV-cache speedup: drop the per-request attribution prefix so the local
  // server's prompt cache stays valid. Honor a caller override.
  if (env.CLAUDE_CODE_ATTRIBUTION_HEADER === undefined) {
    env.CLAUDE_CODE_ATTRIBUTION_HEADER = "0";
  }

  const settings = loadSettings(join(homedir(), ".claude", "settings.json"));
  const compat = applyCompat({ settings, baseUrl, existingClaudeArgs: claudeArgs });
  for (const w of compat.warnings) process.stderr.write(`claudely: ${w}\n`);

  const claudeArgv = assembleClaudeArgv({
    model,
    extraArgs: compat.extraArgs,
    claudeArgs,
  });

  return await new Promise<number>((resolve) => {
    const child = spawn("claude", claudeArgv, { stdio: "inherit", env });
    child.on("error", (err) => {
      console.error(`claudely: failed to spawn claude: ${err.message}`);
      resolve(127);
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // Inquirer surfaces user-cancelled (Ctrl-C / Esc) as ExitPromptError.
    if (err && err.name === "ExitPromptError") process.exit(130);
    console.error(`claudely: ${err?.message ?? err}`);
    process.exit(1);
  });
