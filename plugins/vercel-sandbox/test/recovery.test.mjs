import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "paseo-vercel-sandbox-recovery-"));
process.env.PASEO_VERCEL_SANDBOX_STATE_DIR = root;

const { CredentialsStore } = await import("../dist/server/credentials.js");
const { acquireOperation, failOperation, fencedUpdate, LEASE_MS } = await import("../dist/server/operations.js");
const { ConflictError, SlotStore } = await import("../dist/server/store.js");
const { executeOperation, gatewayCreditsRequest, GATEWAY_CREDITS_URL } = await import("../dist/server/runtime.js");
const { PluginService } = await import("../dist/server/service.js");
const { providerDiagnostic } = await import("../dist/server/agent.js");
const { PROVIDERS } = await import("../dist/server/providers.js");

const credentials = new CredentialsStore(root);
const slots = new SlotStore(root);

test("first credential context is private and configured", async () => {
  await credentials.save({
    teamId: "team-one", projectId: "project-one",
    vercelToken: "vercel-secret-one", gatewayKey: "gateway-secret-one",
    replaceVercelToken: true, replaceGatewayKey: true,
  });
  const record = await credentials.read();
  assert.equal(record.value?.contexts.length, 1);
  const text = readFileSync(join(root, "credentials.json"), "utf8");
  assert.ok(text.includes("vercel-secret-one"));
  assert.equal(text.includes("AI_GATEWAY_API_KEY"), false);
});

