import test from "node:test";
import assert from "node:assert/strict";
import { parseObject } from "../../web/body.ts";

test("bounded JSON parser accepts an object", async () => {
  assert.deepEqual(await parseObject(new Request("https://test", { method: "POST", body: '{"agent":"codex"}' })), { agent: "codex" });
});

test("bounded JSON parser rejects malformed, array, and oversized input", async () => {
  await assert.rejects(() => parseObject(new Request("https://test", { method: "POST", body: "{" })), /invalid_request/);
  await assert.rejects(() => parseObject(new Request("https://test", { method: "POST", body: "[]" })), /invalid_request/);
  await assert.rejects(() => parseObject(new Request("https://test", { method: "POST", body: '{"x":"' + "a".repeat(1100) + '"}' })), /invalid_request/);
});
