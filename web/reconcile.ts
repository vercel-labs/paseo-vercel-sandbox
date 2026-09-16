import { getSandbox } from "../dist/lifecycle.js";
import type { VercelCredentials } from "../dist/auth.js";
import type { AgentId, SlotRecord } from "./types";
import type { SlotStore } from "./store";
import type { SessionState } from "../dist/types.js";

export function observedPhase(record: SlotRecord | null, sandboxStatus?: string): SessionState["phase"] | "empty" {
  if (record?.session?.phase === "ready" && sandboxStatus === "stopped") return "stopped";
  return record?.session?.phase ?? "empty";
}

export async function observeSlot(store: SlotStore, creds: VercelCredentials, agent: AgentId) {
  const stored = await store.read(agent);
  const record = stored.value;
  const busy = record?.operation?.status !== "complete" && record?.operation && Date.parse(record.operation.leaseUntil) > Date.now();
  if (!record?.session || busy) return { stored, phase: observedPhase(record) };
  try {
    const sandbox = await getSandbox(creds, record.session, false);
    return { stored, phase: observedPhase(record, sandbox.status) };
  } catch {
    return { stored, phase: observedPhase(record) };
  }
}

export async function reconcileAutoStop(store: SlotStore, creds: VercelCredentials, agent: AgentId) {
  const observed = await observeSlot(store, creds, agent);
  if (observed.phase !== "stopped" || observed.stored.value?.session?.phase !== "ready") return;
  observed.stored.value.session.phase = "stopped";
  observed.stored.value.session.sandboxStatus = "stopped";
  observed.stored.value.revision++;
  await store.write(agent, observed.stored.value, observed.stored.etag);
}
