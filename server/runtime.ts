import { Sandbox } from "./sdk.js";
import type { AgentId } from "../shared/agents.js";
import { CredentialsStore, type CredentialContext } from "./credentials.js";
import { providerDiagnostic } from "./agent.js";
import { runBootstrap, writeBootstrapToSandbox } from "./bootstrap.js";
import { failOperation, fencedUpdate, finishOperation, LEASE_RENEWAL_MS, renewOperation } from "./operations.js";
import { parsePairingOffer, startDaemonAndPair } from "./pairing.js";
import { applyGatewayPolicy, BROKERED_GATEWAY_KEY } from "./network.js";
import { PROVIDERS, redactText } from "./providers.js";
import { SlotStore } from "./store.js";
import { logEvent } from "./log.js";
import type { SessionState } from "./types.js";
import type { SlotRecord, UncertainAllocation } from "./types.js";
import {
  assertSandboxCanResume,
  createSandbox,
  destroySandboxAndSnapshots,
  getSandbox,
  isNotFound,
  recordVerifiedSession,
  resumeSandbox,
  stopSandbox,
  verifySandboxOwnership,
} from "./lifecycle.js";

export const GATEWAY_CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits";

export interface RuntimeDependencies {
  getSandbox: typeof getSandbox;
  createSandbox: typeof createSandbox;
  stopSandbox: typeof stopSandbox;
  resumeSandbox: typeof resumeSandbox;
  destroySandboxAndSnapshots: typeof destroySandboxAndSnapshots;
  writeBootstrap: typeof writeBootstrapToSandbox;
  runBootstrap: typeof runBootstrap;
  startDaemonAndPair: typeof startDaemonAndPair;
  providerDiagnostic: typeof providerDiagnostic;
  verifyGatewayKey: (key: string, signal?: AbortSignal) => Promise<void>;
  applyGatewayPolicy: typeof applyGatewayPolicy;
}

export interface WorkerFence {
  signal: AbortSignal;
  abort: () => void;
  isActive: () => boolean;
}

export async function gatewayCreditsRequest(
  key: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(GATEWAY_CREDITS_URL, {
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    signal,
  });
  if (response.status === 401 || response.status === 403) throw new Error("gateway_key_rejected");
  if (!response.ok) throw new Error(`gateway_check_failed_${response.status}`);
}

async function verifyGatewayKey(key: string, signal?: AbortSignal): Promise<void> {
  await gatewayCreditsRequest(key, signal);
}

const defaultDependencies: RuntimeDependencies = {
  getSandbox,
  createSandbox,
  stopSandbox,
  resumeSandbox,
  destroySandboxAndSnapshots,
  writeBootstrap: writeBootstrapToSandbox,
  runBootstrap,
  startDaemonAndPair,
  providerDiagnostic,
  verifyGatewayKey,
  applyGatewayPolicy,
};

type OperationError = Parameters<typeof failOperation>[3];

const REMOTE_METADATA_TIMEOUT_MS = 30_000;
const REMOTE_CREATE_TIMEOUT_MS = 60_000;
const PENDING_SANDBOX_TIMEOUT_MS = 60_000;
const BOOTSTRAP_TIMEOUT_MS = 600_000;
const PAIRING_TIMEOUTS = { start: 240_000, pair: 30_000 } as const;
const DIAGNOSTIC_TIMEOUT_MS = 180_000;

async function checkpoint(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  change: (session: SessionState) => void,
): Promise<void> {
  let phase: string | undefined;
  await fencedUpdate(store, agent, operationId, (record) => {
    if (!record.session) throw new Error("session_missing");
    change(record.session);
    record.session.updatedAt = new Date().toISOString();
    phase = record.session.phase;
  });
  logEvent("phase", { agent, operationId, phase });
}

