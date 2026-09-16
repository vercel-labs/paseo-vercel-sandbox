import { randomUUID } from "node:crypto";
import type { Action, AgentId, SlotRecord, StoredSlot } from "./types.ts";
import type { SlotStore } from "./store.ts";
import { ConflictError } from "./store.ts";

export const LEASE_MS = 10 * 60 * 1000;

export class BusyError extends Error {
  constructor() { super("operation_in_progress"); }
}

export async function acquireOperation(
  store: SlotStore,
  agent: AgentId,
  action: Action,
  now = Date.now(),
): Promise<{ record: SlotRecord; etag: string }> {
  const current = await store.read(agent);
  const operation = current.value?.operation;
  if (operation && operation.status !== "complete" && Date.parse(operation.leaseUntil) > now) throw new BusyError();
  const retry = Boolean(operation && operation.status !== "complete" && operation.action === action);
  if (operation && operation.status !== "complete" && operation.action !== action && action !== "delete") throw new BusyError();
  const phase = current.value?.session?.phase;
  const allowed =
    retry ||
    (action === "start" && !phase) ||
    (action === "stop" && phase === "ready") ||
    (action === "resume" && phase === "stopped") ||
    (action === "delete" && Boolean(phase));
  if (!allowed) throw new BusyError();
  const timestamp = new Date(now).toISOString();
  const record: SlotRecord = {
    schema: 1,
    agent,
    revision: (current.value?.revision ?? 0) + 1,
    session: current.value?.session,
    operation: { id: randomUUID(), action, status: "running", startedAt: timestamp, updatedAt: timestamp, leaseUntil: new Date(now + LEASE_MS).toISOString() },
  };
  return { record, etag: await store.write(agent, record, current.etag) };
}

export async function fencedUpdate(
  store: SlotStore,
  agent: AgentId,
  operationId: string,
  mutate: (record: SlotRecord) => void | Promise<void>,
  now = Date.now(),
): Promise<StoredSlot> {
  const current = await store.read(agent);
  if (!current.value || current.value.operation?.id !== operationId || current.value.operation.status !== "running" || Date.parse(current.value.operation.leaseUntil) <= now) {
    throw new ConflictError();
  }
  await mutate(current.value);
  current.value.revision++;
  current.value.operation.updatedAt = new Date(now).toISOString();
  const etag = await store.write(agent, current.value, current.etag);
  return { value: current.value, etag };
}

export async function finishOperation(store: SlotStore, agent: AgentId, operationId: string): Promise<void> {
  await fencedUpdate(store, agent, operationId, (record) => {
    if (record.operation) record.operation.status = "complete";
  });
}

export async function failOperation(store: SlotStore, agent: AgentId, operationId: string, detail: string): Promise<void> {
  let redacted = detail
    .replace(/https:\/\/app\.paseo\.sh\/#offer=\S+/gi, "[REDACTED]")
    .replace(/(Bearer\s+)[^\s"',]+/gi, "$1[REDACTED]");
  for (const value of [process.env.AI_GATEWAY_API_KEY, process.env.LAUNCHER_SECRET, process.env.BLOB_READ_WRITE_TOKEN]) {
    if (value) redacted = redacted.replaceAll(value, "[REDACTED]");
  }
  redacted = redacted.slice(0, 1000);
  await fencedUpdate(store, agent, operationId, (record) => {
    const noRemoteWork = !record.session || record.session.phase === "intent";
    if (record.operation) {
      if (noRemoteWork) record.operation.leaseUntil = new Date().toISOString();
      record.operation.status = "failed";
      record.operation.publicError = "operation_failed";
      record.operation.privateError = redacted;
    }
    if (record.session) {
      if (!noRemoteWork) record.session.phase = "failed";
      record.session.lastError = "operation_failed";
    }
  });
}
