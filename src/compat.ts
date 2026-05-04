export interface ApplyContext {
  settings: Record<string, unknown> | undefined;
  baseUrl: string;
  existingClaudeArgs: readonly string[];
}

export interface CompatResult {
  warnings: string[];
  extraArgs: string[];
}

export interface Incompatibility {
  settingKey: string;
  badValues: ReadonlySet<string>;
  safeValue: string;
  cliFlag: string;
  appliesWhen: (ctx: { baseUrl: string }) => boolean;
  warning: (badValue: string, safeValue: string) => string;
}

function isAnthropicHost(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname === "api.anthropic.com";
  } catch {
    return false;
  }
}

export const INCOMPATIBILITIES: readonly Incompatibility[] = [
  {
    settingKey: "effortLevel",
    badValues: new Set(["xhigh"]),
    safeValue: "high",
    cliFlag: "--effort",
    appliesWhen: ({ baseUrl }) => !isAnthropicHost(baseUrl),
    warning: (bad, safe) =>
      `warning: effortLevel '${bad}' is rejected by most local Anthropic-compatible servers; auto-clamping to '${safe}' for this session via --effort. Edit ~/.claude/settings.json or run /effort ${safe} to make it permanent.`,
  },
];

export function applyCompat(ctx: ApplyContext, table: readonly Incompatibility[] = INCOMPATIBILITIES): CompatResult {
  const warnings: string[] = [];
  const extraArgs: string[] = [];

  for (const entry of table) {
    const value = ctx.settings?.[entry.settingKey];
    if (typeof value !== "string" || !entry.badValues.has(value)) continue;
    if (!entry.appliesWhen({ baseUrl: ctx.baseUrl })) continue;
    if (ctx.existingClaudeArgs.includes(entry.cliFlag)) continue;

    warnings.push(entry.warning(value, entry.safeValue));
    extraArgs.push(entry.cliFlag, entry.safeValue);
  }

  return { warnings, extraArgs };
}
