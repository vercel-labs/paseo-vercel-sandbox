import test from "node:test";
import assert from "node:assert/strict";
import { observedPhase } from "../../web/reconcile.ts";

test("a refreshed ready record displays an auto-stopped sandbox as resumable", () => {
  assert.equal(observedPhase({ session: { phase: "ready" } }, "stopped"), "stopped");
  assert.equal(observedPhase({ session: { phase: "ready" } }, "running"), "ready");
});