test("concurrent credential saves have one CAS winner", async () => {
  const current = await credentials.read();
  const save = (suffix) => credentials.save({
    teamId: `team-cas-${suffix}`, projectId: `project-cas-${suffix}`,
    vercelToken: `vercel-cas-${suffix}`, gatewayKey: `gateway-cas-${suffix}`,
    replaceVercelToken: true, replaceGatewayKey: true,
    expectedDigest: current.digest,
  });
  const results = await Promise.allSettled([save("a"), save("b")]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected" && String(item.reason).includes("state_conflict")).length, 1);
});

test("start acquisition persists a stable intent before remote create", async () => {
  const active = await credentials.readActive();
  const first = await acquireOperation(slots, "codex", "start", () => ({
    id: "session-one", name: "stable-name", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    phase: "intent", sandboxName: "stable-name", region: "iad1", image: "universal", teamId: active.teamId,
    projectId: active.projectId, credentialId: active.id, owner: "owner-one", paseoHome: "/vercel/paseo-home",
    workspacePath: "/vercel/workspace", repoPath: "/vercel/workspace/repo", agentProvider: "codex",
    agentModel: "model", sessionIds: [], snapshotIds: [], snapshots: [],
  }));
  assert.equal(first.session?.phase, "intent");
  assert.equal(first.session?.sandboxName, "stable-name");
  const stored = await slots.read("codex");
  assert.equal(stored.value?.session?.sandboxName, "stable-name");
  await failOperation(slots, "codex", first.operation.id, "operation_failed");
});

test("concurrent acquisitions have one winner and one busy result", async () => {
  const active = await credentials.readActive();
  const make = () => ({
    id: `session-${Math.random()}`, name: `name-${Math.random()}`, createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), phase: "intent", sandboxName: `name-${Math.random()}`, region: "iad1",
    image: "universal", teamId: active.teamId, projectId: active.projectId, credentialId: active.id,
    owner: "owner", paseoHome: "/h", workspacePath: "/w", repoPath: "/r", agentProvider: "codex",
    agentModel: "m", sessionIds: [], snapshotIds: [], snapshots: [],
  });
  const results = await Promise.allSettled([
    acquireOperation(slots, "claude", "start", make),
    acquireOperation(slots, "claude", "start", make),
  ]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected" && String(item.reason).includes("operation_in_progress")).length, 1);
});

test("journal writes use compare-and-swap", async () => {
  const record = await slots.read("opencode");
  assert.equal(record.digest, "MISSING");
  const value = { schema: 1, agent: "opencode", revision: 1 };
  const first = slots.write("opencode", value, "MISSING");
  const second = slots.write("opencode", { ...value, revision: 2 }, "MISSING");
  const [a, b] = await Promise.allSettled([first, second]);
  const results = [a, b];
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected" && item.reason instanceof ConflictError).length, 1);
});

test("credential replacement preserves a referenced old context", async () => {
  const before = await credentials.readActive();
  const slot = await slots.read("codex");
  assert.equal(slot.value?.session?.credentialId, before.id);
  await credentials.save({
    teamId: "team-two", projectId: "project-two",
    vercelToken: "vercel-secret-two", gatewayKey: "gateway-secret-two",
    replaceVercelToken: true, replaceGatewayKey: true,
    preserveContextIds: [before.id],
  });
  const after = await credentials.read();
  assert.equal(after.value?.contexts.length, 2);
  assert.notEqual(after.value?.activeContextId, before.id);
  const old = await credentials.readContext(before.id);
  assert.equal(old.teamId, before.teamId);
});

test("ambiguous create failure is surfaced and retry reconciles without a second create", async () => {
  const active = await credentials.readContext((await slots.read("codex")).value?.session?.credentialId ?? "");
  const acquired = await acquireOperation(slots, "codex", "start", () => { throw new Error("unreachable"); }, Date.now() + LEASE_MS + 1);
  const operationId = acquired.operation?.id;
  assert.ok(operationId);
  let createCount = 0;
  const deps = {
    getSandbox: async () => { throw { response: { status: 404 } }; },
    createSandbox: async () => { createCount++; throw new Error("fetch timeout"); },
    stopSandbox: async () => {},
    resumeSandbox: async () => {},
    destroySandboxAndSnapshots: async () => [],
    writeBootstrap: async () => {},
    runBootstrap: async () => {},
    startDaemonAndPair: async () => { throw new Error("unreachable"); },
    providerDiagnostic: async () => ({ ok: true, provider: "codex", providerMatched: true, status: "Ready", modelCount: 1, exitCode: 0, parseError: false }),
    verifyGatewayKey: async () => {},
  };
  await executeOperation(slots, credentials, "codex", operationId, deps);
  const failed = await slots.read("codex");
  assert.equal(failed.value?.operation?.publicError, "operation_ambiguous");
  assert.equal(failed.value?.session?.lastError, "operation_ambiguous");

  const retry = await acquireOperation(slots, "codex", "start", () => { throw new Error("unreachable"); }, Date.now() + 2 * LEASE_MS + 1);
  const retryId = retry.operation?.id;
  assert.ok(retryId);
  deps.getSandbox = async () => { throw new Error("ambiguous create needs reconciliation"); };
  await executeOperation(slots, credentials, "codex", retryId, deps);
  assert.equal(createCount, 1);
  assert.equal((await slots.read("codex")).value?.operation?.publicError, "operation_ambiguous");
  void active;
});

test("expired stale worker is fenced from a newer operation", async () => {
  const now = Date.now();
  const first = await acquireOperation(slots, "pi", "start", () => ({ phase: "ready" }), now);
  const firstId = first.operation?.id;
  assert.ok(firstId);
  const retry = await acquireOperation(slots, "pi", "delete", () => { throw new Error("unreachable"); }, now + LEASE_MS + 1);
  const retryId = retry.operation?.id;
  assert.ok(retryId);
  await assert.rejects(() => fencedUpdate(slots, "pi", firstId, () => {}, now + LEASE_MS + 2), ConflictError);
  assert.notEqual(retryId, firstId);
});

test("explicit delete removes the owned sandbox and journal session", async () => {
  const active = await credentials.readActive();
  await slots.update("pi", () => ({
    schema: 1, agent: "pi", revision: 1,
    session: {
      id: "delete-session", name: "delete-name", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), phase: "ready", sandboxName: "delete-name",
      region: "iad1", image: "universal", teamId: active.teamId, projectId: active.projectId,
      credentialId: active.id, owner: "delete-owner", paseoHome: "/vercel/paseo-home",
      workspacePath: "/vercel/workspace", repoPath: "/vercel/workspace/repo",
      agentProvider: "pi", agentModel: "model", sessionIds: ["owned"], snapshotIds: [],
      snapshots: [],
    },
  }));
  const deletion = await acquireOperation(slots, "pi", "delete", () => { throw new Error("unreachable"); }, Date.now() + 2 * LEASE_MS + 1);
  const operationId = deletion.operation?.id;
  assert.ok(operationId);
  let destroyed = false;
  const deps = {
    getSandbox: async () => { throw new Error("unreachable"); },
    createSandbox: async () => { throw new Error("unreachable"); },
    stopSandbox: async () => {},
    resumeSandbox: async () => {},
    destroySandboxAndSnapshots: async (_credential, state, persist) => {
      destroyed = true;
      await persist({ ...state, snapshots: [], snapshotIds: [], sessionIds: [] });
      return [];
    },
    writeBootstrap: async () => {},
    runBootstrap: async () => {},
    startDaemonAndPair: async () => { throw new Error("unreachable"); },
    providerDiagnostic: async () => ({ ok: true, provider: "pi", providerMatched: true, status: "Ready", modelCount: 1, exitCode: 0, parseError: false }),
    verifyGatewayKey: async () => {},
  };
  await executeOperation(slots, credentials, "pi", operationId, deps);
  assert.equal(destroyed, true);
  const record = await slots.read("pi");
  assert.equal(record.value?.session, undefined);
  assert.equal(record.value?.operation?.status, "complete");
});

