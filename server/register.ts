import type { PluginServerContext } from "@getpaseo/plugin/server";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import {
  actRpc,
  removeCredentialsRpc,
  revealPairingRpc,
  saveCredentialsRpc,
  statusRpc,
} from "../shared/rpc.js";

export interface RegisteredService {
  status(refresh?: boolean): Promise<RpcOutput<typeof statusRpc>>;
  act(agent: RpcInput<typeof actRpc>["agent"], action: RpcInput<typeof actRpc>["action"], confirm?: string): Promise<RpcOutput<typeof actRpc>>;
  revealPairing(agent: RpcInput<typeof revealPairingRpc>["agent"]): Promise<RpcOutput<typeof revealPairingRpc>>;
  saveCredentials(input: RpcInput<typeof saveCredentialsRpc>): Promise<RpcOutput<typeof saveCredentialsRpc>>;
  removeCredentials(): Promise<RpcOutput<typeof removeCredentialsRpc>>;
  dispose(): Promise<void>;
}

// Every contract in shared/rpc.ts must be registered here; test/register.test.mjs checks the list.
export function register(server: Pick<PluginServerContext, "handle">, service: RegisteredService): () => Promise<void> {
  server.handle(statusRpc, (input) => service.status(input.refresh ?? false));
  server.handle(actRpc, (input) => service.act(input.agent, input.action, input.confirm));
  server.handle(revealPairingRpc, (input) => service.revealPairing(input.agent));
  server.handle(saveCredentialsRpc, (input) => service.saveCredentials(input));
  server.handle(removeCredentialsRpc, () => service.removeCredentials());
  return () => service.dispose();
}
