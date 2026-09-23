import type { NetworkPolicy, Sandbox } from "./sdk.js";

export const GATEWAY_HOST = "ai-gateway.vercel.sh";

// What the sandbox sees instead of the Gateway key. Agents refuse to start
// with an empty key, so a visible placeholder goes into their env and config
// files; the firewall replaces the Authorization header on the way out.
export const BROKERED_GATEWAY_KEY = "brokered-by-vercel-sandbox-firewall";

export function gatewayNetworkPolicy(gatewayKey: string): NetworkPolicy {
  if (!gatewayKey) throw new Error("gateway key is required to build the network policy");
  return {
    allow: {
      [GATEWAY_HOST]: [{ transform: [{ headers: { Authorization: `Bearer ${gatewayKey}` } }] }],
      "*": [],
    },
  };
}

export async function applyGatewayPolicy(
  sandbox: Pick<Sandbox, "update">,
  gatewayKey: string,
  signal?: AbortSignal,
): Promise<void> {
  await sandbox.update({ networkPolicy: gatewayNetworkPolicy(gatewayKey) }, { signal });
}
