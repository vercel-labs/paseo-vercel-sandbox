import { randomUUID } from "node:crypto";
import { Sandbox, Snapshot } from "./sdk.js";
import type { VercelCredentials } from "./credentials.js";
import { gatewayNetworkPolicy } from "./network.js";
import type { SessionState, SnapshotRecord } from "./types.js";

export const DEFAULT_IMAGE = "vercel/sandbox/universal:latest";
export const DEFAULT_REGION = "iad1";
export const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const SNAPSHOT_EXPIRATION_MS = 24 * 60 * 60 * 1000;
export const KEEP_LAST_SNAPSHOTS = 3;

export function newSandboxName(prefix = "paseo-sandbox"): string {
  return `${prefix}-${randomUUID()}`;
}

export function sandboxTags(state: SessionState): Record<string, string> {
  return {
    paseoSandbox: state.name,
    owner: state.owner,
  };
}

export function verifySandboxOwnership(sandbox: Sandbox, state: SessionState): void {
  if (
    sandbox.name !== state.sandboxName ||
    sandbox.tags?.paseoSandbox !== state.name ||
    sandbox.tags?.owner !== state.owner
  ) {
    throw new Error("sandbox owner or name mismatch");
  }
}

export function recordVerifiedSession(sandbox: Sandbox, state: SessionState): string {
  const sessionId = sandbox.currentSession().sessionId;
  if (!state.sessionIds.includes(sessionId)) state.sessionIds.push(sessionId);
  return sessionId;
}

export async function createSandbox(
  creds: VercelCredentials & { gatewayKey: string; sessionTimeoutMs?: number },
  state: SessionState,
  signal?: AbortSignal,
): Promise<Sandbox> {
  const { gatewayKey, sessionTimeoutMs, ...vercel } = creds;
  return Sandbox.create({
    ...vercel,
    networkPolicy: gatewayNetworkPolicy(gatewayKey),
    name: state.sandboxName,
    image: state.image,
    region: state.region,
    timeout: sessionTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    persistent: true,
    snapshotExpiration: SNAPSHOT_EXPIRATION_MS,
    keepLastSnapshots: { count: KEEP_LAST_SNAPSHOTS },
    tags: sandboxTags(state),
    signal,
  });
}

export async function getSandbox(
  creds: VercelCredentials,
  state: SessionState,
  resume = false,
  signal?: AbortSignal,
): Promise<Sandbox> {
  const sandbox = await Sandbox.get({ ...creds, name: state.sandboxName, resume: false, signal });
  verifySandboxOwnership(sandbox, state);
  recordVerifiedSession(sandbox, state);
  if (resume) {
    await resumeSandbox(sandbox, signal);
    recordVerifiedSession(sandbox, state);
  }
  return sandbox;
}

export async function stopSandbox(sandbox: Sandbox, signal?: AbortSignal): Promise<SnapshotRecord | undefined> {
  const sourceSessionId = sandbox.currentSession().sessionId;
  const result = await sandbox.stop({ signal });
  if (!result.snapshot?.id) return undefined;
  return {
    id: result.snapshot.id,
    sourceSessionId,
  };
}

export function assertSandboxCanResume(sandbox: Pick<Sandbox, "status">): void {
  if (!["stopped", "stopping", "snapshotting"].includes(sandbox.status)) {
    throw new Error("sandbox_not_resumable");
  }
}

export async function resumeSandbox(sandbox: Sandbox, signal?: AbortSignal): Promise<void> {
  assertSandboxCanResume(sandbox);
  const result = await sandbox.runCommand("true", [], { timeoutMs: 60_000, signal });
  if (result.exitCode !== 0) throw new Error("sandbox resume probe failed");
}

export async function destroySandbox(sandbox: Sandbox, signal?: AbortSignal): Promise<void> {
  await sandbox.delete({ signal });
}

export function isNotFound(error: unknown): boolean {
  const e = error as { response?: { status?: number } };
  return e?.response?.status === 404;
}

export async function listOwnedSandboxes(
  creds: VercelCredentials,
  state: SessionState,
  signal?: AbortSignal,
): Promise<string[]> {
  const names: string[] = [];
  const result = await Sandbox.list({ ...creds, namePrefix: state.sandboxName, sortBy: "name", signal });
  for await (const sandbox of result) {
    if (sandbox.tags?.owner === state.owner) names.push(sandbox.name);
  }
  return names;
}

