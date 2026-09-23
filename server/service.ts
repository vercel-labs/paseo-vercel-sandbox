import { join } from "node:path";
import { logEvent } from "./log.js";
import { AGENT_IDS, type AgentId } from "../shared/agents.js";
import type { AgentAction } from "./types.js";
import { CredentialsStore, pluginStateRoot, type CredentialContext } from "./credentials.js";
import { acquireExclusiveLock, StateLockedError, withExclusiveLock, type ExclusiveLockHandle } from "./fs.js";
import { acquireOperation, failOperation, rebindUnallocatedHost } from "./operations.js";
import { executeOperation, runtimeDefaultDependencies, type RuntimeDependencies, type WorkerFence } from "./runtime.js";
import { SlotStore } from "./store.js";
import { newSessionState } from "./state.js";
import { PROVIDERS } from "./providers.js";
import { isNotFound } from "./lifecycle.js";
import type { CredentialsSaveInput, StatusOutput } from "../shared/rpc.js";
import type { SessionState, SlotRecord } from "./types.js";

interface WorkerEntry {
  agent: AgentId;
  controller: AbortController;
  promise: Promise<void>;
}

interface RemoteStatusCache {
  fetchedAt: number;
  sandboxStatus?: string;
  expiresAt?: string;
  error?: "remote_status_unavailable" | "existing_host_missing" | "credential_context_missing";
}

const REMOTE_STATUS_REFRESH_MS = 30_000;
const REMOTE_STATUS_TIMEOUT_MS = 15_000;

export class PluginService {
  private credentials: CredentialsStore;
  private slots: SlotStore;
  private dependencies: RuntimeDependencies;
  private root: string;
  private ready: Promise<void>;
  private workers = new Map<string, WorkerEntry>();
  private remoteStatus = new Map<AgentId, RemoteStatusCache>();
  private remoteStatusInFlight = new Map<AgentId, Promise<void>>();
  private disposed = false;

  constructor(root = pluginStateRoot(), dependencies: RuntimeDependencies = runtimeDefaultDependencies) {
    this.root = root;
    this.credentials = new CredentialsStore(root);
    this.slots = new SlotStore(root);
    this.dependencies = dependencies;
    this.ready = this.reconcileInterruptedOperations();
  }

  private get controlPath(): string {
    return join(this.root, "control");
  }

  private runnerPath(agent: AgentId): string {
    return join(this.root, "runner-locks", agent);
  }

  private async reconcileInterruptedOperations(): Promise<void> {
    await Promise.all(AGENT_IDS.map(async (agent) => {
      let runner: ExclusiveLockHandle;
      try {
        runner = await acquireExclusiveLock(this.runnerPath(agent));
      } catch (error) {
        if (error instanceof StateLockedError) return;
        throw error;
      }
      try {
        const record = await this.slots.read(agent);
        const operation = record.value?.operation;
        if (operation?.status === "running") {
          await failOperation(this.slots, agent, operation.id, "operation_interrupted");
        }
      } finally {
        await runner.release();
      }
    }));
  }

  private async refreshRemoteStatus(agent: AgentId, session: SessionState, force: boolean): Promise<void> {
    const cached = this.remoteStatus.get(agent);
    if (!force && cached && Date.now() - cached.fetchedAt < REMOTE_STATUS_REFRESH_MS) return;
    const inFlight = this.remoteStatusInFlight.get(agent);
    if (inFlight) return inFlight;

    const refresh = (async () => {
      let credential: CredentialContext;
      try {
        credential = await this.credentials.readContext(session.credentialId);
      } catch {
        this.remoteStatus.set(agent, {
          fetchedAt: Date.now(),
          error: "credential_context_missing",
        });
        return;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REMOTE_STATUS_TIMEOUT_MS);
      try {
        const sandbox = await this.dependencies.getSandbox(credential, session, false, controller.signal);
        const next: RemoteStatusCache = {
          fetchedAt: Date.now(),
          sandboxStatus: sandbox.status,
          expiresAt: sandbox.expiresAt?.toISOString(),
        };
        this.remoteStatus.set(agent, next);
        await this.slots.update(agent, (record) => {
          if (record?.session?.id !== session.id || record.operation?.status === "running") return record as SlotRecord;
          record.session.sandboxStatus = sandbox.status;
          record.session.expiresAt = sandbox.expiresAt?.toISOString();
          if (sandbox.status === "stopped" && record.session.phase === "ready") record.session.phase = "stopped";
          if (sandbox.status === "running" && record.session.phase === "stopped") record.session.phase = "ready";
          record.session.updatedAt = new Date().toISOString();
          return record;
        });
      } catch (error) {
        this.remoteStatus.set(agent, {
          fetchedAt: Date.now(),
          sandboxStatus: session.sandboxStatus,
          expiresAt: session.expiresAt,
          error: isNotFound(error) ? "existing_host_missing" : "remote_status_unavailable",
        });
      } finally {
        clearTimeout(timer);
      }
    })().finally(() => this.remoteStatusInFlight.delete(agent));
    this.remoteStatusInFlight.set(agent, refresh);
    return refresh;
  }

