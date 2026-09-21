import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createServer } from "node:net";

assert.equal(process.env.PASEO_E2E_RUN, "1", "Set PASEO_E2E_RUN=1 to authorize four disposable billable sandboxes");
const plugin = resolve(process.env.PASEO_E2E_PLUGIN ?? fileURLToPath(new URL("..", import.meta.url)));
const cli = process.env.PASEO_E2E_CLI;
const browserPackage = process.env.PASEO_E2E_PLAYWRIGHT;
assert.ok(cli && browserPackage, "Set PASEO_E2E_CLI and PASEO_E2E_PLAYWRIGHT to pinned CLI0.8 and Playwright module paths");
assert.equal(JSON.parse(await readFile(join(dirname(dirname(cli)), "package.json"), "utf8")).version, "0.8.0");
const { chromium } = createRequire(import.meta.url)(browserPackage);
const { Sandbox, Snapshot } = await import(pathToFileURL(join(plugin, "dist/server/sdk.js")));
const { destroySandboxAndSnapshots } = await import(pathToFileURL(join(plugin, "dist/server/lifecycle.js")));
const credentials = {
  token: process.env.VERCEL_TOKEN,
  teamId: process.env.VERCEL_TEAM_ID,
  projectId: process.env.VERCEL_PROJECT_ID,
  gateway: process.env.AI_GATEWAY_API_KEY,
};
for (const [name, value] of Object.entries(credentials)) assert.ok(value, `Missing ${name}`);
const privateValues = Object.values(credentials);
const safe = (input) => {
  let text = String(input);
  for (const value of privateValues) text = text.replaceAll(value, "[PRIVATE]");
  return text.replace(/https:\/\/app\.paseo\.sh\/[^\s"']+/g, "[PAIRING URL]");
};
const root = await mkdtemp(join(tmpdir(), "paseo-plugin-e2e-"));
const home = join(root, "home");
const stateRoot = join(root, "state");
await mkdir(home, { mode: 0o700 });
await writeFile(join(home, "config.json"), JSON.stringify({ pluginsEnabled: true }), { mode: 0o600 });
const port = await new Promise((res, rej) => {
  const server = createServer(); server.once("error", rej);
  server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close(() => res(value)); });
});
const base = `http://127.0.0.1:${port}`;
const daemonEnv = { ...process.env, PASEO_HOME: home, PASEO_VERCEL_SANDBOX_STATE_DIR: stateRoot,
  npm_config_registry: "https://registry.npmjs.org", npm_config_userconfig: "/dev/null",
  npm_config_cache: join(root, "npm-cache"), npm_config_audit: "false", npm_config_fund: "false" };