async function markUncertainCreate(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  state: SessionState,
): Promise<void> {
  await fencedUpdate(store, agent, operationId, (record) => {
    if (!record.session) throw new Error("session_missing");
    const allocations = record.uncertainAllocations ?? [];
    if (!allocations.some((allocation) => allocation.sandboxName === state.sandboxName && !allocation.resolvedAt)) {
      const allocation: UncertainAllocation = {
        sandboxName: state.sandboxName,
        owner: state.owner,
        createdAt: new Date().toISOString(),
      };
      record.uncertainAllocations = [...allocations, allocation];
    }
  });
}

// A 4xx other than timeout or conflict means the API refused the request before allocating anything.
// Timeouts, 5xx and network errors stay ambiguous: the sandbox may exist under the reserved name.
function isDefiniteRejection(error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } } | undefined)?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 409;
}

// The allocation marker may only be resolved together with durable proof of the session it produced;
// otherwise a worker that dies between create and checkpoint leaves a running sandbox with no marker.
async function resolveCreateWithSession(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  state: SessionState,
  sandbox: Awaited<ReturnType<RuntimeDependencies["getSandbox"]>>,
): Promise<void> {
  recordVerifiedSession(sandbox, state);
  await fencedUpdate(store, agent, operationId, (record) => {
    if (record.session) record.session.sessionIds = state.sessionIds;
    record.uncertainAllocations = (record.uncertainAllocations ?? []).map((allocation) =>
      allocation.sandboxName === state.sandboxName && !allocation.resolvedAt
        ? { ...allocation, resolvedAt: new Date().toISOString() }
        : allocation,
    );
  });
}

async function resolveUncertainCreate(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  state: SessionState,
): Promise<void> {
  await fencedUpdate(store, agent, operationId, (record) => {
    record.uncertainAllocations = (record.uncertainAllocations ?? []).map((allocation) =>
      allocation.sandboxName === state.sandboxName && !allocation.resolvedAt
        ? { ...allocation, resolvedAt: new Date().toISOString() }
        : allocation,
    );
  });
}

async function currentSession(store: SlotStore, agent: AgentId): Promise<SessionState> {
  const record = await store.read(agent);
  if (!record.value?.session) throw new Error("session_missing");
  return record.value.session;
}

async function ensureWorkerIsCurrent(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  fence?: WorkerFence,
): Promise<void> {
  if (fence && (!fence.isActive() || fence.signal.aborted)) throw new Error("operation_cancelled");
  const record = await store.read(agent);
  if (record.value?.operation?.id !== operationId || record.value.operation.status !== "running") {
    throw new Error("operation_fenced");
  }
}

async function remoteEffect<T>(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  fence: WorkerFence | undefined,
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  await ensureWorkerIsCurrent(store, agent, operationId, fence);
  if (fence?.signal.aborted) throw new Error("operation_cancelled");
  const controller = new AbortController();
  const propagateAbort = () => controller.abort();
  if (fence) {
    if (fence.signal.aborted) controller.abort();
    else fence.signal.addEventListener("abort", propagateAbort, { once: true });
  }
  let timer: NodeJS.Timeout | undefined;
  let timeout: Promise<never> | undefined;
  try {
    const request = operation(controller.signal);
    void request.catch(() => {});
    if (fence?.signal.aborted) throw new Error("operation_cancelled");
    timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("remote_effect_timeout"));
      }, timeoutMs);
    });
    return await Promise.race([request, timeout]);
  } catch (error) {
    if (String(error).includes("remote_effect_timeout")) throw new Error("remote effect timeout");
    if (fence?.signal.aborted) throw new Error("operation_cancelled");
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (fence) fence.signal.removeEventListener("abort", propagateAbort);
  }
}

async function waitUntilNotPending(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  credential: CredentialContext,
  state: SessionState,
  sandbox: Awaited<ReturnType<RuntimeDependencies["getSandbox"]>>,
  dependencies: RuntimeDependencies,
  fence?: WorkerFence,
): Promise<Awaited<ReturnType<RuntimeDependencies["getSandbox"]>>> {
  let current = sandbox;
  const deadline = Date.now() + PENDING_SANDBOX_TIMEOUT_MS;
  while (current.status === "pending") {
    if (Date.now() >= deadline) throw new Error("sandbox pending timeout");
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 250);
      fence?.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("operation_cancelled"));
      }, { once: true });
    });
    current = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.getSandbox(credential, state, false, signal),
    );
  }
  return current;
}

