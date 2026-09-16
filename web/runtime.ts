import { withinDeadline } from "./deadline.ts";
import { parsePairingOffer, startDaemonAndPair } from "../dist/pairing.js";
import { providerDiagnostic } from "../dist/agent.js";
import {
  DEFAULT_REGION, createSandbox, getSandbox, isNotFound,
  recordVerifiedSession, stopSandbox, assertSandboxCanResume, resumeSandbox,
  destroySandboxAndSnapshots,
} from "../dist/lifecycle.js";
import {
  DEFAULT_PASEO_HOME, DEFAULT_REPO_PATH, DEFAULT_WORKSPACE,
  runBootstrap, writeBootstrapToSandbox,
} from "../dist/bootstrap.js";
import { resolveAgentKey, resolveVercelCredentials, verifyAgentKey } from "../dist/auth.js";
import { newState } from "../dist/state.js";
import { PROVIDERS, redactText } from "../dist/providers.js";
import type { AgentId, SlotRecord } from "./types";
import type { SlotStore } from "./store";
import { failOperation, fencedUpdate, finishOperation } from "./operations.ts";

async function checkpoint(store: SlotStore, agent: AgentId, operationId: string, change: (record: SlotRecord) => void | Promise<void>) {
  await fencedUpdate(store, agent, operationId, change);
}

export async function executeOperation(store: SlotStore, agent: AgentId, operationId: string): Promise<void> {
  try {
    await withinDeadline(async () => {
    const initial = await store.read(agent);
    if (!initial.value?.operation || initial.value.operation.id !== operationId) return;
    const action = initial.value.operation.action;
    const creds = await resolveVercelCredentials();
    if (action === "start") await start(store, agent, operationId, creds);
    if (action === "stop") await stop(store, agent, operationId, creds);
    if (action === "resume") await resume(store, agent, operationId, creds);
    if (action === "delete") await remove(store, agent, operationId, creds);
    await finishOperation(store, agent, operationId);
    });
  } catch (error) {
    try { await failOperation(store, agent, operationId, redactText(String(error))); } catch {}
  }
}

type Creds = Awaited<ReturnType<typeof resolveVercelCredentials>>;

async function start(store: SlotStore, agent: AgentId, operationId: string, creds: Creds) {
  let current = await store.read(agent);
  let state = current.value?.session;
  if (!state) {
    state = newState({
      region: DEFAULT_REGION, image: "vercel/sandbox/universal:latest",
      teamId: creds.teamId, projectId: creds.projectId, agentProvider: agent,
      agentModel: PROVIDERS[agent].defaultModel, workspacePath: DEFAULT_WORKSPACE,
      repoPath: DEFAULT_REPO_PATH, paseoHome: DEFAULT_PASEO_HOME,
    });
    state.phase = "intent";
    await checkpoint(store, agent, operationId, record => { record.session = state; });
  }
  let sandbox;
  try {
    sandbox = await getSandbox(creds, state, false);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    if (state.sessionIds.length || state.pairingUrl) throw new Error("existing_host_missing_delete_to_restart");
    await verifyAgentKey(resolveAgentKey());
    await checkpoint(store, agent, operationId, record => { if (record.session) record.session.phase = "creating"; });
    sandbox = await createSandbox(creds, state);
  }
  if (sandbox.status !== "running") await resumeSandbox(sandbox);
  const previousIdentity = state.pairingUrl ? parsePairingOffer(state.pairingUrl) : undefined;
  recordVerifiedSession(sandbox, state);
  state.phase = "created";
  state.sandboxStatus = sandbox.status;
  await checkpoint(store, agent, operationId, record => { record.session = state; });
  await writeBootstrapToSandbox(sandbox, state);
  state.phase = "bootstrapping";
  await checkpoint(store, agent, operationId, record => { record.session = state; });
  await runBootstrap(sandbox, state, 120_000);
  const pairing = await startDaemonAndPair(sandbox, state, { start: 40_000, pair: 15_000 });
  if (previousIdentity && (previousIdentity.serverId !== pairing.serverId || previousIdentity.daemonPublicKeyB64 !== pairing.daemonPublicKeyB64)) throw new Error("daemon_identity_changed");
  state.phase = "ready";
  state.sandboxStatus = "running";
  state.pairingUrl = pairing.url;
  state.lastError = undefined;
  await checkpoint(store, agent, operationId, record => { record.session = state; });
  const diagnostic = await providerDiagnostic(sandbox, state, 30_000);
  if (!diagnostic.ok) throw new Error("provider_readiness_failed");
}

async function stop(store: SlotStore, agent: AgentId, operationId: string, creds: Creds) {
  const state = (await store.read(agent)).value?.session;
  if (!state) throw new Error("session_missing");
  const sandbox = await getSandbox(creds, state, false);
  state.phase = "stopping";
  await checkpoint(store, agent, operationId, record => { record.session = state; });
  const snapshot = sandbox.status === "stopped" ? undefined : await stopSandbox(sandbox);
  if (snapshot && !state.snapshots.some(item => item.id === snapshot.id)) state.snapshots.push(snapshot);
  if (snapshot && !state.snapshotIds.includes(snapshot.id)) state.snapshotIds.push(snapshot.id);
  state.phase = "stopped"; state.sandboxStatus = "stopped";
  await checkpoint(store, agent, operationId, record => { record.session = state; });
}

async function resume(store: SlotStore, agent: AgentId, operationId: string, creds: Creds) {
  const state = (await store.read(agent)).value?.session;
  if (!state?.pairingUrl) throw new Error("stored_pairing_missing");
  const identity = parsePairingOffer(state.pairingUrl, "stored pairing offer");
  const sandbox = await getSandbox(creds, state, false);
  state.phase = "resuming";
  await checkpoint(store, agent, operationId, record => { record.session = state; });
  if (sandbox.status !== "running") {
    assertSandboxCanResume(sandbox);
    await resumeSandbox(sandbox);
  }
  recordVerifiedSession(sandbox, state);
  const pairing = await startDaemonAndPair(sandbox, state, { start: 40_000, pair: 15_000 });
  if (identity.serverId !== pairing.serverId || identity.daemonPublicKeyB64 !== pairing.daemonPublicKeyB64) {
    throw new Error("daemon_identity_changed");
  }
  state.phase = "ready"; state.sandboxStatus = "running"; state.pairingUrl = pairing.url;
  await checkpoint(store, agent, operationId, record => { record.session = state; });
}

async function remove(store: SlotStore, agent: AgentId, operationId: string, creds: Creds) {
  const state = (await store.read(agent)).value?.session;
  if (!state) return;
  state.phase = "destroying";
  await checkpoint(store, agent, operationId, record => { record.session = state; });
  await destroySandboxAndSnapshots(creds, state, async updated => {
    await checkpoint(store, agent, operationId, record => { record.session = structuredClone(updated); });
  });
  state.phase = "destroyed"; state.pairingUrl = undefined;
  await checkpoint(store, agent, operationId, record => { record.session = undefined; });
}
