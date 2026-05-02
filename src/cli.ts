#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// loclaude — launch Claude Code against a local LLM.
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
import { maybeWarnEffort } from "./effort.js";

const HELP = `Usage: loclaude [options] [-- claude-args...]

Options:
  -p, --provider <name>   lmstudio (default) | ollama | llamacpp | custom
  -m, --model <id>        Skip the picker and use this model id
  -u, --base-url <url>    Override the provider's default base URL
  -t, --token <token>     Override the provider's default auth token
      --list              Print available models for the provider and exit
  -h, --help              Show this help

Anything after \`--\` is forwarded verbatim to \`claude\`.

Examples:
  loclaude                                       # LM Studio + interactive picker
  loclaude -p ollama                             # Ollama
  loclaude -p llamacpp                           # llama.cpp
  loclaude -p ollama -m gpt-oss:20b              # skip the picker
  loclaude -p custom -u http://localhost:4000 -t sk-x -m my-model
  loclaude -p ollama --list                      # print models, don't launch
  loclaude -- --print "explain this repo"        # forward args to claude

Selection precedence:
  Provider:  -p  >  $LOCLAUDE_PROVIDER  >  lmstudio
  Model:     -m  >  $LOCLAUDE_MODEL     >  provider-specific env  >  picker
  Base URL:  -u  >  $LOCLAUDE_BASE_URL  >  provider default
  Token:     -t  >  $LOCLAUDE_TOKEN     >  provider default
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
  // Split argv on `--` so anything after it gets forwarded to claude verbatim.
  const argv = process.argv.slice(2);
  const sepIdx = argv.indexOf("--");
  const ownArgs = sepIdx >= 0 ? argv.slice(0, sepIdx) : argv;
  const claudeArgs = sepIdx >= 0 ? argv.slice(sepIdx + 1) : [];

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
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: false,
      strict: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`loclaude: ${msg}`);
    console.error(`(use \`--\` to forward unknown flags to claude, e.g. \`loclaude -- --print "hi"\`)`);
    return 2;
  }

  const { values } = parsed;

  if (values.help) {
    console.log(HELP);
    return 0;
  }

  const providerName = values.provider ?? process.env.LOCLAUDE_PROVIDER ?? "lmstudio";
  const provider = PROVIDERS[providerName];
  if (!provider) {
    console.error(
      `loclaude: unknown provider '${providerName}' (expected: ${Object.keys(PROVIDERS).join(" | ")})`,
    );
    return 2;
  }

  const baseUrl =
    values["base-url"] ?? process.env.LOCLAUDE_BASE_URL ?? provider.defaultBaseUrl();
  const token = values.token ?? process.env.LOCLAUDE_TOKEN ?? provider.defaultToken;

  if (!baseUrl) {
    console.error(
      "loclaude: provider 'custom' requires --base-url <url> (or $LOCLAUDE_BASE_URL)",
    );
    return 2;
  }
  if (!token) {
    console.error(
      "loclaude: provider 'custom' requires --token <token> (or $LOCLAUDE_TOKEN)",
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

  let model =
    values.model ??
    process.env.LOCLAUDE_MODEL ??
    (provider.modelEnvVar ? process.env[provider.modelEnvVar] : undefined);

  if (!model) {
    const entries = await listForProvider(provider, baseUrl, token);
    if (entries.length === 0) {
      console.error(
        `loclaude: no models discovered for provider '${providerName}' at ${baseUrl}.`,
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

  maybeWarnEffort({
    baseUrl,
    settingsPath: join(homedir(), ".claude", "settings.json"),
    write: (line) => process.stderr.write(line),
  });

  return await new Promise<number>((resolve) => {
    const child = spawn("claude", ["--model", model!, ...claudeArgs], {
      stdio: "inherit",
      env,
    });
    child.on("error", (err) => {
      console.error(`loclaude: failed to spawn claude: ${err.message}`);
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
    console.error(`loclaude: ${err?.message ?? err}`);
    process.exit(1);
  });
