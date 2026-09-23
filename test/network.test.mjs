import test from "node:test";
import assert from "node:assert/strict";

const { applyGatewayPolicy, BROKERED_GATEWAY_KEY, GATEWAY_HOST, gatewayNetworkPolicy } = await import("../dist/server/network.js");

test("the Gateway key is injected by the firewall and everything else stays reachable", () => {
  const policy = gatewayNetworkPolicy("gateway-secret");
  assert.deepEqual(policy, {
    allow: {
      [GATEWAY_HOST]: [{ transform: [{ headers: { Authorization: "Bearer gateway-secret" } }] }],
      "*": [],
    },
  });
  assert.equal(GATEWAY_HOST, "ai-gateway.vercel.sh");
});

test("an empty key never produces a policy that would let requests out unauthenticated", () => {
  assert.throws(() => gatewayNetworkPolicy(""), /gateway key is required/);
});

test("the in-sandbox placeholder is not a usable key and differs from any real one", () => {
  assert.ok(BROKERED_GATEWAY_KEY.length > 0);
  assert.equal(BROKERED_GATEWAY_KEY.startsWith("vck_"), false);
  assert.notEqual(BROKERED_GATEWAY_KEY, "gateway-secret");
});

test("applyGatewayPolicy updates the running sandbox with the transform policy", async () => {
  const calls = [];
  await applyGatewayPolicy({ update: async (params, opts) => { calls.push([params, opts]); } }, "gateway-secret");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], { networkPolicy: gatewayNetworkPolicy("gateway-secret") });
});
