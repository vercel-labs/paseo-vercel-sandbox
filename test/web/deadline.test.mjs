import test from "node:test";
import assert from "node:assert/strict";
import { withinDeadline } from "../../web/deadline.ts";
test("a stalled operation releases the worker to persist its failure", async () => {
  await assert.rejects(withinDeadline(() => new Promise(() => {}), 5), /operation_deadline/);
});
test("successful operations return their result without waiting for the deadline", async () => {
  assert.equal(await withinDeadline(async () => "complete", 1000), "complete");
});
