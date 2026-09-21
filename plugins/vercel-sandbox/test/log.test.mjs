import test from "node:test";
import assert from "node:assert/strict";
const { logEvent } = await import("../dist/server/log.js");

test("plugin log lines never carry secrets", () => {
  const lines = [];
  const original = console.log; console.log = (line) => lines.push(String(line));
  try {
    logEvent("operation_failed", {
      agent: "codex", error: "operation_failed",
      detail: "bootstrap failed: AI_GATEWAY_API_KEY=vck_secret_123 token: vercel-secret-456 https://app.paseo.sh/#offer=abc.def paseo://pair/xyz Bearer zzz",
    }, "vck_secret_123");
  } finally { console.log = original; }
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.plugin, "vercel-sandbox"); assert.equal(parsed.event, "operation_failed"); assert.ok(parsed.at);
  for (const secret of ["vck_secret_123", "vercel-secret-456", "#offer=abc", "paseo://pair/xyz", "Bearer zzz"]) assert.ok(!lines[0].includes(secret), `log leaked ${secret}`);
});

test("redaction does not depend on knowing the key", () => {
  const lines = [];
  const original = console.log; console.log = (line) => lines.push(String(line));
  try { logEvent("operation_failed", { detail: 'bare vck_abcDEF123-_x and {"gatewayKey":"vck_other"} and gateway_key=vck_third' }); }
  finally { console.log = original; }
  for (const secret of ["vck_abcDEF123-_x", "vck_other", "vck_third"]) assert.ok(!lines[0].includes(secret), `log leaked ${secret}`);
});