test("malformed journal reload fails closed without overwrite", async () => {
  const path = slots.path("claude");
  const malformed = "{not-json";
  writeFileSync(path, malformed, { mode: 0o600 });
  await assert.rejects(() => slots.read("claude"), /Expected property name|Unexpected token/);
  assert.equal(readFileSync(path, "utf8"), malformed);
  writeFileSync(path, JSON.stringify({ schema: 1, agent: "claude", revision: 0 }), { mode: 0o600 });
});

test("stale lock from a dead process is recoverable", async () => {
  const path = slots.path("pi");
  mkdirSync(join(root, "slots"), { recursive: true, mode: 0o700 });
  writeFileSync(`${path}.lock`, JSON.stringify({ pid: 999999999, createdAt: new Date(Date.now() - 10_000).toISOString() }), { mode: 0o600 });
  const record = await slots.read("pi");
  assert.ok(record);
});

test("status and delete are secret-free and explicitly confirmed", async () => {
  const service = new PluginService(root);
  const status = await service.status();
  const text = JSON.stringify(status);
  assert.equal(text.includes("vercel-secret"), false);
  assert.equal(text.includes("#offer="), false);
  await assert.rejects(() => service.act("codex", "delete"), /delete_confirmation_required/);
  await assert.rejects(() => service.act("codex", "delete", "wrong"), /delete_confirmation_required/);
});

