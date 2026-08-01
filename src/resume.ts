// Detect "resume" intent in the args claudely is about to forward to claude,
// and decide whether to inject `--model`. When the user is resuming a saved
// session, the model is already encoded in that session — picking again
// (interactive picker) and re-injecting `--model` is at best wasted UX and
// at worst overrides what the saved session asked for.
//
// Flags considered resume-intent (per `claude --help`):
//   -c, --continue                  resume most recent session in cwd
//   -r, --resume [value]            resume by id, or interactive picker
//   --session-id <uuid>             use a specific session id
//   --from-pr [value]               resume the session linked to a PR

const RESUME_BOOLS = new Set(["-c", "--continue"]);

// Flags that are themselves resume intent regardless of their value form
// (`--flag`, `--flag=value`, or `--flag value`).
const RESUME_VALUEY = new Set(["-r", "--resume", "--session-id", "--from-pr"]);

export function isResumeIntent(claudeArgs: readonly string[]): boolean {
  for (const arg of claudeArgs) {
    if (RESUME_BOOLS.has(arg)) return true;
    if (RESUME_VALUEY.has(arg)) return true;
    const eq = arg.indexOf("=");
    if (eq > 0 && RESUME_VALUEY.has(arg.slice(0, eq))) return true;
  }
  return false;
}

export interface AssembleArgs {
  // undefined when caller has decided not to inject --model (resume case).
  model: string | undefined;
  extraArgs: readonly string[];
  claudeArgs: readonly string[];
}

export function assembleClaudeArgv(opts: AssembleArgs): string[] {
  const head = opts.model ? ["--model", opts.model] : [];
  return [...head, ...opts.extraArgs, ...opts.claudeArgs];
}

export interface ResolveModelForSpawnInputs {
  // value of the claudely --model flag (undefined if not passed).
  explicitModel?: string;
  env: NodeJS.ProcessEnv;
  // configured default model from ~/.config/claudely/config.json.
  configModel?: string;
  // provider-specific model env var name (e.g. OLLAMA_MODEL).
  providerModelEnvVar?: string;
  // true when the user passed a resume flag (-c/-r/--session-id/--from-pr) and
  // therefore wants to keep the saved session's model.
  explicitlyResuming: boolean;
}

export interface ModelResolution {
  model: string | undefined;
  needsPicker: boolean;
}

// Decide which --model (if any) to hand to claude, and whether the interactive
// picker must run. Explicit resume intent affects both:
//   - Explicit CLI --model always wins, resume or not (claude supports
//     --continue --model X to switch models while resuming).
//   - Explicit resume (user chose to resume a specific session) keeps that
//     session's saved model: no override, no picker.
//   - Otherwise (fresh run) fall back to the configured model for this
//     provider; if none is configured, the picker must run.
export function resolveModelForSpawn(inputs: ResolveModelForSpawnInputs): ModelResolution {
  if (inputs.explicitModel) return { model: inputs.explicitModel, needsPicker: false };
  if (inputs.explicitlyResuming) return { model: undefined, needsPicker: false };

  const fromEnv =
    inputs.env.CLAUDELY_MODEL ??
    inputs.configModel ??
    (inputs.providerModelEnvVar ? inputs.env[inputs.providerModelEnvVar] : undefined);
  if (fromEnv) return { model: fromEnv, needsPicker: false };

  return { model: undefined, needsPicker: true };
}
