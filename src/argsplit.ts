export interface FlagSpec {
  string: Set<string>;
  boolean: Set<string>;
  short: Record<string, string>;
}

export interface SplitResult {
  own: string[];
  claude: string[];
}

export function splitArgs(argv: readonly string[], spec: FlagSpec): SplitResult {
  const own: string[] = [];
  const claude: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];

    if (tok === "--") {
      for (let j = i + 1; j < argv.length; j++) claude.push(argv[j]);
      break;
    }

    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      const name = eq >= 0 ? tok.slice(2, eq) : tok.slice(2);
      if (spec.string.has(name)) {
        own.push(tok);
        if (eq < 0 && i + 1 < argv.length) own.push(argv[++i]);
        continue;
      }
      if (spec.boolean.has(name)) {
        own.push(tok);
        continue;
      }
    } else if (tok.startsWith("-") && tok.length >= 2) {
      const ch = tok[1];
      const longName = spec.short[ch];
      if (longName) {
        const glued = tok.length > 2;
        if (spec.string.has(longName)) {
          own.push(tok);
          if (!glued && i + 1 < argv.length) own.push(argv[++i]);
          continue;
        }
        if (spec.boolean.has(longName)) {
          own.push(tok);
          continue;
        }
      }
    }

    claude.push(tok);
  }

  return { own, claude };
}