test("failed operation details never persist raw exception text", async () => {
  const operation = await acquireOperation(slots, "opencode", "start", () => ({ phase: "intent" }));
  const id = operation.operation?.id;
  assert.ok(id);
  await failOperation(slots, "opencode", id, "operation_failed");
  const record = await slots.read("opencode");
  assert.equal(record.value?.operation?.publicError, "operation_failed");
  assert.equal("privateError" in (record.value?.operation ?? {}), false);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeSession(active, agent = "codex", overrides = {}) {
  const id = `session-${Math.random()}`;
  const name = `sandbox-${Math.random()}`;
  const now = new Date().toISOString();
  return {
    id, name, createdAt: now, updatedAt: now, phase: "ready", sandboxName: name,
    region: "iad1", image: "universal", teamId: active.teamId, projectId: active.projectId,
    credentialId: active.id, owner: `owner-${Math.random()}`, paseoHome: "/vercel/paseo-home",
    workspacePath: "/vercel/workspace", repoPath: "/vercel/workspace/repo", agentProvider: agent,
    agentModel: PROVIDERS.defaultModel, sessionIds: ["existing-session"], snapshotIds: [], snapshots: [],
    ...overrides,
  };
}

function pairingUrl(serverId = "server-one") {
  const offer = {
    v: 2,
    serverId,
    daemonPublicKeyB64: Buffer.alloc(32, 1).toString("base64"),
    relay: { endpoint: "https://relay.example", useTls: true },
  };
  return `https://app.paseo.sh/#offer=${Buffer.from(JSON.stringify(offer)).toString("base64url")}`;
}

function fakeSandbox(state, status = "running", sessionId = "existing-session") {
  return {
    name: state.sandboxName,
    tags: { paseoSandbox: state.name, owner: state.owner },
    status,
    expiresAt: new Date(Date.now() + 60_000),
    currentSession: () => ({ sessionId }),
  };
}

function makeDeps(state, overrides = {}) {
  return {
    getSandbox: async () => fakeSandbox(state),
    createSandbox: async () => fakeSandbox(state),
    stopSandbox: async () => undefined,
    resumeSandbox: async () => {},
    destroySandboxAndSnapshots: async (_credential, current, persist) => {
      await persist({ ...current, snapshots: [], snapshotIds: [], sessionIds: [] });
      return [];
    },
    writeBootstrap: async () => {},
    runBootstrap: async () => {},
    startDaemonAndPair: async () => ({
      url: pairingUrl(),
      serverId: "server-one",
      daemonPublicKeyB64: Buffer.alloc(32, 1).toString("base64"),
    }),
    providerDiagnostic: async () => ({
      ok: true, provider: state.agentProvider, providerMatched: true, status: "Ready",
      modelCount: 12, exitCode: 0, parseError: false,
    }),
    verifyGatewayKey: async () => {},
    ...overrides,
  };
}

async function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), "paseo-vercel-sandbox-case-"));
  const credentials = new CredentialsStore(root);
  const slots = new SlotStore(root);
  await credentials.save({
    teamId: "case-team", projectId: "case-project",
    vercelToken: "case-vercel-secret", gatewayKey: "case-gateway-secret",
    replaceVercelToken: true, replaceGatewayKey: true,
  });
  return { root, credentials, slots, active: await credentials.readActive() };
}

test("first credential save works without replacement switches", async () => {
  const root = mkdtempSync(join(tmpdir(), "paseo-first-save-"));
  const store = new CredentialsStore(root);
  await store.save({
    teamId: "first-team", projectId: "first-project",
    vercelToken: "first-vercel-secret", gatewayKey: "first-gateway-secret",
    replaceVercelToken: false, replaceGatewayKey: false,
  });
  assert.equal((await store.readActive()).teamId, "first-team");
});

test("fencedUpdate awaits async mutators", async () => {
  const { credentials, slots, active } = await makeRoot();
  const acquired = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "intent", sessionIds: [] }));
  const operationId = acquired.operation.id;
  let completed = false;
  await fencedUpdate(slots, "codex", operationId, async (record) => {
    await sleep(10);
    record.session.phase = "bootstrapping";
    completed = true;
  });
  assert.equal(completed, true);
  assert.equal((await slots.read("codex")).value.session.phase, "bootstrapping");
});

test("expired running operation recovers on construction without lockout", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const session = makeSession(active, "codex", { phase: "stopping" });
  await slots.update("codex", () => ({
    schema: 1, agent: "codex", revision: 1, session,
    operation: {
      id: "old-operation", action: "stop", status: "running",
      startedAt: new Date(Date.now() - 20_000).toISOString(),
      updatedAt: new Date(Date.now() - 20_000).toISOString(),
      leaseUntil: new Date(Date.now() - 10_000).toISOString(),
    },
  }));
  const service = new PluginService(root, makeDeps(session));
  const status = await service.status();
  const slot = status.slots.find((item) => item.agent === "codex");
  assert.equal(slot.operation.status, "failed");
  assert.equal(slot.operation.publicError, "operation_interrupted");
  const retry = await acquireOperation(slots, "codex", "stop", () => { throw new Error("unreachable"); });
  assert.equal(retry.operation.action, "stop");
  await service.dispose();
});

