// Per-provider model listers. Each returns a uniform shape; the picker
// decides how to render extras.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface ModelEntry {
  id: string;
  display: string;
  extras: string[];
  loaded?: boolean;
}

interface LmsListEntry {
  modelKey: string;
  displayName?: string;
  paramsString?: string;
  quantization?: { name?: string };
  trainedForToolUse?: boolean;
}

interface LmsPsEntry {
  modelKey: string;
}

export async function listLmStudio(baseUrl: string, token: string): Promise<ModelEntry[]> {
  try {
    const [{ stdout: lsOut }, ps] = await Promise.all([
      run("lms", ["ls", "--llm", "--json"]),
      run("lms", ["ps", "--json"]).catch(() => ({ stdout: "[]" })),
    ]);
    const onDisk: LmsListEntry[] = JSON.parse(lsOut);
    const loadedKeys = new Set((JSON.parse(ps.stdout) as LmsPsEntry[]).map(m => m.modelKey));
    if (onDisk.length === 0) return listV1Models(baseUrl, token);
    return onDisk.map(m => {
      const isLoaded = loadedKeys.has(m.modelKey);
      const extras = [
        m.paramsString ?? "",
        m.quantization?.name ?? "",
        m.trainedForToolUse ? "tools" : "",
      ].filter(Boolean);
      return {
        id: m.modelKey,
        display: (isLoaded ? "[LOADED] " : "") + (m.displayName ?? m.modelKey),
        extras,
        loaded: isLoaded,
      };
    });
  } catch {
    return listV1Models(baseUrl, token);
  }
}

export async function listOllama(baseUrl: string, token: string): Promise<ModelEntry[]> {
  try {
    const { stdout } = await run("ollama", ["list"]);
    const lines = stdout.trim().split("\n");
    if (lines.length <= 1) return listV1Models(baseUrl, token);
    const rows: ModelEntry[] = [];
    // Columns: NAME  ID  SIZE (number unit)  MODIFIED (rest of line)
    for (const line of lines.slice(1)) {
      const parts = line.split(/\s+/);
      if (parts.length < 4) continue;
      const [name, , size, sizeUnit, ...modified] = parts;
      rows.push({
        id: name,
        display: name,
        extras: [`${size} ${sizeUnit}`, modified.join(" ")].filter(Boolean),
      });
    }
    return rows;
  } catch {
    return listV1Models(baseUrl, token);
  }
}

export async function listV1Models(baseUrl: string, token: string): Promise<ModelEntry[]> {
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    return (json.data ?? []).map(m => ({ id: m.id, display: m.id, extras: [] }));
  } catch {
    return [];
  }
}
