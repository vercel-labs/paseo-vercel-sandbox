import type { AgentId } from "../shared/agents.js";
import { ConflictError, newOperationId, SlotStore } from "./store.js";
import type { AgentAction, SlotRecord } from "./types.js";

export const LEASE_MS = 2 * 60 * 1000;
export const LEASE_RENEWAL_MS = 30 * 1000;

export class BusyError extends Error {
  constructor() { super("operation_in_progress"); }
}

export async function acquireOperation(
  store: SlotStore,
  agent: AgentId,
  action: AgentAction,
  createSession: () => SlotRecord["session"],
  now = Date.now(),
): Promise<SlotRecord> {
  return store.update(agent, (record) => {
    const operation = record?.operation;
    if (operation && operation.status === "running" && Date.parse(operation.leaseUntil) > now) throw new BusyError();
    if (operation && operation.status === "failed" && operation.action !== action && action !== "delete") throw new BusyError();
    if (operation && operation.status !== "complete" && operation.status !== "failed" && operation.action !== action && action !== "delete") throw new BusyError();
    const retry = Boolean(operation && operation.status === "failed" && operation.action === action);
    const phase = record?.session?.phase;
    const allowed = retry || (action === "start" && (!phase || phase === "failed" || phase === "destroyed")) ||
      (action === "stop" && phase === "ready") || (action === "resume" && phase === "stopped") ||
      (action === "diagnose" && phase === "ready") || (action === "delete" && Boolean(phase));
    if (!allowed) throw new BusyError();
    const timestamp = new Date(now).toISOString();
    const session = record?.session ?? createSession();
    if (!session) throw new BusyError();
    return {
      schema: 1,
      agent,
      revision: (record?.revision ?? 0) + 1,
      session,
      uncertainAllocations: record?.uncertainAllocations,
      operation: {
        id: newOperationId(),
        action,
        status: "running",
        startedAt: timestamp,
        updatedAt: timestamp,
        leaseUntil: new Date(now + LEASE_MS).toISOString(),
      },
    };
  });
}

// A host that never allocated anything (no session, no pairing, no open allocation marker) carries no
// remote state, so a retried start may adopt the currently active credentials, including a corrected
// session timeout or project. Anything that touched the cloud keeps the context that created it.
export async function rebindUnallocatedHost(
  store: SlotStore,
  agent: AgentId,
  record: SlotRecord,
  active: { id: string; teamId: string; projectId: string },
): Promise<SlotRecord> {
  const session = record.session;
  const operation = record.operation;
  if (!session || !operation || operation.action !== "start" || session.credentialId === active.id) return record;
  if (session.sessionIds.length > 0 || session.pairingUrl || session.snapshots.length > 0 || session.snapshotIds.length > 0) return record;
  if ((record.uncertainAllocations ?? []).some((allocation) => !allocation.resolvedAt)) return record;
  return fencedUpdate(store, agent, operation.id, (current) => {
    if (current.session) {
      current.session.credentialId = active.id;
      current.session.teamId = active.teamId;
      current.session.projectId = active.projectId;
    }
  });
}

export async function fencedUpdate(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  mutate: (record: SlotRecord) => void | Promise<void>,
  now = Date.now(),
): Promise<SlotRecord> {
  return store.update(agent, async (record) => {
    // Fence on identity, not on the lease: the runner lock is the mutual exclusion, and a host that
    // slept past its lease must be able to checkpoint the work that kept running remotely.
    if (!record || record.operation?.id !== operationId || record.operation.status !== "running") throw new ConflictError();
    await mutate(record);
    record.revision++;
    record.operation.updatedAt = new Date(now).toISOString();
    return record;
  });
}

// A live worker renews even after its lease lapsed: the host may have slept mid-operation, and the
// remote work continued regardless. Only another operation taking the slot ends this one.
export async function renewOperation(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  now = Date.now(),
): Promise<void> {
  await store.update(agent, (record) => {
    if (!record || record.operation?.id !== operationId || record.operation.status !== "running") throw new ConflictError();
    record.operation.leaseUntil = new Date(now + LEASE_MS).toISOString();
    record.operation.updatedAt = new Date(now).toISOString();
    record.revision++;
    return record;
  });
}

export async function finishOperation(store: SlotStore, agent: AgentId, operationId: string): Promise<void> {
  await fencedUpdate(store, agent, operationId, (record) => {
    if (record.operation) {
      record.operation.status = "complete";
      record.operation.leaseUntil = new Date().toISOString();
    }
  });
}

export async function failOperation(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  error: "operation_failed" | "operation_ambiguous" | "operation_interrupted" | "credential_context_missing" | "existing_host_missing" | "daemon_identity_changed" | "provider_readiness_failed",
  now = Date.now(),
): Promise<void> {
  await store.update(agent, (record) => {
    if (!record || record.operation?.id !== operationId || record.operation.status !== "running") {
      throw new ConflictError();
    }
    if (record.operation) {
      record.operation.status = "failed";
      record.operation.publicError = error;
      record.operation.leaseUntil = new Date(now).toISOString();
    }
    if (record.session) {
      record.session.phase = "failed";
      record.session.lastError = error;
      record.session.updatedAt = new Date(now).toISOString();
    }
    return record;
  });
}