export async function executeOperation(
  store: SlotStore,
  credentials: CredentialsStore,
  agent: AgentId,
  operationId: string,
  dependencies: RuntimeDependencies = defaultDependencies,
  fence?: WorkerFence,
): Promise<void> {
  let heartbeat: NodeJS.Timeout | undefined;
  let gatewayKey: string | undefined;
  let action: string | undefined;
  try {
    const initial = await currentSession(store, agent);
    const credential = await credentials.readContext(initial.credentialId);
    gatewayKey = credential.gatewayKey;
    const current = await store.read(agent);
    action = current.value?.operation?.action;
    if (current.value?.operation?.id !== operationId || current.value.operation.status !== "running") {
      throw new Error("operation_fenced");
    }
    heartbeat = setInterval(() => {
      void renewOperation(store, agent, operationId).catch((error: unknown) => {
        logEvent("heartbeat_failed", { agent, operationId, action, detail: String(error).slice(0, 300) }, gatewayKey);
        fence?.abort();
      });
    }, LEASE_RENEWAL_MS);
    if (action === "start") await start(store, agent, operationId, credential, dependencies, fence);
    if (action === "stop") await stop(store, agent, operationId, credential, dependencies, fence);
    if (action === "resume") await resume(store, agent, operationId, credential, dependencies, fence);
    if (action === "diagnose") await diagnose(store, agent, operationId, credential, dependencies, fence);
    if (action === "delete") await remove(store, agent, operationId, credential, dependencies, fence);
    await ensureWorkerIsCurrent(store, agent, operationId, fence);
    await finishOperation(store, agent, operationId);
    logEvent("operation_complete", { agent, operationId, action });
  } catch (error) {
    const message = String(error);
    const mapped: OperationError =
      message.includes("operation_cancelled") ? "operation_interrupted" :
      message.includes("credential_context_missing") ? "credential_context_missing" :
      message.includes("existing_host_missing") ? "existing_host_missing" :
      message.includes("daemon_identity_changed") ? "daemon_identity_changed" :
      message.includes("provider_readiness_failed") ? "provider_readiness_failed" :
      message.includes("ambiguous") || message.includes("timeout") || message.includes("Timeout") ? "operation_ambiguous" :
      "operation_failed";
    logEvent("operation_failed", { agent, operationId, action, error: mapped, detail: message.slice(0, 400) }, gatewayKey);
    await failOperation(store, agent, operationId, mapped);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}

async function start(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  credential: CredentialContext,
  dependencies: RuntimeDependencies,
  fence?: WorkerFence,
): Promise<void> {
  let state = await currentSession(store, agent);
  let sandbox: Awaited<ReturnType<RuntimeDependencies["getSandbox"]>> | undefined;
  try {
    sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.getSandbox(credential, state, false, signal),
    );
    if (sandbox) await resolveCreateWithSession(store, agent, operationId, state, sandbox);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const currentRecord = await store.read(agent);
    const uncertainAllocation = currentRecord.value?.uncertainAllocations?.some((allocation) =>
      allocation.sandboxName === state.sandboxName && !allocation.resolvedAt,
    );
    if (uncertainAllocation || state.sessionIds.length || state.pairingUrl) {
      throw new Error("existing_host_missing");
    }
    await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.verifyGatewayKey(credential.gatewayKey, signal),
    );
    await checkpoint(store, agent, operationId, (session) => { session.phase = "creating"; });
    await markUncertainCreate(store, agent, operationId, state);
    state = await currentSession(store, agent);
    try {
      sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_CREATE_TIMEOUT_MS, (signal) =>
        dependencies.createSandbox(credential, state, signal),
      );
    } catch (error) {
      if (isDefiniteRejection(error)) await resolveUncertainCreate(store, agent, operationId, state);
      throw error;
    }
    await resolveCreateWithSession(store, agent, operationId, state, sandbox);
  }
  sandbox = await waitUntilNotPending(store, agent, operationId, credential, state, sandbox, dependencies, fence);
  if (sandbox.status !== "running") {
    assertSandboxCanResume(sandbox);
    await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.resumeSandbox(sandbox!, signal),
    );
    sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.getSandbox(credential, state, false, signal),
    );
  }
  // The key lives only in the firewall policy. A resumed session may not carry the
  // policy it was created with, so it is reapplied every time the sandbox starts.
  await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.applyGatewayPolicy(sandbox!, credential.gatewayKey, signal),
  );
  const previousIdentity = state.pairingUrl ? parsePairingOffer(state.pairingUrl) : undefined;
  recordVerifiedSession(sandbox, state);
  await checkpoint(store, agent, operationId, (session) => {
    session.sessionIds = state.sessionIds;
    session.phase = "created";
    session.sandboxStatus = sandbox?.status;
    session.expiresAt = sandbox?.expiresAt?.toISOString();
  });
  await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.writeBootstrap(sandbox, state, signal),
  );
  await checkpoint(store, agent, operationId, (session) => { session.phase = "bootstrapping"; });
  await remoteEffect(store, agent, operationId, fence, BOOTSTRAP_TIMEOUT_MS, (signal) =>
    dependencies.runBootstrap(sandbox, state, BROKERED_GATEWAY_KEY, BOOTSTRAP_TIMEOUT_MS, signal),
  );
  const pairing = await remoteEffect(store, agent, operationId, fence, PAIRING_TIMEOUTS.start + PAIRING_TIMEOUTS.pair, (signal) =>
    dependencies.startDaemonAndPair(sandbox, state, BROKERED_GATEWAY_KEY, PAIRING_TIMEOUTS, signal),
  );
  if (previousIdentity && (previousIdentity.serverId !== pairing.serverId || previousIdentity.daemonPublicKeyB64 !== pairing.daemonPublicKeyB64)) {
    throw new Error("daemon_identity_changed");
  }
  await checkpoint(store, agent, operationId, (session) => {
    session.phase = "ready";
    session.sandboxStatus = "running";
    session.pairingUrl = pairing.url;
    session.lastError = undefined;
  });
  const diagnostic = await remoteEffect(store, agent, operationId, fence, DIAGNOSTIC_TIMEOUT_MS, (signal) =>
    dependencies.providerDiagnostic(sandbox, state, BROKERED_GATEWAY_KEY, DIAGNOSTIC_TIMEOUT_MS, signal),
  );
  if (!diagnostic.ok || !diagnostic.providerMatched) throw new Error("provider_readiness_failed");
  await checkpoint(store, agent, operationId, (session) => {
    session.lastDiagnostic = { ...diagnostic, checkedAt: new Date().toISOString() };
  });
}

