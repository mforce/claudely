import { select, input, confirm } from "@inquirer/prompts";
import { PROVIDERS, PROVIDER_NAMES, type Provider } from "./providers.js";
import { listLmStudio, listOllama, listV1Models, type ModelEntry } from "./listers.js";
import { loadConfig, saveConfig, type ClaudelyConfig } from "./config.js";

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

export async function runSetup(): Promise<number> {
  const existing = loadConfig();

  const providerName = await select({
    message: "Provider",
    choices: PROVIDER_NAMES.map(name => ({ name, value: name })),
    default: existing.provider ?? "lmstudio",
  });

  const provider = PROVIDERS[providerName];

  const baseUrl = await input({
    message: "Base URL",
    default: existing.baseUrl ?? provider.defaultBaseUrl(),
  });

  const token = await input({
    message: "Auth token",
    default: existing.token ?? provider.defaultToken,
  });

  let models: ModelEntry[] = [];
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      models = await listForProvider(provider, baseUrl, token);
      console.log(`  Connected — ${models.length} model(s) found.`);
    } else {
      console.log(`  Server responded ${res.status} — skipping model discovery.`);
    }
  } catch {
    console.log("  Could not reach server — you can still save and connect later.");
  }

  let model: string | undefined;
  if (models.length > 0) {
    const choices = models.map(m => ({ name: m.display, value: m.id }));
    choices.push({ name: "(skip — no default model)", value: "" });
    const picked = await select({
      message: "Default model",
      choices,
      default: existing.model ?? undefined,
    });
    if (picked) model = picked;
  } else {
    const manual = await input({
      message: "Default model (Enter to skip)",
      default: existing.model ?? "",
    });
    if (manual) model = manual;
  }

  const config: ClaudelyConfig = { provider: providerName, baseUrl, token };
  if (model) config.model = model;

  console.log("\nConfig to save:");
  console.log(`  provider:  ${config.provider}`);
  console.log(`  baseUrl:   ${config.baseUrl}`);
  console.log(`  token:     ${config.token}`);
  if (config.model) console.log(`  model:     ${config.model}`);
  console.log();

  const ok = await confirm({ message: "Save?", default: true });
  if (!ok) {
    console.log("Aborted — nothing saved.");
    return 0;
  }

  saveConfig(config);
  console.log("Saved. Run `claudely` to use your new config.");
  return 0;
}