  async status(refresh = false): Promise<StatusOutput> {
    await this.ready;
    const credentials = await this.credentials.read();
    const slots = await Promise.all(AGENT_IDS.map(async (agent) => {
      let record = await this.slots.read(agent);
      let session = record.value?.session;
      let operation = record.value?.operation;
      let running = operation?.status === "running" && Date.parse(operation.leaseUntil) > Date.now();
      if (session && !running && (Boolean(this.remoteStatus.get(agent)) || refresh)) {
        await this.refreshRemoteStatus(agent, session, refresh);
        record = await this.slots.read(agent);
        session = record.value?.session;
        operation = record.value?.operation;
        running = operation?.status === "running" && Date.parse(operation.leaseUntil) > Date.now();
      }
      const cached = this.remoteStatus.get(agent);
      const expired = operation?.status === "running" && Date.parse(operation.leaseUntil) <= Date.now();
      return {
        agent,
        phase: session?.phase ?? ("empty" as const),
        sandboxStatus: session ? cached?.sandboxStatus ?? session.sandboxStatus : undefined,
        expiresAt: session ? cached?.expiresAt ?? session.expiresAt : undefined,
        statusError: session && !running ? cached?.error : undefined,
        operation: operation ? {
          id: operation.id,
          action: operation.action,
          status: expired ? "failed" : operation.status,
          leaseUntil: operation.leaseUntil,
          publicError: expired ? "operation_expired" : operation.publicError,
        } : undefined,
        diagnostic: session?.lastDiagnostic,
        pairingRevealed: Boolean(session?.pairingRevealedAt),
        updatedAt: session?.updatedAt,
      };
    }));
    return {
      credentials: {
        configured: Boolean(credentials.value),
        activeContextId: credentials.value?.activeContextId,
        contextCount: credentials.value?.contexts.length ?? 0,
        teamId: credentials.value?.contexts.find((context) => context.id === credentials.value?.activeContextId)?.teamId,
        projectId: credentials.value?.contexts.find((context) => context.id === credentials.value?.activeContextId)?.projectId,
        sessionTimeoutMinutes: (() => {
          const ms = credentials.value?.contexts.find((context) => context.id === credentials.value?.activeContextId)?.sessionTimeoutMs;
          return ms ? Math.round(ms / 60_000) : undefined;
        })(),
      },
      slots,
    };
  }

  async saveCredentials(input: CredentialsSaveInput): Promise<{ activeContextId: string }> {
    await this.ready;
    return withExclusiveLock(this.controlPath, async () => {
      const records = await Promise.all(AGENT_IDS.map((agent) => this.slots.read(agent)));
      const preserveContextIds = records.flatMap((record) => record.value?.session ? [record.value.session.credentialId] : []);
      const current = await this.credentials.read();
      const activeContextId = await this.credentials.save({
        ...input,
        preserveContextIds,
        expectedDigest: current.digest,
      });
      return { activeContextId };
    });
  }

  async removeCredentials(): Promise<{ removed: boolean }> {
    await this.ready;
    return withExclusiveLock(this.controlPath, async () => {
      const records = await Promise.all(AGENT_IDS.map((agent) => this.slots.read(agent)));
      if (records.some((record) => record.value?.session)) {
        throw new Error("credential_references_remain");
      }
      const current = await this.credentials.read();
      await this.credentials.remove(current.digest);
      return { removed: true };
    });
  }

  async act(agent: AgentId, action: AgentAction, confirm?: string): Promise<{ accepted: boolean; operationId: string }> {
    await this.ready;
    if (this.disposed) throw new Error("plugin_disposed");
    if (action === "delete" && confirm !== agent) throw new Error("delete_confirmation_required");
    const runner = await acquireExclusiveLock(this.runnerPath(agent));
    try {
      if (this.disposed) throw new Error("plugin_disposed");
      const record = await withExclusiveLock(this.controlPath, async () => {
        const active = await this.credentials.readActive();
        const acquired = await acquireOperation(this.slots, agent, action, () => newSessionState({
          teamId: active.teamId,
          projectId: active.projectId,
          credentialId: active.id,
          agentProvider: agent,
          agentModel: PROVIDERS[agent].defaultModel,
        }));
        return rebindUnallocatedHost(this.slots, agent, acquired, active);
      });
      if (!record.operation) throw new Error("operation_missing");
      const operationId = record.operation.id;
      const controller = new AbortController();
      const entry = {
        agent,
        controller,
        promise: Promise.resolve(),
      } as WorkerEntry;
      this.workers.set(operationId, entry);
      const fence: WorkerFence = {
        signal: controller.signal,
        abort: () => { logEvent("fence_abort", { agent, operationId, reason: "heartbeat" }); controller.abort(); },
        isActive: () => !this.disposed && this.workers.get(operationId) === entry,
      };
      const worker = executeOperation(this.slots, this.credentials, agent, operationId, this.dependencies, fence);
      entry.promise = worker;
      void worker.catch(() => {}).finally(() => {
        this.workers.delete(operationId);
        void runner.release();
      });
      logEvent("operation_accepted", { agent, action, operationId });
      return { accepted: true, operationId };
    } catch (error) {
      await runner.release();
      throw error;
    }
  }

  async revealPairing(agent: AgentId): Promise<{ url: string; revealedAt: string }> {
    await this.ready;
    const record = await this.slots.read(agent);
    const url = record.value?.session?.pairingUrl;
    if (!url) throw new Error("pairing_missing");
    const revealedAt = new Date().toISOString();
    await this.slots.update(agent, (current) => {
      if (!current?.session?.pairingUrl) throw new Error("pairing_missing");
      current.session.pairingRevealedAt = revealedAt;
      current.session.updatedAt = revealedAt;
      return current;
    });
    return { url, revealedAt };
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    logEvent("dispose", { workers: this.workers.size });
    for (const worker of this.workers.values()) worker.controller.abort();
    await Promise.allSettled([...this.workers.values()].map((worker) => worker.promise));
  }
}
