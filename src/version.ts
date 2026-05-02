import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ExecRunner = (
  cmd: string,
  args: string[],
  options: { timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

const defaultExec: ExecRunner = promisify(execFile) as ExecRunner;

export function readClaudelyVersion(): string {
  // dist/version.js  → ../package.json (npm install layout)
  // dist-test/version.js → ../package.json (test layout)
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function probeClaudeVersion(run: ExecRunner = defaultExec): Promise<string> {
  try {
    const { stdout } = await run("claude", ["--version"], { timeout: 2000 });
    return stdout.trim() || "unknown";
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return "not found on PATH";
    const stderr = (err as { stderr?: string }).stderr?.trim();
    return stderr || `error: ${(err as Error).message ?? String(err)}`;
  }
}

export async function renderVersion(run: ExecRunner = defaultExec): Promise<string> {
  const [claudely, claude] = await Promise.all([
    Promise.resolve(readClaudelyVersion()),
    probeClaudeVersion(run),
  ]);
  return `claudely ${claudely}\nclaude  ${claude}`;
}