test("disposing a worker prevents the next remote effect", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const session = makeSession(active);
  await slots.update("codex", () => ({
    schema: 1, agent: "codex", revision: 1, session,
  }));
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let diagnosticCount = 0;
  const deps = makeDeps(session, {
    getSandbox: async () => {
      await gate;
      return fakeSandbox(session);
    },
    providerDiagnostic: async () => {
      diagnosticCount++;
      return { ok: true, provider: "codex", providerMatched: true, exitCode: 0, parseError: false };
    },
  });
  const service = new PluginService(root, deps);
  await service.act("codex", "diagnose");
  const disposing = service.dispose();
  release();
  await disposing;
  assert.equal(diagnosticCount, 0);
  const record = await slots.read("codex");
  assert.equal(record.value.operation.publicError, "operation_interrupted");
});

test("concurrent service creates allocate one sandbox", async () => {
  const { root, credentials, active } = await makeRoot();
  const state = makeSession(active, "codex", { phase: "intent", sessionIds: [] });
  let createCount = 0;
  const deps = makeDeps(state, {
    getSandbox: async () => { throw { response: { status: 404 } }; },
    createSandbox: async () => {
      createCount++;
      return fakeSandbox(state, "running", "created-session");
    },
  });
  const service = new PluginService(root, deps);
  const results = await Promise.allSettled([
    service.act("codex", "start"),
    service.act("codex", "start"),
  ]);
  await service.dispose();
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.filter((item) => item.status === "rejected").length, 1);
  assert.equal(createCount, 1);
});

test("uncertain delete retains the original host and credentials until a late allocation is removed", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const first = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "intent", sessionIds: [] }));
  const state = first.session;
  let createCount = 0;
  let destroyCount = 0;
  let visible = false;
  const deps = makeDeps(state, {
    getSandbox: async (credential, current) => {
      assert.equal(credential.id, active.id);
      assert.equal(current.sandboxName, state.sandboxName);
      if (!visible) throw { response: { status: 404 } };
      return fakeSandbox(state, "running", "late-session");
    },
    createSandbox: async () => { createCount++; throw new Error("fetch timeout"); },
    destroySandboxAndSnapshots: async (credential, current) => {
      assert.equal(credential.id, active.id);
      assert.equal(current.sandboxName, state.sandboxName);
      assert.ok(visible);
      destroyCount++;
      visible = false;
      return [];
    },
  });
  await executeOperation(slots, credentials, "codex", first.operation.id, deps);
  const retry = await acquireOperation(slots, "codex", "start", () => { throw new Error("unreachable"); });
  await executeOperation(slots, credentials, "codex", retry.operation.id, deps);
  assert.equal(createCount, 1);
  const service = new PluginService(root, deps);
  await service.status();
  const deletion = await acquireOperation(slots, "codex", "delete", () => { throw new Error("unreachable"); });
  await executeOperation(slots, credentials, "codex", deletion.operation.id, deps);
  let record = (await slots.read("codex")).value;
  assert.equal(record.operation.publicError, "operation_ambiguous");
  assert.equal(record.session.id, state.id);
  assert.equal(record.session.credentialId, active.id);
  assert.equal(destroyCount, 0);
  await assert.rejects(() => service.removeCredentials(), /credential_references_remain/);
  await service.saveCredentials({
    teamId: "new-team", projectId: "new-project", vercelToken: "new-token", gatewayKey: "new-key",
    replaceVercelToken: true, replaceGatewayKey: true,
  });
  assert.equal((await credentials.readContext(active.id)).token, active.token);
  visible = true;
  const secondDelete = await acquireOperation(slots, "codex", "delete", () => { throw new Error("unreachable"); });
  await executeOperation(slots, credentials, "codex", secondDelete.operation.id, deps);
  record = (await slots.read("codex")).value;
  assert.equal(record.operation.status, "complete");
  assert.equal(record.session, undefined);
  assert.ok(record.uncertainAllocations.every(allocation => allocation.resolvedAt));
  assert.equal(createCount, 1);
  assert.equal(destroyCount, 1);
  await service.removeCredentials();
  await service.dispose();
});

