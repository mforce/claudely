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

import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

// claude stores per-cwd sessions under ~/.claude/projects/<encoded-cwd>/.
// The encoding replaces path separators with `-` (e.g. /home/u/x → -home-u-x).
// We mirror that to detect "is there a previous session here?" without spawning.
export function encodeCwdForClaude(cwd: string): string {
  return cwd.replace(/\//g, "-");
}

export interface SessionLookupOpts {
  // Override for tests; defaults to os.homedir().
  home?: string;
}

export function hasRecentSessionForCwd(cwd: string, opts: SessionLookupOpts = {}): boolean {
  const root = opts.home ?? homedir();
  const dir = join(root, ".claude", "projects", encodeCwdForClaude(cwd));
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries.some((e) => e.isFile() && e.name.endsWith(".jsonl"));
  } catch {
    return false;
  }
}

export interface AutoResumeInputs {
  ownValues: {
    model?: string | undefined;
    list?: boolean | undefined;
    new?: boolean | undefined;
  };
  claudeArgs: readonly string[];
  hasRecentSession: boolean;
  env: NodeJS.ProcessEnv;
}

export function shouldAutoResume(inputs: AutoResumeInputs): boolean {
  if (!inputs.hasRecentSession) return false;
  if (inputs.ownValues.new) return false;
  if (inputs.ownValues.list) return false;
  if (inputs.ownValues.model) return false;
  if (inputs.claudeArgs.length > 0) return false;
  if (isResumeIntent(inputs.claudeArgs)) return false;
  const optOut = inputs.env.CLAUDELY_NO_AUTO_RESUME;
  if (optOut && optOut !== "0" && optOut !== "" && optOut !== "false") return false;
  return true;
}
