import test from "node:test";
import assert from "node:assert/strict";

const { register } = await import("../dist/server/register.js");
const rpc = await import("../dist/shared/rpc.js");

const contracts = Object.values(rpc).filter((value) => value && typeof value === "object" && typeof value.name === "string");

function fakeServer() {
  const handlers = new Map();
  return { handlers, handle: (contract, handler) => { handlers.set(contract.name, handler); } };
}

function recordingService() {
  const calls = [];
  const record = (name) => (...args) => { calls.push([name, ...args]); return Promise.resolve({ name }); };
  return {
    calls,
    status: record("status"), act: record("act"), revealPairing: record("revealPairing"),
    saveCredentials: record("saveCredentials"), removeCredentials: record("removeCredentials"),
    dispose: record("dispose"),
  };
}

test("every RPC contract in shared/rpc.ts has a registered handler", () => {
  const server = fakeServer();
  register(server, recordingService());
  assert.ok(contracts.length >= 5, `expected at least 5 contracts, found ${contracts.length}`);
  for (const contract of contracts) assert.ok(server.handlers.has(contract.name), `${contract.name} is not registered`);
  assert.equal(server.handlers.size, contracts.length);
});

test("status handler forwards the client's refresh flag", async () => {
  const server = fakeServer();
  const service = recordingService();
  register(server, service);
  const status = server.handlers.get(rpc.statusRpc.name);
  await status({ refresh: true }, {});
  await status({}, {});
  await status({ refresh: false }, {});
  assert.deepEqual(service.calls, [["status", true], ["status", false], ["status", false]]);
});

test("act, reveal, save and remove handlers pass their inputs through", async () => {
  const server = fakeServer();
  const service = recordingService();
  register(server, service);
  await server.handlers.get(rpc.actRpc.name)({ agent: "codex", action: "start", confirm: undefined }, {});
  await server.handlers.get(rpc.revealPairingRpc.name)({ agent: "pi" }, {});
  const save = { teamId: "t", projectId: "p", replaceVercelToken: false, replaceGatewayKey: false };
  await server.handlers.get(rpc.saveCredentialsRpc.name)(save, {});
  await server.handlers.get(rpc.removeCredentialsRpc.name)({}, {});
  assert.deepEqual(service.calls, [
    ["act", "codex", "start", undefined], ["revealPairing", "pi"], ["saveCredentials", save], ["removeCredentials"],
  ]);
});

test("cleanup returns the dispose promise so Paseo can await worker shutdown", async () => {
  const service = recordingService();
  const cleanup = register(fakeServer(), service);
  const result = cleanup();
  assert.ok(result instanceof Promise);
  await result;
  assert.deepEqual(service.calls, [["dispose"]]);
});