async function stop(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  credential: CredentialContext,
  dependencies: RuntimeDependencies,
  fence?: WorkerFence,
): Promise<void> {
  const state = await currentSession(store, agent);
  const sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.getSandbox(credential, state, false, signal),
  );
  await checkpoint(store, agent, operationId, (session) => { session.phase = "stopping"; });
  const snapshot = sandbox.status === "stopped" ? undefined : await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.stopSandbox(sandbox, signal),
  );
  await checkpoint(store, agent, operationId, (session) => {
    if (snapshot && !session.snapshots.some((item) => item.id === snapshot.id)) session.snapshots.push(snapshot);
    if (snapshot && !session.snapshotIds.includes(snapshot.id)) session.snapshotIds.push(snapshot.id);
    session.phase = "stopped";
    session.sandboxStatus = "stopped";
    session.expiresAt = undefined;
  });
}

async function resume(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  credential: CredentialContext,
  dependencies: RuntimeDependencies,
  fence?: WorkerFence,
): Promise<void> {
  const state = await currentSession(store, agent);
  if (!state.pairingUrl) throw new Error("stored_pairing_missing");
  const identity = parsePairingOffer(state.pairingUrl, "stored pairing offer");
  let sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.getSandbox(credential, state, false, signal),
  );
  sandbox = await waitUntilNotPending(store, agent, operationId, credential, state, sandbox, dependencies, fence);
  await checkpoint(store, agent, operationId, (session) => { session.phase = "resuming"; });
  if (sandbox.status !== "running") {
    assertSandboxCanResume(sandbox);
    await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.resumeSandbox(sandbox, signal),
    );
    sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
      dependencies.getSandbox(credential, state, false, signal),
    );
  }
  await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.applyGatewayPolicy(sandbox, credential.gatewayKey, signal),
  );
  recordVerifiedSession(sandbox, state);
  await checkpoint(store, agent, operationId, (session) => {
    session.sessionIds = state.sessionIds;
    session.sandboxStatus = sandbox?.status;
    session.expiresAt = sandbox?.expiresAt?.toISOString();
  });
  const pairing = await remoteEffect(store, agent, operationId, fence, PAIRING_TIMEOUTS.start + PAIRING_TIMEOUTS.pair, (signal) =>
    dependencies.startDaemonAndPair(sandbox, state, BROKERED_GATEWAY_KEY, PAIRING_TIMEOUTS, signal),
  );
  if (identity.serverId !== pairing.serverId || identity.daemonPublicKeyB64 !== pairing.daemonPublicKeyB64) {
    throw new Error("daemon_identity_changed");
  }
  await checkpoint(store, agent, operationId, (session) => {
    session.phase = "ready";
    session.sandboxStatus = "running";
    session.pairingUrl = pairing.url;
  });
}

