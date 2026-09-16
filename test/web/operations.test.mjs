import test from "node:test";
import assert from "node:assert/strict";
import { acquireOperation, failOperation, fencedUpdate, LEASE_MS } from "../../web/operations.ts";
import { ConflictError } from "../../web/store.ts";

class MemoryStore {
  value = null;
  etag = null;
  async read() { return { value: this.value && structuredClone(this.value), etag: this.etag }; }
  async write(_agent, value, expected) {
    await Promise.resolve();
    if (expected !== this.etag) throw new ConflictError();
    this.value = structuredClone(value);
    this.etag = String(Number(this.etag ?? 0) + 1);
    return this.etag;
  }
}

test("two concurrent starts have one winner", async () => {
  const store = new MemoryStore();
  const results = await Promise.allSettled([
    acquireOperation(store, "codex", "start", 1000),
    acquireOperation(store, "codex", "start", 1000),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected" && result.reason instanceof ConflictError).length, 1);
});

test("an unexpired operation lease blocks overlap", async () => {
  const store = new MemoryStore();
  await acquireOperation(store, "codex", "start", 1000);
  await assert.rejects(() => acquireOperation(store, "codex", "stop", 1001), /operation_in_progress/);
});

test("an expired operation must retry the same action", async () => {
  const store = new MemoryStore();
  await acquireOperation(store, "codex", "start", 1000);
  await assert.rejects(() => acquireOperation(store, "codex", "stop", 700_000), /operation_in_progress/);
});

test("failed operation stays leased, then retries with a fresh fencing id", async () => {
  const store = new MemoryStore();
  const base = Date.now();
  const first = await acquireOperation(store, "codex", "start", base);
  store.value.session = { phase: "created" };
  await failOperation(store, "codex", first.record.operation.id, "private https://app.paseo.sh/#offer=secret");
  assert.equal(store.value.operation.privateError.includes("secret"), false);
  await assert.rejects(() => acquireOperation(store, "codex", "start", base + 1), /operation_in_progress/);
  const retry = await acquireOperation(store, "codex", "start", base + LEASE_MS + 1);
  assert.notEqual(retry.record.operation.id, first.record.operation.id);
  await assert.rejects(() => fencedUpdate(store, "codex", first.record.operation.id, () => {}, base + LEASE_MS + 2), ConflictError);
});

test("fenced update rejects an expired lease", async () => {
  const store = new MemoryStore();
  const first = await acquireOperation(store, "codex", "start", 1000);
  await assert.rejects(() => fencedUpdate(store, "codex", first.record.operation.id, () => {}, 1000 + LEASE_MS), ConflictError);
});

const phases = [
  ["start", "creating"], ["start", "created"], ["start", "bootstrapping"], ["start", "ready"],
  ["stop", "stopping"], ["resume", "resuming"], ["delete", "destroying"],
];
for (const [action, phase] of phases) {
  test(`interrupted ${phase} retries ${action} with preserved sandbox identity`, async () => {
    const store = new MemoryStore();
    const first = await acquireOperation(store, "codex", "start", 1000);
    store.value.session = { phase, sandboxName: "owned-random-name" };
    store.value.operation.action = action;
    const retry = await acquireOperation(store, "codex", action, 1000 + LEASE_MS + 1);
    assert.notEqual(retry.record.operation.id, first.record.operation.id);
    assert.equal(retry.record.session.sandboxName, "owned-random-name");
  });
}

test("delete is a safe escape after another action lease expires", async () => {
  const store = new MemoryStore();
  await acquireOperation(store, "codex", "start", 1000);
  store.value.session = { phase: "failed", sandboxName: "owned-random-name" };
  await assert.rejects(() => acquireOperation(store, "codex", "delete", 2000), /operation_in_progress/);
  const removal = await acquireOperation(store, "codex", "delete", 1000 + LEASE_MS + 1);
  assert.equal(removal.record.operation.action, "delete");
});

test("private failure details redact every configured credential", async () => {
  const previous = [process.env.AI_GATEWAY_API_KEY, process.env.LAUNCHER_SECRET, process.env.BLOB_READ_WRITE_TOKEN];
  [process.env.AI_GATEWAY_API_KEY, process.env.LAUNCHER_SECRET, process.env.BLOB_READ_WRITE_TOKEN] = ["gateway-secret", "owner-secret", "blob-secret"];
  try {
    const store = new MemoryStore();
    const attempt = await acquireOperation(store, "codex", "start");
    await failOperation(store, "codex", attempt.record.operation.id, "gateway-secret owner-secret blob-secret");
    assert.equal(store.value.operation.privateError.includes("secret"), false);
  } finally {
    [process.env.AI_GATEWAY_API_KEY, process.env.LAUNCHER_SECRET, process.env.BLOB_READ_WRITE_TOKEN] = previous;
  }
});

for (const phase of [undefined, "intent"]) {
  test(`pre-create failure (${phase ?? "no session"}) allows immediate retry`, async () => {
    const store = new MemoryStore();
    const first = await acquireOperation(store, "codex", "start");
    if (phase) store.value.session = { phase, sandboxName: "stable-intent" };
    await failOperation(store, "codex", first.record.operation.id, "key rejected");
    assert.ok(Date.parse(store.value.operation.leaseUntil) <= Date.now());
    const retry = await acquireOperation(store, "codex", "start");
    assert.notEqual(retry.record.operation.id, first.record.operation.id);
    if (phase) assert.equal(retry.record.session.sandboxName, "stable-intent");
  });
}