for (const key of ["VERCEL_TOKEN", "VERCEL_OIDC_TOKEN", "AI_GATEWAY_API_KEY"]) delete daemonEnv[key];
const checks = [];
const report = { startedAt: new Date().toISOString(), passed: false, checks, cleanup: [], root };
const record = (name, details = {}) => { checks.push({ name, time: new Date().toISOString(), ...details }); console.log(`PASS ${name}`); };
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
async function until(fn, label, timeout = 120000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return; await delay(500); }
  throw new Error(`Timed out: ${label}`);
}
async function slot(agent) {
  try { return JSON.parse(await readFile(join(stateRoot, "slots", `${agent}.json`), "utf8")); }
  catch (e) { if (e.code === "ENOENT") return null; throw e; }
}
async function settled(agent, phase) {
  await until(async () => {
    const r = await slot(agent);
    if (r?.operation?.status === "failed") throw Error(`${agent}: ${r.operation.publicError}`);
    return r?.operation?.status === "complete" && (r.session?.phase ?? "empty") === phase;
  }, `${agent} ${phase}`, 900000);
}
const noBackdrop = () => page.getByTestId("add-project-flow-backdrop").waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
const auth = (s) => ({ token: credentials.token, teamId: s.teamId, projectId: s.projectId });
async function owned(agent) {
  const s = (await slot(agent))?.session; assert.ok(s, `${agent} state missing`);
  const sb = await Sandbox.get({ ...auth(s), name: s.sandboxName, resume: false });
  assert.equal(sb.tags?.owner, s.owner); assert.equal(sb.tags?.paseoSandbox, s.name);
  return { s, sb };
}
const agents = [
  { id: "codex", title: "Codex", provider: "Codex", search: "Gateway", model: "Gateway openai/gpt-6-astra Create profile from this model" },
  { id: "claude", title: "Claude Code", provider: "Claude", search: "Sonnet 5", model: "Sonnet 5 Sonnet 5 · Best for everyday tasks Create profile from this model" },
  { id: "opencode", title: "OpenCode", provider: "OpenCode", search: "sonnet", model: "Claude Sonnet 5 Vercel AI Gateway - claude-sonnet Create profile from this model" },
  { id: "pi", title: "Pi", provider: "Pi", search: "sonnet-5", model: "Claude Sonnet 5 vercel-ai-gateway/anthropic/claude-sonnet-5 Create profile from this model" },
];
let daemon, browser, page, controllerId;
const inventory = new Map();
const button = (name) => page.getByRole("button", { name, exact: typeof name === "string" });
const textbox = (name) => page.getByRole("textbox", { name, exact: true });
async function hosts(agent) {
  if (!(await button("Vercel Sandboxes").isVisible())) await button("Back").click();
  await button("Vercel Sandboxes").click(); await button(agent.title).click();
}
async function verifyFile(agent, resumed) {
  const { s, sb } = await owned(agent.id); assert.equal(sb.status, "running");
  const bytes = await sb.readFileToBuffer({ path: `/vercel/workspace/repo/${agent.id}-proof.txt` });
  assert.equal(bytes.toString(), `paseo-plugin-${agent.id}-ok\n`);
  const sessions = []; for await (const ss of await sb.listSessions()) sessions.push(ss.id);
  if (resumed) { assert.ok(sessions.length >= 2); assert.ok(s.sessionIds.includes(sb.currentSession().sessionId)); }
  await writeFile(join(root, `${agent.id}-export.txt`), bytes);
  record(`${agent.id} ${resumed ? "resumed" : "edited"} exact file exported`, { sha256: createHash("sha256").update(bytes).digest("hex"), sessions: sessions.length });
}
async function snapshotInventory(agent) {
  const { s, sb } = await owned(agent.id);
  const sessions = []; for await (const ss of await sb.listSessions()) sessions.push(ss.id);
  const snapshots = []; for await (const sn of await sb.listSnapshots()) { assert.ok(sessions.includes(sn.sourceSessionId)); snapshots.push({ id: sn.id, sourceSessionId: sn.sourceSessionId }); }
  inventory.set(agent.id, { s, snapshots });
}
async function verifyAbsent(agent) {
  const { s, snapshots } = inventory.get(agent.id);
  await assert.rejects(() => Sandbox.get({ ...auth(s), name: s.sandboxName, resume: false }), e => e.response?.status === 404);
  for (const sn of snapshots) {
    try { const found = await Snapshot.get({ ...auth(s), snapshotId: sn.id }); assert.equal(found.status, "deleted"); }
    catch (e) { if (e.response?.status !== 404) throw e; }
  }
  report.cleanup.push({ agent: agent.id, hostAbsent: true, snapshotsAbsent: snapshots.length });
}
try {
  const source = join(root, "source"); const staged = join(source, "plugins/vercel-sandbox");
  await cp(plugin, staged, { recursive: true, filter: p => !p.slice(plugin.length).split(/[\\/]/).some(part => ["node_modules", "dist", ".git", ".vercel"].includes(part) || part.startsWith(".env")) && !p.endsWith(".edit-lock") });
  const git = args => execFileSync("git", args, { cwd: source, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-b", "test"]); git(["add", "plugins"]);
  git(["-c", "user.name=Plugin tests", "-c", "user.email=plugin-tests@example.invalid", "commit", "-m", "Plugin test fixture"]);
  report.fixtureCommit = git(["rev-parse", "HEAD"]).trim();
  daemon = spawn(process.execPath, [cli, "daemon", "start", "--foreground", "--home", home, "--listen", `127.0.0.1:${port}`, "--no-relay", "--no-mcp", "--no-inject-mcp", "--web-ui"], { env: daemonEnv, stdio: ["ignore", "pipe", "pipe"] });
  daemon.stdout.on("data", () => {}); daemon.stderr.on("data", () => {});
  await until(async () => { try { return (await fetch(base)).ok; } catch { return false; } }, "isolated daemon startup");
  const runCli = args => execFileSync(process.execPath, [cli, ...args], { env: daemonEnv, encoding: "utf8", timeout: 600000, stdio: ["ignore", "pipe", "pipe"] });
  controllerId = JSON.parse(runCli(["daemon", "status", "--home", home, "--json"])).serverId;
  const installed = JSON.parse(runCli(["plugin", "add", `${pathToFileURL(source)}:plugins/vercel-sandbox`, "--ref", report.fixtureCommit, "--host", `127.0.0.1:${port}`, "--json"]));
  assert.equal(installed.source, "git"); assert.equal(installed.status, "running"); assert.equal(installed.commit, report.fixtureCommit);
  record("clean Git subdirectory install and server activation");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"], viewport: { width: 1440, height: 1000 } });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(base + `/settings/hosts/${controllerId}/plugins`); await button("Open").click();
  await textbox("Vercel team ID").fill(credentials.teamId); await textbox("Vercel project ID").fill(credentials.projectId);
  await textbox("Vercel token").fill(credentials.token); await textbox("AI Gateway key").fill(credentials.gateway);
  await button("Save credentials").click();
  await until(async () => (await textbox("Vercel token").inputValue()) === "" && (await textbox("AI Gateway key").inputValue()) === "", "secret inputs cleared", 15000);
  record("first setup saves and clears secret fields without replacement switches");
  for (const agent of agents) { await hosts(agent); await button("Create").click(); }
  for (const agent of agents) await settled(agent.id, "ready");
  record("four plugin-created hosts ready");
  for (const agent of agents) {
    await hosts(agent); await button("Reveal pairing link").click(); await button("Copy pairing link").click();
    const offer = await page.evaluate(() => navigator.clipboard.readText()); privateValues.push(offer);
    const parsed = JSON.parse(Buffer.from(new URL(offer).hash.slice("#offer=".length), "base64url"));
    await button("Hosts").click(); await button("Add host").click(); await button("Paste pairing link").click();
    await textbox("Pairing link").fill(offer); await button("Pair").click();
    await until(async () => new URL(page.url()).pathname === `/settings/hosts/${parsed.serverId}/connections` && !(await textbox("Pairing link").isVisible()), "manual pairing");
    const hostLabel = (await button("Switch host").innerText()).trim();
    await button("Back").click(); await button("New workspace").click();
    await textbox("Message agent...").press(process.platform === "darwin" ? "Meta+o" : "Control+o");
    await button(new RegExp(parsed.serverId)).click();
    await button(/^Search for directory Find a directory on /).click();
    await textbox("Search directories or enter a path...").fill("/vercel/workspace/repo");
    await textbox("Search directories or enter a path...").press("Enter");
    await noBackdrop();
    await button(/^Select model /).click();
    if (await button("Back").isVisible()) await button("Back").click();
    await button(new RegExp(`^${agent.provider} \\d+ models?$`)).click();
    await textbox("Search models...").fill(agent.search); await button(agent.model).click();
    const done = `${agent.id.toUpperCase()}_PLUGIN_OK`;
    await textbox("Message agent...").fill(`Create ${agent.id}-proof.txt in the current workspace containing exactly paseo-plugin-${agent.id}-ok followed by a newline. Verify exact content with a command. Do not change other files. Reply ${done} after verification.`);
    if (await button("Auto accept permission prompts").isVisible()) await button("Auto accept permission prompts").click();
    await noBackdrop();
    await button("Create").click();
    await page.getByText(done, { exact: true }).waitFor({ state: "visible", timeout: 180000 });
    const workspace = page.url(); record(`${agent.id} real agent task through Paseo UI`);
    await verifyFile(agent, false);
    await page.reload(); await page.getByText(done, { exact: true }).waitFor({ state: "visible" });
    record(`${agent.id} conversation after browser reconnect`);
    await hosts(agent);
    if (agent.id === "codex") {
      const { sb } = await owned(agent.id); await sb.stop();
      await button("Refresh").click(); await settled(agent.id, "stopped");
      record("remote stop reconciles without restarting the host");
    } else { await button("Stop").click(); await settled(agent.id, "stopped"); }
    await button("Resume").click(); await settled(agent.id, "ready");
    await page.goto(workspace); await page.getByText(done, { exact: true }).waitFor({ state: "visible" });
    await button("Hosts").click(); await button(`Open ${hostLabel} settings`).click();
    await button("Connections").click();
    await until(async () => /Relay[\s\S]*\b\d+ms\b/.test(await page.locator("body").innerText()), "relay connection ready");
    await button("Back").click();
    await until(async () => !(await button("Select model (Loading...)").isVisible()), "model readiness");

    const resumed = `${agent.id.toUpperCase()}_RESUME_OK`;
    await textbox("Message agent...").fill(`Verify ${agent.id}-proof.txt still contains exactly paseo-plugin-${agent.id}-ok followed by a newline after this sandbox restart. Do not edit it. Reply ${resumed} after checking it.`);
    await textbox("Message agent...").press("Enter");
    await page.getByText(resumed, { exact: true }).waitFor({ state: "visible", timeout: 180000 });
    record(`${agent.id} follow-up through UI after restart`); await verifyFile(agent, true);
  }
  // Reload the plugin through the installed CLI while all hosts and journals exist.
  const reloaded = JSON.parse(execFileSync(process.execPath, [cli, "plugin", "reload", "vercel-sandbox", "--host", `127.0.0.1:${port}`, "--json"], { env: daemonEnv, encoding: "utf8", timeout: 120000, stdio: "pipe" }));
  assert.equal(reloaded.status, "running");
  await page.reload(); await button("Vercel Sandboxes").waitFor({ state: "visible" });
  for (const agent of agents) { const r = await slot(agent.id); assert.equal(r.session.phase, "ready"); }
  record("plugin reload retains all four host journals");
  for (const agent of agents) {
    await snapshotInventory(agent); await hosts(agent); await button("Delete…").click();
    const input = page.getByRole("textbox"); await input.fill(agent.id);
    await button("Delete permanently").click(); await settled(agent.id, "empty"); await verifyAbsent(agent);
    record(`${agent.id} UI deletion removes owned host and snapshots`);
  }
  report.passed = true;
} catch (error) { report.error = safe(error); console.error(report.error); process.exitCode = 1; }
finally {
  await browser?.close();
  if (daemon && report.passed !== true) {
    try { report.pluginLogs = safe(execFileSync(process.execPath, [cli, "plugin", "logs", "vercel-sandbox", "--host", `127.0.0.1:${port}`], { env: daemonEnv, encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] }).slice(-20000)); }
    catch (e) { report.pluginLogs = `unavailable: ${String(e).slice(0, 200)}`; }
  }
  let controllerStopped = !daemon;
  if (daemon) {
    try {
      const stopped = JSON.parse(execFileSync(process.execPath, [cli, "daemon", "stop", "--home", home, "--timeout", "15", "--force", "--json"], { env: daemonEnv, timeout: 30000, encoding: "utf8", stdio: "pipe" }));
      controllerStopped = ["stopped", "not_running"].includes(stopped.action);
    } catch (e) { report.shutdownError = safe(e); process.exitCode = 1; report.passed = false; }
  }
  if (daemon && daemon.exitCode === null && daemon.signalCode === null) {
    daemon.kill("SIGTERM");
    await Promise.race([new Promise(res => daemon.once("exit", res)), delay(10000)]);
    if (daemon.exitCode === null && daemon.signalCode === null) { daemon.kill("SIGKILL"); await new Promise(res => daemon.once("exit", res)); }
  }
  daemon?.stdout?.destroy(); daemon?.stderr?.destroy();
  // The controller is stopped before fallback cleanup, so no worker can race it.
  for (const agent of agents) {
    const r = await slot(agent.id);
    if (!r?.session) continue;
    if (!controllerStopped) { report.cleanup.push({ agent: agent.id, error: "controller shutdown unverified; no concurrent fallback deletion" }); continue; }
    try {
      const s = r.session;
      assert.ok(s.sandboxName.startsWith("paseo-vercel-sandbox-"));
      if (r.uncertainAllocations?.some(a => a.sandboxName === s.sandboxName && !a.resolvedAt)) {
        await owned(agent.id);
      }
      await destroySandboxAndSnapshots(auth(s), s, async () => {});
      report.cleanup.push({ agent: agent.id, fallbackCleanup: true });
    } catch (e) { report.cleanup.push({ agent: agent.id, error: safe(e) }); process.exitCode = 1; report.passed = false; }
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(process.env.PASEO_E2E_REPORT ?? join(root, "report.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ passed: report.passed, checks: checks.length, cleanup: report.cleanup, recoveryDirectory: root }));
}