function addSnapshotRecord(state: SessionState, record: SnapshotRecord): void {
  if (!state.snapshots.some((candidate) => candidate.id === record.id)) state.snapshots.push(record);
  if (!state.snapshotIds.includes(record.id)) state.snapshotIds.push(record.id);
}

export async function collectOwnedSnapshotCleanup(
  sandbox: Sandbox,
  state: SessionState,
  signal?: AbortSignal,
): Promise<SnapshotRecord[]> {
  const sessions = await sandbox.listSessions({ signal });
  for await (const session of sessions) {
    if (!state.sessionIds.includes(session.id)) state.sessionIds.push(session.id);
  }
  const snapshots = await sandbox.listSnapshots({ signal });
  for await (const snapshot of snapshots) {
    if (!state.sessionIds.includes(snapshot.sourceSessionId)) {
      throw new Error(`snapshot ${snapshot.id} has no verified provenance`);
    }
    addSnapshotRecord(state, {
      id: snapshot.id,
      sourceSessionId: snapshot.sourceSessionId,
    });
  }
  return state.snapshots;
}

export async function listSnapshotsForSandbox(
  creds: VercelCredentials,
  state: SessionState,
  signal?: AbortSignal,
): Promise<SnapshotRecord[]> {
  const sandbox = await getSandbox(creds, state, false, signal);
  return collectOwnedSnapshotCleanup(sandbox, state, signal);
}

export async function deleteVerifiedSnapshot(
  creds: VercelCredentials,
  state: SessionState,
  record: SnapshotRecord,
  signal?: AbortSignal,
): Promise<void> {
  if (!state.sessionIds.includes(record.sourceSessionId)) {
    throw new Error(`snapshot ${record.id} has no verified provenance`);
  }
  const snapshot = await Snapshot.get({ ...creds, snapshotId: record.id, signal });
  if (snapshot.sourceSessionId !== record.sourceSessionId) {
    throw new Error(`snapshot ${record.id} has no verified provenance`);
  }
  await snapshot.delete({ signal });
}

export async function destroySandboxAndSnapshots(
  creds: VercelCredentials,
  state: SessionState,
  persist: (state: SessionState) => unknown | Promise<unknown>,
  signal?: AbortSignal,
): Promise<string[]> {
  try {
    const sandbox = await getSandbox(creds, state, false, signal);
    await collectOwnedSnapshotCleanup(sandbox, state, signal);
    await persist(state);
    await destroySandbox(sandbox, signal);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  for (const id of state.snapshotIds) {
    if (!state.snapshots.some((record) => record.id === id)) {
      throw new Error(`snapshot ${id} has no verified provenance`);
    }
  }
  await persist(state);
  const deleted: string[] = [];
  for (const record of state.snapshots.slice()) {
    try {
      await deleteVerifiedSnapshot(creds, state, record, signal);
      deleted.push(record.id);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      deleted.push(record.id);
    }
  }

  let absent = false;
  try {
    await getSandbox(creds, state, false, signal);
  } catch (error) {
    if (isNotFound(error)) absent = true;
    else throw error;
  }
  if (!absent) throw new Error("sandbox still exists after delete");
  const remaining = await listRemainingSnapshots(creds, state, signal);
  if (remaining.length) throw new Error(`snapshots remain after delete: ${remaining.join(", ")}`);

  state.snapshots = state.snapshots.filter((record) => !deleted.includes(record.id));
  state.snapshotIds = state.snapshotIds.filter((id) => !deleted.includes(id));
  await persist(state);
  return deleted;
}

export async function listRemainingSnapshots(
  creds: VercelCredentials,
  state: SessionState,
  signal?: AbortSignal,
): Promise<string[]> {
  const remaining: string[] = [];
  for (const record of state.snapshots) {
    try {
      const snapshot = await Snapshot.get({ ...creds, snapshotId: record.id, signal });
      if (snapshot.sourceSessionId !== record.sourceSessionId) {
        throw new Error(`snapshot ${record.id} has no verified provenance`);
      }
      if (snapshot.status !== "deleted") remaining.push(record.id);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return remaining;
}
