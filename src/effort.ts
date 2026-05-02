import { readFileSync } from "node:fs";

export interface EffortContext {
  effortLevel: string | undefined;
  baseUrl: string;
}

export function loadEffortLevel(settingsPath: string): string | undefined {
  try {
    const raw = readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as { effortLevel?: unknown };
    return typeof parsed.effortLevel === "string" ? parsed.effortLevel : undefined;
  } catch {
    return undefined;
  }
}

const REJECTED = new Set(["xhigh"]);

function isAnthropicHost(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname === "api.anthropic.com";
  } catch {
    return false;
  }
}

export function effortWarning(ctx: EffortContext): string | null {
  if (!ctx.effortLevel || !REJECTED.has(ctx.effortLevel)) return null;
  if (isAnthropicHost(ctx.baseUrl)) return null;
  return `warning: effortLevel '${ctx.effortLevel}' may be rejected by local Anthropic-compatible servers; consider 'high' (or run /effort high in Claude Code).`;
}

export interface MaybeWarnArgs {
  baseUrl: string;
  settingsPath: string;
  write: (line: string) => void;
}

export function maybeWarnEffort(args: MaybeWarnArgs): void {
  const effortLevel = loadEffortLevel(args.settingsPath);
  const msg = effortWarning({ effortLevel, baseUrl: args.baseUrl });
  if (msg) args.write(`loclaude: ${msg}\n`);
}
