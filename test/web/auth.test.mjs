import test from "node:test";
import assert from "node:assert/strict";
import { assertOrigin, createSession, verifyOwnerKey, verifySession } from "../../web/auth.ts";
import { setupStatus } from "../../web/config.ts";

const env = { LAUNCHER_SECRET: "a".repeat(32), AI_GATEWAY_API_KEY: "gateway", BLOB_STORE_ID: "store" };

test("owner auth accepts only the configured key", () => {
  assert.equal(verifyOwnerKey("a".repeat(32), env), true);
  assert.equal(verifyOwnerKey("b".repeat(32), env), false);
});

test("signed session rejects tampering and expiry", () => {
  const session = createSession(1_000_000, env);
  assert.equal(verifySession(session, 1_000_001, env), true);
  assert.equal(verifySession(session + "x", 1_000_001, env), false);
  assert.equal(verifySession(session, 1_000_000 + 12 * 60 * 60 * 1000, env), false);
});

test("mutation origin must exactly match request origin", () => {
  assert.doesNotThrow(() => assertOrigin(new Request("https://launcher.test/api", { headers: { origin: "https://launcher.test" } })));
  assert.throws(() => assertOrigin(new Request("https://launcher.test/api", { headers: { origin: "https://evil.test" } })), /invalid_origin/);
  assert.throws(() => assertOrigin(new Request("https://launcher.test/api")), /invalid_origin/);
});

test("setup accepts either Blob credential and fails closed", () => {
  assert.equal(setupStatus(env).ready, true);
  assert.equal(setupStatus({ ...env, BLOB_STORE_ID: undefined, BLOB_READ_WRITE_TOKEN: "token" }).ready, true);
  const missing = setupStatus({ LAUNCHER_SECRET: "short" });
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.missing, ["LAUNCHER_SECRET", "AI_GATEWAY_API_KEY", "BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN"]);
});
