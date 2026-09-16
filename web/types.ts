import type { SessionState } from "../dist/types.js";

export const AGENT_IDS = ["codex", "claude", "opencode", "pi"] as const;
export type AgentId = (typeof AGENT_IDS)[number];
export type Action = "start" | "stop" | "resume" | "delete";
export type OperationStatus = "running" | "failed" | "complete";

export interface Operation {
  id: string;
  action: Action;
  status: OperationStatus;
  leaseUntil: string;
  startedAt: string;
  updatedAt: string;
  publicError?: "operation_failed" | "operation_expired";
  privateError?: string;
}

export interface SlotRecord {
  schema: 1;
  agent: AgentId;
  revision: number;
  session?: SessionState;
  operation?: Operation;
}

export interface StoredSlot {
  value: SlotRecord | null;
  etag: string | null;
}

export interface PublicSlot {
  agent: AgentId;
  phase: SessionState["phase"] | "empty";
  operation?: Pick<Operation, "id" | "action" | "status" | "leaseUntil" | "publicError">;
  updatedAt?: string;
}
