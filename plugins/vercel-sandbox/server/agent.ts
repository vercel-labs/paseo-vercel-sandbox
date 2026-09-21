import type { Sandbox } from "./sdk.js";
import { providerLaunchEnvironment, resolveProvider } from "./providers.js";
import type { SessionState } from "./types.js";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export async function providerDiagnostic(
  sandbox: Sandbox,
  state: SessionState,
  gatewayKey: string,
  timeoutMs = 180_000,
  signal?: AbortSignal,
): Promise<{
  ok: boolean;
  provider: string;
  providerMatched: boolean;
  status?: string;
  modelCount?: number;
  exitCode: number;
  parseError: boolean;
}> {
  const provider = resolveProvider(state.agentProvider);
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      `export PASEO_HOME=${shellQuote(state.paseoHome)}; ` +
        `export PATH="$HOME/.npm-global/bin:$PATH"; ` +
        `export CLAUDE_CONFIG_DIR="$HOME/.claude"; ` +
        `export XDG_DATA_HOME="$HOME/.local/share"; ` +
        `export OPENCODE_CONFIG_DIR="$HOME/.config/opencode"; ` +
        `export PI_CODING_AGENT_DIR="$HOME/.pi/agent"; ` +
        `export OPENCODE_AUTH_CONTENT=; ` +
        `paseo provider diagnostic ${provider.id} --json`,
    ],
    env: providerLaunchEnvironment(gatewayKey, state.agentModel),
    timeoutMs,
    signal,
  });
  const stdout = await result.stdout();
  await result.stderr();
  let diagnosticText: string | undefined;
  let parseError = false;
  let payload: { diagnostic?: unknown; provider?: unknown } = {};
  try {
    payload = JSON.parse(stdout.trim() || "null") as { diagnostic?: unknown; provider?: unknown };
  if (typeof payload.diagnostic === "string") diagnosticText = payload.diagnostic;
  } catch {
    parseError = true;
  }
  const status = diagnosticText?.match(/Status:\s*([^\n]+)/i)?.[1]?.trim();
  const modelCount = diagnosticText?.match(/Models:\s*(\d+|—)/i)?.[1];
  const parsedModelCount = modelCount && modelCount !== "—" ? Number(modelCount) : undefined;
  return {
    ok: result.exitCode === 0 && !parseError && status?.toLowerCase() === "ready" &&
      parsedModelCount !== undefined && parsedModelCount > 0,
    provider: provider.id,
    providerMatched: payload.provider === undefined || payload.provider === provider.id,
    status,
    modelCount: parsedModelCount,
    exitCode: result.exitCode,
    parseError,
  };
}
