// Provider registry for claudely.
// Each provider declares: how to derive its base URL/token, which env-var
// style Claude Code expects (auth_token vs api_key), and which lister to
// use for model discovery.

export type EnvStyle = "auth_token" | "api_key";
export type ListerKind = "lmstudio" | "ollama" | "v1_models";

export interface Provider {
  name: string;
  defaultBaseUrl: () => string;
  defaultToken: string;
  modelEnvVar?: string;
  envStyle: EnvStyle;
  lister: ListerKind;
  startHint?: string;
}

export const PROVIDERS: Record<string, Provider> = {
  lmstudio: {
    name: "lmstudio",
    defaultBaseUrl: () => `http://localhost:${process.env.LMSTUDIO_PORT ?? "1234"}`,
    defaultToken: "lmstudio",
    modelEnvVar: "LMSTUDIO_MODEL",
    envStyle: "auth_token",
    lister: "lmstudio",
    startHint: "lms server start --port 1234  (and load a model in LM Studio)",
  },
  ollama: {
    name: "ollama",
    defaultBaseUrl: () => `http://localhost:${process.env.OLLAMA_PORT ?? "11434"}`,
    defaultToken: "ollama",
    modelEnvVar: "OLLAMA_MODEL",
    envStyle: "auth_token",
    lister: "ollama",
    startHint: "ollama serve  (and pull one with: ollama pull <name>)",
  },
  llamacpp: {
    name: "llamacpp",
    defaultBaseUrl: () => `http://localhost:${process.env.LLAMACPP_PORT ?? "8080"}`,
    defaultToken: "sk-no-key-required",
    modelEnvVar: "LLAMACPP_MODEL",
    envStyle: "auth_token",
    lister: "v1_models",
    startHint: "llama-server --port 8080 -m /path/to/model.gguf",
  },
  custom: {
    name: "custom",
    defaultBaseUrl: () => "",
    defaultToken: "",
    envStyle: "auth_token",
    lister: "v1_models",
  },
};

export const PROVIDER_NAMES = Object.keys(PROVIDERS) as Array<keyof typeof PROVIDERS>;
