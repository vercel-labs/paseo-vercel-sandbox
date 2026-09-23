export interface SnapshotRecord {
  id: string;
  sourceSessionId: string;
}

export type AgentAction = "start" | "stop" | "resume" | "delete" | "diagnose";

export interface SessionState {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  phase:
    | "intent" | "creating" | "created" | "bootstrapping" | "ready"
    | "stopping" | "stopped" | "resuming" | "destroying" | "destroyed" | "failed";
  sandboxName: string;
  sandboxStatus?: string;
  region: string;
  image: string;
  teamId: string;
  projectId: string;
  credentialId: string;
  owner: string;
  paseoHome: string;
  workspacePath: string;
  repoPath: string;
  repoUrl?: string;
  agentProvider: string;
  agentModel: string;
  sessionIds: string[];
  snapshotIds: string[];
  snapshots: SnapshotRecord[];
  expiresAt?: string;
  pairingUrl?: string;
  pairingRevealedAt?: string;
  lastDiagnostic?: {
    ok: boolean;
    provider: string;
    providerMatched: boolean;
    status?: string;
    modelCount?: number;
    exitCode: number;
    parseError: boolean;
    checkedAt: string;
  };
  lastError?: "operation_failed" | "operation_ambiguous" | "operation_interrupted" | "credential_context_missing" | "existing_host_missing" | "daemon_identity_changed" | "provider_readiness_failed";
}

export interface Operation {
  id: string;
  action: AgentAction;
  status: "running" | "failed" | "complete";
  startedAt: string;
  updatedAt: string;
  leaseUntil: string;
  publicError?: "operation_failed" | "operation_ambiguous" | "operation_interrupted" | "operation_expired" | "credential_context_missing" | "existing_host_missing" | "daemon_identity_changed" | "provider_readiness_failed";
}

export interface UncertainAllocation {
  sandboxName: string;
  owner: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SlotRecord {
  schema: 1;
  agent: string;
  revision: number;
  session?: SessionState;
  operation?: Operation;
  uncertainAllocations?: UncertainAllocation[];
}