test("a checkpoint after a lapsed lease succeeds for the same operation", async () => {
  const { slots, active } = await makeRoot();
  const first = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "bootstrapping" }));
  const late = Date.parse(first.operation.leaseUntil) + 10 * 60 * 1000;
  const updated = await fencedUpdate(slots, "codex", first.operation.id, (record) => { record.session.phase = "ready"; }, late);
  assert.equal(updated.session.phase, "ready");
  await assert.rejects(() => fencedUpdate(slots, "codex", "not-the-operation", () => {}, late), ConflictError);
});

test("heartbeat renews a lapsed lease while the operation is still ours", async () => {
  const { slots, active } = await makeRoot();
  const first = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "bootstrapping" }));
  const { renewOperation } = await import("../dist/server/operations.js");
  // Simulate the host sleeping past the lease: renew with a clock far beyond leaseUntil.
  const late = Date.parse(first.operation.leaseUntil) + 10 * 60 * 1000;
  await renewOperation(slots, "codex", first.operation.id, late);
  const record = (await slots.read("codex")).value;
  assert.equal(record.operation.status, "running");
  assert.ok(Date.parse(record.operation.leaseUntil) > late, "lease must be re-established after a lapse");
});

test("heartbeat stops once another operation owns the slot", async () => {
  const { slots, active } = await makeRoot();
  const first = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "bootstrapping" }));
  const { renewOperation } = await import("../dist/server/operations.js");
  await failOperation(slots, "codex", first.operation.id, "operation_interrupted");
  const second = await acquireOperation(slots, "codex", "delete", () => { throw new Error("unreachable"); });
  await assert.rejects(() => renewOperation(slots, "codex", first.operation.id), ConflictError);
  const record = (await slots.read("codex")).value;
  assert.equal(record.operation.id, second.operation.id);
});

test("a create the API refuses outright leaves the slot usable", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const first = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "intent", sessionIds: [] }));
  const state = first.session;
  let createCount = 0;
  let destroyCount = 0;
  let created = false;
  const deps = makeDeps(state, {
    getSandbox: async () => { if (!created) throw { response: { status: 404 } }; return fakeSandbox(state, "running", "fresh-session"); },
    createSandbox: async () => {
      createCount++;
      if (createCount === 1) throw Object.assign(new Error("Payment Required"), { response: { status: 402 } });
      created = true;
      return fakeSandbox(state, "running", "fresh-session");
    },
    destroySandboxAndSnapshots: async () => { destroyCount++; created = false; return []; },
  });
  await executeOperation(slots, credentials, "codex", first.operation.id, deps);
  let record = (await slots.read("codex")).value;
  assert.equal(record.operation.publicError, "operation_failed");
  assert.ok(record.uncertainAllocations.every(allocation => allocation.resolvedAt), "a refused create must not leave an open allocation marker");
  // Retry after the user fixes the account: the same name is reused and create runs again.
  const retry = await acquireOperation(slots, "codex", "start", () => { throw new Error("unreachable"); });
  await executeOperation(slots, credentials, "codex", retry.operation.id, deps);
  record = (await slots.read("codex")).value;
  assert.equal(record.operation.status, "complete");
  assert.equal(createCount, 2);
  assert.equal(record.session.sandboxName, state.sandboxName);
  // Delete after a refused create must also succeed, without an ambiguous-allocation error.
  const deletion = await acquireOperation(slots, "codex", "delete", () => { throw new Error("unreachable"); });
  await executeOperation(slots, credentials, "codex", deletion.operation.id, deps);
  record = (await slots.read("codex")).value;
  assert.equal(record.operation.status, "complete");
  assert.equal(record.session, undefined);
  assert.equal(destroyCount, 1);
  void root;
});