async function diagnose(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  credential: CredentialContext,
  dependencies: RuntimeDependencies,
  fence?: WorkerFence,
): Promise<void> {
  const state = await currentSession(store, agent);
  const sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.getSandbox(credential, state, false, signal),
  );
  const diagnostic = await remoteEffect(store, agent, operationId, fence, DIAGNOSTIC_TIMEOUT_MS, (signal) =>
    dependencies.providerDiagnostic(sandbox, state, BROKERED_GATEWAY_KEY, DIAGNOSTIC_TIMEOUT_MS, signal),
  );
  await checkpoint(store, agent, operationId, (session) => {
    session.lastDiagnostic = { ...diagnostic, checkedAt: new Date().toISOString() };
  });
}

async function remove(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  credential: CredentialContext,
  dependencies: RuntimeDependencies,
  fence?: WorkerFence,
): Promise<void> {
  const state = await currentSession(store, agent);
  const record = await store.read(agent);
  if (record.value?.uncertainAllocations?.some(allocation =>
    allocation.sandboxName === state.sandboxName && !allocation.resolvedAt,
  )) {
    try {
      const sandbox = await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, signal =>
        dependencies.getSandbox(credential, state, false, signal),
      );
      verifySandboxOwnership(sandbox, state);
      recordVerifiedSession(sandbox, state);
      await checkpoint(store, agent, operationId, session => { session.sessionIds = state.sessionIds; });
      await resolveUncertainCreate(store, agent, operationId, state);
    } catch (error) {
      if (isNotFound(error)) throw new Error("allocation outcome ambiguous");
      throw error;
    }
  }
  await checkpoint(store, agent, operationId, (session) => { session.phase = "destroying"; });
  await remoteEffect(store, agent, operationId, fence, REMOTE_METADATA_TIMEOUT_MS, (signal) =>
    dependencies.destroySandboxAndSnapshots(credential, state, async (updated) => {
      await checkpoint(store, agent, operationId, (session) => {
        session.snapshots = updated.snapshots;
        session.snapshotIds = updated.snapshotIds;
        session.sessionIds = updated.sessionIds;
      });
    }, signal),
  );
  await fencedUpdate(store, agent, operationId, record => { record.session = undefined; });
}

export const runtimeDefaultDependencies = defaultDependencies;
export const runtimeSandbox = Sandbox;
