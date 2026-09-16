import test from "node:test";
import assert from "node:assert/strict";
import { Sandbox } from "@vercel/sandbox";
import { executeOperation } from "../../web/runtime.ts";
import { acquireOperation } from "../../web/operations.ts";
import { newState } from "../../dist/state.js";

class Store {
  value = null; version = 0;
  async read() { return { value: structuredClone(this.value), etag: this.version ? String(this.version) : null }; }
  async write(_agent, value, etag) {
    assert.equal(etag, this.version ? String(this.version) : null);
    this.value = structuredClone(value); return String(++this.version);
  }
}
function setup(t) {
  for (const [key, value] of Object.entries({ VERCEL_TOKEN: "test", VERCEL_TEAM_ID: "team", VERCEL_PROJECT_ID: "project", AI_GATEWAY_API_KEY: "gateway" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => previous === undefined ? delete process.env[key] : process.env[key] = previous);
  }
  const state = newState({ region: "iad1", image: "vercel/sandbox/universal:latest", teamId: "team", projectId: "project", agentProvider: "codex", agentModel: "openai/gpt-5.2-codex", workspacePath: "/vercel/workspace", repoPath: "/vercel/workspace/repo", paseoHome: "/vercel/paseo-home" });
  state.sessionIds = ["existing-session"];
  return state;
}

test("retry never recreates an existing host that is now missing", async t => {
  const state = setup(t), store = new Store();
  const op = await acquireOperation(store, "codex", "start");
  store.value.session = state;
  t.mock.method(Sandbox, "get", async () => { throw { response: { status: 404 } }; });
  const creation = t.mock.method(Sandbox, "create", async () => { throw Error("must not create"); });
  await executeOperation(store, "codex", op.record.operation.id);
  assert.equal(creation.mock.callCount(), 0);
  assert.equal(store.value.operation.status, "failed");
  assert.match(store.value.operation.privateError, /existing_host_missing/);
  assert.deepEqual(store.value.session.sessionIds, ["existing-session"]);
});

test("provider failure retains pairing and retries bootstrap against the same host", async t => {
  const state = setup(t), store = new Store();
  const op = await acquireOperation(store, "codex", "start"); store.value.session = state;
  const url = "https://app.paseo.sh/#offer=" + Buffer.from(JSON.stringify({ v: 2, serverId: "same-daemon", daemonPublicKeyB64: Buffer.alloc(32, 7).toString("base64"), relay: { endpoint: "relay.paseo.sh", useTls: true } })).toString("base64url");
  const calls = [];
  const sandbox = {
    name: state.sandboxName, tags: { owner: state.owner, paseoSandbox: state.name }, status: "running",
    currentSession: () => ({ sessionId: "existing-session" }),
    writeFiles: async () => {},
    runCommand: async params => {
      calls.push(params);
      const line = (params.args ?? []).join(" ");
      const out = line.includes("daemon pair") ? JSON.stringify({ url }) : line.includes("daemon status") ? '{"localDaemon":"running"}' : line.includes("provider diagnostic") ? JSON.stringify({ provider: "codex", diagnostic: "Status: Error" }) : "";
      return { exitCode: 0, stdout: async () => out, stderr: async () => "" };
    },
  };
  t.mock.method(Sandbox, "get", async () => sandbox);
  const creation = t.mock.method(Sandbox, "create", async () => { throw Error("must not create"); });
  await executeOperation(store, "codex", op.record.operation.id);
  assert.equal(creation.mock.callCount(), 0);
  assert.equal(store.value.operation.status, "failed");
  assert.equal(store.value.session.pairingUrl, url);
  assert.match(store.value.operation.privateError, /provider_readiness_failed/);
  assert.deepEqual(calls.map(c => c.timeoutMs), [120000, 40000, 15000, 30000]);
  assert.deepEqual(store.value.session.sessionIds, ["existing-session"]);
});


test("two consecutive rejected keys never create a host or lock a retry", async t => {
  setup(t); const store = new Store();
  t.mock.method(Sandbox, "get", async () => { throw { response: { status: 404 } }; });
  const create = t.mock.method(Sandbox, "create", async () => { throw Error("must not create"); });
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  let name;
  for (let attempt = 0; attempt < 2; attempt++) {
    const acquired = await acquireOperation(store, "codex", "start");
    await executeOperation(store, "codex", acquired.record.operation.id);
    assert.equal(store.value.operation.status, "failed");
    assert.ok(Date.parse(store.value.operation.leaseUntil) <= Date.now(), "pre-create failure must release its lease on every attempt");
    name ??= store.value.session.sandboxName;
    assert.equal(store.value.session.sandboxName, name);
  }
  await acquireOperation(store, "codex", "start");
  assert.equal(create.mock.callCount(), 0);
});