test("lost create response is reconciled by the same host lookup", async () => {
  const { credentials, slots, active } = await makeRoot();
  const first = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "intent", sessionIds: [] }));
  const state = (await slots.read("codex")).value.session;
  let createCount = 0;
  const deps = makeDeps(state, {
    getSandbox: async () => { throw { response: { status: 404 } }; },
    createSandbox: async () => {
      createCount++;
      throw new Error("fetch timeout");
    },
  });
  await executeOperation(slots, credentials, "codex", first.operation.id, deps);
  const retry = await acquireOperation(slots, "codex", "start", () => { throw new Error("unreachable"); });
  deps.getSandbox = async () => fakeSandbox(state, "running", "reconciled-session");
  await executeOperation(slots, credentials, "codex", retry.operation.id, deps);
  assert.equal(createCount, 1);
  const record = await slots.read("codex");
  assert.equal(record.value.operation.status, "complete");
  assert.ok(record.value.session.sessionIds.includes("reconciled-session"));
});

test("remote status refresh marks idle hosts stopped without auto-resume and throttles", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const session = makeSession(active);
  await slots.update("codex", () => ({ schema: 1, agent: "codex", revision: 1, session }));
  let getSandboxCount = 0;
  let resumeCount = 0;
  const deps = makeDeps(session, {
    getSandbox: async () => {
      getSandboxCount++;
      return fakeSandbox(session, "stopped");
    },
    resumeSandbox: async () => {
      resumeCount++;
    },
  });
  const service = new PluginService(root, deps);
  let status = await service.status(true);
  let slot = status.slots.find((item) => item.agent === "codex");
  assert.equal(slot.phase, "stopped");
  assert.equal(slot.sandboxStatus, "stopped");
  assert.match(slot.expiresAt ?? "", /Z$/);
  status = await service.status(false);
  assert.equal(getSandboxCount, 1);
  deps.getSandbox = async () => { throw new Error("401 unauthorized"); };
  status = await service.status(true);
  slot = status.slots.find((item) => item.agent === "codex");
  assert.equal(slot.statusError, "remote_status_unavailable");
  assert.equal(slot.phase, "stopped");
  assert.equal(resumeCount, 0);
  await service.dispose();
});

test("credential rotation preserves an admitted host context across a remote await", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const session = makeSession(active);
  await slots.update("codex", () => ({ schema: 1, agent: "codex", revision: 1, session }));
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const deps = makeDeps(session, {
    getSandbox: async () => {
      await gate;
      return fakeSandbox(session);
    },
  });
  const service = new PluginService(root, deps);
  await service.act("codex", "diagnose");
  await service.saveCredentials({
    teamId: "new-team", projectId: "new-project",
    vercelToken: "new-vercel-secret", gatewayKey: "new-gateway-secret",
    replaceVercelToken: true, replaceGatewayKey: true,
  });
  release();
  for (let attempt = 0; attempt < 100; attempt++) {
    const status = await service.status();
    if (status.slots.find((item) => item.agent === "codex").operation?.status === "complete") break;
    await sleep(10);
  }
  const stored = await credentials.read();
  assert.equal(stored.value.contexts.length, 2);
  await credentials.readContext(active.id);
  await service.dispose();
});

test("credential removal fails while host journals reference it and succeeds when empty", async () => {
  const { root, credentials, slots, active } = await makeRoot();
  const service = new PluginService(root, makeDeps(makeSession(active)));
  await slots.update("codex", () => ({
    schema: 1, agent: "codex", revision: 1, session: makeSession(active),
  }));
  await assert.rejects(() => service.removeCredentials(), /credential_references_remain/);
  await slots.update("codex", (record) => ({ ...record, session: undefined }));
  const removed = await service.removeCredentials();
  assert.equal(removed.removed, true);
  assert.equal((await credentials.read()).value, null);
  await service.dispose();
});

test("resume records the new session immediately and verifies daemon identity", async () => {
  const { credentials, slots, active } = await makeRoot();
  const session = makeSession(active, "codex", {
    phase: "stopped",
    sessionIds: ["old-session"],
    pairingUrl: pairingUrl("identity-server"),
  });
  await slots.update("codex", () => ({ schema: 1, agent: "codex", revision: 1, session }));
  const acquired = await acquireOperation(slots, "codex", "resume", () => { throw new Error("unreachable"); });
  let lookupCount = 0;
  let resumeCount = 0;
  const deps = makeDeps(session, {
    getSandbox: async () => {
      lookupCount++;
      return lookupCount === 1
        ? fakeSandbox(session, "stopped", "old-session")
        : fakeSandbox(session, "running", "resumed-session");
    },
    resumeSandbox: async () => {
      resumeCount++;
    },
    startDaemonAndPair: async () => ({
      url: pairingUrl("identity-server"),
      serverId: "identity-server",
      daemonPublicKeyB64: Buffer.alloc(32, 1).toString("base64"),
    }),
  });
  await executeOperation(slots, credentials, "codex", acquired.operation.id, deps);
  const record = await slots.read("codex");
  assert.equal(record.value.operation.status, "complete");
  assert.ok(record.value.session.sessionIds.includes("resumed-session"));
  assert.equal(resumeCount, 1);
});

test("pending create is polled to running without an immediate resume", async () => {
  const { credentials, slots, active } = await makeRoot();
  const acquired = await acquireOperation(slots, "codex", "start", () => makeSession(active, "codex", { phase: "intent", sessionIds: [] }));
  const state = (await slots.read("codex")).value.session;
  let lookupCount = 0;
  let createCount = 0;
  let resumeCount = 0;
  const deps = makeDeps(state, {
    getSandbox: async () => {
      lookupCount++;
      if (lookupCount === 1) throw { response: { status: 404 } };
      return fakeSandbox(state, "running", "pending-session");
    },
    createSandbox: async () => {
      createCount++;
      return fakeSandbox(state, "pending", "pending-session");
    },
    resumeSandbox: async () => {
      resumeCount++;
    },
  });
  await executeOperation(slots, credentials, "codex", acquired.operation.id, deps);
  assert.equal(createCount, 1);
  assert.equal(resumeCount, 0);
  const record = await slots.read("codex");
  assert.equal(record.value.operation.status, "complete");
  assert.ok(record.value.session.sessionIds.includes("pending-session"));
});

test("diagnostics expose structured readiness only", async () => {
  const { credentials } = await makeRoot();
  const active = await credentials.readActive();
  const sandbox = {
    runCommand: async () => ({
      exitCode: 0,
      stdout: async () => JSON.stringify({
        provider: "codex",
        diagnostic: "Status: Ready\nModels: 12\nraw-vercel-secret",
      }),
      stderr: async () => "raw-gateway-secret",
    }),
  };
  const result = await providerDiagnostic(sandbox, makeSession(active), "gateway-secret");
  const text = JSON.stringify(result);
  assert.equal(result.ok, true);
  assert.equal(result.providerMatched, true);
  assert.equal(result.modelCount, 12);
  assert.equal(text.includes("raw-vercel-secret"), false);
  assert.equal(text.includes("raw-gateway-secret"), false);
});

test("gateway preflight uses the documented authenticated credits endpoint", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, authorization: init.headers.authorization });
    return { ok: true, status: 200 };
  };
  await gatewayCreditsRequest("gateway-secret", undefined, fetchImpl);
  await assert.rejects(() => gatewayCreditsRequest("invalid-secret", undefined, async () => ({ ok: false, status: 401 })), /gateway_key_rejected/);
  assert.equal(requests[0].url, GATEWAY_CREDITS_URL);
  assert.equal(requests[0].authorization, "Bearer gateway-secret");
});
